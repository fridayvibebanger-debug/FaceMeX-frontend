import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path: string, options: RequestInit = {}) {
  let authHeader: Record<string, string> = {};

  if (typeof window !== 'undefined') {
    // 1️⃣ Get token
    const token = window.localStorage.getItem('faceme_token');
    if (token) authHeader.Authorization = `Bearer ${token}`;
    else if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (accessToken) authHeader.Authorization = `Bearer ${accessToken}`;
      } catch {}
    }

    // 2️⃣ Get user info
    let userId = window.localStorage.getItem('facemex_user_id') || window.localStorage.getItem('faceme_user_id');
    let userTier =
      window.localStorage.getItem('facemex_user_tier') ||
      window.localStorage.getItem('faceme_user_tier');
    let userName = window.localStorage.getItem('faceme_user_name') || window.localStorage.getItem('facemex_user_name');

    // 3️⃣ Fallback to Supabase session
    if ((!userId || !userName) && isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        const u = data.session?.user;
        if (u) {
          if (!userId) userId = u.id;
          if (!userName) {
            userName = String((u.user_metadata as any)?.full_name || u.email || '').trim();
          }
        }
      } catch {}
    }

    // 3️⃣b Fallback: derive identity from Authorization JWT payload (works even if session fetch fails)
    if (!userName) {
      try {
        const raw = String(authHeader.Authorization || '').trim();
        const token = raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : '';
        const payloadB64 = token.split('.')[1];
        if (payloadB64) {
          const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
          const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
          const payloadJson = atob(padded);
          const payload = JSON.parse(payloadJson);
          const fullName = String(payload?.user_metadata?.full_name || '').trim();
          const email = String(payload?.email || '').trim();
          userName = fullName || email;
          if (userName) {
            try {
              window.localStorage.setItem('faceme_user_name', userName);
            } catch {}
          }
        }
      } catch {}
    }

    // 4️⃣ Set headers (only when available)
    if (userId) authHeader['x-user-id'] = userId;
    if (userName) authHeader['x-user-name'] = userName;
    if (userTier) authHeader['x-user-tier'] = userTier;
  }

  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeader, ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    try {
      const data = await res.json();
      throw new Error(JSON.stringify(data));
    } catch {
      const msg = await res.text().catch(() => '');
      const fallback = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;
      throw new Error((msg || '').trim() || fallback);
    }
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) =>
    request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: any) =>
    request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};