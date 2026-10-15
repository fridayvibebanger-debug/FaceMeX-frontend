import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createParticipantGrant,
  deleteLiveKitRoomIfPresent,
  getBearerToken,
  handler,
  isUuid,
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

test('limits host publishing to screen share and denies publishing to viewers', () => {
  assert.deepEqual(createParticipantGrant(true, 'facemex-room'), {
    roomJoin: true,
    room: 'facemex-room',
    canPublish: true,
    canPublishSources: [TrackSource.SCREEN_SHARE],
    canSubscribe: true,
    canPublishData: false,
  });
  assert.deepEqual(createParticipantGrant(false, 'facemex-room'), {
    roomJoin: true,
    room: 'facemex-room',
    canPublish: false,
    canPublishSources: [],
    canSubscribe: true,
    canPublishData: false,
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
