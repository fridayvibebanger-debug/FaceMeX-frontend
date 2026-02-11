import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { useWorldStore } from '@/store/worldStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BoothPage() {
  const { id } = useParams();
  const { getBooth, loadMock, events, getStage } = useWorldStore();
  useEffect(()=> { loadMock(); }, [loadMock]);
  const booth = getBooth(id as string);

  if (!booth) return (
    <div className="min-h-screen bg-background"><Navbar /><div className="pt-16 p-6">Booth not found.</div></div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{booth.name}</h1>
          <Link to="/world" className="text-sm underline">Back to World</Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <img src={booth.brandAvatar} className="h-10 w-10 rounded-full" />
              <div className="text-muted-foreground">{booth.description || 'Brand booth'}</div>
            </div>
            <div className="text-xs">Zone {booth.location.zone} · Tile ({booth.location.x},{booth.location.y}) · Tier {booth.sponsorTier}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            {booth.products.map(p => {
              const hasLiveShopping = events.some(e =>
                e.type === 'live-shopping' &&
                Array.isArray(e.boothIds) &&
                e.boothIds.includes(booth.id) &&
                e.stageId &&
                !!getStage(e.stageId)?.isLive
              );
              return (
                <div key={p.id} className="border rounded p-3 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {p.image && <img src={p.image} className="h-10 w-10 rounded object-cover" />}
                    <div className="truncate pr-2">{p.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">R{p.price.toFixed(2)}</div>
                    <Button size="sm" variant="outline">{hasLiveShopping ? 'Buy Live' : 'Buy'}</Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        {(() => {
          const upcoming = events.filter(e => Array.isArray(e.boothIds) && e.boothIds.includes(booth.id) && new Date(e.startAt).getTime() >= Date.now());
          if (upcoming.length === 0) return null;
          return (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {upcoming.map(e => (
                  <div key={e.id} className="border rounded p-2 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{new Date(e.startAt).toLocaleString()}</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] capitalize">{e.type.replace('-', ' ')}</span>
                        {e.stageId && getStage(e.stageId)?.isLive && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px]">LIVE</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline"><Link to={`/world/event/${e.id}`}>Details</Link></Button>
                      {e.stageId && <Button asChild size="sm"><Link to={`/world/stage/${e.stageId}`}>Stage</Link></Button>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()}
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild><Link to={`/messages`}>DM Brand</Link></Button>
          <Button variant="secondary">Follow</Button>
          <Button asChild><Link to="/world/manage">Rent a Booth</Link></Button>
        </div>
      </div>
    </div>
  );
}
