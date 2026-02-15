import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useWorldStore, Booth, WorldEvent, SponsorTier } from '@/store/worldStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function WorldManagePage() {
  const { booths, stages, events, loadMock, addBooth, updateBooth, removeBooth, addEvent, updateEvent, removeEvent, quoteSponsorship } = useWorldStore();
  useEffect(()=> { loadMock(); }, [loadMock]);

  // Booth form state
  const [bName, setBName] = useState('');
  const [bAvatar, setBAvatar] = useState('');
  const [bDesc, setBDesc] = useState('');
  const [bZone, setBZone] = useState('A');
  const [bX, setBX] = useState(1);
  const [bY, setBY] = useState(1);
  const [bTier, setBTier] = useState<SponsorTier>('free');

  // Event form state
  const [eTitle, setETitle] = useState('');
  const [eType, setEType] = useState<'live-shopping'|'concert'|'expo'|'showcase'>('live-shopping');
  const [eStart, setEStart] = useState<string>('');
  const [eStageId, setEStageId] = useState<string>('');
  const [eBanner, setEBanner] = useState<string>('');
  const [eBoothIds, setEBoothIds] = useState<string[]>([]);

  const addBoothSubmit = () => {
    if (!bName) return;
    addBooth({
      name: bName,
      brandAvatar: bAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=brand',
      description: bDesc,
      banner: undefined,
      location: { x: Math.max(1, bX), y: Math.max(1, bY), zone: bZone || 'A' },
      sponsorTier: bTier,
      products: [],
      links: {},
    });
    setBName(''); setBAvatar(''); setBDesc(''); setBX(1); setBY(1); setBTier('free');
  };

  const addEventSubmit = () => {
    if (!eTitle || !eStart) return;
    addEvent({
      title: eTitle,
      type: eType,
      startAt: new Date(eStart).toISOString(),
      endAt: undefined,
      stageId: eStageId || undefined,
      boothIds: eBoothIds,
      sponsor: undefined,
      banner: eBanner || undefined,
    });
    setETitle(''); setEStart('');
    setEBanner(''); setEBoothIds([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 max-w-6xl mx-auto p-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Booth</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Name" value={bName} onChange={e=>setBName(e.target.value)} />
            <Input placeholder="Avatar URL" value={bAvatar} onChange={e=>setBAvatar(e.target.value)} />
            <Textarea placeholder="Description" value={bDesc} onChange={e=>setBDesc(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" min={1} placeholder="X" value={bX} onChange={e=>setBX(parseInt(e.target.value||'1',10))} />
              <Input type="number" min={1} placeholder="Y" value={bY} onChange={e=>setBY(parseInt(e.target.value||'1',10))} />
              <Input placeholder="Zone" value={bZone} onChange={e=>setBZone(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="h-9 rounded-md border bg-background px-2" value={bTier} onChange={e=>setBTier(e.target.value as SponsorTier)}>
                <option value="free">Free</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
              </select>
              <Button onClick={addBoothSubmit}>Add Booth</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={eTitle} onChange={e=>setETitle(e.target.value)} />
            <select className="h-9 rounded-md border bg-background px-2" value={eType} onChange={e=>setEType(e.target.value as any)}>
              <option value="live-shopping">Live shopping</option>
              <option value="concert">Concert</option>
              <option value="expo">Expo</option>
              <option value="showcase">Showcase</option>
            </select>
            <Input type="datetime-local" value={eStart} onChange={e=>setEStart(e.target.value)} />
            <select className="h-9 rounded-md border bg-background px-2" value={eStageId} onChange={e=>setEStageId(e.target.value)}>
              <option value="">Stage (optional)</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-sm">Attach booths (hold Ctrl/Cmd to multi-select)</label>
                <select multiple className="w-full h-24 rounded-md border bg-background px-2" value={eBoothIds} onChange={e=> setEBoothIds(Array.from(e.target.selectedOptions).map(o=>o.value))}>
                  {booths.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Input placeholder="Promo banner URL (optional)" value={eBanner} onChange={e=>setEBanner(e.target.value)} />
              </div>
            </div>
            <Button onClick={addEventSubmit}>Add Event</Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Booths</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            {booths.map(b => (
              <div key={b.id} className="border rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{b.name} <span className="text-xs text-muted-foreground">({b.location.zone} {b.location.x},{b.location.y})</span></div>
                  <div className="flex items-center gap-2">
                    <select className="h-8 rounded-md border bg-background px-2 text-xs" value={b.sponsorTier} onChange={e=>updateBooth(b.id, { sponsorTier: e.target.value as SponsorTier })}>
                      <option value="free">Free</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                    </select>
                    <Button size="sm" variant="outline" onClick={()=>removeBooth(b.id)}>Delete</Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-2">{b.description}</div>
                <div className="mt-2">
                  <div className="font-medium mb-1">Products</div>
                  <div className="grid gap-2">
                    {b.products.map(p => (
                      <div key={p.id} className="flex items-center justify-between border rounded p-2">
                        <div className="flex items-center gap-2 pr-2 min-w-0">
                          {p.image && <img src={p.image} className="h-8 w-8 rounded object-cover" />}
                          <Input defaultValue={p.name} id={`pname-edit-${b.id}-${p.id}`} className="h-8 text-xs" />
                          <Input defaultValue={p.price} type="number" step="0.01" id={`pprice-edit-${b.id}-${p.id}`} className="h-8 text-xs w-24" />
                          <Input defaultValue={p.image || ''} placeholder="Image URL" id={`pimg-edit-${b.id}-${p.id}`} className="h-8 text-xs" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={()=> {
                            const n = (document.getElementById(`pname-edit-${b.id}-${p.id}`) as HTMLInputElement | null)?.value?.trim() || p.name;
                            const pv = (document.getElementById(`pprice-edit-${b.id}-${p.id}`) as HTMLInputElement | null)?.value || String(p.price);
                            const price = parseFloat(pv);
                            const img = (document.getElementById(`pimg-edit-${b.id}-${p.id}`) as HTMLInputElement | null)?.value || p.image;
                            if (!n || isNaN(price)) return;
                            useWorldStore.getState().updateBoothProduct(b.id, p.id, { name: n, price, image: img });
                          }}>Save</Button>
                          <Button size="sm" variant="outline" onClick={()=> useWorldStore.getState().removeBoothProduct(b.id, p.id)}>Remove</Button>
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Product name" id={`pname-${b.id}`} className="col-span-2" />
                      <Input placeholder="Price" type="number" min={0} step="0.01" id={`pprice-${b.id}`} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Image URL (optional)" id={`pimg-${b.id}`} className="col-span-3" />
                    </div>
                    <div>
                      <Button size="sm" onClick={()=> {
                        const n = (document.getElementById(`pname-${b.id}`) as HTMLInputElement | null)?.value?.trim() || '';
                        const pv = (document.getElementById(`pprice-${b.id}`) as HTMLInputElement | null)?.value || '';
                        const price = parseFloat(pv);
                        const img = (document.getElementById(`pimg-${b.id}`) as HTMLInputElement | null)?.value || undefined;
                        if (!n || isNaN(price)) return;
                        useWorldStore.getState().addBoothProduct(b.id, { name: n, price, image: img });
                        const ne = document.getElementById(`pname-${b.id}`) as HTMLInputElement | null; if (ne) ne.value = '';
                        const pe = document.getElementById(`pprice-${b.id}`) as HTMLInputElement | null; if (pe) pe.value = '';
                        const ie = document.getElementById(`pimg-${b.id}`) as HTMLInputElement | null; if (ie) ie.value = '';
                      }}>Add Product</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            {events.map(e => (
              <div key={e.id} className="border rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{e.title} <span className="text-xs text-muted-foreground">{new Date(e.startAt).toLocaleString()}</span></div>
                  <div className="flex items-center gap-2">
                    <select className="h-8 rounded-md border bg-background px-2 text-xs" value={e.type} onChange={evt=>updateEvent(e.id, { type: evt.target.value as any })}>
                      <option value="live-shopping">Live shopping</option>
                      <option value="concert">Concert</option>
                      <option value="expo">Expo</option>
                      <option value="showcase">Showcase</option>
                    </select>
                    <Button size="sm" onClick={()=> useWorldStore.getState().toggleFeatured(e.id)}>{e.featured ? 'Unfeature' : 'Feature'}</Button>
                    <Button size="sm" variant="outline" onClick={()=>removeEvent(e.id)}>Delete</Button>
                  </div>
                </div>
                {e.stageId && <div className="text-xs">Stage: {e.stageId}</div>}
                {e.featured && <div className="text-[10px] inline-block mt-1 px-2 py-0.5 rounded bg-yellow-200">Featured</div>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Sponsorship Pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['free','bronze','silver','gold'] as SponsorTier[]).map(tier => {
              const q = quoteSponsorship(tier, 30);
              return (
                <div key={tier} className="border rounded p-3 text-sm text-center">
                  <div className="font-medium capitalize">{tier}</div>
                  <div className="text-xs text-muted-foreground">{q.days} days</div>
                  <div className="text-base">R{q.priceZAR}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Rent a Booth (Mock Checkout)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="grid md:grid-cols-4 gap-2 items-center">
              <div className="md:col-span-2">
                <select id="rent-tier" className="h-9 rounded-md border bg-background px-2 w-full">
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
              </div>
              <Input id="rent-days" type="number" min={7} defaultValue={30} />
              <div className="col-span-2 md:col-span-4 flex items-center gap-3">
                <label className="flex items-center gap-2"><input type="checkbox" id="rent-use-credits" defaultChecked /> Use Ad Credits</label>
                <div className="text-xs text-muted-foreground">Current credits: R{(() => { try { const raw = localStorage.getItem('ads:credits'); return raw ? JSON.parse(raw) : 0; } catch { return 0; } })()}</div>
              </div>
              <Button onClick={()=> {
                const tier = (document.getElementById('rent-tier') as HTMLSelectElement).value as SponsorTier;
                const days = parseInt(((document.getElementById('rent-days') as HTMLInputElement).value)||'30',10) || 30;
                const q = quoteSponsorship(tier, days);
                // mock credit deduction from localStorage 'ads:credits'
                try {
                  const useCredits = (document.getElementById('rent-use-credits') as HTMLInputElement | null)?.checked;
                  if (useCredits) {
                    const raw = localStorage.getItem('ads:credits');
                    const cur = raw ? JSON.parse(raw) as number : 0;
                    if (cur < q.priceZAR) {
                      alert(`Not enough credits. Need R${q.priceZAR}, have R${cur}.`);
                      return;
                    }
                    localStorage.setItem('ads:credits', String(cur - q.priceZAR));
                    alert(`Success! R${q.priceZAR} deducted. Tier ${tier} for ${days} days.`);
                  } else {
                    alert(`Simulated purchase: R${q.priceZAR}.`);
                  }
                } catch {
                  alert(`Checkout mock: R${q.priceZAR}.`);
                }
              }}>Checkout</Button>
            </div>
            <div className="text-xs text-muted-foreground">This is a mock checkout that deducts from your Ad Credits (localStorage) if available.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
