import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handler } from './ai-proxy.js';

function createEvent(path) {
  return {
    httpMethod: 'POST',
    path,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-session-token',
      cookie: 'session=test-session',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Hello' }],
      task: 'workspace_assistant',
    }),
    isBase64Encoded: false,
  };
}

test('reply route forwards auth and returns the backend JSON response', async () => {
  const originalFetch = globalThis.fetch;
  let forwardedRequest;
  globalThis.fetch = async (url, options) => {
    forwardedRequest = { url: String(url), options };
    return new Response(
      JSON.stringify({
        success: true,
        provider: 'gemini',
        response: 'Hello from FaceMeX AI.',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    const result = await handler(createEvent('/.netlify/functions/ai-proxy/reply'));

    assert.equal(result.statusCode, 200);
    assert.equal(
      forwardedRequest.url,
      'https://facemex-backend-4akg.onrender.com/api/ai/reply',
    );
    assert.equal(forwardedRequest.options.method, 'POST');
    assert.equal(
      forwardedRequest.options.headers.get('authorization'),
      'Bearer test-session-token',
    );
    assert.equal(forwardedRequest.options.headers.get('cookie'), 'session=test-session');
    assert.equal(
      JSON.parse(forwardedRequest.options.body).task,
      'workspace_assistant',
    );
    assert.deepEqual(JSON.parse(result.body), {
      success: true,
      provider: 'gemini',
      response: 'Hello from FaceMeX AI.',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('non-JSON backend responses are not returned as successful AI replies', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>Not found</html>', {
    status: 404,
    headers: { 'content-type': 'text/html' },
  });

  try {
    const result = await handler(createEvent('/.netlify/functions/ai-proxy/reply'));

    assert.equal(result.statusCode, 502);
    assert.deepEqual(JSON.parse(result.body), {
      error: 'ai_backend_invalid_response',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
