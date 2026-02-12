import { create } from 'zustand';
import { api } from '@/lib/api';

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
    const { token, user } = await api.post('/api/auth/login', { email, password });
    if (!token || !user?.id) {
      throw new Error('login_failed');
    }

    try {
      window.localStorage.setItem('faceme_token', String(token));
      window.localStorage.setItem('faceme_user_id', String(user.id));
      if (user.tier) window.localStorage.setItem('faceme_user_tier', String(user.tier));
    } catch {}

    set({ user, isAuthenticated: true, isInitialized: true });
  },
  register: async (name: string, email: string, password: string) => {
    const { token, user } = await api.post('/api/auth/register', { name, email, password });
    if (!token || !user?.id) {
      throw new Error('register_failed');
    }

    try {
      window.localStorage.setItem('faceme_token', String(token));
      window.localStorage.setItem('faceme_user_id', String(user.id));
      if (user.tier) window.localStorage.setItem('faceme_user_tier', String(user.tier));
    } catch {}

    set({ user, isAuthenticated: true, isInitialized: true });
  },
  logout: () => {
    try {
      window.localStorage.removeItem('faceme_token');
    } catch {}
    set({ user: null, isAuthenticated: false, isInitialized: true });
  },
  restoreSession: async () => {
    if (get().isInitialized) return;
    let token = '';
    try {
      token = window.localStorage.getItem('faceme_token') || '';
    } catch {}
    if (!token) {
      set({ user: null, isAuthenticated: false, isInitialized: true });
      return;
    }

    try {
      const me = await api.get('/api/auth/me');
      set({ user: me, isAuthenticated: true, isInitialized: true });
    } catch {
      try {
        window.localStorage.removeItem('faceme_token');
      } catch {}
      set({ user: null, isAuthenticated: false, isInitialized: true });
    }
  },
  updateProfile: (updates: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));
  },
  followUser: (userId: string) => {
    set((state) => ({
      user: state.user ? { ...state.user, following: (state.user.following || 0) + 1 } : null,
    }));
  },
  unfollowUser: (userId: string) => {
    set((state) => ({
      user: state.user ? { ...state.user, following: Math.max(0, (state.user.following || 0) - 1) } : null,
    }));
  },
}));
