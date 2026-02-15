import { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Draft { name: string; objective: string; budget: string; ts: string; lastRun?: string }

const readLS = (k: string) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const saveLS = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const impressionsFor = (rands: number) => Math.max(0, (rands || 0) * 10);

export default function AdsDraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>(() => Array.isArray(readLS('ads:campaigns')) ? readLS('ads:campaigns') : []);
  const [editing, setEditing] = useState<Record<number, Draft | null>>({});
  const [usage, setUsage] = useState<Array<any>>(() => Array.isArray(readLS('ads:usage')) ? readLS('ads:usage') : []);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [usageType, setUsageType] = useState<'all'|'buy_credits'|'run_campaign'|'quick_spend'>('all');
  const [usageSort, setUsageSort] = useState<'newest'|'oldest'|'spent_desc'>('newest');

  useEffect(() => {
    // ensure fresh from storage
    const d = Array.isArray(readLS('ads:campaigns')) ? readLS('ads:campaigns') : [];
    setDrafts(d);
    const u = Array.isArray(readLS('ads:usage')) ? readLS('ads:usage') : [];
    setUsage(u);
  }, []);

  const startEdit = (i: number) => setEditing({ ...editing, [i]: { ...drafts[i] } });
  const cancelEdit = (i: number) => setEditing({ ...editing, [i]: null });
  const applyEdit = (i: number) => {
    const e = editing[i];
    if (!e) return;
    const next = drafts.slice();
    next[i] = e;
    setDrafts(next);
    saveLS('ads:campaigns', next);
    setEditing({ ...editing, [i]: null });
  };
  const confirmDelete = (i: number) => { setConfirmIndex(i); setConfirmOpen(true); };
  const doDelete = () => {
    if (confirmIndex === null) return;
    const next = drafts.slice();
    next.splice(confirmIndex,1);
    setDrafts(next);
    saveLS('ads:campaigns', next);
    setConfirmOpen(false);
    setConfirmIndex(null);
  };

  const filteredUsage = (() => {
    let arr = Array.isArray(usage) ? usage.slice() : [];
    if (usageType !== 'all') arr = arr.filter(u => u.type === usageType);
    if (usageSort === 'newest') arr.sort((a,b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    else if (usageSort === 'oldest') arr.sort((a,b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    else if (usageSort === 'spent_desc') arr.sort((a,b) => (parseInt(b.spentImpressions||0,10) || 0) - (parseInt(a.spentImpressions||0,10) || 0));
    return arr;
  })();

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">All Draft Campaigns</h1>
          <Badge variant="secondary">Stored locally</Badge>
        </div>
        {/* Usage analytics */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Ad Usage</div>
            <div className="flex items-center gap-2">
              <select className="h-8 rounded-md border bg-background px-2 text-xs" value={usageType} onChange={(e)=> setUsageType(e.target.value as any)}>
                <option value="all">All</option>
                <option value="buy_credits">Buy credits</option>
                <option value="run_campaign">Run campaign</option>
                <option value="quick_spend">Quick spend</option>
              </select>
              <select className="h-8 rounded-md border bg-background px-2 text-xs" value={usageSort} onChange={(e)=> setUsageSort(e.target.value as any)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="spent_desc">Spent (desc)</option>
              </select>
            </div>
          </div>
          {filteredUsage.length === 0 ? (
            <div className="text-xs text-muted-foreground">No usage yet.</div>
          ) : (
            <div className="space-y-1">
              {filteredUsage.slice(0,10).map((e, i) => (
                <div key={`${e.ts}-${i}`} className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    {e.type === 'buy_credits' && `Bought ${e.impressions?.toLocaleString?.() || e.impressions} impressions (R${e.rands})`}
                    {e.type === 'run_campaign' && `Ran ${e.name} · Spent ${e.spentImpressions?.toLocaleString?.() || e.spentImpressions}`}
                    {e.type === 'quick_spend' && `Quick spend on ${e.name} · ${e.spentImpressions?.toLocaleString?.() || e.spentImpressions}`}
                  </span>
                  <span>{new Date(e.ts).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {drafts.length === 0 ? (
          <div className="text-sm text-muted-foreground">No drafts saved yet.</div>
        ) : (
          <div className="grid gap-3">
            {drafts.slice(0,10).map((d, i) => {
              const ed = editing[i];
              return (
                <Card key={`${d.ts}-${i}`}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{d.name}</span>
                      <span className="text-xs text-muted-foreground">Est {impressionsFor(parseInt((ed?.budget ?? d.budget) || '0',10)).toLocaleString()} impressions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    {ed ? (
                      <>
                        <Input placeholder="Name" value={ed.name} onChange={(e)=> setEditing({ ...editing, [i]: { ...ed, name: e.target.value } })} />
                        <Input placeholder="Objective" value={ed.objective} onChange={(e)=> setEditing({ ...editing, [i]: { ...ed, objective: e.target.value } })} />
                        <Input placeholder="Budget (R)" value={ed.budget} onChange={(e)=> setEditing({ ...editing, [i]: { ...ed, budget: e.target.value } })} />
                      </>
                    ) : (
                      <>
                        <div className="text-sm"><span className="font-medium">Objective:</span> {d.objective}</div>
                        <div className="text-sm"><span className="font-medium">Budget:</span> R{d.budget}</div>
                        {d.lastRun && <div className="text-xs text-muted-foreground">Last run: {new Date(d.lastRun).toLocaleString()}</div>}
                      </>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="text-xs text-muted-foreground">Saved: {new Date(d.ts).toLocaleString()}</div>
                    <div className="flex items-center gap-2">
                      {ed ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={()=> applyEdit(i)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={()=> cancelEdit(i)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={()=> startEdit(i)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={()=> confirmDelete(i)}>Delete</Button>
                        </>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Confirm delete dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete draft?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The selected draft will be permanently removed from this device.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={()=> setConfirmOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={doDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
