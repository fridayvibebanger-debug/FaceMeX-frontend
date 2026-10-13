const DEFAULT_AI_BACKEND_ORIGIN = 'https://facemex-backend-4akg.onrender.com';
const ALLOWED_AI_BACKEND_ORIGIN = new URL(DEFAULT_AI_BACKEND_ORIGIN).origin;
const AI_BACKEND_URL = new URL(
  process.env.FACEMEX_AI_BACKEND_URL || DEFAULT_AI_BACKEND_ORIGIN
);
if (
  AI_BACKEND_URL.protocol !== 'https:' ||
  AI_BACKEND_URL.origin !== ALLOWED_AI_BACKEND_ORIGIN
) {
  throw new Error(
    'FACEMEX_AI_BACKEND_URL must use the approved FaceMeX backend origin.'
  );
}
const AI_BACKEND_ORIGIN = AI_BACKEND_URL.origin;
const FUNCTION_PATH = '/.netlify/functions/ai-proxy';
const ALLOWED_AI_ROUTES = new Set([
  '/reply',
  '/pro/job-assistant',
  '/pro/resume-builder',
  '/pro/cover-letter',
  '/workspace',
]);
const ALLOWED_ROUTE_PREFIXES = ['/api/ai', FUNCTION_PATH];
const FORWARDED_REQUEST_HEADERS = [
  'authorization',
  'cookie',
  'content-type',
  'x-user-email',
  'x-user-id',
  'x-user-name',
  'x-user-tier',
];

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function resolveAIRoute(path = '') {
  for (const prefix of ALLOWED_ROUTE_PREFIXES) {
    if (!path.startsWith(`${prefix}/`)) continue;

    const route = path.slice(prefix.length);
    return ALLOWED_AI_ROUTES.has(route) ? route : null;
  }

  return null;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const route = resolveAIRoute(event.path);
  if (!route) {
    return json(404, { error: 'ai_route_not_found' });
  }

  const incomingHeaders = Object.fromEntries(
    Object.entries(event.headers || {}).map(([name, value]) => [
      name.toLowerCase(),
      value,
    ])
  );
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      incomingHeaders['content-type'] || ''
    )
  ) {
    return json(415, { error: 'unsupported_media_type' });
  }

  const headers = new Headers();

  FORWARDED_REQUEST_HEADERS.forEach((name) => {
    const value = incomingHeaders[name];
    if (value) headers.set(name, value);
  });

  const requestBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64')
    : event.body || '';
  let body;
  try {
    body = JSON.parse(requestBody.toString());
  } catch {
    return json(400, { error: 'invalid_json_body' });
  }

  try {
    const response = await fetch(
      `${AI_BACKEND_ORIGIN}/api/ai${route}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        redirect: 'manual',
      }
    );
    if (response.status >= 300 && response.status < 400) {
      return json(502, { error: 'ai_backend_redirect_rejected' });
    }

    const responseBody = await response.text();
    const contentType = response.headers.get('content-type') || '';
    if (!/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(contentType)) {
      console.error('FaceMeX AI backend returned a non-JSON response', {
        route,
        status: response.status,
        contentType: contentType || 'unknown',
      });
      return json(502, { error: 'ai_backend_invalid_response' });
    }

    try {
      JSON.parse(responseBody);
    } catch {
      console.error('FaceMeX AI backend returned invalid JSON', {
        route,
        status: response.status,
      });
      return json(502, { error: 'ai_backend_invalid_response' });
    }

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: responseBody,
    };
  } catch (error) {
    console.error('FaceMeX AI proxy request failed', {
      route,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return json(502, { error: 'ai_backend_unavailable' });
  }
};
