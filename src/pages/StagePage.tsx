import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { useWorldStore } from '@/store/worldStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StagePage() {
  const { id } = useParams();
  const { getStage, loadMock } = useWorldStore();
  useEffect(()=> { loadMock(); }, [loadMock]);
  const stage = getStage(id as string);

  if (!stage) return (
    <div className="min-h-screen bg-background"><Navbar /><div className="pt-16 p-6">Stage not found.</div></div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{stage.name}</h1>
          <Link to="/world" className="text-sm underline">Back to World</Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Livestream</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded bg-muted flex items-center justify-center text-muted-foreground">
              {stage.isLive ? 'Live stream playing…' : 'Stage is offline (placeholder)'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Live Shopping</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            <div className="border rounded p-3 text-sm">Featured products will appear here during live shopping events.</div>
            <div className="border rounded p-3 text-sm">Chat placeholder.</div>
          </CardContent>
        </Card>
        {stage.sponsor && (
          <div className="text-xs text-muted-foreground">Sponsored by {stage.sponsor.name} · Tier {stage.sponsor.tier}</div>
        )}
        <Button asChild><Link to="/events">View Events</Link></Button>
      </div>
    </div>
  );
}
