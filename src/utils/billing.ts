import { supabase } from '@/lib/supabaseClient';

export type PaidTier = 'pro' | 'creator' | 'business' | 'exclusive';

export const tierPricesZar: Record<PaidTier, number> = {
  pro: 99,
  creator: 299,
  business: 999,
  exclusive: 1999,
};

function isPaidTier(value: unknown): value is PaidTier {
  return (
    value === 'pro' ||
    value === 'creator' ||
    value === 'business' ||
    value === 'exclusive'
  );
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createCheckoutSession(params: {
  priceId: string;
  tier?: PaidTier;
  mode?: 'subscription' | 'payment';
  quantity?: number;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}) {
  const metadata: Record<string, string> = {
    ...(params.metadata || {}),
  };

  if (params.tier) {
    metadata.tier = params.tier;
    metadata.billingPurpose = 'tier_upgrade';
  }

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/billing/checkout`,
    {
      method: 'POST',
      credentials: 'include',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        priceId: params.priceId,
        tier: params.tier,
        mode: params.mode || 'subscription',
        quantity: params.quantity || 1,
        metadata,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.error || 'checkout_failed');
  }

  return (await res.json()) as { id: string; url: string };
}

export async function createYocoCheckoutSession(params: {
  tier?: PaidTier;
  amountZar?: number;
  amount?: number;
  currency?: 'ZAR' | string;
  successUrl: string;
  cancelUrl: string;
  failureUrl?: string;
  metadata?: Record<string, string>;
  externalId?: string;
}) {
  const metadata: Record<string, string> = {
    ...(params.metadata || {}),
  };

  if (params.tier) {
    metadata.tier = params.tier;
    metadata.billingPurpose = 'tier_upgrade';
  }

  const amountZar =
    params.amountZar ||
    (params.tier && isPaidTier(params.tier)
      ? tierPricesZar[params.tier]
      : undefined);

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/billing/yoco/checkout`,
    {
      method: 'POST',
      credentials: 'include',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        tier: params.tier,
        amountZar,
        amount: params.amount,
        currency: params.currency || 'ZAR',
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        failureUrl: params.failureUrl,
        metadata,
        externalId: params.externalId,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.error || 'yoco_checkout_failed');
  }

  return (await res.json()) as { id: string; redirectUrl: string };
}

export async function refreshMyBillingTier() {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/billing/me`, {
    method: 'GET',
    credentials: 'include',
    headers: await getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.error || 'billing_refresh_failed');
  }

  return (await res.json()) as {
    tier: PaidTier | 'free';
    subscriptionStatus: string;
  };
}
