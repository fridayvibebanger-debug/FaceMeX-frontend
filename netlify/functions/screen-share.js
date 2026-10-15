import { createClient } from '@supabase/supabase-js';
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';

const SESSION_HOURS = 4;
const TOKEN_TTL = '5m';
const MAX_VIEWERS = 10;
const HOST_DISCONNECT_GRACE_MS = 20_000;
const LIVEKIT_MAX_PARTICIPANTS = MAX_VIEWERS + 1;

class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function createParticipantGrant(isHost, roomName) {
  return {
    roomJoin: true,
    room: roomName,
    canPublish: isHost,
    canPublishSources: isHost ? [TrackSource.SCREEN_SHARE] : [],
    canSubscribe: true,
    canPublishData: false,
  };
}

export function getBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || '';
  const match = String(authorization).match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || '';
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}

function config() {
  const settings = {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    livekitUrl: process.env.LIVEKIT_URL,
    livekitApiKey: process.env.LIVEKIT_API_KEY,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET,
  };
  const missing = Object.entries(settings)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new HttpError(
      503,
      'screen_share_not_configured',
      `Private live sharing is not configured on the server. Missing: ${missing.join(', ')}.`
    );
  }

  return settings;
}

function parseBody(event) {
  if (!event.body) return {};
  if (event.body.length > 12_000) {
    throw new HttpError(413, 'request_too_large', 'This screen sharing request is too large.');
  }
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    throw new HttpError(400, 'invalid_json', 'The screen sharing request was not valid JSON.');
  }
}

function assertSessionId(sessionId) {
  if (!isUuid(sessionId)) {
    throw new HttpError(400, 'invalid_session', 'The private sharing link is invalid.');
  }
}

function assertNotExpired(session) {
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    throw new HttpError(410, 'session_expired', 'This private sharing session has expired.');
  }
}

