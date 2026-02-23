import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

export const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path: string, options: RequestInit = {}) {
  let authHeader: Record<string, string> = {};

  if (typeof window !== 'undefined') {
    // 1️⃣ Get token from localStorage or Supabase
    const token = window.localStorage.getItem('faceme_token');
    if (token) {
      authHeader.Authorization = `Bearer ${token}`;
    } else if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (accessToken) authHeader.Authorization = `Bearer ${accessToken}`;
      } catch {}
    }

    // 2️⃣ Get user info from localStorage or Supabase
    let userId = window.localStorage.getItem('facemex_user_id') || window.localStorage.getItem('faceme_user_id');
    let userTier =
      window.localStorage.getItem('facemex_user_tier') ||
      window.localStorage.getItem('faceme_user_tier');
    let userName = window.localStorage.getItem('faceme_user_name') || window.localStorage.getItem('facemex_user_name');

    // Fallback to Supabase session if missing
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

    // 3️⃣ Fallback for DEV mode
    if (import.meta.env.DEV) {
      if (!userId) userId = 'dev-user-1';
      if (!userName) userName = 'Dev User';
      if (!userTier) userTier = 'dev';
    }

    // 4️⃣ Add headers if values exist
    if (userId) authHeader['x-user-id'] = userId;
    if (userTier) authHeader['x-user-tier'] = userTier;
    if (userName) authHeader['x-user-name'] = userName;

    // Optional: log headers for debugging
    // console.log('Request headers:', authHeader);
  }

  // 5️⃣ Make the request
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeader, ...(options.headers || {}) },
    ...options,
  });

  // 6️⃣ Handle errors
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

// 7️⃣ API helper
export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) =>
    request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: any) =>
    request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};