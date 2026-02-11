import Navbar from '@/components/layout/Navbar';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useUserStore } from '@/store/userStore';

const YOCO_PAYMENT_URL_PRO = import.meta.env.VITE_YOCO_PAYMENT_URL_PRO || '';
const YOCO_PAYMENT_URL_CREATOR = import.meta.env.VITE_YOCO_PAYMENT_URL_CREATOR || '';
const YOCO_PAYMENT_URL_BUSINESS = import.meta.env.VITE_YOCO_PAYMENT_URL_BUSINESS || '';
const YOCO_PAYMENT_URL_EXCLUSIVE = import.meta.env.VITE_YOCO_PAYMENT_URL_EXCLUSIVE || '';
const YOCO_PAYMENT_URL_VERIFIED = import.meta.env.VITE_YOCO_PAYMENT_URL_VERIFIED || '';

export default function PricingPage() {
  const { currentTier, subscribe } = useSubscriptionStore();
  const { setVerifiedDev, addons, upgradeDev } = useUserStore();

  const tierLabel = String(currentTier || '').toLowerCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-14 md:pt-16 p-4">
        <h1 className="text-xl md:text-2xl font-semibold mb-2 text-center">Choose your plan</h1>
        <p className="text-sm md:text-base leading-relaxed text-muted-foreground text-center mb-8">Pick what you need today. You can change plans later.</p>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2 mb-10">
          <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 shadow-none flex flex-col justify-between md:min-h-[320px]">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-wide">PRO</h2>
                {tierLabel === 'pro' && (
                  <span className="mt-0.5 inline-flex items-center rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                    Current plan
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">Simple tools for steady professional growth.</p>
              <div className="text-base md:text-lg font-medium text-foreground mb-1">ZAR 99.99 / month</div>
              <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
                <li>• Publish with a clean professional profile</li>
                <li>• Track performance with simple analytics</li>
                <li>• Connect and message with confidence</li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (YOCO_PAYMENT_URL_PRO) {
                    window.open(YOCO_PAYMENT_URL_PRO, '_blank');
                    return;
                  }
                  subscribe('pro').catch(() => {});
                  upgradeDev('pro').catch(() => {});
                }}
                className="w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {YOCO_PAYMENT_URL_PRO ? 'Continue to payment' : 'Activate Pro'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 shadow-none flex flex-col justify-between md:min-h-[320px]">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-wide">CREATOR</h2>
                {tierLabel === 'creator' && (
                  <span className="mt-0.5 inline-flex items-center rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                    Current plan
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">Create consistently. Grow naturally.</p>
              <div className="text-base md:text-lg font-medium text-foreground mb-1">ZAR 299.99 / month</div>
              <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
                <li>• Write better posts faster</li>
                <li>• Understand what your audience likes</li>
                <li>• Build a stronger body of work over time</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                if (YOCO_PAYMENT_URL_CREATOR) {
                  window.open(YOCO_PAYMENT_URL_CREATOR, '_blank');
                  return;
                }
                subscribe('creator').catch(() => {});
                upgradeDev('creator').catch(() => {});
              }}
              className="mt-6 w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {YOCO_PAYMENT_URL_CREATOR ? 'Continue to payment' : 'Activate Creator'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2 mb-10">
          <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 shadow-none flex flex-col justify-between md:min-h-[320px]">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-wide">BUSINESS</h2>
                {tierLabel === 'business' && (
                  <span className="mt-0.5 inline-flex items-center rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                    Current plan
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">Turn attention into customers.</p>
              <div className="text-base md:text-lg font-medium text-foreground mb-1">ZAR 999.99 / month</div>
              <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
                <li>• Promote your brand inside the feed</li>
                <li>• Manage campaigns without agencies</li>
                <li>• Track what actually works</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                if (YOCO_PAYMENT_URL_BUSINESS) {
                  window.open(YOCO_PAYMENT_URL_BUSINESS, '_blank');
                  return;
                }
                subscribe('business').catch(() => {});
                upgradeDev('business').catch(() => {});
              }}
              className="mt-6 w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {YOCO_PAYMENT_URL_BUSINESS ? 'Continue to payment' : 'Activate Business'}
            </button>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 shadow-none flex flex-col justify-between md:min-h-[320px]">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-wide">EXCLUSIVE</h2>
                {tierLabel === 'exclusive' && (
                  <span className="mt-0.5 inline-flex items-center rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                    Current plan
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">Full access. Zero friction.</p>
              <div className="text-base md:text-lg font-medium text-foreground mb-1">ZAR 1,999.99 / month</div>
              <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
                <li>• Everything unlocked</li>
                <li>• Priority access to new tools</li>
                <li>• Support when you need it</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                if (YOCO_PAYMENT_URL_EXCLUSIVE) {
                  window.open(YOCO_PAYMENT_URL_EXCLUSIVE, '_blank');
                  return;
                }
                subscribe('exclusive').catch(() => {});
                upgradeDev('exclusive').catch(() => {});
              }}
              className="mt-6 w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {YOCO_PAYMENT_URL_EXCLUSIVE ? 'Continue to payment' : 'Activate Exclusive'}
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto mb-16">
          <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 shadow-none flex flex-col justify-between md:min-h-[220px]">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-wide flex items-center gap-2">
                  Verified badge
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    New
                  </span>
                </h2>
                {addons?.verified && (
                  <span className="mt-0.5 inline-flex items-center rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                    Current
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">A simple way to show trust on your profile.</p>
              <div className="text-base md:text-lg font-medium text-foreground mb-1">ZAR 150.00 / month</div>
              <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
                <li>• Verified checkmark on profile</li>
                <li>• Higher trust in comments and DMs</li>
                <li>• Priority support</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                if (YOCO_PAYMENT_URL_VERIFIED) {
                  window.open(YOCO_PAYMENT_URL_VERIFIED, '_blank');
                  return;
                }
                try {
                  setVerifiedDev(true);
                } catch {}
              }}
              className="mt-6 w-full rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {YOCO_PAYMENT_URL_VERIFIED ? 'Continue to payment' : 'Activate Verified'}
            </button>
          </div>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
            Current plan: <span className="font-medium uppercase">{currentTier}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