export async function createPrivateSession(admin, user, now = new Date()) {
  const sessionId = crypto.randomUUID();
  const roomName = `facemex-${crypto.randomUUID()}`;
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  const hostName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'FaceMeX user')
    .trim()
    .slice(0, 80) || 'FaceMeX user';
  const { data, error } = await admin
    .from('facemex_screen_share_sessions')
    .insert({
      id: sessionId,
      room_name: roomName,
      host_id: user.id,
      host_name: hostName,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id,room_name,host_id,host_name,status,invitation_revoked,started_at,expires_at,created_at')
    .single();
  if (error) throw error;
  return data;
}

function makeClients(settings, accessToken) {
  const verifier = createClient(settings.supabaseUrl, settings.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createClient(settings.supabaseUrl, settings.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const roomService = new RoomServiceClient(
    settings.livekitUrl,
    settings.livekitApiKey,
    settings.livekitApiSecret
  );
  return { verifier, admin, roomService, accessToken };
}

async function requireUser(verifier, accessToken) {
  const { data, error } = await verifier.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new HttpError(401, 'unauthorized', 'Your FaceMeX sign-in has expired. Sign in again.');
  }
  return data.user;
}

async function loadSession(admin, sessionId) {
  const { data, error } = await admin
    .from('facemex_screen_share_sessions')
    .select('id,room_name,host_id,host_name,status,invitation_revoked,started_at,expires_at,created_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new HttpError(404, 'session_not_found', 'This private sharing session does not exist.');
  return data;
}

async function hostParticipantIdentityConnected(roomService, session) {
  try {
    const connected = await roomService.listParticipants(session.room_name);
    return connected.some((participant) => participant.identity === session.host_id);
  } catch (error) {
    console.error('FaceMeX could not inspect LiveKit room participants', error);
    throw new HttpError(502, 'media_status_unavailable', 'Could not check the live room connection. Please retry.');
  }
}

export async function deleteLiveKitRoomIfPresent(roomService, roomName) {
  const rooms = await roomService.listRooms([roomName]);
  if (rooms.some((room) => room.name === roomName)) {
    await roomService.deleteRoom(roomName);
  }
}

export async function createLiveKitRoom(roomService, roomName) {
  await roomService.createRoom({
    name: roomName,
    emptyTimeout: 60,
    maxParticipants: LIVEKIT_MAX_PARTICIPANTS,
  });
}

export async function rotateActiveSessionRoom(admin, roomService, session, now = new Date()) {
  const nextRoomName = `facemex-${crypto.randomUUID()}`;
  await createLiveKitRoom(roomService, nextRoomName);

  let updatedSession;
  try {
    const { data, error } = await admin
      .from('facemex_screen_share_sessions')
      .update({ room_name: nextRoomName, started_at: now.toISOString() })
      .eq('id', session.id)
      .eq('room_name', session.room_name)
      .eq('status', 'active')
      .select('id,room_name,host_id,host_name,status,invitation_revoked,started_at,expires_at,created_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new HttpError(409, 'session_state_changed', 'The sharing session changed before access could be revoked. Refresh and try again.');
    }
    updatedSession = data;
  } catch (error) {
    try {
      await deleteLiveKitRoomIfPresent(roomService, nextRoomName);
    } catch (cleanupError) {
      console.error('FaceMeX could not clean up a rotated room after session update failed', cleanupError);
    }
    throw error;
  }

  await deleteLiveKitRoomIfPresent(roomService, session.room_name);
  return updatedSession;
}

async function endExpiredHostlessSession(admin, roomService, session) {
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : 0;
  if (
    session.status !== 'active' ||
    !startedAt ||
    Date.now() - startedAt < HOST_DISCONNECT_GRACE_MS
  ) {
    return session;
  }

  const hostConnected = await hostParticipantIdentityConnected(roomService, session);
  if (hostConnected) return session;

  await deleteLiveKitRoomIfPresent(roomService, session.room_name);
  const { data, error } = await admin
    .from('facemex_screen_share_sessions')
    .update({ status: 'paused' })
    .eq('id', session.id)
    .eq('status', 'active')
    .select('id,room_name,host_id,host_name,status,invitation_revoked,started_at,expires_at,created_at')
    .maybeSingle();
  if (error) throw error;
  return data || { ...session, status: 'paused' };
}

async function sessionResponse(admin, roomService, session, user) {
  assertNotExpired(session);
  if (session.invitation_revoked && session.host_id !== user.id) {
    throw new HttpError(410, 'invitation_revoked', 'This private sharing invitation has been revoked.');
  }

  let hostConnected = false;
  if (session.status === 'active') {
    session = await endExpiredHostlessSession(admin, roomService, session);
    hostConnected = session.status === 'active'
      ? await hostParticipantIdentityConnected(roomService, session)
      : false;
  }

  const role = session.host_id === user.id ? 'host' : 'visitor';
  const { data: ownParticipant, error: participantError } = role === 'visitor'
    ? await admin
        .from('facemex_screen_share_participants')
        .select('user_id,display_name,status,requested_at')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null, error: null };
  if (participantError) throw participantError;

  let participants = [];
  if (role === 'host') {
    const { data, error } = await admin
      .from('facemex_screen_share_participants')
      .select('user_id,display_name,status,requested_at')
      .eq('session_id', session.id)
      .order('requested_at', { ascending: true });
    if (error) throw error;

    let connectedIdentities = new Set();
    if (session.status === 'active') {
      const { room_name: roomName } = session;
      try {
        const liveParticipants = await roomService.listParticipants(roomName);
        connectedIdentities = new Set(liveParticipants.map((participant) => participant.identity));
      } catch (error) {
        console.error('FaceMeX could not inspect connected screen-share viewers', error);
        throw new HttpError(502, 'media_status_unavailable', 'Could not check connected viewers. Please retry.');
      }
    }
    participants = (data || []).map((participant) => ({
      id: participant.user_id,
      name: participant.display_name,
      status: participant.status,
      requestedAt: participant.requested_at,
      connected: connectedIdentities.has(participant.user_id),
    }));
  }

  return {
    session: {
      id: session.id,
      status: session.status,
      expiresAt: session.expires_at,
      hostName: session.host_name,
      role,
      participantStatus: ownParticipant?.status || null,
      hostConnected,
      participants,
    },
  };
}

async function mustBeHost(session, user) {
  if (session.host_id !== user.id) {
    throw new HttpError(403, 'host_only', 'Only the session host can perform this action.');
  }
}

async function handleAction(action, body, user, admin, roomService, settings) {
  if (action === 'create') {
    const session = await createPrivateSession(admin, user);
    return sessionResponse(admin, roomService, session, user);
  }

  assertSessionId(body.sessionId);
  let session = await loadSession(admin, body.sessionId);
  assertNotExpired(session);
  if (session.invitation_revoked && session.host_id !== user.id) {
    throw new HttpError(410, 'invitation_revoked', 'This private sharing invitation has been revoked.');
  }

  if (action === 'get') {
    return sessionResponse(admin, roomService, session, user);
  }

  if (action === 'request') {
    if (session.host_id === user.id) {
      throw new HttpError(409, 'host_cannot_request', 'You are the host of this private sharing session.');
    }
    if (session.status === 'ended') {
      throw new HttpError(410, 'session_ended', 'This private sharing session has ended.');
    }
    const { data: existing, error: existingError } = await admin
      .from('facemex_screen_share_participants')
      .select('status')
      .eq('session_id', session.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.status === 'removed') {
      throw new HttpError(403, 'participant_removed', 'The host removed your access to this session.');
    }
    if (existing?.status !== 'approved') {
      const { count, error: countError } = await admin
        .from('facemex_screen_share_participants')
        .select('user_id', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .in('status', ['waiting', 'approved']);
      if (countError) throw countError;
      if ((count || 0) >= MAX_VIEWERS) {
        throw new HttpError(409, 'session_full', 'This session has reached its viewer limit.');
      }
      const displayName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'FaceMeX user')
        .trim()
        .slice(0, 80) || 'FaceMeX user';
      const { error } = await admin
        .from('facemex_screen_share_participants')
        .upsert({
          session_id: session.id,
          user_id: user.id,
          display_name: displayName,
          status: 'waiting',
          requested_at: new Date().toISOString(),
          approved_at: null,
        }, { onConflict: 'session_id,user_id' });
      if (error) throw error;
    }
    return sessionResponse(admin, roomService, session, user);
  }

  if (action === 'token') {
    assertNotExpired(session);
    if (session.status !== 'active') {
      throw new HttpError(409, 'session_not_live', 'The host has not started live sharing yet.');
    }

    const isHost = session.host_id === user.id;
    if (!isHost) {
      const { data: participant, error } = await admin
        .from('facemex_screen_share_participants')
        .select('status,display_name')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (participant?.status !== 'approved') {
        throw new HttpError(403, 'approval_required', 'The host must approve your request before you can join.');
      }
    }

    if (!isHost && !(await hostParticipantIdentityConnected(roomService, session))) {
      throw new HttpError(409, 'host_not_connected', 'The host is not currently sharing. Wait for the host to start sharing.');
    }

    const participantName = isHost
      ? session.host_name
      : String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'FaceMeX viewer').slice(0, 80);
    const accessToken = new AccessToken(settings.livekitApiKey, settings.livekitApiSecret, {
      identity: user.id,
      name: participantName,
      ttl: TOKEN_TTL,
    });
    accessToken.addGrant(createParticipantGrant(isHost, session.room_name));
    return { url: settings.livekitUrl, token: await accessToken.toJwt() };
  }

  await mustBeHost(session, user);
  if (action === 'approve' || action === 'reject') {
    assertSessionId(body.participantId);
    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await admin
      .from('facemex_screen_share_participants')
      .update({
        status: nextStatus,
        approved_at: nextStatus === 'approved' ? new Date().toISOString() : null,
      })
      .eq('session_id', session.id)
      .eq('user_id', body.participantId)
      .eq('status', 'waiting')
      .select('user_id')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new HttpError(409, 'request_not_waiting', 'That viewer request is no longer waiting for a decision.');
    }
    return sessionResponse(admin, roomService, session, user);
  }

  if (action === 'start') {
    if (session.status === 'ended' || session.invitation_revoked) {
      throw new HttpError(410, 'session_ended', 'This private sharing session has ended.');
    }
    if (session.status === 'active') return sessionResponse(admin, roomService, session, user);

    const previousRoomName = session.room_name;
    await deleteLiveKitRoomIfPresent(roomService, previousRoomName);
    const roomName = `facemex-${crypto.randomUUID()}`;
    await createLiveKitRoom(roomService, roomName);
    try {
      const { data, error } = await admin
        .from('facemex_screen_share_sessions')
        .update({ room_name: roomName, status: 'active', started_at: new Date().toISOString() })
        .eq('id', session.id)
        .in('status', ['pending', 'paused'])
        .select('id,room_name,host_id,host_name,status,invitation_revoked,started_at,expires_at,created_at')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new HttpError(409, 'session_state_changed', 'The sharing session changed before it could start. Refresh and try again.');
      }
      session = data;
    } catch (error) {
      try {
        await deleteLiveKitRoomIfPresent(roomService, roomName);
      } catch (cleanupError) {
        console.error('FaceMeX could not clean up a room after a failed session start', cleanupError);
      }
      throw error;
    }
    return sessionResponse(admin, roomService, session, user);
  }

  if (action === 'pause') {
    if (session.status === 'ended') {
      throw new HttpError(410, 'session_ended', 'This private sharing session has ended.');
    }
    const { data, error } = await admin
      .from('facemex_screen_share_sessions')
      .update({ status: 'paused' })
      .eq('id', session.id)
      .neq('status', 'ended')
      .select('id,room_name,host_id,host_name,status,invitation_revoked,started_at,expires_at,created_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new HttpError(410, 'session_ended', 'This private sharing session has ended.');
    }
    await deleteLiveKitRoomIfPresent(roomService, session.room_name);
    return sessionResponse(admin, roomService, data, user);
  }

  if (action === 'remove') {
    assertSessionId(body.participantId);
    const { data, error } = await admin
      .from('facemex_screen_share_participants')
      .update({ status: 'removed' })
      .eq('session_id', session.id)
      .eq('user_id', body.participantId)
      .neq('status', 'removed')
      .select('user_id')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new HttpError(404, 'participant_not_found', 'That participant is not part of this session.');
    }
    if (session.status === 'active') {
      try {
        const liveParticipants = await roomService.listParticipants(session.room_name);
        if (liveParticipants.some((participant) => participant.identity === body.participantId)) {
          await roomService.removeParticipant(session.room_name, body.participantId);
        }
        session = await rotateActiveSessionRoom(admin, roomService, session);
      } catch (error) {
        console.error('FaceMeX could not rotate the media room after removing a viewer', error);
        throw new HttpError(502, 'viewer_revocation_failed', 'The viewer was removed from the request list, but the live room could not be safely rotated. End the session before continuing.');
      }
    }
    return sessionResponse(admin, roomService, session, user);
  }

  if (action === 'end') {
    const { data, error } = await admin
      .from('facemex_screen_share_sessions')
      .update({ status: 'ended', invitation_revoked: true })
      .eq('id', session.id)
      .select('id,room_name,host_id,host_name,status,invitation_revoked,started_at,expires_at,created_at')
      .single();
    if (error) throw error;
    try {
      await deleteLiveKitRoomIfPresent(roomService, session.room_name);
    } catch (error) {
      console.error('FaceMeX ended session but could not immediately delete its LiveKit room', error);
      throw new HttpError(502, 'media_disconnect_failed', 'The session is closed, but media cleanup did not finish. Retry ending the session.');
    }
    return sessionResponse(admin, roomService, data, user);
  }

  throw new HttpError(400, 'unknown_action', 'This screen sharing action is not supported.');
}

