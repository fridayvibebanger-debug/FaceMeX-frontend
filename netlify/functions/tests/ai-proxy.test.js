import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handler } from '../functions/ai-proxy.js';

function createEvent(path, body = {
  messages: [{ role: 'user', content: 'Hello' }],
  task: 'workspace_assistant',
}) {
  return {
    httpMethod: 'POST',
    path,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-session-token',
      cookie: 'session=test-session',
    },
    body: JSON.stringify(body),
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

test('pro job assistant and workspace routes both reach the shared AI backend', async () => {
  const originalFetch = globalThis.fetch;
  const forwardedUrls = [];
  globalThis.fetch = async (url) => {
    forwardedUrls.push(String(url));
    return new Response(JSON.stringify({ success: true, response: 'Workspace answer.' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const proResult = await handler(createEvent('/.netlify/functions/ai-proxy/pro/job-assistant'));
    const workspaceResult = await handler(createEvent('/.netlify/functions/ai-proxy/workspace'));

    assert.equal(proResult.statusCode, 200);
    assert.equal(workspaceResult.statusCode, 200);
    assert.deepEqual(forwardedUrls, [
      'https://facemex-backend-4akg.onrender.com/api/ai/pro/job-assistant',
      'https://facemex-backend-4akg.onrender.com/api/ai/workspace',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('workspace rejects invalid PDF chat before forwarding to the AI backend', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response('{}', { status: 200 });
  };

  try {
    const result = await handler(createEvent('/.netlify/functions/ai-proxy/workspace', {
      feature: 'pdf_chat',
      messages: [{ role: 'user', content: 'Summarize this document.' }],
      attachments: [],
    }));

    assert.equal(result.statusCode, 400);
    assert.equal(JSON.parse(result.body).error, 'invalid_pdf');
    assert.equal(fetchCalled, false);
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
