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

async function getProfileFromSupabase(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, name, username, avatar_url, avatar, bio, cover_photo, location, website'
    )
    .eq('id', userId)
    .maybeSingle();

  return data;
}

function buildUserFromSupabaseUser(supaUser: any, profile?: any): User {
  const email = supaUser.email || profile?.email || '';

  const realName =
    profile?.full_name ||
    profile?.name ||
    profile?.username ||
    supaUser.user_metadata?.full_name ||
    supaUser.user_metadata?.name ||
    email.split('@')[0] ||
    'FaceMeX user';

  const realAvatar =
    profile?.avatar_url ||
    profile?.avatar ||
    supaUser.user_metadata?.avatar_url ||
    '';

  return {
    id: supaUser.id,
    email,
    name: realName,
    phone: supaUser.user_metadata?.phone,
    avatar: realAvatar,
    bio: profile?.bio || '',
    coverPhoto: profile?.cover_photo || '',
    location: profile?.location || '',
    website: profile?.website || '',
    followers: 0,
    following: 0,
    joinedDate: new Date(supaUser.created_at),
  };
}

async function saveLocalProfileCache(profile: User) {
  try {
    localStorage.setItem('faceme_user_id', String(profile.id));
    localStorage.setItem('faceme_user_name', String(profile.name || ''));
    localStorage.setItem('faceme_user_avatar', String(profile.avatar || ''));
  } catch {
    // ignore localStorage errors
  }
}

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

      if (
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('credentials')
      ) {
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

    const profileData = await getProfileFromSupabase(supaUser.id);
    const profile = buildUserFromSupabaseUser(supaUser, profileData);

    set({
      user: profile,
      isAuthenticated: true,
      isInitialized: true,
    });

    await saveLocalProfileCache(profile);

    try {
      await useUserStore.getState().loadMe();
    } catch {
      // ignore user store sync error
    }

    try {
      const me = await api.get('/api/users/me');

      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              ...me,
              avatar:
                profile.avatar ||
                me.avatar ||
                state.user.avatar ||
                '',
              name:
                profile.name ||
                me.name ||
                state.user.name ||
                'FaceMeX user',
            }
          : state.user,
      }));
    } catch {
      // Supabase profile is source of truth
    }
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
          username: name,
        },
        emailRedirectTo,
      },
    });

    if (error) {
      const msg = error.message || '';

      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('exists')
      ) {
        throw new Error('email_in_use');
      }

      throw new Error(`register_failed:${msg}`);
    }

    const supaUser = data.user;

    if (!supaUser) {
      throw new Error('register_failed');
    }

    await supabase.from('profiles').upsert({
      id: supaUser.id,
      email: supaUser.email || email,
      full_name: name,
      name,
      username: name,
      avatar_url: null,
      avatar: null,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    const profileData = await getProfileFromSupabase(supaUser.id);
    const profile = buildUserFromSupabaseUser(supaUser, profileData);

    set({
      user: profile,
      isAuthenticated: true,
      isInitialized: true,
    });

    await saveLocalProfileCache(profile);

    try {
      await useUserStore.getState().loadMe();
    } catch {
      // ignore user store sync error
    }

    try {
      const me = await api.get('/api/users/me');

      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              ...me,
              avatar:
                profile.avatar ||
                me.avatar ||
                state.user.avatar ||
                '',
              name:
                profile.name ||
                me.name ||
                state.user.name ||
                'FaceMeX user',
            }
          : state.user,
      }));
    } catch {
      // Supabase profile is source of truth
    }
  },

  logout: () => {
    supabase.auth.signOut();

    set({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
    });

    try {
      const nextMode =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('faceme_mode') as any)) === 'professional'
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
    } catch {
      // ignore user store reset error
    }

    try {
      localStorage.removeItem('faceme_user_id');
      localStorage.removeItem('faceme_user_name');
      localStorage.removeItem('faceme_user_avatar');
      localStorage.removeItem('faceme_token');
    } catch {
      // ignore localStorage errors
    }
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

      supabase.auth.onAuthStateChange((_event, session) => {
        const supaUser = session?.user;

        if (!supaUser) {
          set({
            user: null,
            isAuthenticated: false,
            isInitialized: true,
          });
          return;
        }

        (async () => {
          const profileData = await getProfileFromSupabase(supaUser.id);
          const profile = buildUserFromSupabaseUser(supaUser, profileData);

          set({
            user: profile,
            isAuthenticated: true,
            isInitialized: true,
          });

          await saveLocalProfileCache(profile);

          try {
            await useUserStore.getState().loadMe();
          } catch {
            // ignore user store sync error
          }

          try {
            const me = await api.get('/api/users/me');

            set((state) => ({
              user: state.user
                ? {
                    ...state.user,
                    ...me,
                    avatar:
                      profile.avatar ||
                      me.avatar ||
                      state.user.avatar ||
                      '',
                    name:
                      profile.name ||
                      me.name ||
                      state.user.name ||
                      'FaceMeX user',
                  }
                : state.user,
            }));
          } catch {
            // Supabase profile is source of truth
          }
        })();
      });
    }

    const { data, error } = await supabase.auth.getSession();
    const session = data?.session;
    const supaUser = session?.user;

    if (error || !supaUser) {
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
      });
      return;
    }

    const profileData = await getProfileFromSupabase(supaUser.id);
    const profile = buildUserFromSupabaseUser(supaUser, profileData);

    set({
      user: profile,
      isAuthenticated: true,
      isInitialized: true,
    });

    await saveLocalProfileCache(profile);

    try {
      await useUserStore.getState().loadMe();
    } catch {
      // ignore user store sync error
    }

    try {
      const me = await api.get('/api/users/me');

      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              ...me,
              avatar:
                profile.avatar ||
                me.avatar ||
                state.user.avatar ||
                '',
              name:
                profile.name ||
                me.name ||
                state.user.name ||
                'FaceMeX user',
            }
          : state.user,
      }));
    } catch {
      // Supabase profile is source of truth
    }
  },

  updateProfile: (updates: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));

    (async () => {
      const currentUser = get().user;

      if (!currentUser?.id) return;

      try {
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: updates.name || currentUser.name || 'FaceMeX user',
          name: updates.name || currentUser.name || 'FaceMeX user',
          username: updates.name || currentUser.name || 'facemex_user',
          avatar_url: updates.avatar || currentUser.avatar || '',
          avatar: updates.avatar || currentUser.avatar || '',
          bio: updates.bio ?? currentUser.bio ?? '',
          cover_photo: updates.coverPhoto ?? currentUser.coverPhoto ?? '',
          location: updates.location ?? currentUser.location ?? '',
          website: updates.website ?? currentUser.website ?? '',
          is_active: true,
          updated_at: new Date().toISOString(),
        });

        const freshProfile = await getProfileFromSupabase(currentUser.id);

        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                name:
                  freshProfile?.full_name ||
                  freshProfile?.name ||
                  freshProfile?.username ||
                  state.user.name,
                avatar:
                  freshProfile?.avatar_url ||
                  freshProfile?.avatar ||
                  state.user.avatar ||
                  '',
                bio: freshProfile?.bio ?? state.user.bio,
                coverPhoto:
                  freshProfile?.cover_photo ?? state.user.coverPhoto,
                location: freshProfile?.location ?? state.user.location,
                website: freshProfile?.website ?? state.user.website,
              }
            : null,
        }));

        const latestUser = get().user;

        if (latestUser) {
          await saveLocalProfileCache(latestUser);
        }

        try {
          await api.patch('/api/users/me', {
            ...updates,
            avatar:
              freshProfile?.avatar_url ||
              freshProfile?.avatar ||
              updates.avatar ||
              currentUser.avatar ||
              '',
          });
        } catch {
          // Supabase profile is source of truth
        }

        try {
          await useUserStore.getState().loadMe();
        } catch {
          // ignore user store sync error
        }
      } catch {
        // keep optimistic local updates
      }
    })();
  },

  followUser: (_userId: string) => {
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            following: (state.user.following || 0) + 1,
          }
        : null,
    }));
  },

  unfollowUser: (_userId: string) => {
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            following: Math.max(0, (state.user.following || 0) - 1),
          }
        : null,
    }));
  },
}));