export function createHandler({ readConfig = config, createClients = makeClients } = {}) {
  return async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { 'Cache-Control': 'no-store' }, body: '' };
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'method_not_allowed', message: 'Use POST for screen sharing requests.' });
    }

    const bearer = getBearerToken(event.headers || {});
    if (!bearer) {
      return json(401, { error: 'unauthorized', message: 'Sign in to FaceMeX before using private screen sharing.' });
    }

    let body;
    let action = '';
    try {
      body = parseBody(event);
      action = String(body.action || '');
      if (action !== 'create') {
        assertSessionId(body.sessionId);
        if (['approve', 'reject', 'remove'].includes(action)) assertSessionId(body.participantId);
      }
    } catch (error) {
      if (error instanceof HttpError) {
        return json(error.statusCode, { error: error.code, message: error.message });
      }
      console.error('FaceMeX screen-share request validation failed', {
        route: event.path || '/.netlify/functions/screen-share',
        method: event.httpMethod,
        errorCode: 'request_validation_failed',
      });
      return json(400, { error: 'request_validation_failed', message: 'The screen sharing request was invalid.' });
    }

    let upstreamService = 'configuration';
    try {
      const settings = readConfig();
      const { verifier, admin, roomService } = createClients(settings, bearer);
      upstreamService = 'supabase-auth';
      const user = await requireUser(verifier, bearer);
      upstreamService = action === 'create' ? 'supabase-session-store' : 'session-authorization';
      const result = await handleAction(action, body, user, admin, roomService, settings);
      return json(200, result);
    } catch (error) {
      if (error instanceof HttpError) {
        return json(error.statusCode, { error: error.code, message: error.message });
      }
      console.error('FaceMeX screen-share function request failed', {
        route: event.path || '/.netlify/functions/screen-share',
        method: event.httpMethod,
        action: action || 'unknown',
        service: upstreamService,
        errorCode: typeof error?.code === 'string' && /^[a-z0-9_-]{1,64}$/i.test(error.code)
          ? error.code
          : 'screen_share_request_failed',
      });
      return json(500, { error: 'screen_share_request_failed', message: 'The screen sharing request failed. Please try again.' });
    }
  };
}

export const handler = createHandler();
