import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
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
  const [processingPlan, setProcessingPlan] = useState<PlanKey | null>(null);
  const [refreshingEntitlement, setRefreshingEntitlement] = useState(false);
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectUrl = params.get('redirectUrl');
    if (params.get('checkout') === 'redirect' && redirectUrl) {
      window.location.replace(redirectUrl);
      return;
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

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-[#202123] transition-colors dark:bg-[#0d0d0d] dark:text-[#f5f5f5]">
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pt-10">
        <header className="mb-6 flex items-start justify-between gap-3 border-b border-[#e5e5e5] pb-4 transition-colors dark:border-[#333] sm:mb-9 sm:items-center sm:pb-5">
          <div>
            <p className="text-xs font-medium text-[#6b6b6b] dark:text-[#aaa] sm:text-sm">FaceMeX account</p>
            <h1 className="mt-1 text-[22px] font-semibold leading-7 text-[#202123] dark:text-[#f5f5f5] sm:text-[26px] sm:leading-8">Choose your plan</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/ai/job-assistant')}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#444] transition hover:bg-[#ededed] dark:text-[#ddd] dark:hover:bg-[#222] sm:gap-2 sm:px-3 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to chat</span>
            <span className="sm:hidden">Back</span>
          </button>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-5">
          {(['plus', 'pro'] as PlanKey[]).map((plan) => {
            const details = FACEMEX_PLANS[plan];
            const isPlanCurrent = userPlan === plan;
            return (
              <section key={plan} className="flex min-h-0 flex-col rounded-xl border border-[#dedede] bg-white p-4 transition-colors dark:border-[#333] dark:bg-[#171717] sm:p-6 md:min-h-[284px]">
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#202123] dark:text-[#f5f5f5] sm:text-xl">{details.name}</h2>
                    <p className="mt-1 text-sm text-[#6b6b6b] dark:text-[#aaa]">{details.description}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-[#f1f1f1] px-2 py-1 text-[10px] font-medium text-[#555] dark:bg-[#282828] dark:text-[#ccc] sm:text-xs">
                    {details.badge}
                  </span>
                </div>

                <div className="my-5 flex flex-wrap items-baseline gap-2 sm:mt-6">
                  <span className="text-[30px] font-semibold leading-none text-[#202123] dark:text-[#f5f5f5] sm:text-[34px]">R{details.amountZar}</span>
                  <span className="text-sm text-[#6b6b6b] dark:text-[#aaa]">/ month</span>
                  {isPlanCurrent && <span className="ml-auto text-xs font-medium text-[#666] dark:text-[#bbb]">Current plan</span>}
                </div>

                <button
                  type="button"
                  onClick={() => startCheckout(plan)}
                  disabled={processingPlan !== null}
                  className={`mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    plan === 'plus'
                      ? 'bg-[#202123] text-white hover:bg-[#343538] dark:bg-white dark:text-[#202123] dark:hover:bg-[#e5e5e5]'
                      : 'border border-[#d6d6d6] bg-white text-[#202123] hover:bg-[#f5f5f5] dark:border-[#444] dark:bg-[#202020] dark:text-[#f5f5f5] dark:hover:bg-[#282828]'
                  }`}
                >
                  {processingPlan === plan ? 'Opening checkout…' : `Get ${plan === 'plus' ? 'Plus' : 'Pro'}`}
                </button>
              </section>
            );
          })}
        </div>

        <section className="mt-6 overflow-hidden rounded-xl border border-[#dedede] bg-white transition-colors dark:border-[#333] dark:bg-[#171717] sm:mt-10" aria-label="Plan comparison">
          <div className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center border-b border-[#e5e5e5] bg-[#fafafa] px-3 py-3 text-[10px] font-semibold leading-tight text-[#666] dark:border-[#333] dark:bg-[#202020] dark:text-[#bbb] sm:grid-cols-[minmax(0,1fr)_112px_112px] sm:px-5 sm:text-xs lg:grid-cols-[minmax(0,1fr)_170px_170px] lg:px-6">
            <span>Included features</span>
            <span className="px-1 text-center">FaceMeX Plus</span>
            <span className="px-1 text-center">FaceMeX Pro</span>
          </div>
          {[...PLUS_FEATURES, ...PRO_FEATURES].map((feature) => (
            <div key={feature.key} className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center border-b border-[#ededed] px-3 py-3 last:border-b-0 dark:border-[#303030] sm:grid-cols-[minmax(0,1fr)_112px_112px] sm:px-5 lg:grid-cols-[minmax(0,1fr)_170px_170px] lg:px-6">
              <span className="min-w-0 break-words pr-2 text-xs leading-5 text-[#333] dark:text-[#ddd] sm:text-sm">{feature.label}</span>
              <span className="flex justify-center" aria-label={feature.plus ? 'Included with Plus' : 'Not included with Plus'}>
                {feature.plus ? <Check className="h-4 w-4 text-[#333] dark:text-[#ddd]" aria-hidden="true" /> : <span className="text-[#aaa] dark:text-[#777]">—</span>}
              </span>
              <span className="flex justify-center" aria-label={feature.pro ? 'Included with Pro' : 'Not included with Pro'}>
                {feature.pro ? <Check className="h-4 w-4 text-[#333] dark:text-[#ddd]" aria-hidden="true" /> : <span className="text-[#aaa] dark:text-[#777]">—</span>}
              </span>
            </div>
          ))}
        </section>

        <div className="mt-4 flex flex-col-reverse items-stretch gap-3 text-sm text-[#666] dark:text-[#aaa] sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span aria-live="polite">{subscriptionNotice || (refreshingEntitlement ? 'Refreshing your plan access…' : '')}</span>
          <button type="button" onClick={handleRestoreSubscription} className="shrink-0 self-end rounded-lg px-3 py-2 text-sm font-medium text-[#444] transition hover:bg-[#ededed] dark:text-[#ddd] dark:hover:bg-[#222] sm:self-auto">
            Restore subscription
          </button>
        </div>
      </div>
    </div>
  );
}
