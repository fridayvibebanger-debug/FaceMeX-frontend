import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPrivateSession,
  createParticipantGrant,
  createHandler,
  deleteLiveKitRoomIfPresent,
  getBearerToken,
  getParticipantDisplayName,
  handler,
  isUuid,
  readScreenShareConfig,
  rotateActiveSessionRoom,
} from './screen-share.js';
import { TrackSource } from 'livekit-server-sdk';

test('extracts only a well-formed bearer token', () => {
  assert.equal(getBearerToken({ authorization: 'Bearer signed-token' }), 'signed-token');
  assert.equal(getBearerToken({ Authorization: 'bearer signed-token' }), 'signed-token');
  assert.equal(getBearerToken({ authorization: 'signed-token' }), '');
  assert.equal(getBearerToken({ authorization: 'Bearer ' }), '');
});

test('accepts only UUID session and participant identifiers', () => {
  assert.equal(isUuid('07d44437-9f21-4ca2-8d15-8830d64d32b9'), true);
  assert.equal(isUuid('not-a-session-id'), false);
  assert.equal(isUuid(42), false);
});

test('uses verified anonymous identity for guest names and requires a name', () => {
  assert.equal(
    getParticipantDisplayName({ is_anonymous: true }, '  Course partner  '),
    'Course partner'
  );
  assert.throws(
    () => getParticipantDisplayName({ is_anonymous: true }, '   '),
    (error) => error.code === 'guest_name_required'
  );
  assert.equal(
    getParticipantDisplayName({ user_metadata: { full_name: 'Registered user' } }, 'Spoofed name'),
    'Registered user'
  );
});

test('reports missing deployment variable names without exposing values', () => {
  assert.throws(
    () => readScreenShareConfig({
      SUPABASE_URL: 'supabase-url',
      SUPABASE_ANON_KEY: 'public-anon-key',
    }),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.match(error.message, /SUPABASE_SERVICE_ROLE_KEY/);
      assert.match(error.message, /LIVEKIT_URL/);
      assert.match(error.message, /LIVEKIT_API_KEY/);
      assert.match(error.message, /LIVEKIT_API_SECRET/);
      assert.doesNotMatch(error.message, /supabase-url|public-anon-key/);
      return true;
    }
  );
});

test('accepts the documented Netlify server-side configuration names', () => {
  const settings = readScreenShareConfig({
    SUPABASE_URL: 'supabase-url',
    SUPABASE_ANON_KEY: 'public-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    LIVEKIT_URL: 'wss://livekit.example.test',
    LIVEKIT_API_KEY: 'livekit-key',
    LIVEKIT_API_SECRET: 'livekit-secret',
  });

  assert.deepEqual(settings, {
    supabaseUrl: 'supabase-url',
    supabaseAnonKey: 'public-anon-key',
    serviceRoleKey: 'service-role-key',
    livekitUrl: 'wss://livekit.example.test',
    livekitApiKey: 'livekit-key',
    livekitApiSecret: 'livekit-secret',
  });
});

test('limits host and viewer media publishing to their approved track sources', () => {
  assert.deepEqual(createParticipantGrant(true, 'facemex-room'), {
    roomJoin: true,
    room: 'facemex-room',
    canPublish: true,
    canPublishSources: [TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE],
    canSubscribe: true,
    canPublishData: true,
  });
  assert.deepEqual(createParticipantGrant(false, 'facemex-room'), {
    roomJoin: true,
    room: 'facemex-room',
    canPublish: true,
    canPublishSources: [TrackSource.MICROPHONE],
    canSubscribe: true,
    canPublishData: true,
  });
});

test('deletes an existing room using the LiveKit SDK array response', async () => {
  const deletedRooms = [];
  const roomService = {
    async listRooms() {
      return [{ name: 'facemex-session' }];
    },
    async deleteRoom(roomName) {
      deletedRooms.push(roomName);
    },
  };

  await deleteLiveKitRoomIfPresent(roomService, 'facemex-session');
  assert.deepEqual(deletedRooms, ['facemex-session']);
});

test('does not delete a room that is already absent', async () => {
  const deletedRooms = [];
  const roomService = {
    async listRooms() {
      return [];
    },
    async deleteRoom(roomName) {
      deletedRooms.push(roomName);
    },
  };

  await deleteLiveKitRoomIfPresent(roomService, 'facemex-session');
  assert.deepEqual(deletedRooms, []);
});

