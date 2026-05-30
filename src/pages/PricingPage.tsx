import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useUserStore } from '@/store/userStore';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import {
  Check,
  Crown,
  ShieldCheck,
  Sparkles,
  Building2,
  Star,
  Loader2,
} from 'lucide-react';

type PlanKey = 'pro' | 'creator' | 'business' | 'exclusive' | 'verified';

type Plan = {
  key: PlanKey;
  name: string;
  badge?: string;
  price: string;
  subtitle: string;
  icon: React.ElementType;
  bullets: string[];
  featured?: boolean;
};

const plans: Plan[] = [
  {
    key: 'pro',
    name: 'Pro',
    price: 'R99.99 / month',
    subtitle: 'Simple tools for steady professional growth.',
    icon: Sparkles,
    bullets: [
      'Clean professional profile',
      'Simple analytics',
      'Better career tools',
    ],
  },
  {
    key: 'creator',
    name: 'Creator',
    badge: 'Popular',
    price: 'R299.99 / month',
    subtitle: 'Create consistently and grow naturally.',
    icon: Star,
    featured: true,
    bullets: [
      'Post creation tools',
      'Audience growth support',
      'AI CV upgrade access',
    ],
  },
  {
    key: 'business',
    name: 'Business',
    price: 'R999.99 / month',
    subtitle: 'Turn attention into customers.',
    icon: Building2,
    bullets: [
      'Promote your brand',
      'Campaign tools',
      'Business visibility',
    ],
  },
  {
    key: 'exclusive',
    name: 'Exclusive',
    price: 'R1,999.99 / month',
    subtitle: 'Full access. Zero friction.',
    icon: Crown,
    bullets: [
      'Everything unlocked',
      'Priority access',
      'Premium support',
    ],
  },
  {
    key: 'verified',
    name: 'Verified badge',
    badge: 'Trust',
    price: 'R150.00 / month',
    subtitle: 'Show trust on your profile.',
    icon: ShieldCheck,
    bullets: [
      'Verified checkmark',
      'Higher trust in comments',
      'Priority support',
    ],
  },
];

export default function PricingPage() {
  const { currentTier, subscribe } = useSubscriptionStore();
  const {
    id: userId,
    setVerifiedDev,
    addons,
    upgradeDev,
  } = useUserStore();

  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const tierLabel = String(currentTier || '').toLowerCase();

  const searchParams = useMemo(() => {
    return new URLSearchParams(window.location.search);
  }, []);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const checkoutId = searchParams.get('checkoutId');
    const plan = searchParams.get('plan') as PlanKey | null;

    if (payment === 'cancelled') {
      toast({
        title: 'Payment cancelled',
        description: 'No problem. You can try again anytime.',
      });
      return;
    }

    if (payment === 'failed') {
      toast({
        title: 'Payment failed',
        description: 'The payment did not go through. Please try again.',
      });
      return;
    }

    if (payment !== 'success' || !checkoutId) return;

    const verifyPayment = async () => {
      setCheckingPayment(true);

      try {
        const res = await api.post('/api/payments/yoco/verify', {
          checkoutId,
          userId,
        });

        if (res?.active) {
          const activePlan = String(res.plan || plan || '').toLowerCase() as PlanKey;

          if (activePlan === 'verified') {
            try {
              setVerifiedDev(true);
            } catch {}
          } else if (activePlan) {
            try {
              await subscribe(activePlan);
            } catch {}

            try {
              await upgradeDev(activePlan);
            } catch {}
          }

          toast({
            title: 'Payment successful',
            description: 'Your FaceMeX access has been activated.',
          });

          window.history.replaceState({}, '', '/pricing');
          return;
        }

        toast({
          title: 'Payment received',
          description:
            res?.message || 'Yoco is still confirming your payment. Refresh shortly.',
        });
      } catch (error: any) {
        toast({
          title: 'Checking payment',
          description:
            error?.message || 'Payment was made, but confirmation is still pending.',
        });
      } finally {
        setCheckingPayment(false);
      }
    };

    verifyPayment();
  }, [searchParams, subscribe, upgradeDev, setVerifiedDev, userId]);

  const startPayment = async (plan: PlanKey) => {
    if (!userId) {
      toast({
        title: 'Login required',
        description: 'Please log in before choosing a plan.',
      });
      return;
    }

    setLoadingPlan(plan);

    try {
      const res = await api.post('/api/payments/yoco/create-checkout', {
        plan,
        userId,
      });

      if (!res?.redirectUrl) {
        throw new Error('Payment link was not created.');
      }

      window.location.href = res.redirectUrl;
    } catch (error: any) {
      toast({
        title: 'Payment error',
        description:
          error?.message || 'Could not start Yoco payment. Please try again.',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (plan: PlanKey) => {
    if (plan === 'verified') return Boolean(addons?.verified);
    return tierLabel === plan;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 md:pt-20">
        <section className="mx-auto mb-8 max-w-2xl text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            FaceMeX plans
          </div>

          <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
            Choose your growth plan
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            Start with what you need today. Upgrade when your profile, career,
            content, or business needs more power.
          </p>

          {checkingPayment && (
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Confirming your payment...
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.filter((plan) => plan.key !== 'verified').map((plan) => {
            const Icon = plan.icon;
            const current = isCurrentPlan(plan.key);
            const loading = loadingPlan === plan.key;

            return (
              <article
                key={plan.key}
                className={`relative flex min-h-[330px] flex-col justify-between rounded-[28px] border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  plan.featured
                    ? 'border-primary/40 ring-2 ring-primary/10'
                    : 'border-border/70'
                }`}
              >
                {plan.badge && (
                  <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h2 className="text-lg font-bold uppercase tracking-wide">
                    {plan.name}
                  </h2>

                  <p className="mt-1 min-h-[44px] text-sm leading-relaxed text-muted-foreground">
                    {plan.subtitle}
                  </p>

                  <div className="mt-5 text-xl font-bold">
                    {plan.price}
                  </div>

                  <ul className="mt-5 space-y-3">
                    {plan.bullets.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={loading || current || checkingPayment}
                  onClick={() => startPayment(plan.key)}
                  className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    plan.featured
                      ? 'bg-slate-950 text-white shadow-lg hover:bg-slate-800'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening Yoco...
                    </>
                  ) : current ? (
                    'Current plan'
                  ) : (
                    'Continue to payment'
                  )}
                </button>
              </article>
            );
          })}
        </section>

        <section className="mx-auto mt-6 max-w-md">
          {plans.filter((plan) => plan.key === 'verified').map((plan) => {
            const Icon = plan.icon;
            const current = isCurrentPlan(plan.key);
            const loading = loadingPlan === plan.key;

            return (
              <article
                key={plan.key}
                className="relative rounded-[28px] border border-border/70 bg-card p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">{plan.name}</h2>

                      {plan.badge && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {plan.subtitle}
                    </p>

                    <div className="mt-3 text-lg font-bold">
                      {plan.price}
                    </div>
                  </div>
                </div>

                <ul className="mt-5 space-y-3">
                  {plan.bullets.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={loading || current || checkingPayment}
                  onClick={() => startPayment(plan.key)}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening Yoco...
                    </>
                  ) : current ? (
                    'Verified active'
                  ) : (
                    'Get verified'
                  )}
                </button>
              </article>
            );
          })}

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Current plan:{' '}
            <span className="font-bold uppercase text-foreground">
              {currentTier || 'free'}
            </span>
          </p>
        </section>
      </main>
    </div>
  );
}
