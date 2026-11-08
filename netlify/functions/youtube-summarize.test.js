import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createYouTubeSummarizeHandler,
  extractYouTubeVideoId,
} from './youtube-summarize.js';

const configuredEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'public-anon-key',
  OPENAI_API_KEY: 'server-only-key',
};

function createEvent({ authorization = 'Bearer valid-session', url = 'https://youtu.be/abcdefghijk' } = {}) {
  return {
    httpMethod: 'POST',
    headers: { authorization },
    body: JSON.stringify({ url }),
  };
}

function createVerifier(valid = true) {
  return () => ({
    auth: {
      getUser: async () => valid
        ? { data: { user: { id: 'user-123' } }, error: null }
        : { data: { user: null }, error: new Error('invalid token') },
    },
  });
}

test('extracts video IDs only from valid HTTPS YouTube links', () => {
  assert.equal(extractYouTubeVideoId('https://youtu.be/abcdefghijk'), 'abcdefghijk');
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v=abcdefghijk'), 'abcdefghijk');
  assert.equal(extractYouTubeVideoId('https://youtube.com/shorts/abcdefghijk'), 'abcdefghijk');
  assert.equal(extractYouTubeVideoId('http://youtube.com/watch?v=abcdefghijk'), null);
  assert.equal(extractYouTubeVideoId('https://example.com/watch?v=abcdefghijk'), null);
  assert.equal(extractYouTubeVideoId('https://youtube.com/watch?v=short'), null);
});

test('requires a verified signed-in user before calling video or AI providers', async () => {
  let providerCalls = 0;
  const handler = createYouTubeSummarizeHandler({
    env: configuredEnv,
    createClientFn: createVerifier(false),
    fetchImpl: async () => {
      providerCalls += 1;
      throw new Error('Provider should not be called.');
    },
  });

  const response = await handler(createEvent());
  assert.equal(response.statusCode, 401);
  assert.equal(providerCalls, 0);
});

test('accepts the workspace URL request, summarizes public video metadata and returns the canonical URL', async () => {
  const requestedUrls = [];
  const handler = createYouTubeSummarizeHandler({
    env: configuredEnv,
    createClientFn: createVerifier(),
    fetchImpl: async (url, options) => {
      requestedUrls.push(String(url));
      if (String(url).startsWith('https://www.youtube.com/oembed')) {
        return new Response(JSON.stringify({
          title: 'A lesson on photosynthesis',
          author_name: 'Science Teacher',
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer server-only-key');
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'This context summary is based on the video title and channel.' } }],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });

  const response = await handler(createEvent());
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    ok: true,
    summary: 'This context summary is based on the video title and channel.',
    watchUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  });
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[1], /^https:\/\/api\.openai\.com\/v1\/chat\/completions$/);
});

test('rejects non-YouTube links without calling external providers', async () => {
  let providerCalls = 0;
  const handler = createYouTubeSummarizeHandler({
    env: configuredEnv,
    createClientFn: createVerifier(),
    fetchImpl: async () => {
      providerCalls += 1;
      throw new Error('Provider should not be called.');
    },
  });

  const response = await handler(createEvent({ url: 'https://example.com/video' }));
  assert.equal(response.statusCode, 400);
  assert.equal(JSON.parse(response.body).error, 'invalid_youtube_url');
  assert.equal(providerCalls, 0);
});
