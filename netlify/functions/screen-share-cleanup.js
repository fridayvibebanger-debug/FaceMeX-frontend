import { createClient } from '@supabase/supabase-js';
import { RoomServiceClient } from 'livekit-server-sdk';
import { deleteLiveKitRoomIfPresent } from './screen-share.js';

const BATCH_SIZE = 100;
const HOST_DISCONNECT_GRACE_MS = 20_000;

function getClients() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const livekitUrl = process.env.LIVEKIT_URL;
  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
  const missing = Object.entries({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    LIVEKIT_URL: livekitUrl,
    LIVEKIT_API_KEY: livekitApiKey,
    LIVEKIT_API_SECRET: livekitApiSecret,
  })
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`Screen-share cleanup is not configured. Missing: ${missing.join(', ')}.`);
  }

  return {
    admin: createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    roomService: new RoomServiceClient(livekitUrl, livekitApiKey, livekitApiSecret),
  };
}

async function endExpiredSessions(admin, roomService, now) {
  const { data: sessions, error } = await admin
    .from('facemex_screen_share_sessions')
    .select('id,room_name')
    .lte('expires_at', now.toISOString())
    .neq('status', 'ended')
    .order('expires_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw error;

  for (const session of sessions || []) {
    await deleteLiveKitRoomIfPresent(roomService, session.room_name);
    const { error: updateError } = await admin
      .from('facemex_screen_share_sessions')
      .update({ status: 'ended', invitation_revoked: true })
      .eq('id', session.id)
      .lte('expires_at', now.toISOString())
      .neq('status', 'ended');
    if (updateError) throw updateError;
  }
}

async function pauseHostlessSessions(admin, roomService, now) {
  const disconnectBefore = new Date(now.getTime() - HOST_DISCONNECT_GRACE_MS);
  const { data: sessions, error } = await admin
    .from('facemex_screen_share_sessions')
    .select('id,room_name,host_id,started_at')
    .eq('status', 'active')
    .lt('started_at', disconnectBefore.toISOString())
    .limit(BATCH_SIZE);
  if (error) throw error;

  for (const session of sessions || []) {
    const rooms = await roomService.listRooms([session.room_name]);
    if (rooms.some((room) => room.name === session.room_name)) {
      const participants = await roomService.listParticipants(session.room_name);
      if (participants.some((participant) => participant.identity === session.host_id)) continue;
    }

    await deleteLiveKitRoomIfPresent(roomService, session.room_name);
    const { error: updateError } = await admin
      .from('facemex_screen_share_sessions')
      .update({ status: 'paused' })
      .eq('id', session.id)
      .eq('status', 'active')
      .eq('started_at', session.started_at);
    if (updateError) throw updateError;
  }
}

export const config = { schedule: '* * * * *' };

export const handler = async () => {
  const { admin, roomService } = getClients();
  const now = new Date();
  await endExpiredSessions(admin, roomService, now);
  await pauseHostlessSessions(admin, roomService, now);
};
