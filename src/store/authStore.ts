import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/api';

let authListenerInitialized = false;

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  tier?: string;
  addons?: { verified?: boolean };
  mode?: 'social' | 'professional';
  bio?: string;
  coverPhoto?: string;
  followers?: number;
  following?: number;
  isVerified?: boolean;
  interests?: string[];
  pronouns?: string;
  mood?: string;
  location?: string;
  website?: string;
  joinedDate?: Date;
  isFollowing?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  login: async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('supabase_not_configured');
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
        throw new Error('invalid_credentials');
      }
      if (msg.toLowerCase().includes('not found')) {
        throw new Error('account_not_found');
      }
      throw new Error(`login_failed:${msg}`);
    }

    const supaUser = data.user;
    if (!supaUser) {
      throw new Error('login_failed');
    }

    const profile: User = {
      id: supaUser.id,
      email: supaUser.email || email,
      name: (supaUser.user_metadata as any)?.full_name || email.split('@')[0] || 'FaceMe User',
      phone: (supaUser.user_metadata as any)?.phone,
      avatar: (supaUser.user_metadata as any)?.avatar_url,
      followers: 0,
      following: 0,
      joinedDate: new Date(supaUser.created_at),
    };

    set({ user: profile, isAuthenticated: true });

    try {
      localStorage.setItem('faceme_user_id', String(profile.id));
      localStorage.setItem('faceme_user_name', String(profile.name || ''));
    } catch {}

    try {
      const me = await api.get('/api/users/me');
      set((state) => ({
        user: state.user ? { ...state.user, ...me } : state.user,
      }));
    } catch {}
  },
  register: async (name: string, email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('supabase_not_configured');
    }
    const baseUrl = import.meta.env.BASE_URL || '/';
    const emailRedirectTo = new URL(baseUrl, window.location.origin).toString();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo,
      },
    });

    if (error) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('exists')) {
        throw new Error('email_in_use');
      }
      throw new Error(`register_failed:${msg}`);
    }

    const supaUser = data.user;
    if (!supaUser) {
      // In some configs, Supabase may require email confirmation and not return a session
      throw new Error('register_failed');
    }

    const profile: User = {
      id: supaUser.id,
      email: supaUser.email || email,
      name,
      avatar: (supaUser.user_metadata as any)?.avatar_url,
      followers: 0,
      following: 0,
      joinedDate: new Date(supaUser.created_at),
    };

    set({ user: profile, isAuthenticated: true });

    try {
      localStorage.setItem('faceme_user_id', String(profile.id));
      localStorage.setItem('faceme_user_name', String(profile.name || ''));
    } catch {}

    try {
      const me = await api.get('/api/users/me');
      set((state) => ({
        user: state.user ? { ...state.user, ...me } : state.user,
      }));
    } catch {}
  },
  logout: () => {
    supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
    try {
      localStorage.removeItem('faceme_user_id');
      localStorage.removeItem('faceme_user_name');
      localStorage.removeItem('faceme_token');
    } catch {}
  },
  restoreSession: async () => {
    if (get().isInitialized) return;

    if (!isSupabaseConfigured) {
      set({ user: null, isAuthenticated: false, isInitialized: true });
      return;
    }

    if (!authListenerInitialized) {
      authListenerInitialized = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        const supaUser = session?.user;
        if (!supaUser) {
          set({ user: null, isAuthenticated: false, isInitialized: true });
          return;
        }
        const profile: User = {
          id: supaUser.id,
          email: supaUser.email || '',
          name: (supaUser.user_metadata as any)?.full_name || supaUser.email || 'FaceMe User',
          phone: (supaUser.user_metadata as any)?.phone,
          avatar: (supaUser.user_metadata as any)?.avatar_url,
          followers: 0,
          following: 0,
          joinedDate: new Date(supaUser.created_at),
        };

        set({ user: profile, isAuthenticated: true, isInitialized: true });
        try {
          localStorage.setItem('faceme_user_id', String(profile.id));
          localStorage.setItem('faceme_user_name', String(profile.name || ''));
        } catch {}
        (async () => {
          try {
            const me = await api.get('/api/users/me');
            set((state) => ({
              user: state.user ? { ...state.user, ...me } : state.user,
            }));
          } catch {}
        })();
      });
    }

    const { data, error } = await supabase.auth.getSession();
    const session = data?.session;
    const supaUser = session?.user;
    if (error || !supaUser) {
      set({ user: null, isAuthenticated: false, isInitialized: true });
      return;
    }

    const profile: User = {
      id: supaUser.id,
      email: supaUser.email || '',
      name: (supaUser.user_metadata as any)?.full_name || supaUser.email || 'FaceMe User',
      phone: (supaUser.user_metadata as any)?.phone,
      avatar: (supaUser.user_metadata as any)?.avatar_url,
      followers: 0,
      following: 0,
      joinedDate: new Date(supaUser.created_at),
    };

    set({ user: profile, isAuthenticated: true, isInitialized: true });

    try {
      localStorage.setItem('faceme_user_id', String(profile.id));
      localStorage.setItem('faceme_user_name', String(profile.name || ''));
    } catch {}

    try {
      const me = await api.get('/api/users/me');
      set((state) => ({
        user: state.user ? { ...state.user, ...me } : state.user,
      }));
    } catch {}
  },
  updateProfile: (updates: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));

    (async () => {
      try {
        const me = await api.patch('/api/users/me', updates);
        set((state) => ({
          user: state.user ? { ...state.user, ...me } : null,
        }));
      } catch {
        // keep optimistic local updates
      }
    })();
  },
  followUser: (userId: string) => {
    set((state) => ({
      user: state.user ? { ...state.user, following: state.user.following + 1 } : null,
    }));
  },
  unfollowUser: (userId: string) => {
    set((state) => ({
      user: state.user ? { ...state.user, following: state.user.following - 1 } : null,
    }));
  },
}));