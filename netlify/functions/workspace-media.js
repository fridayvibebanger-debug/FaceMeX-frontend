import { createClient } from '@supabase/supabase-js';
import { searchWorkspaceImageResults } from './workspace-images.js';

const VIDEO_THUMBNAIL_HOST = 'i.ytimg.com';

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

function parseBody(event) {
  if (!event.body) return {};
  if (event.body.length > 4_000) throw new Error('request_too_large');
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    throw new Error('invalid_json');
  }
}

function validQuery(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 220
    ? value.trim()
    : '';
}

function getBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || '';
  return String(authorization).match(/^Bearer\s+(\S+)$/i)?.[1] || '';
}

function formatDuration(value) {
  const match = String(value || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return '';
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function durationInSeconds(value) {
  const match = String(value || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

async function searchVideos(query, apiKey, fetchImpl) {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', '10');
  searchUrl.searchParams.set('safeSearch', 'strict');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('key', apiKey);
  const searchResponse = await fetchImpl(searchUrl, { signal: AbortSignal.timeout(8_000) });
  if (!searchResponse.ok) throw new Error(`youtube_search_http_${searchResponse.status}`);
  const searchData = await searchResponse.json();
  const candidates = (Array.isArray(searchData?.items) ? searchData.items : [])
    .filter((item) => /^[A-Za-z0-9_-]{11}$/.test(item?.id?.videoId || ''));
  if (!candidates.length) return [];

  const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  detailsUrl.searchParams.set('part', 'contentDetails,status');
  detailsUrl.searchParams.set('id', candidates.map((item) => item.id.videoId).join(','));
  detailsUrl.searchParams.set('key', apiKey);
  const detailsResponse = await fetchImpl(detailsUrl, { signal: AbortSignal.timeout(8_000) });
  if (!detailsResponse.ok) throw new Error(`youtube_details_http_${detailsResponse.status}`);
  const detailsData = await detailsResponse.json();
  const detailsById = new Map((Array.isArray(detailsData?.items) ? detailsData.items : [])
    .filter((item) => item?.status?.privacyStatus === 'public' && item?.status?.embeddable)
    .map((item) => [item.id, item]));

  const videos = [];
  const seen = new Set();
  for (const item of candidates) {
    const videoId = item.id.videoId;
    const details = detailsById.get(videoId);
    if (!details || seen.has(videoId)) continue;
    const title = String(item.snippet?.title || '').trim();
    const channelTitle = String(item.snippet?.channelTitle || '').trim();
    const thumbnail = item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url;
    try {
      if (
        !title ||
        /\bshorts?\b/i.test(title) ||
        durationInSeconds(details.contentDetails?.duration) < 60 ||
        new URL(thumbnail).hostname !== VIDEO_THUMBNAIL_HOST
      ) continue;
    } catch {
      continue;
    }
    seen.add(videoId);
    videos.push({
      id: videoId,
      title: title.slice(0, 300),
      channelTitle: channelTitle.slice(0, 150),
      duration: formatDuration(details.contentDetails?.duration),
      thumbnail,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      relevance: `Selected from YouTube results for “${query.slice(0, 120)}”.`,
    });
    if (videos.length === 2) break;
  }
  return videos;
}

export function createWorkspaceMediaHandler({
  env = process.env,
  fetchImpl = fetch,
  createClientFn = createClient,
} = {}) {
  return async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

    let body;
    try {
      body = parseBody(event);
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === 'request_too_large';
      return json(tooLarge ? 413 : 400, { error: tooLarge ? 'request_too_large' : 'invalid_json' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json(400, { error: 'invalid_json' });
    }
    if (
      (body.imageQuery !== undefined && body.imageQuery !== '' && !validQuery(body.imageQuery)) ||
      (body.videoQuery !== undefined && body.videoQuery !== '' && !validQuery(body.videoQuery))
    ) {
      return json(400, { error: 'invalid_search_query' });
    }

    const imageQuery = validQuery(body.imageQuery);
    const videoQuery = validQuery(body.videoQuery);
    if (!imageQuery && !videoQuery) {
      return json(200, { images: [], videos: [], imageSearchAvailable: false, videoSearchAvailable: false });
    }

    const youtubeKey = env.YOUTUBE_API_KEY;
    const videoSearchAvailable = Boolean(youtubeKey);
    const imageSearchAvailable = Boolean(env.UNSPLASH_ACCESS_KEY);
    if (!videoSearchAvailable && !imageSearchAvailable) {
      return json(200, { images: [], videos: [], imageSearchAvailable, videoSearchAvailable });
    }

    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    const accessToken = getBearerToken(event.headers);
    if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
      return json(401, { error: 'unauthorized' });
    }

    try {
      const verifier = createClientFn(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await verifier.auth.getUser(accessToken);
      if (error || !data?.user) return json(401, { error: 'unauthorized' });
    } catch (error) {
      console.error('Workspace media authentication check failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      return json(503, { error: 'authentication_unavailable' });
    }

    const [imageResult, videoResult] = await Promise.allSettled([
      imageSearchAvailable && imageQuery
        ? searchWorkspaceImageResults(imageQuery, env, fetchImpl)
        : Promise.resolve([]),
      videoSearchAvailable && videoQuery
        ? searchVideos(videoQuery, youtubeKey, fetchImpl)
        : Promise.resolve([]),
    ]);
    if (imageResult.status === 'rejected') {
      console.error('Workspace optional image search failed', {
        errorName: imageResult.reason instanceof Error ? imageResult.reason.name : 'UnknownError',
      });
    }
    if (videoResult.status === 'rejected') {
      console.error('Workspace video search failed', {
        errorName: videoResult.reason instanceof Error ? videoResult.reason.name : 'UnknownError',
      });
    }
    const images = imageResult.status === 'fulfilled' ? imageResult.value : [];
    const videos = videoResult.status === 'fulfilled' ? videoResult.value : [];
    return json(200, {
      images: images.map((image) => ({
        id: image.photoUrl,
        url: image.url,
        alt: image.alt,
        attribution: image.photographerName,
        attributionUrl: image.photographerProfileUrl,
        photoUrl: image.photoUrl,
      })),
      videos: videos.slice(0, 2),
      imageSearchAvailable,
      videoSearchAvailable,
    });
  };
}

export const handler = createWorkspaceMediaHandler();
