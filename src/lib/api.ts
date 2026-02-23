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

    // 4️⃣ Force defaults if still missing
    if (!userId) userId = 'unknown-user';
    if (!userName) userName = 'Unknown User';
    if (!userTier) userTier = 'free';

    // 5️⃣ Set headers
    authHeader['x-user-id'] = userId;
    authHeader['x-user-name'] = userName;
    authHeader['x-user-tier'] = userTier;

    // Optional: log headers to confirm
    // console.log('Request headers:', authHeader);
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