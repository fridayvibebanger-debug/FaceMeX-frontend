import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

interface TrustResponse {
  trust?: {
    lastVerification?: { status?: string; createdAt?: string } | null;
  };
}

export default function IdentityVerifiedBadge() {
  const [approvedAt, setApprovedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/api/safety/trust') as TrustResponse;
        const status = res?.trust?.lastVerification?.status;
        const createdAt = res?.trust?.lastVerification?.createdAt;
        if (mounted && status === 'approved' && createdAt) {
          setApprovedAt(createdAt);
        }
      } catch {
        // ignore; badge is purely cosmetic
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!approvedAt) return null;

  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold shadow-xs">
      <ShieldCheck className="h-3 w-3" />
      <span>ID verified</span>
    </span>
  );
}
