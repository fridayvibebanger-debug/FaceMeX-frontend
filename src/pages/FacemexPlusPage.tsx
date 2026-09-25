import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { createYocoCheckoutSession } from '@/utils/billing';
import { useUserStore } from '@/store/userStore';

type PlanKey = 'plus' | 'pro';
type UserPlan = 'free' | 'plus' | 'pro';

type FeatureRow = {
  key: string;
  label: string;
  free: boolean;
  plus: boolean;
  pro: boolean;
};

const FACEMEX_PLANS: Record<PlanKey, { name: string; amountZar: number; description: string; badge: string }> = {
  plus: {
    name: 'FaceMeX Plus',
    amountZar: 99,
    description: 'More intelligence. More tools. More ways to get things done.',
    badge: 'Popular',
  },
  pro: {
    name: 'FaceMeX Pro',
    amountZar: 250,
    description: 'Your personal AI workspace for serious work, study and career growth.',
    badge: 'Most advanced',
  },
};

const PLUS_FEATURES: FeatureRow[] = [
  { key: 'moreAiMessages', label: 'More AI messages', free: false, plus: true, pro: true },
  { key: 'homework', label: 'AI homework & explanations', free: false, plus: true, pro: true },
  { key: 'jobSearch', label: 'AI job search', free: false, plus: true, pro: true },
  { key: 'jobVerification', label: 'Job verification', free: false, plus: true, pro: true },
  { key: 'cvCoverLetter', label: 'CV & cover letter assistance', free: false, plus: true, pro: true },
  { key: 'imageAnalysis', label: 'Image/document analysis', free: false, plus: true, pro: true },
  { key: 'watch', label: 'FaceMeX Watch', free: false, plus: true, pro: true },
  { key: 'careerAssistant', label: 'Career assistance', free: false, plus: true, pro: true },
  { key: 'workspaceUsage', label: 'More AI workspace usage', free: false, plus: true, pro: true },
  { key: 'priorityAccess', label: 'Priority AI access', free: false, plus: true, pro: true },
];

const PRO_FEATURES: FeatureRow[] = [
  { key: 'everythingPlus', label: 'Everything in Plus', free: false, plus: true, pro: true },
  { key: 'advancedWorkspace', label: 'Advanced AI workspace', free: false, plus: false, pro: true },
  { key: 'personalizedJobAssistant', label: 'Personalized job assistant', free: false, plus: false, pro: true },
  { key: 'automatedSearch', label: 'Automated job opportunity search', free: false, plus: false, pro: true },
  { key: 'opportunityAlerts', label: 'Personalized opportunity alerts', free: false, plus: false, pro: true },
  { key: 'cvBuilder', label: 'Advanced CV builder', free: false, plus: false, pro: true },
  { key: 'coverLetterBuilder', label: 'Advanced cover-letter builder', free: false, plus: false, pro: true },
  { key: 'interviewPrep', label: 'Interview preparation', free: false, plus: false, pro: true },
  { key: 'appSupport', label: 'Job application assistance', free: false, plus: false, pro: true },
  { key: 'practicalLab', label: 'Practical Lab', free: false, plus: false, pro: true },
  { key: 'jobTracker', label: 'Job Tracker', free: false, plus: false, pro: true },
  { key: 'schedule', label: 'Schedule', free: false, plus: false, pro: true },
  { key: 'screenShare', label: 'Screen Share', free: false, plus: false, pro: true },
  { key: 'careerGrowth', label: 'Advanced career assistance', free: false, plus: false, pro: true },
  { key: 'priorityProcessing', label: 'Priority processing', free: false, plus: false, pro: true },
];

function normalizePlan(value?: string | null): UserPlan {
  const plan = String(value || 'free').trim().toLowerCase();
  if (plan === 'plus') return 'plus';
  if (plan === 'pro') return 'pro';
  return 'free';
}

