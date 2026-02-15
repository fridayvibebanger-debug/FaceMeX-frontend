import { create } from 'zustand';

export type Tier =
  | 'free'
  | 'pro'
  | 'creator'
  | 'business'
  | 'exclusive'
  | 'verified';

export interface TierInfo {
  id: Tier;
  name: string;
  price: string;
  benefits: string[];
}

interface SubscriptionState {
  currentTier: Tier;
  tiers: TierInfo[];
  trialTier: Tier | null;
  trialEndsAt: string | null; // ISO string
  subscribe: (tier: Tier) => Promise<void>;
  startTrial: (tier: Tier) => Promise<void>;
  isTrialActive: () => boolean;
  cancel: () => Promise<void>;
}

const TIERS: TierInfo[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R0',
    benefits: [
      'Public content access',
      'Basic profile and posting',
      'Follow and message friends',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'ZAR 99/month',
    benefits: [
      'HD uploads',
      'Advanced engagement',
      'Analytics',
      '1 AI tool',
      'DM Pro users',
    ],
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 'ZAR 299/month',
    benefits: [
      'FaceMeX AI Assistant',
      'Monetization dashboard',
      'Insights and unlimited posts',
      'Messaging across all tiers',
      'Post Wizard & Caption Muse',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 'ZAR 999/month',
    benefits: [
      'Ad tools & campaign management',
      'Recruitment portal',
      'Brand page & data insights',
      'Sell live',
      'Access to all AI tools',
    ],
  },
  {
    id: 'exclusive',
    name: 'Exclusive',
    price: 'ZAR 1,999/month',
    benefits: [
      'Premium wellness & full access',
      'All features unlocked',
      'Mental & healthcare support',
      'Early access to new tools',
    ],
  },
  {
    id: 'verified',
    name: 'Verified badge',
    price: 'ZAR 150/month',
    benefits: [
      'Blue verified badge on profile',
      'Priority moderation & support',
      'Higher trust in comments and DMs',
    ],
  },
];

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  currentTier: 'free',
  tiers: TIERS,
  trialTier: null,
  trialEndsAt: null,
  subscribe: async (tier) => {
    await new Promise((r) => setTimeout(r, 600));
    set({ currentTier: tier, trialTier: null, trialEndsAt: null });
  },
  startTrial: async (tier) => {
    const now = Date.now();
    const endsAt = new Date(now + TRIAL_DURATION_MS).toISOString();
    await new Promise((r) => setTimeout(r, 400));
    set({ currentTier: tier, trialTier: tier, trialEndsAt: endsAt });
  },
  isTrialActive: () => {
    const { trialEndsAt } = get();
    if (!trialEndsAt) return false;
    return Date.now() < new Date(trialEndsAt).getTime();
  },
  cancel: async () => {
    await new Promise((r) => setTimeout(r, 600));
    set({ currentTier: 'free', trialTier: null, trialEndsAt: null });
  },
}));
