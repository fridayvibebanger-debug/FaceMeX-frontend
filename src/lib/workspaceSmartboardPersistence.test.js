import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getSmartboardRecoveryKey,
  parseSmartboardRecovery,
  serializeSmartboardRecovery,
} from './workspaceSmartboardPersistence.js';

test('namespaces Smartboard recovery by authenticated user', () => {
  assert.equal(getSmartboardRecoveryKey('user-123'), 'facemex_smartboard_recovery_user-123');
  assert.notEqual(getSmartboardRecoveryKey('user-123'), getSmartboardRecoveryKey('user-456'));
  assert.throws(() => getSmartboardRecoveryKey(''), /signed-in user id/);
});

test('round-trips an unsaved board snapshot and optional saved-board identity', () => {
  const recovery = {
    savedAt: '2026-11-14T10:00:00.000Z',
    title: 'Quadratic practice',
    scene: { strokes: [{ color: '#000000', points: [{ x: 0.1, y: 0.2 }] }] },
    image: null,
    view: { zoom: 1.5, x: -12, y: 8 },
    savedBoard: { id: 'board-1', conversationId: 'conversation-1', createdAt: '2026-11-13T10:00:00.000Z' },
  };

  assert.deepEqual(
    parseSmartboardRecovery(serializeSmartboardRecovery(recovery)),
    { status: 'valid', recovery },
  );
});

test('rejects malformed or unsupported recovery data without inventing a board', () => {
  assert.deepEqual(parseSmartboardRecovery(null), { status: 'empty' });
  assert.deepEqual(parseSmartboardRecovery('{'), { status: 'invalid' });
  assert.deepEqual(parseSmartboardRecovery(JSON.stringify({
    version: 99,
    title: 'Unknown board',
    scene: {},
    image: null,
    view: { zoom: 1, x: 0, y: 0 },
    savedAt: '2026-11-14T10:00:00.000Z',
  })), { status: 'invalid' });
  assert.throws(() => serializeSmartboardRecovery({ title: 'Bad', scene: [], image: null }), /scene object/);
});
