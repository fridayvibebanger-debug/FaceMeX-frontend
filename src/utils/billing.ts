export async function createCheckoutSession(params: {
  priceId: string;
  mode?: 'subscription' | 'payment';
  quantity?: number;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/billing/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId: params.priceId,
      mode: params.mode || 'subscription',
      quantity: params.quantity || 1,
      metadata: params.metadata || {},
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.error || 'checkout_failed');
  }
  return (await res.json()) as { id: string; url: string };
}

export async function createYocoCheckoutSession(params: {
  amountZar?: number;
  amount?: number;
  currency?: 'ZAR' | string;
  successUrl: string;
  cancelUrl: string;
  failureUrl?: string;
  metadata?: Record<string, string>;
  externalId?: string;
}) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/billing/yoco/checkout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountZar: params.amountZar,
      amount: params.amount,
      currency: params.currency || 'ZAR',
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      failureUrl: params.failureUrl,
      metadata: params.metadata || {},
      externalId: params.externalId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.error || 'yoco_checkout_failed');
  }
  return (await res.json()) as { id: string; redirectUrl: string };
}
