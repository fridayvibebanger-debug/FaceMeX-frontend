import { createClient } from '@supabase/supabase-js';
import { searchWorkspaceImageResults } from './workspace-images.js';

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
    if (body.imageQuery !== undefined && body.imageQuery !== '' && !validQuery(body.imageQuery)) {
      return json(400, { error: 'invalid_search_query' });
    }

    const imageQuery = validQuery(body.imageQuery);
    if (!imageQuery) {
      return json(200, { images: [], videos: [], imageSearchAvailable: false, videoSearchAvailable: false });
    }

    const imageSearchAvailable = Boolean(env.UNSPLASH_ACCESS_KEY);
    if (!imageSearchAvailable) {
      return json(200, { images: [], videos: [], imageSearchAvailable, videoSearchAvailable: false });
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

    let images;
    try {
      images = await searchWorkspaceImageResults(imageQuery, env, fetchImpl);
    } catch (error) {
      console.error('Workspace optional image search failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      images = [];
    }
    return json(200, {
      images: images.map((image) => ({
        id: image.photoUrl,
        url: image.url,
        alt: image.alt,
        attribution: image.photographerName,
        attributionUrl: image.photographerProfileUrl,
        photoUrl: image.photoUrl,
      })),
      videos: [],
      imageSearchAvailable,
      videoSearchAvailable: false,
    });
  };
}

export const handler = createWorkspaceMediaHandler();