test('rotates an active room and deletes the previous room', async () => {
  let updatedRoom;
  const deletedRooms = [];
  const admin = {
    from(table) {
      assert.equal(table, 'facemex_screen_share_sessions');
      return {
        update(values) {
          updatedRoom = values.room_name;
          return this;
        },
        eq() {
          return this;
        },
        select() {
          return this;
        },
        async maybeSingle() {
          return { data: { id: 'session-id', room_name: updatedRoom, status: 'active' }, error: null };
        },
      };
    },
  };
  const roomService = {
    async createRoom({ name }) {
      updatedRoom = name;
    },
    async listRooms([name]) {
      return [{ name }];
    },
    async deleteRoom(name) {
      deletedRooms.push(name);
    },
  };

  const updated = await rotateActiveSessionRoom(
    admin,
    roomService,
    { id: 'session-id', room_name: 'old-room' }
  );

  assert.match(updated.room_name, /^facemex-/);
  assert.notEqual(updated.room_name, 'old-room');
  assert.deepEqual(deletedRooms, ['old-room']);
});

test('cleans up a newly-created room if the session update fails', async () => {
  const createdRooms = [];
  const deletedRooms = [];
  const admin = {
    from() {
      return {
        update() {
          return this;
        },
        eq() {
          return this;
        },
        select() {
          return this;
        },
        async maybeSingle() {
          return { data: null, error: new Error('database unavailable') };
        },
      };
    },
  };
  const roomService = {
    async createRoom({ name }) {
      createdRooms.push(name);
    },
    async listRooms([name]) {
      return createdRooms.includes(name) ? [{ name }] : [];
    },
    async deleteRoom(name) {
      deletedRooms.push(name);
    },
  };

  await assert.rejects(
    rotateActiveSessionRoom(admin, roomService, { id: 'session-id', room_name: 'old-room' }),
    /database unavailable/
  );
  assert.equal(createdRooms.length, 1);
  assert.deepEqual(deletedRooms, createdRooms);
});

test('creates a pending private invitation record for the authenticated host', async () => {
  let inserted;
  const sessionRecord = {
    id: 'session-id',
    room_name: 'facemex-room-id',
    host_id: 'host-id',
    host_name: 'FaceMeX Host',
    status: 'pending',
  };
  const admin = {
    from(table) {
      assert.equal(table, 'facemex_screen_share_sessions');
      return {
        insert(values) {
          inserted = values;
          return this;
        },
        select() {
          return this;
        },
        async single() {
          return { data: sessionRecord, error: null };
        },
      };
    },
  };

  const session = await createPrivateSession(
    admin,
    { id: 'host-id', user_metadata: { full_name: ' FaceMeX Host ' } },
    new Date('2026-10-15T12:00:00.000Z')
  );

  assert.equal(session, sessionRecord);
  assert.equal(inserted.host_id, 'host-id');
  assert.equal(inserted.host_name, 'FaceMeX Host');
  assert.equal(inserted.status, 'pending');
  assert.equal(inserted.expires_at, '2026-10-15T16:00:00.000Z');
  assert.match(inserted.id, /^[0-9a-f-]{36}$/i);
  assert.match(inserted.room_name, /^facemex-[0-9a-f-]{36}$/i);
});