export function hasFeatureAccess(feature: string, userPlan?: string | null): boolean {
  const plan = normalizePlan(userPlan);
  const accessMap: Record<string, Record<UserPlan, boolean>> = {
    moreAiMessages: { free: false, plus: true, pro: true },
    homework: { free: false, plus: true, pro: true },
    jobSearch: { free: false, plus: true, pro: true },
    jobVerification: { free: false, plus: true, pro: true },
    cvCoverLetter: { free: false, plus: true, pro: true },
    imageAnalysis: { free: false, plus: true, pro: true },
    watch: { free: false, plus: true, pro: true },
    careerAssistant: { free: false, plus: true, pro: true },
    workspaceUsage: { free: false, plus: true, pro: true },
    priorityAccess: { free: false, plus: true, pro: true },
    everythingPlus: { free: false, plus: true, pro: true },
    advancedWorkspace: { free: false, plus: false, pro: true },
    personalizedJobAssistant: { free: false, plus: false, pro: true },
    automatedSearch: { free: false, plus: false, pro: true },
    opportunityAlerts: { free: false, plus: false, pro: true },
    cvBuilder: { free: false, plus: false, pro: true },
    coverLetterBuilder: { free: false, plus: false, pro: true },
    interviewPrep: { free: false, plus: false, pro: true },
    appSupport: { free: false, plus: false, pro: true },
    practicalLab: { free: false, plus: false, pro: true },
    jobTracker: { free: false, plus: false, pro: true },
    schedule: { free: false, plus: false, pro: true },
    screenShare: { free: false, plus: false, pro: true },
    careerGrowth: { free: false, plus: false, pro: true },
    priorityProcessing: { free: false, plus: false, pro: true },
  };

  return Boolean(accessMap[feature]?.[plan]);
}

