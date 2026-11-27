import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsHandler, sanitizeAnalyticsEvent } from '../functions/analytics.js';

const validEvent = {
  event_id: '07d44437-9f21-4ca2-8d15-8830d64d32b9',
  event_name: 'ai_request_failed',
  feature: 'ai_workspace',
  button_id: 'send_message',
  action: 'submit prompt',
  route: '/ai/job-assistant',
  device_category: 'mobile',
  duration_ms: 1234,
  properties: {
    intent: 'career_help',
    prompt: 'private user content',
    password: 'must not persist',
  },
};

function mockClients({
  isFounder = false,
  captureEvent,
  captureReport,
  captureUserLookup,
  reportResponse = { data: { overview: { active_users: 1 } }, error: null },
  usersById = {},
  userLookupErrors = {},
  authenticated = true,
} = {}) {
  return (url, key) => ({
    auth: {
      getUser: async () => ({
        data: { user: key === 'anon' && authenticated ? {
          id: 'registered-user-id',
          email: isFounder ? 'luckymawasha72@gmail.com' : 'other@example.com',
        } : null },
        error: key === 'anon' && authenticated ? null : Object.assign(new Error('invalid token'), {
          status: 401,
          code: 'invalid_token',
        }),
      }),
      admin: {
        getUserById: async (userId) => {
          captureUserLookup?.(userId);
          if (userLookupErrors[userId] instanceof Error) throw userLookupErrors[userId];
          if (userLookupErrors[userId]) {
            return { data: { user: null }, error: userLookupErrors[userId] };
          }
          return {
            data: { user: usersById[userId] || null },
            error: null,
          };
        },
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: isFounder ? { user_id: 'registered-user-id' } : null, error: null }),
        }),
      }),
      upsert: async (value) => {
        captureEvent?.(value);
        return { error: null };
      },
    }),
    rpc: async (name, args) => {
      captureReport?.({ name, args });
      return reportResponse;
    },
  });
}

test('analytics event allowlist drops prompts and credentials', () => {
  const sanitized = sanitizeAnalyticsEvent(validEvent);
  assert.ok(sanitized);
  assert.equal(sanitized.outcome, 'failure');
  assert.equal(sanitized.error_category, 'provider');
  assert.equal(sanitized.duration_ms, 1234);
  assert.equal(sanitized.action, 'submit prompt');
  assert.deepEqual(sanitized.properties, { intent: 'career_help' });
  assert.equal('user_id' in sanitized, false);
});

test('accepts only bounded whole-number event durations', () => {
  assert.equal(sanitizeAnalyticsEvent({ ...validEvent, duration_ms: -1 }).duration_ms, null);
  assert.equal(sanitizeAnalyticsEvent({ ...validEvent, duration_ms: 3_600_001 }).duration_ms, null);
  assert.equal(sanitizeAnalyticsEvent({ ...validEvent, duration_ms: 1.5 }).duration_ms, null);
});

test('rejects malformed event ids, event names, and device categories', () => {
  assert.equal(sanitizeAnalyticsEvent({ ...validEvent, event_id: 'not-a-uuid' }), null);
  assert.equal(sanitizeAnalyticsEvent({ ...validEvent, event_name: 'prompt contains text' }), null);
  assert.equal(sanitizeAnalyticsEvent({ ...validEvent, device_category: 'unknown' }), null);
});

test('requires an authenticated FaceMeX user', async () => {
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({ authenticated: false }),
  });
  const response = await handler({
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer token' },
    body: JSON.stringify({ action: 'track', event: validEvent }),
  });
  assert.equal(response.statusCode, 401);
});

test('records only sanitized events for the verified signed-in user', async () => {
  let stored;
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({ captureEvent: (event) => { stored = event; } }),
  });
  const response = await handler({
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify({ action: 'track', event: validEvent }),
  });
  assert.equal(response.statusCode, 202);
  assert.equal(stored.user_id, 'registered-user-id');
  assert.equal(stored.event_name, 'ai_request_failed');
  assert.deepEqual(stored.properties, { intent: 'career_help' });
  assert.equal('prompt' in stored.properties, false);
});

test('restricts reports to the verified owner account', async () => {
  let userLookupAttempted = false;
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({
      captureUserLookup: () => { userLookupAttempted = true; },
    }),
  });
  const response = await handler({
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-01', end_date: '2026-10-16' }),
  });
  assert.equal(response.statusCode, 403);
  assert.equal(JSON.parse(response.body).error, 'founder_only');
  assert.equal(userLookupAttempted, false);
});

test('returns aggregate reports to the verified owner account', async () => {
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

test('adds identity fields to owner reports using distinct event user ids', async () => {
  const lookedUpUserIds = [];
  const firstUserId = '07d44437-9f21-4ca2-8d15-8830d64d32b9';
  const secondUserId = '17d44437-9f21-4ca2-8d15-8830d64d32b9';
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({
      isFounder: true,
      reportResponse: {
        data: {
          overview: { active_users_in_range: 2 },
          users: [
            { user_id: firstUserId, events: 3 },
            { user_id: secondUserId, events: 1 },
          ],
          recent_activity: [
            { user_id: firstUserId, event_name: 'page_view' },
          ],
        },
        error: null,
      },
      usersById: {
        [firstUserId]: {
          id: firstUserId,
          email: 'one@example.com',
          user_metadata: { full_name: 'FaceMeX User One' },
        },
        [secondUserId]: {
          id: secondUserId,
          email: 'two@example.com',
          user_metadata: { first_name: 'FaceMeX', last_name: 'User Two' },
        },
      },
      captureUserLookup: (userId) => { lookedUpUserIds.push(userId); },
    }),
  });
  const response = await handler({
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer analytics-test-token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-10', end_date: '2026-11-08' }),
  });
  const report = JSON.parse(response.body).report;
  assert.equal(response.statusCode, 200);
  assert.deepEqual(lookedUpUserIds.sort(), [firstUserId, secondUserId].sort());
  assert.equal(report.users[0].name, 'FaceMeX User One');
  assert.equal(report.users[0].email, 'one@example.com');
  assert.equal(report.users[1].name, 'FaceMeX User Two');
  assert.equal(report.users[1].email, 'two@example.com');
  assert.equal(report.recent_activity[0].name, 'FaceMeX User One');
  assert.equal(report.recent_activity[0].email, 'one@example.com');
  assert.equal(report.overview.active_users_in_range, 2);
});