test('authenticated create request returns a real pending session response', async () => {
  const user = { id: 'host-id', email: 'host@example.test', user_metadata: { full_name: 'FaceMeX Host' } };
  const session = {
    id: 'session-id',
    room_name: 'facemex-room',
    host_id: user.id,
    host_name: 'FaceMeX Host',
    status: 'pending',
    invitation_revoked: false,
    started_at: null,
    expires_at: '2027-10-15T16:00:00.000Z',
    created_at: '2026-10-15T12:00:00.000Z',
  };
  const admin = {
    from(table) {
      if (table === 'facemex_screen_share_sessions') {
        return {
          insert() { return this; },
          select() { return this; },
          async single() { return { data: session, error: null }; },
        };
      }
      assert.equal(table, 'facemex_screen_share_participants');
      return {
        select() { return this; },
        eq() { return this; },
        order() { return Promise.resolve({ data: [], error: null }); },
      };
    },
  };
  const endpoint = createHandler({
    readConfig: () => ({}),
    createClients: () => ({
      verifier: { auth: { getUser: async () => ({ data: { user }, error: null }) } },
      admin,
      roomService: {},
    }),
  });

  const response = await endpoint({
    httpMethod: 'POST',
    path: '/.netlify/functions/screen-share',
    headers: { authorization: 'Bearer authenticated-session-token' },
    body: JSON.stringify({ action: 'create' }),
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.session.id, session.id);
  assert.equal(payload.session.status, 'pending');
  assert.equal(payload.session.role, 'host');
  assert.deepEqual(payload.session.participants, []);
});

test('starts a real private room for the authenticated host', async () => {
  const user = { id: 'host-user-id', user_metadata: { full_name: 'FaceMeX Host' } };
  const session = {
    id: '07d44437-9f21-4ca2-8d15-8830d64d32b9',
    room_name: 'facemex-pending-room',
    host_id: user.id,
    host_name: 'FaceMeX Host',
    status: 'pending',
    invitation_revoked: false,
    started_at: null,
    expires_at: '2027-10-15T16:00:00.000Z',
    created_at: '2026-10-15T12:00:00.000Z',
  };
  const createdRooms = [];
  const admin = {
    from(table) {
      assert.equal(table, 'facemex_screen_share_sessions');
      return {
        select() { return this; },
        update(values) {
          this.updatedValues = values;
          return this;
        },
        eq() { return this; },
        in() { return this; },
        maybeSingle: async function () {
          if (this.updatedValues) {
            return {
              data: { ...session, ...this.updatedValues },
              error: null,
            };
          }
          return { data: session, error: null };
        },
      };
    },
  };
  const roomService = {
    async listRooms() { return []; },
    async createRoom(room) { createdRooms.push(room); },
    async listParticipants() { return [{ identity: user.id }]; },
  };
  const endpoint = createHandler({
    readConfig: () => ({}),
    createClients: () => ({
      verifier: { auth: { getUser: async () => ({ data: { user }, error: null }) } },
      admin: {
        ...admin,
        from(table) {
          if (table === 'facemex_screen_share_sessions') return admin.from(table);
          return {
            select() { return this; },
            eq() { return this; },
            order() { return Promise.resolve({ data: [], error: null }); },
          };
        },
      },
      roomService,
    }),
  });
  const response = await endpoint({
    httpMethod: 'POST',
    path: '/.netlify/functions/screen-share',
    headers: { authorization: '******' },
    body: JSON.stringify({ action: 'start', sessionId: session.id }),
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.session.status, 'active');
  assert.equal(payload.session.role, 'host');
  assert.equal(payload.session.hostConnected, true);
  assert.equal(createdRooms.length, 1);
  assert.match(createdRooms[0].name, /^facemex-[0-9a-f-]{36}$/i);
  assert.notEqual(createdRooms[0].name, session.room_name);
  assert.equal(createdRooms[0].maxParticipants, 11);
});

test('reports Supabase session-store errors during invitation creation', async () => {
  const admin = {
    from() {
      return {
        insert() {
          return this;
        },
        select() {
          return this;
        },
        async single() {
          return { data: null, error: Object.assign(new Error('database unavailable'), { code: 'XX000' }) };
        },
      };
    },
  };

  await assert.rejects(
    createPrivateSession(admin, { id: 'host-id' }),
    /database unavailable/
  );
});

test('returns a safe server error when the Supabase session insert fails', async () => {
  const user = { id: 'host-id' };
  const endpoint = createHandler({
    readConfig: () => ({}),
    createClients: () => ({
      verifier: { auth: { getUser: async () => ({ data: { user }, error: null }) } },
      admin: {
        from() {
          return {
            insert() { return this; },
            select() { return this; },
            async single() {
              return { data: null, error: Object.assign(new Error('database unavailable'), { code: 'XX000' }) };
            },
          };
        },
      },
      roomService: {},
    }),
  });

  const response = await endpoint({
    httpMethod: 'POST',
    path: '/.netlify/functions/screen-share',
    headers: { authorization: 'Bearer authenticated-session-token' },
    body: JSON.stringify({ action: 'create' }),
  });
  assert.equal(response.statusCode, 500);
  assert.equal(JSON.parse(response.body).error, 'screen_share_request_failed');
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('authenticated guests can request access but remain pending until host approval', async () => {
  const user = { id: 'guest-user-id', is_anonymous: true, user_metadata: { full_name: 'A guest' } };
  const session = {
    id: '07d44437-9f21-4ca2-8d15-8830d64d32b9',
    room_name: 'facemex-room',
    host_id: '17d44437-9f21-4ca2-8d15-8830d64d32b9',
    host_name: 'FaceMeX Host',
    status: 'pending',
    invitation_revoked: false,
    started_at: null,
    expires_at: '2027-10-15T16:00:00.000Z',
    created_at: '2026-10-15T12:00:00.000Z',
  };
  let participant = null;
  const admin = {
    from(table) {
      if (table === 'facemex_screen_share_sessions') {
        return {
          select() { return this; },
          eq() { return this; },
          async maybeSingle() { return { data: session, error: null }; },
        };
      }
      assert.equal(table, 'facemex_screen_share_participants');
      return {
        select(_columns, options) {
          if (options?.count === 'exact') {
            return {
              eq() { return this; },
              async in() { return { count: participant ? 1 : 0, error: null }; },
            };
          }
          return {
            eq() { return this; },
            async maybeSingle() { return { data: participant, error: null }; },
          };
        },
        async upsert(values) {
          participant = { user_id: user.id, ...values };
          return { error: null };
        },
      };
    },
  };
  const endpoint = createHandler({
    readConfig: () => ({}),
    createClients: () => ({
      verifier: { auth: { getUser: async () => ({ data: { user }, error: null }) } },
      admin,
      roomService: {},
    }),
  });

  const response = await endpoint({
    httpMethod: 'POST',
    path: '/.netlify/functions/screen-share',
    headers: { authorization: '******' },
    body: JSON.stringify({
      action: 'request',
      sessionId: session.id,
      displayName: 'Course partner',
    }),
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(participant.display_name, 'Course partner');
  assert.equal(participant.is_guest, true);
  assert.equal(participant.status, 'waiting');
  assert.equal(payload.session.participantStatus, 'waiting');
  assert.equal(payload.session.isGuest, true);
});

test('does not issue a LiveKit token to a guest whose request is still waiting', async () => {
  const user = { id: 'guest-user-id', is_anonymous: true, user_metadata: { full_name: 'Course partner' } };
  const session = {
    id: '07d44437-9f21-4ca2-8d15-8830d64d32b9',
    room_name: 'facemex-room',
    host_id: '17d44437-9f21-4ca2-8d15-8830d64d32b9',
    host_name: 'FaceMeX Host',
    status: 'active',
    invitation_revoked: false,
    started_at: '2026-10-15T12:00:00.000Z',
    expires_at: '2027-10-15T16:00:00.000Z',
    created_at: '2026-10-15T12:00:00.000Z',
  };
  const admin = {
    from(table) {
      if (table === 'facemex_screen_share_sessions') {
        return {
          select() { return this; },
          eq() { return this; },
          async maybeSingle() { return { data: session, error: null }; },
        };
      }
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          return { data: { status: 'waiting', display_name: 'Course partner', is_guest: true }, error: null };
        },
      };
    },
  };
  const endpoint = createHandler({
    readConfig: () => ({}),
    createClients: () => ({
      verifier: { auth: { getUser: async () => ({ data: { user }, error: null }) } },
      admin,
      roomService: {},
    }),
  });

  const response = await endpoint({
    httpMethod: 'POST',
    path: '/.netlify/functions/screen-share',
    headers: { authorization: '******' },
    body: JSON.stringify({ action: 'token', sessionId: session.id }),
  });

  assert.equal(response.statusCode, 403);
  assert.equal(JSON.parse(response.body).error, 'approval_required');
});

test('rejects an unauthenticated call before accessing service configuration', async () => {
  const response = await handler({
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({ action: 'create' }),
  });
  assert.equal(response.statusCode, 401);
  assert.equal(JSON.parse(response.body).error, 'unauthorized');
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('requires a registered account to create a private session', async () => {
  const endpoint = createHandler({
    readConfig: () => ({}),
    createClients: () => ({
      verifier: { auth: { getUser: async () => ({ data: { user: { id: 'guest-id', is_anonymous: true } }, error: null }) } },
      admin: {},
      roomService: {},
    }),
  });
  const response = await endpoint({
    httpMethod: 'POST',
    path: '/.netlify/functions/screen-share',
    headers: { authorization: '******' },
    body: JSON.stringify({ action: 'create' }),
  });
  assert.equal(response.statusCode, 403);
  assert.equal(JSON.parse(response.body).error, 'registered_host_required');
});

test('rejects malformed invitation identifiers before accessing backend configuration', async () => {
  const response = await handler({
    httpMethod: 'POST',
    path: '/.netlify/functions/screen-share',
    headers: { authorization: 'Bearer valid-shaped-token' },
    body: JSON.stringify({ action: 'get', sessionId: 'invalid-invitation' }),
  });
  assert.equal(response.statusCode, 400);
  assert.equal(JSON.parse(response.body).error, 'invalid_session');
  assert.equal(response.headers['Cache-Control'], 'no-store');
});
