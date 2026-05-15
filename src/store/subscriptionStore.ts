import { create } from 'zustand';
import {
  createYocoCheckoutSession,
  refreshMyBillingTier,
  type PaidTier,
} from '@/lib/billing';

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
  buttonText?: string;
  note?: string;
  isAddon?: boolean;
}

interface SubscriptionState {
  currentTier: Tier;
  tiers: TierInfo[];
  trialTier: Tier | null;
  trialEndsAt: string | null;
  isCheckingOut: boolean;
  subscribe: (tier: Tier) => Promise<void>;
  startTrial: (tier: Tier) => Promise<void>;
  isTrialActive: () => boolean;
  cancel: () => Promise<void>;
  syncTier: () => Promise<void>;
}

const TIERS: TierInfo[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R0',
    buttonText: 'Current free plan',
    note: 'Social Mode only',
    benefits: [
      'Social feed access',
      'Basic profile and posting',
      'Follow and message friends',
      'No Professional Mode access',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R99/month',
    buttonText: 'Upgrade to Pro',
    note: 'Better tools, but no Professional Mode posting',
    benefits: [
      'HD uploads',
      'Advanced engagement tools',
      'Basic analytics',
      '1 AI tool',
      'Improved messaging features',
      'Professional Mode still locked',
    ],
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 'R299/month',
    buttonText: 'Unlock Creator',
    note: 'Professional Mode starts here',
    benefits: [
      'Professional Mode access',
      'Post business, opportunities, jobs, education, inventions, achievements, partners and investor content',
      'FaceMeX AI Assistant',
      'Monetization dashboard',
      'Insights and unlimited posts',
      'Post Wizard & Caption Muse',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 'R999/month',
    buttonText: 'Upgrade to Business',
    note: 'For companies, brands and hiring',
    benefits: [
      'Everything in Creator',
      'Business profile tools',
      'Ad tools & campaign management',
      'Recruitment portal',
      'Brand page & data insights',
      'Access to all AI tools',
    ],
  },
  {
    id: 'exclusive',
    name: 'Exclusive',
    price: 'R1,999/month',
    buttonText: 'Go Exclusive',
    note: 'Full FaceMeX access',
    benefits: [
      'Everything in Business',
      'All premium tools unlocked',
      'Premium wellness access',
      'Early access to new tools',
      'Priority support',
    ],
  },
  {
    id: 'verified',
    name: 'Verified badge',
    price: 'R150/month',
    buttonText: 'Get verified',
    note: 'Add-on, not a main tier',
    isAddon: true,
    benefits: [
      'Verified badge on profile',
      'Higher trust in comments and DMs',
      'Priority moderation & support',
      'Does not unlock Professional Mode by itself',
    ],
  },
];

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const paidTierPrices: Record<PaidTier, number> = {
  pro: 99,
  creator: 299,
  business: 999,
  exclusive: 1999,
};

function isValidTier(value: unknown): value is Tier {
  return (
    value === 'free' ||
    value === 'pro' ||
    value === 'creator' ||
    value === 'business' ||
    value === 'exclusive' ||
    value === 'verified'
  );
}

function isPaidTier(value: Tier): value is PaidTier {
  return (
    value === 'pro' ||
    value === 'creator' ||
    value === 'business' ||
    value === 'exclusive'
  );
}

function getInitialTier(): Tier {
  if (typeof window === 'undefined') return 'free';

  try {
    const stored = localStorage.getItem('facemex_current_tier');
    return isValidTier(stored) ? stored : 'free';
  } catch {
    return 'free';
  }
}

function saveTier(tier: Tier) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('facemex_current_tier', tier);
  } catch {
    // ignore localStorage errors
  }
}

function getBillingUrls(tier: Tier) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return {
    successUrl: `${origin}/billing/success?tier=${tier}`,
    cancelUrl: `${origin}/pricing?cancelled=1&tier=${tier}`,
    failureUrl: `${origin}/pricing?failed=1&tier=${tier}`,
  };
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  currentTier: getInitialTier(),
  tiers: TIERS,
  trialTier: null,
  trialEndsAt: null,
  isCheckingOut: false,

  subscribe: async (tier) => {
    if (tier === 'free') {
      saveTier('free');

      set({
        currentTier: 'free',
        trialTier: null,
        trialEndsAt: null,
        isCheckingOut: false,
      });

      return;
    }

    if (tier === 'verified') {
      set({ isCheckingOut: true });

      try {
        const urls = getBillingUrls('verified');

        const checkout = await createYocoCheckoutSession({
          amountZar: 150,
          currency: 'ZAR',
          successUrl: urls.successUrl,
          cancelUrl: urls.cancelUrl,
          failureUrl: urls.failureUrl,
          metadata: {
            billingPurpose: 'verified_badge',
            addon: 'verified',
            feature: 'verified_badge',
          },
          externalId: `verified-${Date.now()}`,
        });

        window.location.href = checkout.redirectUrl;
      } finally {
        set({ isCheckingOut: false });
      }

      return;
    }

    if (!isPaidTier(tier)) return;

    set({ isCheckingOut: true });

    try {
      const urls = getBillingUrls(tier);

      const checkout = await createYocoCheckoutSession({
        tier,
        amountZar: paidTierPrices[tier],
        currency: 'ZAR',
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl,
        failureUrl: urls.failureUrl,
        metadata: {
          billingPurpose: 'tier_upgrade',
          tier,
          feature: `${tier}_subscription`,
        },
        externalId: `${tier}-${Date.now()}`,
      });

      window.location.href = checkout.redirectUrl;
    } finally {
      set({ isCheckingOut: false });
    }
  },

  startTrial: async (tier) => {
    if (tier === 'free' || tier === 'verified') return;

    const endsAt = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();

    await new Promise((resolve) => setTimeout(resolve, 400));

    saveTier(tier);

    set({
      currentTier: tier,
      trialTier: tier,
      trialEndsAt: endsAt,
    });
  },

  isTrialActive: () => {
    const { trialEndsAt } = get();

    if (!trialEndsAt) return false;

    return Date.now() < new Date(trialEndsAt).getTime();
  },

  cancel: async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));

    saveTier('free');

    set({
      currentTier: 'free',
      trialTier: null,
      trialEndsAt: null,
    });
  },

  syncTier: async () => {
    try {
      const result = await refreshMyBillingTier();
      const tier = isValidTier(result.tier) ? result.tier : 'free';

      saveTier(tier);

      set({
        currentTier: tier,
        trialTier: null,
        trialEndsAt: null,
      });
    } catch {
      // keep local tier if backend fails
    }
  },
}));
