import { useState } from 'react';
import { createYocoCheckoutSession } from '@/utils/billing';

export default function SubscriptionModal({
  currentTier,
  onClose,
}: {
  currentTier: string;
  onClose: () => void;
}) {
  const [processingTier, setProcessingTier] = useState<string | null>(null);

  const plans = [
    { key: 'pro', label: 'Pro', amount: 99.99, description: 'Unlock the core AI and professional tools.' },
    { key: 'creator', label: 'Creator', amount: 299.99, description: 'Best for consistent growth and content creation.' },
    { key: 'business', label: 'Business', amount: 999.99, description: 'Built for teams and growth-focused brands.' },
  ] as const;

  const startCheckout = async (tier: (typeof plans)[number]['key']) => {
    setProcessingTier(tier);
    try {
      const session = await createYocoCheckoutSession({
        amountZar: plans.find((plan) => plan.key === tier)?.amount || 0,
        currency: 'ZAR',
        successUrl: `${window.location.origin}/facemex-plus?checkout=success`,
        cancelUrl: `${window.location.origin}/facemex-plus?checkout=cancel`,
        metadata: { plan: tier, source: 'subscription_modal' },
        externalId: `${tier}-${Date.now()}`,
      });
      const checkoutTarget = `/facemex-plus?checkout=redirect&redirectUrl=${encodeURIComponent(session.redirectUrl)}`;
      window.location.assign(checkoutTarget);
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingTier(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 py-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Upgrade</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Choose your plan</h2>
            <p className="mt-2 text-sm text-slate-600">Current plan: {String(currentTier || 'free').toUpperCase()}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50">
            Close
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {plans.map((plan) => (
            <div key={plan.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{plan.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">R{plan.amount.toFixed(2)}</p>
              </div>
              <button
                type="button"
                onClick={() => startCheckout(plan.key)}
                disabled={processingTier === plan.key}
                className="mt-3 w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {processingTier === plan.key ? 'Opening checkout…' : 'Continue to payment'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
