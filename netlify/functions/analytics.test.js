import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsHandler, sanitizeAnalyticsEvent } from './analytics.js';

const validEvent = {
  event_id: '07d44437-9f21-4ca2-8d15-8830d64d32b9',
  event_name: 'ai_request_failed',
  feature: 'ai_workspace',
  button_id: 'send_message',
  route: '/ai/job-assistant',
  device_category: 'mobile',
  properties: {
    intent: 'career_help',
    prompt: 'private user content',
    password: 'must not persist',
  },
};

function mockClients({ isFounder = false } = {}) {
  return (url, key) => ({
    auth: {
      getUser: async () => ({
        data: { user: key === 'anon' ? { id: 'registered-user-id' } : null },
        error: key === 'anon' ? null : new Error('invalid token'),
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: isFounder ? { user_id: 'registered-user-id' } : null, error: null }),
        }),
      }),
      upsert: async () => ({ error: null }),
    }),
    rpc: async () => ({ data: { overview: { active_users: 1 } }, error: null }),
  });
}

test('analytics event allowlist drops prompts and credentials', () => {
  const sanitized = sanitizeAnalyticsEvent(validEvent);
  assert.ok(sanitized);
  assert.equal(sanitized.outcome, 'failure');
  assert.equal(sanitized.error_category, 'provider');
  assert.deepEqual(sanitized.properties, { intent: 'career_help' });
  assert.equal('user_id' in sanitized, false);
});

test('rejects malformed event ids, event names, and device categories', () => {
  assert.equal(sanitizeAnalyticsEvent({ ...validEvent, event_id: 'not-a-uuid' }), null);
  assert.equal(sanitizeAnalyticsEvent({ ...validEvent, event_name: 'prompt contains text' }), null);
  assert.equal(sanitizeAnalyticsEvent({ ...validEvent, device_category: 'unknown' }), null);
});

test('requires an authenticated FaceMeX user', async () => {
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients(),
  });
  const response = await handler({
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer token' },
    body: JSON.stringify({ action: 'track', event: validEvent }),
  });
  assert.equal(response.statusCode, 401);
});

test('restricts reports to configured analytics admins', async () => {
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients(),
  });
  const response = await handler({
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-01', end_date: '2026-10-16' }),
  });
  assert.equal(response.statusCode, 403);
  assert.equal(JSON.parse(response.body).error, 'founder_only');
});

test('returns aggregate reports to explicitly authorized admins', async () => {
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({ isFounder: true }),
  });
  const response = await handler({
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-01', end_date: '2026-10-16' }),
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).report.overview, { active_users: 1 });
});
