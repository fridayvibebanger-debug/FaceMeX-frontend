import { ReactNode, useEffect } from 'react';
import { useUserStore, Tier } from '@/store/userStore';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function TierGate({ minTier, children, feature }: { minTier: Tier; children: ReactNode; feature?: string }) {
  const { hasTier, loadMe, loading, tier } = useUserStore();

  useEffect(() => {
    loadMe().catch(() => {});
  }, [loadMe]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">Loading access…</div>
    );
  }

  if (!hasTier(minTier)) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-semibold">Upgrade required</h2>
          <p className="text-muted-foreground">
            {feature ? (
              <>
                Upgrade to <span className="font-medium capitalize">{minTier}</span> to use <span className="font-medium">{feature}</span>.
              </>
            ) : (
              <>
                This feature requires <span className="font-medium capitalize">{minTier}</span> or higher.
              </>
            )}
            {' '}Your current tier is <span className="font-medium capitalize">{tier}</span>.
          </p>
          <Button asChild>
            <Link to="/pricing">View Pricing</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
