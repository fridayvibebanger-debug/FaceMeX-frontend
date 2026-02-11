import { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useWorldStore } from '@/store/worldStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function WorldEventsPage() {
  const { events, stages, loadMock } = useWorldStore();
  useEffect(()=> { loadMock(); }, [loadMock]);

  const sorted = [...events].sort((a,b)=> (b.featured ? 1:0) - (a.featured ? 1:0) || a.startAt.localeCompare(b.startAt));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 max-w-5xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">World Events</h1>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {sorted.map(e => (
              <div key={e.id} className={`p-3 border rounded flex items-center justify-between gap-3 ${e.featured ? 'bg-yellow-50' : 'bg-card'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {e.banner && (
                    <img src={e.banner} alt={e.title} className="h-12 w-20 object-cover rounded border" />
                  )}
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{e.title}</div>
                    <Badge variant="secondary" className="capitalize">{e.type}</Badge>
                    {e.featured && <Badge className="bg-yellow-300">Featured</Badge>}
                    {e.sponsor && (
                      <Badge className="capitalize">
                        Sponsor: {e.sponsor.name} · {e.sponsor.tier}
                      </Badge>
                    )}
                    {Array.isArray(e.boothIds) && e.boothIds.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {e.boothIds.length} booth{e.boothIds.length>1?'s':''}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{new Date(e.startAt).toLocaleString()} {e.stageId ? `• Stage ${e.stageId}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={()=> window.location.assign(`/world/event/${e.id}`)}>Details</Button>
                  {e.stageId && <Button size="sm" onClick={()=> window.location.assign(`/world/stage/${e.stageId}`)}>Go to Stage</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
