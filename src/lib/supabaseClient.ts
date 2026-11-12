import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the build environment.');
}

let client: SupabaseClient<any> | undefined;

export function getSupabaseClient(): SupabaseClient<any> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  client ||= createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

export const supabase: SupabaseClient<any> = new Proxy({} as SupabaseClient<any>, {
  get(_target, property) {
    const sharedClient = getSupabaseClient();
    const value = Reflect.get(sharedClient, property, sharedClient);
    return typeof value === 'function' ? value.bind(sharedClient) : value;
  },
});
