import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://facemex-backend-4akg.onrender.com';

type AnyRecord = Record<string, any>;

function clean(value: any) {
  return String(value || '').trim();
}

function buildUrl(path: string) {
  const base = API_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function normalizeBearerToken(token: string) {
  const cleaned = clean(token);

  if (!cleaned) return '';

  if (cleaned.toLowerCase().startsWith('bearer ')) {
    return cleaned.slice(7).trim();
  }

  return cleaned;
}

function readLocalStorage(keys: string[]) {
  if (typeof window === 'undefined') return '';

  for (const key of keys) {
    try {
      const value = window.localStorage.getItem(key);

      if (value && value.trim()) {
        return value.trim();
      }
    } catch {}
  }

  return '';
}

function parseJwtPayload(token: string): AnyRecord | null {
  try {
    const cleanToken = normalizeBearerToken(token);
    const payloadB64 = cleanToken.split('.')[1];

    if (!payloadB64) return null;

    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

async function getSupabaseSessionData() {
  if (!isSupabaseConfigured) {
    return {
      accessToken: '',
      userId: '',
      userName: '',
      userEmail: '',
      userTier: '',
    };
  }

  try {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const user = session?.user;

    if (!session || !user) {
      return {
        accessToken: '',
        userId: '',
        userName: '',
        userEmail: '',
        userTier: '',
      };
    }

    const meta = (user.user_metadata || {}) as AnyRecord;

    return {
      accessToken: session.access_token || '',
      userId: user.id || '',
      userName: clean(meta.full_name || meta.name || user.email),
      userEmail: user.email || '',
      userTier: clean(meta.tier || meta.plan || ''),
    };
  } catch {
    return {
      accessToken: '',
      userId: '',
      userName: '',
      userEmail: '',
      userTier: '',
    };
  }
}

async function buildAuthHeaders() {
  const headers: Record<string, string> = {};

  if (typeof window === 'undefined') {
    return headers;
  }

  const supabaseSession = await getSupabaseSessionData();

  const storedToken = readLocalStorage([
    'faceme_token',
    'facemex_token',
    'token',
    'authToken',
    'accessToken',
    'jwt',
  ]);

  const token = normalizeBearerToken(storedToken || supabaseSession.accessToken);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const jwtPayload = parseJwtPayload(token) || {};

  let userId =
    readLocalStorage([
      'facemex_user_id',
      'faceme_user_id',
      'userId',
      'user_id',
    ]) ||
    supabaseSession.userId ||
    clean(jwtPayload.sub || jwtPayload.user_id || jwtPayload.id);

  let userName =
    readLocalStorage([
      'faceme_user_name',
      'facemex_user_name',
      'userName',
      'name',
    ]) ||
    supabaseSession.userName ||
    clean(
      jwtPayload?.user_metadata?.full_name ||
        jwtPayload?.user_metadata?.name ||
        jwtPayload?.name ||
        jwtPayload?.email
    );

  let userEmail =
    readLocalStorage([
      'faceme_user_email',
      'facemex_user_email',
      'userEmail',
      'email',
    ]) ||
    supabaseSession.userEmail ||
    clean(jwtPayload.email);

  let userTier =
    readLocalStorage([
      'facemex_user_tier',
      'faceme_user_tier',
      'userTier',
      'tier',
      'plan',
    ]) ||
    supabaseSession.userTier ||
    clean(
      jwtPayload?.user_metadata?.tier ||
        jwtPayload?.user_metadata?.plan ||
        jwtPayload?.tier ||
        jwtPayload?.plan
    );

  if (userId) {
    headers['x-user-id'] = userId;

    try {
      window.localStorage.setItem('faceme_user_id', userId);
      window.localStorage.setItem('facemex_user_id', userId);
    } catch {}
  }

  if (userName) {
    headers['x-user-name'] = userName;

    try {
      window.localStorage.setItem('faceme_user_name', userName);
      window.localStorage.setItem('facemex_user_name', userName);
    } catch {}
  }

  if (userEmail) {
    headers['x-user-email'] = userEmail;

    try {
      window.localStorage.setItem('faceme_user_email', userEmail);
      window.localStorage.setItem('facemex_user_email', userEmail);
    } catch {}
  }

  if (userTier) {
    headers['x-user-tier'] = userTier;

    try {
      window.localStorage.setItem('faceme_user_tier', userTier);
      window.localStorage.setItem('facemex_user_tier', userTier);
    } catch {}
  }

  return headers;
}

async function parseResponse(res: Response) {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const authHeaders = await buildAuthHeaders();

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  const baseHeaders: Record<string, string> = isFormData
    ? {}
    : {
        'Content-Type': 'application/json',
      };

  const mergedHeaders = {
    ...baseHeaders,
    ...authHeaders,
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(buildUrl(path), {
    ...options,
    credentials: 'include',
    headers: mergedHeaders,
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    const message =
      typeof data === 'object' && data
        ? data.message ||
          data.error ||
          data.details ||
          `HTTP ${res.status}`
        : clean(data) || `HTTP ${res.status}`;

    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path: string) =>
    request(path, {
      method: 'GET',
    }),

  post: (path: string, body?: any) =>
    request(path, {
      method: 'POST',
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    }),

  put: (path: string, body?: any) =>
    request(path, {
      method: 'PUT',
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    }),

  patch: (path: string, body?: any) =>
    request(path, {
      method: 'PATCH',
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    }),

  delete: (path: string) =>
    request(path, {
      method: 'DELETE',
    }),
};
