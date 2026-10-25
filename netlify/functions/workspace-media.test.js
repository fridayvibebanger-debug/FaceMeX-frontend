import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWorkspaceMediaHandler } from './workspace-media.js';

function createEvent(body) {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  };
}

const configuredEnv = {
  YOUTUBE_API_KEY: 'server-youtube-key',
  UNSPLASH_ACCESS_KEY: 'server-unsplash-key',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'public-anon-key',
};

function verifiedClient() {
  return { auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) } };
}

test('keeps the existing Workspace media request connected to the Unsplash search', async () => {
  let upstreamUrl;
  const handler = createWorkspaceMediaHandler({
    env: configuredEnv,
    createClientFn: verifiedClient,
    fetchImpl: async (url) => {
      upstreamUrl = new URL(url);
      return new Response(JSON.stringify({
        results: [{
          id: 'workspace-image',
          urls: { regular: 'https://images.unsplash.com/photo-workspace' },
          alt_description: 'Delivery bicycle',
          user: {
            name: 'FaceMe Photographer',
            links: { html: 'https://unsplash.com/@faceme' },
          },
          links: { html: 'https://unsplash.com/photos/workspace-image' },
        }],
      }), { status: 200 });
    },
  });
  const response = await handler(createEvent({ imageQuery: 'delivery bicycle' }));
  const result = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(upstreamUrl.searchParams.get('per_page'), '3');
  assert.equal(result.images.length, 1);
  assert.equal(result.images[0].alt, 'Delivery bicycle');
  assert.equal(result.images[0].attribution, 'FaceMe Photographer');
  assert.match(result.images[0].attributionUrl, /utm_source=facemexsocial/);
  assert.match(result.images[0].photoUrl, /utm_medium=referral/);
});

test('returns no videos when the optional YouTube credential is missing', async () => {
  const handler = createWorkspaceMediaHandler({ env: {} });
  const response = await handler(createEvent({ videoQuery: 'solar lesson' }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    videos: [],
    videoSearchAvailable: false,
  });
});

test('rejects invalid and unauthenticated requests before searching', async () => {
  const handler = createWorkspaceMediaHandler({ env: configuredEnv, createClientFn: verifiedClient });
  const invalid = await handler(createEvent({ videoQuery: 'x'.repeat(221) }));
  assert.equal(invalid.statusCode, 400);

  const unauthorized = await handler({
    ...createEvent({ videoQuery: 'solar lesson' }),
    headers: {},
  });
  assert.equal(unauthorized.statusCode, 401);
});

test('returns only verified, distinct, public videos without image-provider calls', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    if (parsed.pathname.endsWith('/search')) {
      return new Response(JSON.stringify({
        items: [
          { id: { videoId: 'abcdefghijk' }, snippet: { title: 'Solar lesson', channelTitle: 'Science', thumbnails: { high: { url: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg' } } } },
          { id: { videoId: 'lmnopqrstuv' }, snippet: { title: 'Solar guide', channelTitle: 'Learning', thumbnails: { high: { url: 'https://i.ytimg.com/vi/lmnopqrstuv/hqdefault.jpg' } } } },
          { id: { videoId: 'abcdefghijk' }, snippet: { title: 'Duplicate', channelTitle: 'Science', thumbnails: { high: { url: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg' } } } },
        ],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      items: [
        { id: 'abcdefghijk', status: { privacyStatus: 'public', embeddable: true }, contentDetails: { duration: 'PT5M30S' } },
        { id: 'lmnopqrstuv', status: { privacyStatus: 'public', embeddable: true }, contentDetails: { duration: 'PT1H2M3S' } },
      ],
    }), { status: 200 });
  };
  const handler = createWorkspaceMediaHandler({
    env: configuredEnv,
    fetchImpl,
    createClientFn: verifiedClient,
  });
  const response = await handler(createEvent({ videoQuery: 'solar lesson' }));
  const result = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(result.videos.length, 2);
  assert.deepEqual(result.videos.map((video) => video.duration), ['5:30', '1:02:03']);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((url) => url.searchParams.get('key') !== 'server-youtube-key' || url.hostname === 'www.googleapis.com'));
});

test('video-provider failures do not break the optional media request', async () => {
  const handler = createWorkspaceMediaHandler({
    env: configuredEnv,
    createClientFn: verifiedClient,
    fetchImpl: async () => new Response('Unavailable', { status: 503 }),
  });
  const response = await handler(createEvent({ videoQuery: 'solar lesson' }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).videos, []);
});

test('does not present a partial YouTube result as a two-video recommendation', async () => {
  const handler = createWorkspaceMediaHandler({
    env: configuredEnv,
    createClientFn: verifiedClient,
    fetchImpl: async (url) => new URL(url).pathname.endsWith('/search')
      ? new Response(JSON.stringify({
        items: [{
          id: { videoId: 'abcdefghijk' },
          snippet: {
            title: 'Solar lesson',
            channelTitle: 'Science',
            thumbnails: { high: { url: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg' } },
          },
        }],
      }), { status: 200 })
      : new Response(JSON.stringify({
        items: [{
          id: 'abcdefghijk',
          status: { privacyStatus: 'public', embeddable: true },
          contentDetails: { duration: 'PT5M' },
        }],
      }), { status: 200 }),
  });
  const response = await handler(createEvent({ videoQuery: 'solar lesson' }));
  assert.deepEqual(JSON.parse(response.body).videos, []);
});
