import { createClient } from '@supabase/supabase-js';

const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
const IMAGE_HOST = 'images.unsplash.com';
const UNSPLASH_HOST = 'unsplash.com';
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const QUERY_MAX_LENGTH = 160;
const responseCache = new Map();
const inFlightSearches = new Map();

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function getQuery(event) {
  const query = event.queryStringParameters?.query;
  if (typeof query !== 'string') return '';
  const normalized = query.replace(/\s+/g, ' ').trim();
  if (
    normalized.length < 2 ||
    normalized.length > QUERY_MAX_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) return '';
  return normalized;
}

function getBearerToken(headers = {}) {
  const authorization = headers.authorization || headers.Authorization || '';
  return String(authorization).match(/^Bearer\s+(\S+)$/i)?.[1] || '';
}

function trustedUrl(value, host) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === host && !url.username && !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}

function addAttributionParameters(value, host) {
  const url = trustedUrl(value, host);
  if (!url) return null;
  url.searchParams.set('utm_source', 'facemexsocial');
  url.searchParams.set('utm_medium', 'referral');
  return url.toString();
}

function normalizePhoto(photo) {
  const imageUrl = trustedUrl(photo?.urls?.regular, IMAGE_HOST);
  const photographerProfileUrl = addAttributionParameters(photo?.user?.links?.html, UNSPLASH_HOST);
  const photoUrl = addAttributionParameters(photo?.links?.html, UNSPLASH_HOST);
  const photographerName = typeof photo?.user?.name === 'string' ? photo.user.name.trim().slice(0, 120) : '';
  const alt = typeof photo?.alt_description === 'string' && photo.alt_description.trim()
    ? photo.alt_description.trim().slice(0, 240)
    : typeof photo?.description === 'string' && photo.description.trim()
      ? photo.description.trim().slice(0, 240)
      : '';

  if (!imageUrl || !photographerProfileUrl || !photoUrl || !photographerName) return null;
  return {
    url: imageUrl.toString(),
    alt,
    photographerName,
    photographerProfileUrl,
    photoUrl,
  };
}

function cacheResult(key, images, now) {
  responseCache.delete(key);
  responseCache.set(key, { images, expiresAt: now + CACHE_TTL_MS });
  while (responseCache.size > CACHE_MAX_ENTRIES) {
    responseCache.delete(responseCache.keys().next().value);
  }
}

async function searchUnsplash(query, apiKey, fetchImpl) {
  const endpoint = new URL(UNSPLASH_API_URL);
  endpoint.searchParams.set('query', query);
  endpoint.searchParams.set('per_page', '3');
  endpoint.searchParams.set('content_filter', 'high');

  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Client-ID ${apiKey}`,
      'Accept-Version': 'v1',
    },
    signal: AbortSignal.timeout(7_000),
  });

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get('retry-after');
    const rawRetryAfter = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
    const retryAfter = Number.isFinite(rawRetryAfter)
      ? Math.max(1, Math.min(Math.floor(rawRetryAfter), 300))
      : 60;
    const error = new Error('unsplash_rate_limited');
    error.retryAfter = retryAfter;
    throw error;
  }
  if (!response.ok) throw new Error(`unsplash_http_${response.status}`);

  const data = await response.json();
  const seen = new Set();
  return (Array.isArray(data?.results) ? data.results : [])
    .map(normalizePhoto)
    .filter((photo) => {
      if (!photo || seen.has(photo.photoUrl)) return false;
      seen.add(photo.photoUrl);
      return true;
    })
    .slice(0, 3);
}

async function getCachedSearch(query, apiKey, fetchImpl, now = Date.now()) {
  const cacheKey = query.toLocaleLowerCase();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.images;
  if (cached) responseCache.delete(cacheKey);

  const pending = inFlightSearches.get(cacheKey);
  if (pending) return pending;

  const request = searchUnsplash(query, apiKey, fetchImpl)
    .then((images) => {
      cacheResult(cacheKey, images, Date.now());
      return images;
    })
    .finally(() => inFlightSearches.delete(cacheKey));
  inFlightSearches.set(cacheKey, request);
  return request;
}

export async function searchWorkspaceImageResults(query, env = process.env, fetchImpl = fetch) {
  const normalizedQuery = String(query || '').replace(/\s+/g, ' ').trim();
  if (normalizedQuery.length < 2 || normalizedQuery.length > QUERY_MAX_LENGTH) return [];
  const accessKey = env.UNSPLASH_ACCESS_KEY;
  if (typeof accessKey !== 'string' || !accessKey.trim()) return [];
  return getCachedSearch(normalizedQuery, accessKey.trim(), fetchImpl);
}

export function createWorkspaceImagesHandler({
  env = process.env,
  fetchImpl = fetch,
  createClientFn = createClient,
} = {}) {
  return async (event) => {
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'method_not_allowed' }, { Allow: 'GET' });
    }

    const query = getQuery(event);
    if (!query) return json(400, { error: 'invalid_search_query' });

    if (typeof env.UNSPLASH_ACCESS_KEY !== 'string' || !env.UNSPLASH_ACCESS_KEY.trim()) {
      return json(200, { images: [], available: false });
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
      console.error('Workspace image-search authentication failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      return json(503, { error: 'authentication_unavailable' });
    }

    try {
      const images = await searchWorkspaceImageResults(query, env, fetchImpl);
      return json(200, { images, available: true });
    } catch (error) {
      const rateLimited = error instanceof Error && error.message === 'unsplash_rate_limited';
      if (!rateLimited) {
        console.error('Workspace Unsplash search failed', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
          status: error instanceof Error && /^unsplash_http_\d+$/.test(error.message)
            ? error.message.slice('unsplash_http_'.length)
            : undefined,
        });
      }
      return json(
        rateLimited ? 429 : 502,
        { error: rateLimited ? 'image_search_rate_limited' : 'image_search_unavailable' },
        rateLimited ? { 'Retry-After': String(error.retryAfter || 60) } : {},
      );
    }
  };
}

export const handler = createWorkspaceImagesHandler();
