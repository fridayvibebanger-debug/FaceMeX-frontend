import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/api';
import { useUserStore } from '@/store/userStore';

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

const buildProfile = (supaUser: any, fallbackName?: string): User => ({
  id: supaUser.id,
  email: supaUser.email || '',
  name:
    supaUser.user_metadata?.full_name ||
    supaUser.user_metadata?.name ||
    fallbackName ||
    supaUser.email?.split('@')[0] ||
    'FaceMe User',
  phone: supaUser.user_metadata?.phone,
  avatar: supaUser.user_metadata?.avatar_url || '',
  followers: 0,
  following: 0,
  joinedDate: new Date(supaUser.created_at || Date.now()),
});

const upsertUserProfile = async (supaUser: any, fallbackName?: string) => {
  if (!supaUser) return;

  const name =
    supaUser.user_metadata?.full_name ||
    supaUser.user_metadata?.name ||
    fallbackName ||
    supaUser.email?.split('@')[0] ||
    'FaceMe User';

  const { error } = await supabase.from('profiles').upsert({
    id: supaUser.id,
    email: supaUser.email || '',
    name,
    avatar: supaUser.user_metadata?.avatar_url || '',
    is_active: true,
  });

  if (error) {
    console.error('Failed to save user profile:', error);
  }
};

const saveLocalUser = (profile: User) => {
  try {
    localStorage.setItem('faceme_user_id', String(profile.id));
    localStorage.setItem('faceme_user_name', String(profile.name || ''));
  } catch {}
};

const loadBackendUser = async (set: any) => {
  try {
    const me = await Promise.race([
      api.get('/api/users/me'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('backend_timeout')), 3000)
      ),
    ]);

    set((state: AuthState) => ({
      user: state.user ? { ...state.user, ...(me as any) } : state.user,
    }));
  } catch {
    // backend failed or timeout — keep Supabase user logged in
  }

  try {
    await Promise.race([
      useUserStore.getState().loadMe(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('userstore_timeout')), 3000)
      ),
    ]);
  } catch {
    // userStore failed or timeout — do not block login
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  login: async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('supabase_not_configured');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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

    await upsertUserProfile(supaUser);

    const profile = buildProfile(supaUser, email.split('@')[0]);

    set({
      user: profile,
      isAuthenticated: true,
      isInitialized: true,
    });

    saveLocalUser(profile);
    await loadBackendUser(set);
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
        data: {
          full_name: name,
          name,
        },
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
      throw new Error('register_failed');
    }

    await upsertUserProfile(supaUser, name);

    const profile = buildProfile(supaUser, name);

    set({
      user: profile,
      isAuthenticated: true,
      isInitialized: true,
    });

    saveLocalUser(profile);
    await loadBackendUser(set);
  },

  logout: () => {
    supabase.auth.signOut();

    set({
      user: null,
      isAuthenticated: false,
    });

    try {
      const nextMode =
        (typeof window !== 'undefined' && (localStorage.getItem('faceme_mode') as any)) === 'professional'
          ? 'professional'
          : 'social';

      useUserStore.setState({
        id: '',
        name: '',
        avatar: '',
        tier: 'free',
        addons: { verified: false },
        mode: nextMode,
        loading: false,
        professional: undefined,
      } as any);
    } catch {}

    try {
      localStorage.removeItem('faceme_user_id');
      localStorage.removeItem('faceme_user_name');
      localStorage.removeItem('faceme_token');
    } catch {}
  },

  restoreSession: async () => {
    if (get().isInitialized) return;

    if (!isSupabaseConfigured) {
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
      });
      return;
    }

    if (!authListenerInitialized) {
      authListenerInitialized = true;

      supabase.auth.onAuthStateChange(async (_event, session) => {
        const supaUser = session?.user;

        if (!supaUser) {
          set({
            user: null,
            isAuthenticated: false,
            isInitialized: true,
          });
          return;
        }

        await upsertUserProfile(supaUser);

        const profile = buildProfile(supaUser);

        set({
          user: profile,
          isAuthenticated: true,
          isInitialized: true,
        });

        saveLocalUser(profile);
        await loadBackendUser(set);
      });
    }

    const { data, error } = await supabase.auth.getSession();
    const supaUser = data?.session?.user;

    if (error || !supaUser) {
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
      });
      return;
    }

    await upsertUserProfile(supaUser);

    const profile = buildProfile(supaUser);

    set({
      user: profile,
      isAuthenticated: true,
      isInitialized: true,
    });

    saveLocalUser(profile);
    await loadBackendUser(set);
  },

  updateProfile: (updates: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));

    (async () => {
      try {
        const currentUser = get().user;

        if (currentUser) {
          await supabase.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            full_name: updates.name || currentUser.name,
            username: currentUser.email?.split('@')[0] || 'user',
            avatar_url: updates.avatar || currentUser.avatar || '',
            bio: updates.bio || currentUser.bio || '',
            is_active: true,
          });
        }

        api.patch('/api/users/me', updates).catch(() => {});
      } catch {
        // keep optimistic local updates
      }
    })();
  },

  followUser: (userId: string) => {
    const currentUser = get().user;
    if (!currentUser?.id) return;

    (async () => {
      try {
        await supabase.from('follows').upsert({
          follower_id: currentUser.id,
          following_id: userId,
        });
      } catch {}
    })();

    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            following: (state.user.following || 0) + 1,
          }
        : null,
    }));
  },

  unfollowUser: (userId: string) => {
    const currentUser = get().user;
    if (!currentUser?.id) return;

    (async () => {
      try {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);
      } catch {}
    })();

    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            following: Math.max(
              0,
              (state.user.following || 0) - 1
            ),
          }
        : null,
    }));
  },
}));
