import { create } from 'zustand';
import { api } from '@/lib/api';

export type Tier = 'free' | 'pro' | 'creator' | 'business' | 'exclusive';

const order: Record<Tier, number> = {
  free: 0,
  pro: 1,
  creator: 2,
  business: 3,
  exclusive: 4,
};

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
  id: '1',
  name: 'Demo User',
  avatar: '',
  tier: 'free',
  addons: { verified: false },
  mode: (typeof window !== 'undefined' && (localStorage.getItem('faceme_mode') as any)) === 'professional' ? 'professional' : 'social',
  loading: false,
  loadMe: async () => {
    set({ loading: true });
    try {
      const me = await api.get('/api/auth/me');
      set({
        id: me.id || '1',
        name: me.name || 'Demo User',
        avatar: me.avatar || '',
        tier: (me.tier || 'free') as Tier,
        addons: me.addons || { verified: false },
        mode: me.mode === 'professional' ? 'professional' : 'social',
        professional: me.professional || {
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
        localStorage.setItem('faceme_mode', me.mode === 'professional' ? 'professional' : 'social');
        if (me.id) localStorage.setItem('faceme_user_id', String(me.id));
        localStorage.setItem('faceme_user_tier', String(me.tier || 'free'));
      } catch {}
    } catch {
      set({ loading: false });
    } finally {
      set({ loading: false });
    }
  },
  hasTier: (min: Tier) => {
    const t = get().tier;
    return order[t] >= order[min];
  },
  upgradeDev: async (tier: Tier) => {
    // Optimistic update so Pricing/Subscriptions page reflects choice immediately
    set({ tier });
    try {
      await api.post('/api/billing/dev/upgrade', { tier });
      await get().loadMe();
    } catch {
      // If backend fails, leave optimistic tier; user can refresh to resync
    }
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
      throw new Error('save_professional_failed');
    }
  },
  endorseSkill: async (skill: string) => {
    await api.post('/api/users/me/endorse', { skill });
    await get().loadMe();
  },
}));
