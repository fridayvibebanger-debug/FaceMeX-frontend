import { createClient } from '@supabase/supabase-js';

const SAFE_PROPERTIES = new Set([
  'intent',
  'image_count',
  'has_images',
  'tier',
  'auto_job_search',
  'batch_size',
  'total_jobs',
  'category',
  'source',
  'answer_length',
]);
const EVENT_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const SAFE_VALUE_PATTERN = /^[\w:/ -]{0,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OWNER_EMAIL = 'luckymawasha72@gmail.com';

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

function getBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || '';
  return String(authorization).match(/^Bearer\s+(\S+)$/i)?.[1] || '';
}

function parseBody(event) {
  if (!event.body) return {};
  if (event.body.length > 8_000) throw new Error('request_too_large');
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    throw new Error('invalid_json');
  }
}

function safeString(value, maxLength = 64) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length <= maxLength && SAFE_VALUE_PATTERN.test(normalized) ? normalized : null;
}

function deriveOutcome(eventName, outcome) {
  if (['success', 'failure', 'started'].includes(outcome)) return outcome;
  if (/(?:_failed|_failure|_error)$/.test(eventName)) return 'failure';
  if (/(?:_started)$/.test(eventName)) return 'started';
  if (/(?:_succeeded|_success|_generated|_exported|_completed)$/.test(eventName)) return 'success';
  return null;
}

function deriveErrorCategory(eventName, requestedCategory) {
  const allowed = new Set(['network', 'permission', 'validation', 'provider', 'server', 'unknown']);
  if (allowed.has(requestedCategory)) return requestedCategory;
  if (!/(?:_failed|_failure|_error)$/.test(eventName)) return null;
  if (/permission|denied/i.test(eventName)) return 'permission';
  if (/network|connection|timeout/i.test(eventName)) return 'network';
  if (/invalid|validation/i.test(eventName)) return 'validation';
  if (/provider|ai/i.test(eventName)) return 'provider';
  return 'unknown';
}

export function sanitizeAnalyticsEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const eventName = input.event_name;
  const eventId = input.event_id;
  if (typeof eventName !== 'string' || !EVENT_NAME_PATTERN.test(eventName)) return null;
  if (typeof eventId !== 'string' || !UUID_PATTERN.test(eventId)) return null;

  const route = typeof input.route === 'string' &&
    input.route.startsWith('/') &&
    input.route.length <= 180 &&
    /^\/[\w/:-]*$/.test(input.route)
    ? input.route
    : null;
  const deviceCategory = ['mobile', 'desktop', 'tablet'].includes(input.device_category)
    ? input.device_category
    : null;
  if (!deviceCategory) return null;

  const properties = {};
  if (input.properties && typeof input.properties === 'object' && !Array.isArray(input.properties)) {
    for (const [key, value] of Object.entries(input.properties)) {
      if (!SAFE_PROPERTIES.has(key)) continue;
      if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
        properties[key] = value;
      } else {
        const safeValue = safeString(value);
        if (safeValue !== null) properties[key] = safeValue;
      }
    }
  }

  const durationMs = Number.isInteger(input.duration_ms) && input.duration_ms >= 0 && input.duration_ms <= 3_600_000
    ? input.duration_ms
    : null;
  const outcome = deriveOutcome(eventName, input.outcome);

  return {
    event_id: eventId,
    event_name: eventName,
    feature: safeString(input.feature, 48),
    button_id: safeString(input.button_id, 64),
    action: safeString(input.action, 64),
    route,
    device_category: deviceCategory,
    outcome,
    error_category: deriveErrorCategory(eventName, input.error_category),
    duration_ms: durationMs,
    app_version: safeString(input.app_version, 32),
    properties,
  };
}

function isValidDate(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().startsWith(value);
}

export function createAnalyticsHandler({
  env = process.env,
  createClient: createClientFn = createClient,
} = {}) {
  return async (event) => {
    const requestId = crypto.randomUUID();
    const route = event.path || '/.netlify/functions/analytics';
    let action = 'unknown';

    try {
      const body = parseBody(event);
      action = body.action;
      if (!['track', 'report'].includes(action)) {
        return json(400, { error: 'invalid_action', message: 'This analytics action is not supported.' });
      }

      const accessToken = getBearerToken(event.headers);
      if (!accessToken) {
        return json(401, { error: 'unauthorized', message: 'Sign in to use FaceMeX analytics.' });
      }
      const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
      const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
      const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        console.error('FaceMeX analytics configuration is incomplete', {
          route,
          request_id: requestId,
          missing: [
            !supabaseUrl && 'SUPABASE_URL',
            !anonKey && 'SUPABASE_ANON_KEY',
            !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
          ].filter(Boolean),
        });
        return json(503, { error: 'analytics_not_configured', message: 'Analytics is temporarily unavailable.' });
      }

      const verifier = createClientFn(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: authData, error: authError } = await verifier.auth.getUser(accessToken);
      if (authError || !authData.user) {
        return json(401, { error: 'unauthorized', message: 'Your FaceMeX sign-in has expired. Sign in again.' });
      }

      const admin = createClientFn(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      if (action === 'track') {
        const safeEvent = sanitizeAnalyticsEvent(body.event);
        if (!safeEvent) {
          return json(400, { error: 'invalid_event', message: 'This analytics event is not valid.' });
        }
        const { error } = await admin
          .from('facemex_product_events')
          .upsert({
            ...safeEvent,
            user_id: authData.user.id,
          }, { onConflict: 'event_id', ignoreDuplicates: true });
        if (error) throw error;
        return json(202, { accepted: true });
      }

      if (String(authData.user.email || '').toLowerCase() !== OWNER_EMAIL) {
        return json(403, { error: 'founder_only', message: 'Founder access is required to view analytics.' });
      }

      const { start_date: startDate, end_date: endDate, feature } = body;
      if (
        !isValidDate(startDate) ||
        !isValidDate(endDate) ||
        startDate > endDate ||
        (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) / 86_400_000 > 365 ||
        (feature !== null && feature !== undefined && safeString(feature, 48) === null)
      ) {
        return json(400, { error: 'invalid_report_range', message: 'Choose a valid date range of up to one year.' });
      }
      const { data, error } = await admin.rpc('facemex_analytics_report', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_feature: feature || null,
      });
      if (error) throw error;
      return json(200, { report: data });
    } catch (error) {
      if (error instanceof Error && ['request_too_large', 'invalid_json'].includes(error.message)) {
        return json(error.message === 'request_too_large' ? 413 : 400, {
          error: error.message,
          message: 'The analytics request could not be read.',
        });
      }
      console.error('FaceMeX analytics function request failed', {
        route,
        action,
        request_id: requestId,
        error_code: error && typeof error === 'object' && 'code' in error ? error.code : 'analytics_request_failed',
      });
      return json(500, { error: 'analytics_request_failed', message: 'Analytics is temporarily unavailable.' });
    }
  };
}

export const handler = createAnalyticsHandler();
