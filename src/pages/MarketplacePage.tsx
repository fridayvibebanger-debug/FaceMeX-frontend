import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

interface Product {
  id: string;
  title: string;
  price: number;
  currency: 'USD' | 'EUR' | 'ZAR';
  category: string;
  image: string;
  description: string;
  nft?: boolean;
}

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card'>('card');
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [creditsRand, setCreditsRand] = useState<number>(200);
  const [quickSpend, setQuickSpend] = useState<boolean>(false);
  const [quickSpendDraftIdx, setQuickSpendDraftIdx] = useState<number>(0);
  const [quickSpendImpr, setQuickSpendImpr] = useState<number>(0);
  const [campaignName, setCampaignName] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('Awareness');
  const [campaignBudget, setCampaignBudget] = useState('500');

  const products: Product[] = useMemo(() => [
    { id: 'p1', title: 'Neon Avatar Pack', price: 249, currency: 'ZAR', category: 'avatars', image: 'https://picsum.photos/seed/ava/400/300', description: 'Customizable neon avatar pack for your profile.', nft: true },
    { id: 'p2', title: 'Synthwave Backgrounds', price: 99, currency: 'ZAR', category: 'themes', image: 'https://picsum.photos/seed/bg/400/300', description: '10 high-res synthwave wallpapers.' },
    { id: 'p3', title: 'Streaming Overlay Kit', price: 189, currency: 'ZAR', category: 'overlays', image: 'https://picsum.photos/seed/ov/400/300', description: 'Overlay kit for live events and streams.' },
    { id: 'p4', title: 'Virtual Event VIP Pass', price: 399, currency: 'ZAR', category: 'tickets', image: 'https://picsum.photos/seed/vip/400/300', description: 'VIP access to exclusive live experiences.', nft: true },
  ], []);

  const filtered = useMemo(() => products.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.category.includes(query.toLowerCase())), [products, query]);

  const saveLS = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const readLS = (k: string) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
  const readUsage = () => { const v = readLS('ads:usage'); return Array.isArray(v) ? v : []; };
  const [usage, setUsage] = useState<Array<any>>(() => readUsage());
  const pushUsage = (e: any) => { const arr = readUsage(); arr.unshift({ ts: new Date().toISOString(), ...e }); const next = arr.slice(0, 50); saveLS('ads:usage', next); setUsage(next); };

  const [creditsBalance, setCreditsBalance] = useState<number>(() => readLS('ads:credits') || 0);
  const [drafts, setDrafts] = useState<Array<{ name: string; objective: string; budget: string; ts: string; lastRun?: string }>>(
    () => Array.isArray(readLS('ads:campaigns')) ? readLS('ads:campaigns') : []
  );
  const [showAllDrafts, setShowAllDrafts] = useState(false);

  const impressionsFor = (rands: number) => Math.max(0, (rands || 0) * 10);

  // Creator & Business Marketplace state
  type Gig = { id: string; title: string; rate: number; currency: 'USD'|'EUR'|'ZAR'; category: string; desc: string; skills: string };
  type Project = { id: string; title: string; budget: number; currency: 'USD'|'EUR'|'ZAR'; desc: string; skills: string; open: boolean };
  type Escrow = { id: string; kind: 'gig'|'project'; title: string; partyA: string; partyB: string; amount: number; currency: 'USD'|'EUR'|'ZAR'; status: 'draft'|'funded'|'released'|'refunded' };
  const readArr = (k: string) => Array.isArray(readLS(k)) ? readLS(k) as any[] : [];
  const [gigs, setGigs] = useState<Gig[]>(() => readArr('mp:gigs'));
  const [projects, setProjects] = useState<Project[]>(() => readArr('mp:projects'));
  const [escrows, setEscrows] = useState<Escrow[]>(() => readArr('mp:escrows'));
  const [escrowHist, setEscrowHist] = useState<Array<{ ts: string; id: string; action: string; title: string }>>(() => readArr('mp:escrows:hist'));
  const saveGigs = (arr: Gig[]) => { setGigs(arr); saveLS('mp:gigs', arr); };
  const saveProjects = (arr: Project[]) => { setProjects(arr); saveLS('mp:projects', arr); };
  const saveEscrows = (arr: Escrow[]) => { setEscrows(arr); saveLS('mp:escrows', arr); };
  const pushEscrowHist = (h: { id: string; action: string; title: string }) => {
    const next = [{ ts: new Date().toISOString(), ...h }, ...escrowHist].slice(0, 50);
    setEscrowHist(next); saveLS('mp:escrows:hist', next);
  };
  // Forms
  const [gigOpen, setGigOpen] = useState(false);
  const [gigTitle, setGigTitle] = useState('');
  const [gigRate, setGigRate] = useState<number>(25);
  const [gigCur, setGigCur] = useState<'USD'|'EUR'|'ZAR'>('ZAR');
  const [gigCat, setGigCat] = useState('design');
  const [gigDesc, setGigDesc] = useState('');
  const [gigSkills, setGigSkills] = useState('Figma, Branding');

  const [projOpen, setProjOpen] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projBudget, setProjBudget] = useState<number>(500);
  const [projCur, setProjCur] = useState<'USD'|'EUR'|'ZAR'>('ZAR');
  const [projDesc, setProjDesc] = useState('');
  const [projSkills, setProjSkills] = useState('Video editing, Motion');

  const [escrowOpen, setEscrowOpen] = useState(false);
  const [escKind, setEscKind] = useState<'gig'|'project'>('gig');
  const [escTitle, setEscTitle] = useState('');
  const [escA, setEscA] = useState('Client');
  const [escB, setEscB] = useState('Creator');
  const [escAmt, setEscAmt] = useState<number>(200);
  const [escCur, setEscCur] = useState<'USD'|'EUR'|'ZAR'>('ZAR');

  // Offers/Proposals
  type Note = { from: string; text: string; ts: string };
  type Offer = { id: string; gigId: string; from: string; amount: number; currency: 'USD'|'EUR'|'ZAR'; message?: string; ts: string; status: 'pending'|'accepted'|'rejected'; notes?: Note[] };
  type Proposal = { id: string; projectId: string; from: string; bid: number; currency: 'USD'|'EUR'|'ZAR'; message?: string; ts: string; status: 'pending'|'accepted'|'rejected'; notes?: Note[] };
  const [offers, setOffers] = useState<Offer[]>(() => readArr('mp:offers'));
  const [proposals, setProposals] = useState<Proposal[]>(() => readArr('mp:proposals'));
  const saveOffers = (arr: Offer[]) => { setOffers(arr); saveLS('mp:offers', arr); };
  const saveProposals = (arr: Proposal[]) => { setProposals(arr); saveLS('mp:proposals', arr); };
  // Offer modal
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerGigId, setOfferGigId] = useState<string>('');
  const [offerFrom, setOfferFrom] = useState('Business');
  const [offerAmt, setOfferAmt] = useState<number>(200);
  const [offerCur, setOfferCur] = useState<'USD'|'EUR'|'ZAR'>('ZAR');
  const [offerMsg, setOfferMsg] = useState('');
  // Offer thread modal (view offers for a gig)
  const [offerThreadOpen, setOfferThreadOpen] = useState(false);
  const [threadGigId, setThreadGigId] = useState<string>('');
  const [threadNote, setThreadNote] = useState('');
  // Proposal modal
  const [propOpen, setPropOpen] = useState(false);
  const [propProjectId, setPropProjectId] = useState<string>('');
  const [propFrom, setPropFrom] = useState('Creator');
  const [propBid, setPropBid] = useState<number>(300);
  const [propCur, setPropCur] = useState<'USD'|'EUR'|'ZAR'>('ZAR');
  const [propMsg, setPropMsg] = useState('');
  // Proposal thread modal (view proposals for a project)
  const [propThreadOpen, setPropThreadOpen] = useState(false);
  const [threadProjectId, setThreadProjectId] = useState<string>('');
  const [propThreadNote, setPropThreadNote] = useState('');
  // Payments setup modal
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  // Filters
  const [gigSkillFilter, setGigSkillFilter] = useState('');
  const [gigCatFilter, setGigCatFilter] = useState('');
  const [gigMinRate, setGigMinRate] = useState<number | ''>('');
  const [gigMaxRate, setGigMaxRate] = useState<number | ''>('');
  const [projSkillFilter, setProjSkillFilter] = useState('');
  const [projMinBudget, setProjMinBudget] = useState<number | ''>('');
  const [projMaxBudget, setProjMaxBudget] = useState<number | ''>('');

  const filteredGigs = useMemo(() => {
    return gigs.filter(g => {
      const skillOk = !gigSkillFilter || g.skills.toLowerCase().includes(gigSkillFilter.toLowerCase());
      const catOk = !gigCatFilter || g.category.toLowerCase().includes(gigCatFilter.toLowerCase());
      const minOk = gigMinRate === '' || g.rate >= Number(gigMinRate);
      const maxOk = gigMaxRate === '' || g.rate <= Number(gigMaxRate);
      return skillOk && catOk && minOk && maxOk;
    });
  }, [gigs, gigSkillFilter, gigCatFilter, gigMinRate, gigMaxRate]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const skillOk = !projSkillFilter || p.skills.toLowerCase().includes(projSkillFilter.toLowerCase());
      const minOk = projMinBudget === '' || p.budget >= Number(projMinBudget);
      const maxOk = projMaxBudget === '' || p.budget <= Number(projMaxBudget);
      return skillOk && minOk && maxOk;
    });
  }, [projects, projSkillFilter, projMinBudget, projMaxBudget]);

  const pay = (id: string) => {
    setProcessing(id);
    setTimeout(() => {
      toast({ title: 'Purchase confirmed', description: `Paid via ${paymentMethod.toUpperCase()}.` });
      setProcessing(null);
    }, 700);
  };

  const saveDrafts = (arr: typeof drafts) => {
    setDrafts(arr);
    saveLS('ads:campaigns', arr);
  };

  const runDraft = (index: number) => {
    const d = drafts[index];
    const needed = impressionsFor(parseInt(d.budget || '0', 10));
    if (!needed || needed <= 0) {
      toast({ title: 'Invalid budget', description: 'Set a positive budget to run this draft.' });
      return;
    }
    if (creditsBalance < needed) {
      toast({ title: 'Not enough credits', description: `Need ${needed.toLocaleString()} impressions, you have ${creditsBalance.toLocaleString()}. Buy more credits.` });
      return;
    }
    const newBal = creditsBalance - needed;
    setCreditsBalance(newBal);
    saveLS('ads:credits', newBal);
    try { window.dispatchEvent(new Event('ad-credits-updated')); } catch {}
    const updated = drafts.slice();
    updated[index] = { ...d, lastRun: new Date().toISOString() };
    saveDrafts(updated);
    pushUsage({ type: 'run_campaign', name: d.name, budgetR: parseInt(d.budget||'0',10), spentImpressions: needed, balance: newBal });
    toast({ title: 'Campaign running (mock)', description: `${d.name} launched · Spent ${needed.toLocaleString()} impressions · Remaining ${newBal.toLocaleString()}` });
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Search products..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="flex items-center gap-2 text-sm">
            <span>Pay with Card (ZAR):</span>
            <Button variant="default" onClick={() => setPaymentMethod('card')}>Card</Button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {creditsBalance > 0 && (
              <Badge variant="secondary">Ad Credits: {creditsBalance.toLocaleString()} impressions</Badge>
            )}
            <Button variant="secondary" onClick={() => setCreditsOpen(true)}>Buy Ad Credits</Button>
            <Button onClick={() => setCampaignOpen(true)}>Create Campaign</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(p => (
                <Card key={p.id} className="overflow-hidden">
                  <div className="aspect-video bg-black/5">
                    {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {p.title}
                      {p.nft && <Badge variant="secondary">NFT</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-muted-foreground">{p.description}</div>
                    <div className="font-semibold">R{p.price.toFixed(2)}</div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Badge>{p.category}</Badge>
                    <Button onClick={() => pay(p.id)} disabled={processing === p.id}>{processing === p.id ? 'Processing...' : 'Buy'}</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
          <div className="md:col-span-1">
            <div className="md:sticky md:top-28 space-y-3">
              {/* Drafts Panel */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">Draft Campaigns</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={()=> setCreditsOpen(true)}>Top up</Button>
                    <div className="text-xs text-muted-foreground">Stored locally</div>
                  </div>
                </div>
                {drafts.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No drafts yet. Create a campaign to save a draft.</div>
                ) : (
                  <div className="space-y-2">
                    {drafts.slice(0, showAllDrafts ? 10 : 5).map((d, i) => (
                      <div key={`${d.ts}-${i}`} className="flex items-center justify-between gap-2 p-2 rounded border">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{d.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{d.objective} · Budget R{d.budget} · Est {impressionsFor(parseInt(d.budget||'0',10)).toLocaleString()} impressions</div>
                          {d.lastRun && (
                            <div className="text-[11px] text-muted-foreground">Last run: {new Date(d.lastRun).toLocaleString()}</div>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={()=> runDraft(i)}>Run</Button>
                        </div>
                      </div>
                    ))}
                    {drafts.length > 5 && (
                      <div className="flex justify-center">
                        <Button size="sm" variant="ghost" onClick={()=> setShowAllDrafts(!showAllDrafts)}>
                          {showAllDrafts ? 'Collapse' : 'View all'}
                        </Button>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <a href="/ads/drafts" className="text-xs text-primary hover:underline">View all drafts →</a>
                    </div>
                  </div>
                )}
              </div>
              {/* Usage Panel */}
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">Ad Usage</div>
                  <div className="text-xs text-muted-foreground">Recent</div>
                </div>
                {(!usage || usage.length === 0) ? (
                  <div className="text-xs text-muted-foreground">No usage yet.</div>
                ) : (
                  <div className="space-y-1">
                    {usage.slice(0,5).map((e, i) => (
                      <div key={`${e.ts}-${i}`} className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>
                          {e.type === 'buy_credits' && `Bought ${e.impressions?.toLocaleString?.() || e.impressions}`}
                          {e.type === 'run_campaign' && `Ran ${e.name} · Spent ${e.spentImpressions?.toLocaleString?.() || e.spentImpressions}`}
                          {e.type === 'quick_spend' && `Quick spend · ${e.spentImpressions?.toLocaleString?.() || e.spentImpressions}`}
                        </span>
                        <span>{new Date(e.ts).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Creator Gigs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Offer services</div>
                <Button size="sm" onClick={()=> setGigOpen(true)}>New Gig</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Filter skills" value={gigSkillFilter} onChange={e=> setGigSkillFilter(e.target.value)} />
                <Input placeholder="Category" value={gigCatFilter} onChange={e=> setGigCatFilter(e.target.value)} />
                <Input type="number" placeholder="Min rate" value={gigMinRate as any} onChange={e=> setGigMinRate(e.target.value===''? '': parseFloat(e.target.value))} />
                <Input type="number" placeholder="Max rate" value={gigMaxRate as any} onChange={e=> setGigMaxRate(e.target.value===''? '': parseFloat(e.target.value))} />
              </div>
              {filteredGigs.length === 0 ? (
                <div className="text-xs text-muted-foreground">No gigs yet.</div>
              ) : (
                <div className="grid gap-2">
                  {filteredGigs.map(g => (
                    <div key={g.id} className="p-2 border rounded">
                      <div className="font-medium truncate">{g.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{g.category} · R{g.rate}/hr</div>
                      <div className="text-xs truncate">{g.skills}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="secondary" onClick={()=> { setOfferGigId(g.id); setOfferOpen(true); }}>Send Offer</Button>
                        <Button size="sm" variant="ghost" onClick={()=> { setThreadGigId(g.id); setOfferThreadOpen(true); }}>Offers</Button>
                        <Button size="sm" variant="outline" asChild><Link to="/messages">DM</Link></Button>
                        <Badge variant="outline" className="ml-auto text-[11px]">{offers.filter(o=>o.gigId===g.id).length} offer(s)</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Business Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Hire creators</div>
                <Button size="sm" onClick={()=> setProjOpen(true)}>New Project</Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input className="col-span-2" placeholder="Filter skills" value={projSkillFilter} onChange={e=> setProjSkillFilter(e.target.value)} />
                <div />
                <Input type="number" placeholder="Min budget" value={projMinBudget as any} onChange={e=> setProjMinBudget(e.target.value===''? '': parseFloat(e.target.value))} />
                <Input type="number" placeholder="Max budget" value={projMaxBudget as any} onChange={e=> setProjMaxBudget(e.target.value===''? '': parseFloat(e.target.value))} />
              </div>
              {filteredProjects.length === 0 ? (
                <div className="text-xs text-muted-foreground">No projects yet.</div>
              ) : (
                <div className="grid gap-2">
                  {filteredProjects.map(pj => (
                    <div key={pj.id} className="p-2 border rounded">
                      <div className="font-medium truncate">{pj.title}</div>
                      <div className="text-xs text-muted-foreground truncate">Budget R{pj.budget.toLocaleString()} · {pj.open ? 'Open' : 'Closed'}</div>
                      <div className="text-xs truncate">{pj.skills}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="secondary" onClick={()=> { setPropProjectId(pj.id); setPropOpen(true); }}>Submit Proposal</Button>
                        <Button size="sm" variant="ghost" onClick={()=> { setThreadProjectId(pj.id); setPropThreadOpen(true); }}>Proposals</Button>
                        <Button size="sm" variant="outline" asChild><Link to="/messages">DM</Link></Button>
                        <Badge variant="outline" className="ml-auto text-[11px]">{proposals.filter(p=>p.projectId===pj.id).length} proposal(s)</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Escrow (Mock)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Secure in-app payments</div>
                <Button size="sm" onClick={()=> setEscrowOpen(true)}>New Escrow</Button>
              </div>
              {escrows.length === 0 ? (
                <div className="text-xs text-muted-foreground">No escrows yet.</div>
              ) : (
                <div className="grid gap-2">
                  {escrows.map(es => (
                    <div key={es.id} className="p-2 border rounded">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{es.title}</div>
                        <Badge className="capitalize" variant={es.status==='funded'?'secondary':es.status==='released'?'default':'outline'}>{es.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{es.kind} · {es.partyA} → {es.partyB} · R{es.amount}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="outline" disabled={es.status!=='draft'} onClick={()=> {
                          const next = escrows.map(x=> x.id===es.id?{...x,status:'funded' as Escrow['status']}:x); saveEscrows(next); pushEscrowHist({ id: es.id, action: 'funded', title: es.title }); toast({ title: 'Escrow funded', description: es.title });
                        }}>Fund</Button>
                        <Button size="sm" variant="secondary" disabled={es.status!=='funded'} onClick={()=> {
                          const next = escrows.map(x=> x.id===es.id?{...x,status:'released' as Escrow['status']}:x); saveEscrows(next); pushEscrowHist({ id: es.id, action: 'released', title: es.title }); toast({ title: 'Funds released', description: es.title });
                        }}>Release</Button>
                        <Button size="sm" variant="ghost" disabled={!(es.status==='funded' || es.status==='draft')} onClick={()=> {
                          const next = escrows.map(x=> x.id===es.id?{...x,status:'refunded' as Escrow['status']}:x); saveEscrows(next); pushEscrowHist({ id: es.id, action: 'refunded', title: es.title }); toast({ title: 'Refunded', description: es.title });
                        }}>Refund</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Escrow Ledger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {escrowHist.length === 0 ? (
                <div className="text-xs text-muted-foreground">No activity yet.</div>
              ) : (
                <div className="space-y-1">
                  {escrowHist.slice(0,10).map((h,i)=> (
                    <div key={`${h.ts}-${i}`} className="flex items-center justify-between text-xs">
                      <span className="truncate">{h.title} · {h.action}</span>
                      <span className="text-muted-foreground">{new Date(h.ts).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={()=> setPaymentsOpen(true)}>Payments Setup</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Buy Ad Credits Modal */}
      <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buy Ad Credits</DialogTitle>
            <DialogDescription>Ad credits are used for Sponsored Posts, Story Ads, Search Ads, and Virtual World Ads.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Pricing: R200 = 2,000 impressions</div>
            <div className="grid grid-cols-3 gap-2">
              {[200, 500, 1000].map(v => (
                <Button key={v} variant={creditsRand===v?'default':'outline'} onClick={()=> setCreditsRand(v)}>R{v}</Button>
              ))}
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Custom amount (R)</label>
              <Input type="number" value={creditsRand} onChange={(e)=> setCreditsRand(parseInt(e.target.value || '0',10))} />
            </div>
            <div className="text-sm">Estimated reach: <span className="font-semibold">{impressionsFor(creditsRand).toLocaleString()}</span> impressions</div>
            <div className="border-t pt-3 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={quickSpend} onChange={(e)=> setQuickSpend(e.target.checked)} />
                Quick spend some of this purchase on a draft
              </label>
              {quickSpend && (
                <div className="grid gap-2">
                  <label className="text-sm">Select draft</label>
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={quickSpendDraftIdx} onChange={(e)=> setQuickSpendDraftIdx(parseInt(e.target.value,10))}>
                    {drafts.map((d, i)=> (
                      <option key={`${d.ts}-${i}`} value={i}>{d.name} · R{d.budget}</option>
                    ))}
                  </select>
                  <label className="text-sm">Spend impressions now</label>
                  <Input type="number" value={quickSpendImpr} onChange={(e)=> setQuickSpendImpr(parseInt(e.target.value||'0',10))} placeholder={`0 to ${impressionsFor(creditsRand)}`} />
                  <div className="text-xs text-muted-foreground">Tip: 1 Rand = 10 impressions. You can leave this at 0 to skip quick spend.</div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setCreditsOpen(false)}>Cancel</Button>
            <Button onClick={()=> { 
              setCreditsOpen(false); 
              let newBal = (creditsBalance || 0) + impressionsFor(creditsRand); 
              setCreditsBalance(newBal);
              saveLS('ads:credits', newBal);
              pushUsage({ type: 'buy_credits', rands: creditsRand, impressions: impressionsFor(creditsRand), balance: newBal });
              // optional quick spend
              if (quickSpend && quickSpendImpr > 0 && drafts[quickSpendDraftIdx]) {
                const spend = Math.min(quickSpendImpr, newBal);
                newBal = newBal - spend;
                setCreditsBalance(newBal);
                saveLS('ads:credits', newBal);
                try { window.dispatchEvent(new Event('ad-credits-updated')); } catch {}
                const updated = drafts.slice();
                const d = updated[quickSpendDraftIdx];
                updated[quickSpendDraftIdx] = { ...d, lastRun: new Date().toISOString() };
                saveDrafts(updated);
                pushUsage({ type: 'quick_spend', name: d.name, spentImpressions: spend, balance: newBal });
                toast({ title: 'Quick spend applied', description: `Spent ${spend.toLocaleString()} impressions on ${d.name}. New balance: ${newBal.toLocaleString()}` });
              } else {
                try { window.dispatchEvent(new Event('ad-credits-updated')); } catch {}
              }
              toast({ title: 'Ad credits added', description: `R${creditsRand} → ${impressionsFor(creditsRand).toLocaleString()} impressions. Balance: ${newBal.toLocaleString()}` });
            }}>Confirm Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Campaign Modal */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>Set up a simple campaign to run Sponsored Posts. This is a UI-only stub.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm">Name</label>
              <Input placeholder="e.g., Winter Awareness" value={campaignName} onChange={(e)=> setCampaignName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Objective</label>
              <Input placeholder="Awareness, Engagement, Conversions" value={campaignObjective} onChange={(e)=> setCampaignObjective(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Budget (R)</label>
              <Input placeholder="500" value={campaignBudget} onChange={(e)=> setCampaignBudget(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Creative Notes</label>
              <Textarea placeholder="Key message, audience, tone…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setCampaignOpen(false)}>Cancel</Button>
            <Button onClick={()=> { 
              setCampaignOpen(false); 
              const draft = { name: campaignName || 'Untitled', objective: campaignObjective, budget: campaignBudget, ts: new Date().toISOString() };
              const drafts = Array.isArray(readLS('ads:campaigns')) ? readLS('ads:campaigns') : [];
              drafts.unshift(draft);
              saveLS('ads:campaigns', drafts.slice(0,10));
              toast({ title: 'Draft saved', description: `${draft.name} (${draft.objective}), budget R${draft.budget}` });
            }}>Save Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Gig Modal */}
      <Dialog open={gigOpen} onOpenChange={setGigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Gig</DialogTitle>
            <DialogDescription>Offer a service as a freelancer creator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={gigTitle} onChange={e=> setGigTitle(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Rate" value={gigRate} onChange={e=> setGigRate(parseFloat(e.target.value||'0'))} />
              <select className="h-9 rounded-md border bg-background px-2" value={gigCur} onChange={e=> setGigCur(e.target.value as any)}>
                <option value="ZAR">ZAR</option>
              </select>
              <Input placeholder="Category" value={gigCat} onChange={e=> setGigCat(e.target.value)} />
            </div>
            <Textarea placeholder="Description" value={gigDesc} onChange={e=> setGigDesc(e.target.value)} />
            <Input placeholder="Skills (comma separated)" value={gigSkills} onChange={e=> setGigSkills(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setGigOpen(false)}>Cancel</Button>
            <Button onClick={()=> {
              if (!gigTitle.trim()) { toast({ title: 'Title required' }); return; }
              const next = [{ id: `g${Date.now()}`, title: gigTitle, rate: gigRate, currency: gigCur, category: gigCat, desc: gigDesc, skills: gigSkills }, ...gigs];
              saveGigs(next); setGigOpen(false); setGigTitle(''); setGigDesc('');
              toast({ title: 'Gig created', description: gigTitle });
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Modal */}
      <Dialog open={projOpen} onOpenChange={setProjOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Post a project to hire creators.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={projTitle} onChange={e=> setProjTitle(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Budget" value={projBudget} onChange={e=> setProjBudget(parseFloat(e.target.value||'0'))} />
              <select className="h-9 rounded-md border bg-background px-2" value={projCur} onChange={e=> setProjCur(e.target.value as any)}>
                <option value="ZAR">ZAR</option>
              </select>
              <div className="flex items-center text-xs text-muted-foreground">Fixed price</div>
            </div>
            <Textarea placeholder="Description" value={projDesc} onChange={e=> setProjDesc(e.target.value)} />
            <Input placeholder="Skills (comma separated)" value={projSkills} onChange={e=> setProjSkills(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setProjOpen(false)}>Cancel</Button>
            <Button onClick={()=> {
              if (!projTitle.trim()) { toast({ title: 'Title required' }); return; }
              const next = [{ id: `j${Date.now()}`, title: projTitle, budget: projBudget, currency: projCur, desc: projDesc, skills: projSkills, open: true }, ...projects];
              saveProjects(next); setProjOpen(false); setProjTitle(''); setProjDesc('');
              toast({ title: 'Project posted', description: projTitle });
            }}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Escrow Modal */}
      <Dialog open={escrowOpen} onOpenChange={setEscrowOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Escrow</DialogTitle>
            <DialogDescription>Secure a payment between a client and a creator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select className="h-9 rounded-md border bg-background px-2" value={escKind} onChange={e=> setEscKind(e.target.value as any)}>
                <option value="gig">Gig</option>
                <option value="project">Project</option>
              </select>
              <Input placeholder="Title" value={escTitle} onChange={e=> setEscTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Payer (Client)" value={escA} onChange={e=> setEscA(e.target.value)} />
              <Input placeholder="Payee (Creator)" value={escB} onChange={e=> setEscB(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Amount" value={escAmt} onChange={e=> setEscAmt(parseFloat(e.target.value||'0'))} />
              <select className="h-9 rounded-md border bg-background px-2" value={escCur} onChange={e=> setEscCur(e.target.value as any)}>
                <option value="ZAR">ZAR</option>
              </select>
              <div className="flex items-center text-xs text-muted-foreground">Held until release</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setEscrowOpen(false)}>Cancel</Button>
            <Button onClick={()=> {
              if (!escTitle.trim()) { toast({ title: 'Title required' }); return; }
              const next = [{ id: `e${Date.now()}`, kind: escKind, title: escTitle, partyA: escA, partyB: escB, amount: escAmt, currency: escCur, status: 'draft' as const }, ...escrows];
              saveEscrows(next); setEscrowOpen(false); setEscTitle('');
              toast({ title: 'Escrow created', description: escTitle });
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Offer Modal */}
      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Offer</DialogTitle>
            <DialogDescription>Send a custom offer to the creator for this gig.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="From (Business)" value={offerFrom} onChange={e=> setOfferFrom(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Amount" value={offerAmt} onChange={e=> setOfferAmt(parseFloat(e.target.value||'0'))} />
              <select className="h-9 rounded-md border bg-background px-2" value={offerCur} onChange={e=> setOfferCur(e.target.value as any)}>
                <option value="ZAR">ZAR</option>
              </select>
              <div className="flex items-center text-xs text-muted-foreground">One-time</div>
            </div>
            <Textarea placeholder="Message (optional)" value={offerMsg} onChange={e=> setOfferMsg(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setOfferOpen(false)}>Cancel</Button>
            <Button onClick={()=> {
              if (!offerGigId) { setOfferOpen(false); return; }
              const next = [{ id: `o${Date.now()}`, gigId: offerGigId, from: offerFrom, amount: offerAmt, currency: offerCur, message: offerMsg, ts: new Date().toISOString(), status: 'pending' as const, notes: [] }, ...offers];
              saveOffers(next);
              setOfferOpen(false); setOfferMsg('');
              toast({ title: 'Offer sent', description: `R${offerAmt}` });
            }}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Proposal Modal */}
      <Dialog open={propOpen} onOpenChange={setPropOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Proposal</DialogTitle>
            <DialogDescription>Apply to this project with your bid and message.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="From (Creator)" value={propFrom} onChange={e=> setPropFrom(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Bid" value={propBid} onChange={e=> setPropBid(parseFloat(e.target.value||'0'))} />
              <select className="h-9 rounded-md border bg-background px-2" value={propCur} onChange={e=> setPropCur(e.target.value as any)}>
                <option value="ZAR">ZAR</option>
              </select>
              <div className="flex items-center text-xs text-muted-foreground">Fixed bid</div>
            </div>
            <Textarea placeholder="Message (optional)" value={propMsg} onChange={e=> setPropMsg(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setPropOpen(false)}>Cancel</Button>
            <Button onClick={()=> {
              if (!propProjectId) { setPropOpen(false); return; }
              const next = [{ id: `p${Date.now()}`, projectId: propProjectId, from: propFrom, bid: propBid, currency: propCur, message: propMsg, ts: new Date().toISOString(), status: 'pending' as const, notes: [] }, ...proposals];
              saveProposals(next);
              setPropOpen(false); setPropMsg('');
              toast({ title: 'Proposal submitted', description: `R${propBid}` });
            }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offers Thread Modal */}
      <Dialog open={offerThreadOpen} onOpenChange={setOfferThreadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Offers</DialogTitle>
            <DialogDescription>Review and manage offers for this gig.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {offers.filter(o=> o.gigId===threadGigId).length === 0 ? (
              <div className="text-xs text-muted-foreground">No offers yet.</div>
            ) : (
              <div className="space-y-2">
                {offers.filter(o=> o.gigId===threadGigId).map(o => (
                  <div key={o.id} className="p-2 border rounded text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{o.from} · R{o.amount}</div>
                      <Badge variant={o.status==='accepted'?'default':o.status==='rejected'?'destructive':'secondary'} className="capitalize">{o.status}</Badge>
                    </div>
                    {o.message && <div className="text-xs text-muted-foreground mt-1">{o.message}</div>}
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" variant="outline" asChild><Link to="/messages">DM</Link></Button>
                      <Button size="sm" disabled={o.status!=='pending'} onClick={()=> { const next = offers.map(x=> x.id===o.id?{...x,status:'accepted' as const}:x); saveOffers(next); toast({ title: 'Offer accepted' }); }}>Accept</Button>
                      <Button size="sm" variant="ghost" disabled={o.status!=='pending'} onClick={()=> { const next = offers.map(x=> x.id===o.id?{...x,status:'rejected' as const}:x); saveOffers(next); toast({ title: 'Offer rejected' }); }}>Reject</Button>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 items-start">
                      <Input className="col-span-3" placeholder="Add note" value={threadNote} onChange={e=> setThreadNote(e.target.value)} />
                      <Button size="sm" onClick={()=> {
                        if (!threadNote.trim()) return;
                        const note: Note = { from: 'You', text: threadNote, ts: new Date().toISOString() };
                        const next = offers.map(x=> x.id===o.id?{...x, notes: [...(x.notes||[]), note]}:x);
                        saveOffers(next); setThreadNote('');
                      }}>Add</Button>
                    </div>
                    {o.notes && o.notes.length>0 && (
                      <div className="mt-2 space-y-1">
                        {o.notes.map((n,i)=> (
                          <div key={`${n.ts}-${i}`} className="text-[11px] text-muted-foreground">{n.from}: {n.text}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Proposals Thread Modal */}
      <Dialog open={propThreadOpen} onOpenChange={setPropThreadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Proposals</DialogTitle>
            <DialogDescription>Review and manage proposals for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {proposals.filter(p=> p.projectId===threadProjectId).length === 0 ? (
              <div className="text-xs text-muted-foreground">No proposals yet.</div>
            ) : (
              <div className="space-y-2">
                {proposals.filter(p=> p.projectId===threadProjectId).map(p => (
                  <div key={p.id} className="p-2 border rounded text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{p.from} · R{p.bid}</div>
                      <Badge variant={p.status==='accepted'?'default':p.status==='rejected'?'destructive':'secondary'} className="capitalize">{p.status}</Badge>
                    </div>
                    {p.message && <div className="text-xs text-muted-foreground mt-1">{p.message}</div>}
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" variant="outline" asChild><Link to="/messages">DM</Link></Button>
                      <Button size="sm" disabled={p.status!=='pending'} onClick={()=> { const next = proposals.map(x=> x.id===p.id?{...x,status:'accepted' as const}:x); saveProposals(next); toast({ title: 'Proposal accepted' }); }}>Accept</Button>
                      <Button size="sm" variant="ghost" disabled={p.status!=='pending'} onClick={()=> { const next = proposals.map(x=> x.id===p.id?{...x,status:'rejected' as const}:x); saveProposals(next); toast({ title: 'Proposal rejected' }); }}>Reject</Button>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 items-start">
                      <Input className="col-span-3" placeholder="Add note" value={propThreadNote} onChange={e=> setPropThreadNote(e.target.value)} />
                      <Button size="sm" onClick={()=> {
                        if (!propThreadNote.trim()) return;
                        const note: Note = { from: 'You', text: propThreadNote, ts: new Date().toISOString() };
                        const next = proposals.map(x=> x.id===p.id?{...x, notes: [...(x.notes||[]), note]}:x);
                        saveProposals(next); setPropThreadNote('');
                      }}>Add</Button>
                    </div>
                    {p.notes && p.notes.length>0 && (
                      <div className="mt-2 space-y-1">
                        {p.notes.map((n,i)=> (
                          <div key={`${n.ts}-${i}`} className="text-[11px] text-muted-foreground">{n.from}: {n.text}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payments Setup Modal (Stripe/Paystack stub) */}
      <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payments Setup</DialogTitle>
            <DialogDescription>Connect to Stripe or Paystack. This is a UI stub.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={()=> toast({ title: 'Stripe connect', description: 'Redirect to Stripe Connect (stub).' })}>Connect Stripe</Button>
              <Button variant="outline" onClick={()=> toast({ title: 'Paystack connect', description: 'Redirect to Paystack (stub).' })}>Connect Paystack</Button>
            </div>
            <div className="text-xs text-muted-foreground">Later, replace with your backend OAuth/Connect flow and secure webhooks.</div>
          </div>
          <DialogFooter>
            <Button onClick={()=> setPaymentsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