export default function FacemexPlusPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tier, loadMe } = useUserStore();
  const userPlan = normalizePlan(tier);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('plus');
  const [processingPlan, setProcessingPlan] = useState<PlanKey | null>(null);
  const [refreshingEntitlement, setRefreshingEntitlement] = useState(false);
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : true));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectUrl = params.get('redirectUrl');
    if (params.get('checkout') === 'redirect' && redirectUrl) {
      window.location.replace(redirectUrl);
      return;
    }

    const planParam = params.get('plan');
    if (planParam === 'pro') {
      setSelectedPlan('pro');
    } else if (planParam === 'plus') {
      setSelectedPlan('plus');
    }

    if (params.get('checkout') !== 'success') return;

    let cancelled = false;
    setRefreshingEntitlement(true);
    const refreshEntitlement = async () => {
      for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
        try {
          await loadMe();
        } catch {
          // The webhook may still be processing; retry below.
        }
        if (attempt < 3 && !cancelled) {
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }
      }
      if (!cancelled) setRefreshingEntitlement(false);
    };

    void refreshEntitlement();
    return () => {
      cancelled = true;
    };
  }, [loadMe, location.search]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const comparisonRows = useMemo(
    () => (selectedPlan === 'plus' ? PLUS_FEATURES : PRO_FEATURES),
    [selectedPlan],
  );

  const startCheckout = async (plan: PlanKey) => {
    setProcessingPlan(plan);
    setSubscriptionNotice(null);
    try {
      const session = await createYocoCheckoutSession({
        amountZar: FACEMEX_PLANS[plan].amountZar,
        currency: 'ZAR',
        successUrl: `${window.location.origin}/facemex-plus?checkout=success`,
        cancelUrl: `${window.location.origin}/facemex-plus?checkout=cancel`,
        metadata: { plan, source: 'facemex_plus_page' },
        externalId: `${plan}-${Date.now()}`,
      });
      const checkoutTarget = `/facemex-plus?checkout=redirect&redirectUrl=${encodeURIComponent(session.redirectUrl)}`;
      window.location.assign(checkoutTarget);
    } catch (error) {
      console.error(error);
      setSubscriptionNotice('Subscription checkout is temporarily unavailable. Please try again in a moment.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleRestoreSubscription = async () => {
    try {
      setSubscriptionNotice('Refreshing your subscription status…');
      await loadMe();
      setSubscriptionNotice('Subscription status refreshed.');
    } catch {
      setSubscriptionNotice('Subscription information is temporarily unavailable.');
    }
  };

  const selectedPlanDetails = FACEMEX_PLANS[selectedPlan];
  const isCurrentPlan = userPlan === selectedPlan;

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-6xl">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Upgrade your plan</h1>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[32px] border border-white/10 bg-[#111111] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Plus</p>
                  <div className="mt-5 flex items-start gap-2 text-5xl font-semibold tracking-tight text-white">
                    <span>R</span>
                    <span className="text-[4.5rem] leading-none">99</span>
                  </div>
                  <p className="mt-1 text-sm text-white/65">/ month</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                  Popular
                </div>
              </div>

              <p className="mt-8 text-sm text-white/70">Unlimited AI, uploads, and faster access for smarter work.</p>

              <button
                type="button"
                onClick={() => startCheckout('plus')}
                disabled={processingPlan === 'plus'}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold tracking-[0.14em] text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4 text-white/85" />
                {processingPlan === 'plus' ? 'Opening checkout…' : 'Get Plus'}
              </button>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-[#111111] p-8 shadow-[0_25px_70px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Pro</p>
                  <div className="mt-5 flex items-start gap-2 text-5xl font-semibold tracking-tight text-white">
                    <span>R</span>
                    <span className="text-[4.5rem] leading-none">250</span>
                  </div>
                  <p className="mt-1 text-sm text-white/65">/ month</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                  Advanced
                </div>
              </div>

              <p className="mt-8 text-sm text-white/70">Everything in Plus, plus scheduling, Google jobs, and advanced work tools.</p>

              <button
                type="button"
                onClick={() => startCheckout('pro')}
                disabled={processingPlan === 'pro'}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold tracking-[0.14em] text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4 text-white/85" />
                {processingPlan === 'pro' ? 'Opening checkout…' : 'Get Pro'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-start gap-3 pt-2">
          <button
            type="button"
            aria-label="Go back"
            title="Go back"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#111111] text-white transition hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 pt-1">
            <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-white leading-none">
              {selectedPlan === 'plus' ? 'FaceMeX Plus' : 'FaceMeX Pro'}
            </h1>
            <p className="mt-3 text-sm leading-5 text-zinc-400">
              {selectedPlan === 'plus'
                ? 'More intelligence. More tools. More ways to get things done.'
                : 'Your personal AI workspace for serious work, study and career growth.'}
            </p>
          </div>
        </header>

        <div className="mt-6 rounded-full border border-zinc-800 bg-[#0a0a0a] p-1">
          <div className="grid grid-cols-2 gap-1">
            {(['plus', 'pro'] as PlanKey[]).map((plan) => {
              const isSelected = selectedPlan === plan;
              return (
                <button
                  key={plan}
                  type="button"
                  aria-label={plan === 'plus' ? 'Select FaceMeX Plus' : 'Select FaceMeX Pro'}
                  onClick={() => setSelectedPlan(plan)}
                  className={`rounded-full px-4 py-3 text-sm font-medium transition ${
                    isSelected
                      ? 'border border-blue-500/30 bg-blue-500/10 text-white shadow-sm'
                      : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  {plan === 'plus' ? 'Plus' : 'Pro'}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 rounded-[24px] border border-zinc-800 bg-[#0b0b0b] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{selectedPlanDetails.badge}</p>
              <h2 className="mt-3 text-[2.25rem] font-semibold tracking-[-0.06em] text-white">
                <span className="text-base align-top">R</span>
                <span className="ml-1 align-baseline">{selectedPlanDetails.amountZar}</span>
              </h2>
            </div>
            {isCurrentPlan && (
              <span className="inline-flex items-center rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-200">
                Current
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-6 text-zinc-400">{selectedPlanDetails.description}</p>
        </div>

        <div className="mt-6 rounded-[24px] border border-zinc-800 bg-[#0b0b0b] p-2.5">
          <div className="grid grid-cols-[1.5fr_.75fr_.75fr] gap-2 px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <span>Features</span>
            <span className="text-center">Free</span>
            <span className="text-center">{selectedPlan === 'plus' ? 'Plus' : 'Pro'}</span>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {comparisonRows.map((feature) => {
              const freeAvailable = feature.free;
              const selectedAvailable = selectedPlan === 'plus' ? feature.plus : feature.pro;
              return (
                <div key={feature.key} className="grid grid-cols-[1.5fr_.75fr_.75fr] items-center gap-2 px-2 py-3">
                  <span className="text-sm text-zinc-200">{feature.label}</span>
                  <span className="flex justify-center text-base">
                    {freeAvailable ? (
                      <Check className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </span>
                  <span className="flex justify-center text-base">
                    {selectedAvailable ? (
                      <Check className="h-4 w-4 text-blue-400" aria-hidden="true" />
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            aria-label={`Upgrade to FaceMeX ${selectedPlan === 'plus' ? 'Plus' : 'Pro'}`}
            onClick={() => startCheckout(selectedPlan)}
            disabled={processingPlan !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Sparkles className="h-4 w-4" />
            {processingPlan === selectedPlan ? 'Opening checkout…' : `Get FaceMeX ${selectedPlan === 'plus' ? 'Plus' : 'Pro'}`}
          </button>

          <button
            type="button"
            aria-label="Restore subscription"
            onClick={handleRestoreSubscription}
            className="inline-flex w-full items-center justify-center rounded-full border border-zinc-800 bg-[#0d0d0d] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-[#141414]"
          >
            Restore subscription
          </button>
        </div>

        {subscriptionNotice && (
          <p className="mt-3 text-center text-xs leading-5 text-zinc-300">{subscriptionNotice}</p>
        )}

        {refreshingEntitlement && (
          <p className="mt-3 text-center text-xs leading-5 text-blue-300">Refreshing your plan access…</p>
        )}

        <div className="mt-4 pb-2 text-center text-[11px] leading-5 text-zinc-500">
          Plan rules are managed centrally via the FaceMeX feature-access system.
        </div>
      </div>
    </div>
  );
}
