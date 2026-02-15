import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { useWorldStore } from '@/store/worldStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function WorldEventDetailPage() {
  const { id } = useParams();
  const { events, getStage, getBooth, loadMock } = useWorldStore();
  useEffect(()=> { loadMock(); }, [loadMock]);
  const e = events.find(ev => ev.id === (id as string));
  const stage = e?.stageId ? getStage(e.stageId) : undefined;

  if (!e) return (
    <div className="min-h-screen bg-background"><Navbar /><div className="pt-16 p-6">Event not found.</div></div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 max-w-4xl mx-auto p-4 space-y-4">
        {e.banner && (
          <div className="w-full overflow-hidden rounded-md border">
            <img src={e.banner} alt={e.title} className="w-full h-48 md:h-64 object-cover" />
          </div>
        )}
        {(e.sponsor || e.featured) && (
          <div className="w-full rounded-md border px-3 py-2 flex items-center justify-between text-sm bg-card">
            <div className="flex items-center gap-2">
              {e.sponsor && (
                <span className="inline-flex items-center gap-2">
                  <span className="text-muted-foreground">Sponsored by</span>
                  <span className="font-medium">{e.sponsor.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${
                    e.sponsor.tier==='gold' ? 'bg-yellow-300' : e.sponsor.tier==='silver' ? 'bg-slate-200' : e.sponsor.tier==='bronze' ? 'bg-amber-200' : 'bg-gray-100'
                  }`}>{e.sponsor.tier}</span>
                </span>
              )}
            </div>
            {e.featured && <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-200">Featured</span>}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="truncate">{e.title}</span>
              <Badge variant="secondary" className="capitalize">{e.type}</Badge>
              {e.featured && <Badge className="bg-yellow-300">Featured</Badge>}
            </h1>
            {e.boothIds && e.boothIds.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {e.boothIds.map(bid => {
                  const b = getBooth(bid);
                  if (!b) return null;
                  return (
                    <Link key={bid} to={`/world/booth/${bid}`} className="text-[11px] px-2 py-0.5 rounded border bg-card hover:bg-accent inline-flex items-center gap-1">
                      <img src={b.brandAvatar} className="h-4 w-4 rounded" />
                      <span className="truncate max-w-[120px]">{b.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <Link to="/world" className="text-sm underline">Back to World</Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Date: {new Date(e.startAt).toLocaleString()}</div>
            {stage && <div>Stage: <Link to={`/world/stage/${stage.id}`} className="underline">{stage.name}</Link></div>}
            <div className="text-xs text-muted-foreground">This is a mock event for the Metaverse MVP.</div>
          </CardContent>
        </Card>
        {e.boothIds && e.boothIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Attached Booths</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-2">
              {e.boothIds.map(bid => {
                const b = getBooth(bid);
                if (!b) return null;
                return (
                  <Link key={bid} to={`/world/booth/${bid}`} className="border rounded p-2 flex items-center gap-3 hover:bg-accent">
                    <img src={b.brandAvatar} className="h-8 w-8 rounded object-cover" />
                    <div className="text-sm">
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">Zone {b.location.zone} · ({b.location.x},{b.location.y})</div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
        <div className="flex items-center gap-2">
          {stage && <Button asChild><Link to={`/world/stage/${stage.id}`}>Go to Stage</Link></Button>}
          <Button asChild variant="outline"><Link to="/world/events">All Events</Link></Button>
        </div>
      </div>
    </div>
  );
}
