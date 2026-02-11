import Navbar from '@/components/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface TrustSummary {
  userId: string;
  accountAgeDays: number | null;
  scamFreeHistory: number;
  warnings: number;
  bans: number;
  trustScore: number;
  devices: { fingerprint?: string; userAgent?: string; ipCity?: string; lastSeenAt?: string }[];
  lastVerification: any;
}

export default function TrustDashboard() {
  const [trust, setTrust] = useState<TrustSummary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/safety/trust') as any;
        if (res?.trust) setTrust(res.trust);
      } catch {
        // ignore for now
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">User Trust Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          See how FaceMeX evaluates the safety and trust of your account.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Account Safety Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!trust && <p className="text-muted-foreground">Loading trust data...</p>}
            {trust && (
              <>
                <p><span className="font-semibold">Trust score:</span> {trust.trustScore}/100</p>
                <p><span className="font-semibold">Account age:</span> {trust.accountAgeDays ?? 'N/A'} days</p>
                <p><span className="font-semibold">Scam-free history:</span> {trust.scamFreeHistory} interactions</p>
                <p><span className="font-semibold">Warnings:</span> {trust.warnings}</p>
                <p><span className="font-semibold">Bans:</span> {trust.bans}</p>
                <p>
                  <span className="font-semibold">Identity verification:</span>{' '}
                  {trust.lastVerification
                    ? `${trust.lastVerification.status || 'pending'} • ${new Date(trust.lastVerification.createdAt).toLocaleDateString()}`
                    : 'Not submitted'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!trust || !trust.devices?.length ? (
              <p className="text-muted-foreground">No recorded device history yet.</p>
            ) : (
              <ul className="space-y-1 max-h-60 overflow-y-auto">
                {trust.devices.map((d, idx) => (
                  <li key={idx} className="flex justify-between border-b py-1 text-xs">
                    <span>{d.userAgent || 'Unknown device'}</span>
                    <span className="text-muted-foreground">{d.ipCity || 'Unknown city'}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
