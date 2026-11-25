import { create } from 'zustand';
import { api } from '@/lib/api';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';
import { isTierAtLeast, resolveSubscriptionTier } from '@/lib/subscriptionEntitlements.js';
import type { SubscriptionProfile } from '@/lib/subscriptionEntitlements.js';

export type Tier = 'free' | 'plus' | 'pro' | 'creator' | 'business' | 'exclusive';

interface UserState {
  id: string;
  name: string;
  avatar: string;
  tier: Tier;
  addons: { verified: boolean };
  mode: 'social' | 'professional';
  professional?: {
    headline?: string;
    bio?: string;
    location?: string;
    skills?: string[];
    careerGoals?: string;
    industryInterests?: string[];
    experienceLevel?: 'student' | 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive' | 'career_switcher' | '';
    smartSummary?: string;
    smartPositioning?: string;
    smartSuggestedSkills?: string[];
    experience?: Array<{ role: string; company: string; start?: string; end?: string; summary?: string; verified?: boolean }>;
    education?: Array<{ institution: string; degree?: string; field?: string; start?: string; end?: string; verified?: boolean }>;
    links?: Array<{ type: string; url: string }>;
    endorsements?: Record<string, number>;
    openToCollab?: boolean;
    collabNote?: string;
    resumeSummary?: string;
  };
  loading: boolean;
  loadMe: () => Promise<void>;
  hasTier: (min: Tier) => boolean;
  upgradeDev: (tier: Tier) => Promise<void>;
  setVerifiedDev: (v: boolean) => Promise<void>;
  resetDev: () => Promise<void>;
  setMode: (m: 'social' | 'professional') => Promise<void>;
  saveProfessional: (profile: UserState['professional']) => Promise<void>;
  endorseSkill: (skill: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  id: '',
  name: '',
  avatar: '',
  tier: 'free',
  addons: { verified: false },
  mode: (typeof window !== 'undefined' && (localStorage.getItem('faceme_mode') as any)) === 'professional' ? 'professional' : 'social',
  loading: false,
  loadMe: async () => {
    set({ loading: true });
    let me: Record<string, any> | null = null;
    let authUser: { id: string; email?: string; user_metadata?: Record<string, any> } | null = null;
    let profile: SubscriptionProfile | null = null;

    try {
      try {
        me = await api.get('/api/users/me');
      } catch {
        me = null;
      }

      if (isSupabaseConfigured) {
        try {
          const { data: authData, error: authError } = await getSupabaseClient().auth.getUser();
          if (authError) throw authError;
          authUser = authData.user;

          if (authUser) {
            const { data: profileData, error: profileError } = await getSupabaseClient()
              .from('profiles')
              .select('tier,is_pro,is_active,subscription_status,subscription_plan,membership,subscription_tier,subscription_expires_at,display_name,avatar_url,professional')
              .eq('id', authUser.id)
              .maybeSingle();
            if (profileError) throw profileError;
            profile = profileData as SubscriptionProfile | null;
          }
        } catch (error) {
          const code = error && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : 'profile_load_failed';
          console.error('FaceMeX could not load the authenticated subscription profile', { code });
        }
      }

      const profileName = profile?.display_name || authUser?.user_metadata?.full_name;
      const profileAvatar = profile?.avatar_url || authUser?.user_metadata?.avatar_url;
      const resolvedTier = resolveSubscriptionTier(profile, me?.tier || 'free');
      const resolvedName = profileName || me?.name || authUser?.email?.split('@')[0] || '';

      set({
        id: authUser?.id || me?.id || '',
        name: resolvedName,
        avatar: profileAvatar || me?.avatar || '',
        tier: resolvedTier,
        addons: me?.addons || { verified: false },
        mode: me?.mode === 'professional' ? 'professional' : 'social',
        professional: profile?.professional || me?.professional || {
          headline: '',
          bio: '',
          location: '',
          skills: [],
          careerGoals: '',
          industryInterests: [],
          experienceLevel: '',
          smartSummary: '',
          smartPositioning: '',
          smartSuggestedSkills: [],
          experience: [],
          education: [],
          links: [],
          endorsements: {},
          openToCollab: false,
          collabNote: '',
          resumeSummary: '',
        },
      });
      try {
        localStorage.setItem('faceme_mode', me?.mode === 'professional' ? 'professional' : 'social');
        if (authUser?.id || me?.id) {
          const userId = String(authUser?.id || me?.id);
          localStorage.setItem('faceme_user_id', userId);
          localStorage.setItem('facemex_user_id', userId);
        }
        localStorage.setItem('faceme_user_name', resolvedName);
      } catch {}
    } finally {
      set({ loading: false });
    }
  },
  hasTier: (min: Tier) => {
    return isTierAtLeast(get().tier, min);
  },
  upgradeDev: async (tier: Tier) => {
    await api.post('/api/billing/dev/upgrade', { tier });
    await get().loadMe();
  },
  setVerifiedDev: async (v: boolean) => {
    await api.post('/api/billing/dev/addon', { verified: v });
    await get().loadMe();
  },
  resetDev: async () => {
    await api.post('/api/billing/dev/reset', {});
    await get().loadMe();
  },
  setMode: async (m: 'social' | 'professional') => {
    try { localStorage.setItem('faceme_mode', m) } catch {}
    // Optimistically update local state so UI responds immediately
    set({ mode: m });
    try {
      await api.patch('/api/users/me', { mode: m });
    } catch {
      // If API fails, keep local mode but don't crash the app
    }
  },
  saveProfessional: async (profile) => {
    try {
      await api.patch('/api/users/me/professional', { professional: profile });
      await get().loadMe();
      return;
    } catch {
      // Production/dist fallback: persist directly to Supabase profiles table
      if (isSupabaseConfigured && !import.meta.env.DEV) {
        try {
          const { data } = await getSupabaseClient().auth.getSession();
          const u = data.session?.user;
          if (u) {
            await getSupabaseClient()
              .from('profiles')
              .update({ professional: profile as any })
              .eq('id', u.id);
            await get().loadMe();
            return;
          }
        } catch {
        }
      }
      throw new Error('save_professional_failed');
    }
  },
  endorseSkill: async (skill: string) => {
    await api.post('/api/users/me/endorse', { skill });
    await get().loadMe();
  },
}));