test('uses safe identity fallbacks for missing user metadata and users', async () => {
  const userWithEmailOnly = '07d44437-9f21-4ca2-8d15-8830d64d32b9';
  const missingUserId = '17d44437-9f21-4ca2-8d15-8830d64d32b9';
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({
      isFounder: true,
      reportResponse: {
        data: {
          users: [
            { user_id: userWithEmailOnly, events: 1 },
            { user_id: missingUserId, events: 1 },
          ],
          recent_activity: [{ user_id: missingUserId, event_name: 'app_open' }],
        },
        error: null,
      },
      usersById: {
        [userWithEmailOnly]: { id: userWithEmailOnly, email: 'known@example.com', user_metadata: {} },
      },
    }),
  });
  const response = await handler({
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer analytics-test-token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-10', end_date: '2026-11-08' }),
  });
  const report = JSON.parse(response.body).report;
  assert.equal(response.statusCode, 200);
  assert.equal(report.users[0].name, 'Name not provided');
  assert.equal(report.users[0].email, 'known@example.com');
  assert.equal(report.users[1].name, 'Name not provided');
  assert.equal(report.users[1].email, 'Email unavailable');
  assert.equal(report.recent_activity[0].name, 'Name not provided');
  assert.equal(report.recent_activity[0].email, 'Email unavailable');
});

test('keeps report available with safe fallbacks when user lookup fails', async () => {
  const userId = '07d44437-9f21-4ca2-8d15-8830d64d32b9';
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({
      isFounder: true,
      reportResponse: {
        data: {
          overview: { active_users_in_range: 1 },
          users: [{ user_id: userId, events: 1 }],
          recent_activity: [],
        },
        error: null,
      },
      userLookupErrors: {
        [userId]: { code: 'user_lookup_failed', message: 'private auth error detail' },
      },
    }),
  });
  const response = await handler({
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer analytics-test-token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-10', end_date: '2026-11-08' }),
  });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.report.users[0].name, 'Name not provided');
  assert.equal(body.report.users[0].email, 'Email unavailable');
  assert.equal(response.body.includes('private auth error detail'), false);
});

test('rejects methods other than POST', async () => {
  const handler = createAnalyticsHandler();
  const response = await handler({ httpMethod: 'GET', path: '/.netlify/functions/analytics' });
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
});

test('returns a diagnosable configuration error when server keys are missing', async () => {
  const handler = createAnalyticsHandler({ env: {} });
  const response = await handler({
    httpMethod: 'POST',
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer analytics-test-token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-10', end_date: '2026-11-08' }),
  });
  assert.equal(response.statusCode, 503);
  assert.equal(JSON.parse(response.body).error, 'analytics_not_configured');
  assert.ok(response.headers['X-Request-Id']);
});

test('passes the requested date range and feature to the report query', async () => {
  let reportRequest;
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({ isFounder: true, captureReport: (request) => { reportRequest = request; } }),
  });
  const response = await handler({
    httpMethod: 'POST',
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer analytics-test-token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-10', end_date: '2026-11-08', feature: 'ai_workspace' }),
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(reportRequest, {
    name: 'facemex_analytics_report',
    args: { p_start_date: '2026-10-10', p_end_date: '2026-11-08', p_feature: 'ai_workspace' },
  });
});

test('all-features reports pass a null feature filter', async () => {
  let reportRequest;
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({ isFounder: true, captureReport: (request) => { reportRequest = request; } }),
  });
  const response = await handler({
    httpMethod: 'POST',
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer analytics-test-token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-10', end_date: '2026-11-08', feature: null }),
  });
  assert.equal(response.statusCode, 200);
  assert.equal(reportRequest.args.p_feature, null);
});

test('rejects invalid date filters before querying Supabase', async () => {
  let queried = false;
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({ isFounder: true, captureReport: () => { queried = true; } }),
  });
  const response = await handler({
    httpMethod: 'POST',
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer analytics-test-token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-02-30', end_date: '2026-03-01' }),
  });
  assert.equal(response.statusCode, 400);
  assert.equal(queried, false);
});

test('reports query failures as database unavailability without exposing internals', async () => {
  const handler = createAnalyticsHandler({
    env: { SUPABASE_URL: 'url', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' },
    createClient: mockClients({
      isFounder: true,
      reportResponse: { data: null, error: { code: '08006', message: 'database connection failed' } },
    }),
  });
  const response = await handler({
    httpMethod: 'POST',
    path: '/.netlify/functions/analytics',
    headers: { authorization: 'Bearer analytics-test-token' },
    body: JSON.stringify({ action: 'report', start_date: '2026-10-10', end_date: '2026-11-08', feature: null }),
  });
  assert.equal(response.statusCode, 503);
  assert.equal(JSON.parse(response.body).error, 'analytics_database_unavailable');
  assert.equal(JSON.parse(response.body).message.includes('database connection failed'), false);
});
