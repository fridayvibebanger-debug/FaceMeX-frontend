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

function clean(value: any) {
  return String(value || '').trim();
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
    supaUser.user_metadata?.avatar ||
    '';

  const tier =
    supaUser.user_metadata?.tier ||
    supaUser.user_metadata?.plan ||
    'free';

  return {
    id: supaUser.id,
    email,
    name: realName,
    phone: supaUser.user_metadata?.phone || '',
    avatar: realAvatar,
    bio: profile?.bio || '',
    coverPhoto: profile?.cover_photo || '',
    location: profile?.location || '',
    website: profile?.website || '',
    tier,
    addons: {
      verified: Boolean(
        supaUser.user_metadata?.verified ||
          supaUser.user_metadata?.userVerified ||
          supaUser.user_metadata?.addons?.verified
      ),
    },
    followers: 0,
    following: 0,
    joinedDate: supaUser.created_at ? new Date(supaUser.created_at) : new Date(),
  };
}

function mergeUser(current: User, incoming: Partial<User>): User {
  return {
    ...current,
    ...incoming,
    id: incoming.id || current.id,
    name: incoming.name || current.name || 'FaceMeX user',
    email: incoming.email || current.email || '',
    avatar: incoming.avatar || current.avatar || '',
    tier: incoming.tier || current.tier || 'free',
    addons: incoming.addons || current.addons || { verified: false },
  };
}

async function saveAuthCache(profile: User, accessToken?: string) {
  try {
    if (accessToken) {
      localStorage.setItem('faceme_token', accessToken);
      localStorage.setItem('facemex_token', accessToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('token', accessToken);
    }

    localStorage.setItem('faceme_user_id', String(profile.id || ''));
    localStorage.setItem('facemex_user_id', String(profile.id || ''));

    localStorage.setItem('faceme_user_name', String(profile.name || ''));
    localStorage.setItem('facemex_user_name', String(profile.name || ''));

    localStorage.setItem('faceme_user_email', String(profile.email || ''));
    localStorage.setItem('facemex_user_email', String(profile.email || ''));

    localStorage.setItem('faceme_user_avatar', String(profile.avatar || ''));
    localStorage.setItem('facemex_user_avatar', String(profile.avatar || ''));

    localStorage.setItem('faceme_user_tier', String(profile.tier || 'free'));
    localStorage.setItem('facemex_user_tier', String(profile.tier || 'free'));
  } catch {
    // ignore localStorage errors
  }
}

function clearAuthCache() {
  try {
    [
      'faceme_token',
      'facemex_token',
      'accessToken',
      'authToken',
      'token',
      'jwt',
      'faceme_user_id',
      'facemex_user_id',
      'faceme_user_name',
      'facemex_user_name',
      'faceme_user_email',
      'facemex_user_email',
      'faceme_user_avatar',
      'facemex_user_avatar',
      'faceme_user_tier',
      'facemex_user_tier',
    ].forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore localStorage errors
  }
}

async function syncUserStoreFallback(profile: User) {
  try {
    useUserStore.setState({
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar || '',
      tier: profile.tier || 'free',
      addons: profile.addons || { verified: false },
      loading: false,
    } as any);
  } catch {
    // ignore user store fallback error
  }
}

function createFastSessionUser(supaUser: any, accessToken?: string) {
  const profile = buildUserFromSupabaseUser(supaUser);

  saveAuthCache(profile, accessToken).catch(() => {});
  syncUserStoreFallback(profile).catch(() => {});

  return profile;
}

function syncUserInBackground(set: any, profile: User, supaUser?: any) {
  const run = async () => {
    let latestProfile = profile;

    try {
      if (supaUser?.id) {
        const profileData = await getProfileFromSupabase(supaUser.id);
        const supabaseProfile = buildUserFromSupabaseUser(supaUser, profileData);

        latestProfile = mergeUser(profile, supabaseProfile);

        await saveAuthCache(latestProfile);

        set((state: AuthState) => ({
          user: state.user ? mergeUser(state.user, latestProfile) : state.user,
        }));

        await syncUserStoreFallback(latestProfile);
      }
    } catch {
      // keep fast profile
    }

    try {
      await useUserStore.getState().loadMe();
    } catch {
      // ignore user store sync error
    }

    try {
      const me = await api.get('/api/users/me');

      set((state: AuthState) => ({
        user: state.user
          ? mergeUser(state.user, {
              ...me,
              id: latestProfile.id || me.id || state.user.id,
              avatar:
                latestProfile.avatar ||
                me.avatar ||
                state.user.avatar ||
                '',
              name:
                latestProfile.name ||
                me.name ||
                state.user.name ||
                'FaceMeX user',
              email:
                latestProfile.email ||
                me.email ||
                state.user.email ||
                '',
              tier:
                me.tier ||
                latestProfile.tier ||
                state.user.tier ||
                'free',
              addons:
                me.addons ||
                latestProfile.addons ||
                state.user.addons ||
                { verified: false },
            })
          : state.user,
      }));
    } catch {
      // Supabase profile is still enough for login session
    }
  };

  if (typeof window !== 'undefined') {
    window.setTimeout(run, 250);
  } else {
    run().catch(() => {});
  }
}

function upsertRegisterProfileInBackground(supaUser: any, name: string, email: string) {
  const run = async () => {
    try {
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
    } catch {
      // ignore profile upsert error
    }
  };

  if (typeof window !== 'undefined') {
    window.setTimeout(run, 50);
  } else {
    run().catch(() => {});
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
    const accessToken = data.session?.access_token || '';

    if (!supaUser) {
      throw new Error('login_failed');
    }

    const profile = createFastSessionUser(supaUser, accessToken);

    set({
      user: profile,
      isAuthenticated: true,
      isInitialized: true,
    });

    syncUserInBackground(set, profile, supaUser);
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
          tier: 'free',
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
    const accessToken = data.session?.access_token || '';

    if (!supaUser) {
      throw new Error('register_failed');
    }

    upsertRegisterProfileInBackground(supaUser, name, email);

    const profile = createFastSessionUser(supaUser, accessToken);

    set({
      user: {
        ...profile,
        name: name || profile.name,
        email: email || profile.email,
      },
      isAuthenticated: true,
      isInitialized: true,
    });

    syncUserInBackground(
      set,
      {
        ...profile,
        name: name || profile.name,
        email: email || profile.email,
      },
      supaUser
    );
  },

  logout: () => {
    try {
      supabase.auth.signOut();
    } catch {
      // ignore logout error
    }

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

    clearAuthCache();
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
        const accessToken = session?.access_token || '';

        if (!supaUser) {
          set({
            user: null,
            isAuthenticated: false,
            isInitialized: true,
          });

          clearAuthCache();
          return;
        }

        const profile = createFastSessionUser(supaUser, accessToken);

        set({
          user: profile,
          isAuthenticated: true,
          isInitialized: true,
        });

        syncUserInBackground(set, profile, supaUser);
      });
    }

    const { data, error } = await supabase.auth.getSession();
    const session = data?.session;
    const supaUser = session?.user;
    const accessToken = session?.access_token || '';

    if (error || !supaUser) {
      set({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
      });

      clearAuthCache();
      return;
    }

    const profile = createFastSessionUser(supaUser, accessToken);

    set({
      user: profile,
      isAuthenticated: true,
      isInitialized: true,
    });

    syncUserInBackground(set, profile, supaUser);
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
          const { data } = await supabase.auth.getSession();
          await saveAuthCache(latestUser, data.session?.access_token || '');
          await syncUserStoreFallback(latestUser);
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
