import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useUserStore } from '@/store/userStore';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { Lock, Sparkles, Wand2, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/layout/Navbar';

export default function EmpowermentToolsPage() {
  const { hasTier } = useUserStore();
  const navigate = useNavigate();
  // Personal Development
  const [goal, setGoal] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [journal, setJournal] = useState('');
  const [mindfulOn, setMindfulOn] = useState(false);
  const [proInput, setProInput] = useState('');
  const [proOutput, setProOutput] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [creatorGoal, setCreatorGoal] = useState('');
  const [assistantAudience, setAssistantAudience] = useState('');
  const [assistantTopic, setAssistantTopic] = useState('');
  const [creatorOutput, setCreatorOutput] = useState<string | null>(null);
  const [businessOutput, setBusinessOutput] = useState<string | null>(null);
  const [proAttempted, setProAttempted] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignBudget, setCampaignBudget] = useState('');
  const [campaignSchedule, setCampaignSchedule] = useState('');
  const [persistence, setPersistence] = useState<{ mode: string; error?: string | null } | null>(null);
  const [hasSavedPro, setHasSavedPro] = useState(false);
  const [hasSavedCreator, setHasSavedCreator] = useState(false);
  const [hasSavedBusiness, setHasSavedBusiness] = useState(false);
  const [proSelected, setProSelected] = useState<string>('');
  const [creatorSelected, setCreatorSelected] = useState<string>('');
  const [businessSelected, setBusinessSelected] = useState<string>('');
  // Filters, tags, and import states
  const [proFilter, setProFilter] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [proTags, setProTags] = useState('');
  const [creatorTags, setCreatorTags] = useState('');
  const [businessTags, setBusinessTags] = useState('');
  const [proImportOpen, setProImportOpen] = useState(false);
  const [creatorImportOpen, setCreatorImportOpen] = useState(false);
  const [businessImportOpen, setBusinessImportOpen] = useState(false);
  const [proImportParsed, setProImportParsed] = useState<any[]>([]);
  const [creatorImportParsed, setCreatorImportParsed] = useState<any[]>([]);
  const [businessImportParsed, setBusinessImportParsed] = useState<any[]>([]);
  const [proImportSel, setProImportSel] = useState<Record<string, boolean>>({});
  const [creatorImportSel, setCreatorImportSel] = useState<Record<string, boolean>>({});
  const [businessImportSel, setBusinessImportSel] = useState<Record<string, boolean>>({});
  const [proImportText, setProImportText] = useState('');
  const [creatorImportText, setCreatorImportText] = useState('');
  const [businessImportText, setBusinessImportText] = useState('');
  const [deepseekPrompt, setDeepseekPrompt] = useState('');
  const [deepseekReply, setDeepseekReply] = useState<string | null>(null);
  const [deepseekBusy, setDeepseekBusy] = useState(false);

  const PD_GOALS_KEY = 'faceme:tools:personal_dev:goals_v1';
  const PD_JOURNAL_KEY = 'faceme:tools:personal_dev:journal_v1';
  const PD_MINDFUL_KEY = 'faceme:tools:personal_dev:mindful_on_v1';

  const saveLS = (k: string, v: any) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  };

  const getAiProvider = () => {
    try {
      const stored = localStorage.getItem('settings:aiProvider');
      if (stored === 'local' || stored === 'openai') return stored;
    } catch {}
    return import.meta.env.VITE_USE_LOCAL_AI === 'false' ? 'openai' : 'local';
  };
  const readLS = (k: string) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; }
  };
  const readHist = (k: string) => Array.isArray(readLS(k)) ? readLS(k) as any[] : [];
  const writeHist = (k: string, arr: any[]) => saveLS(k, arr.slice(0, 5));
  const addHist = (k: string, entry: any) => {
    const arr = readHist(k);
    const withId = { id: String(Date.now()), ts: new Date().toISOString(), ...entry };
    writeHist(k, [withId, ...arr]);
    return withId.id;
  };
  const deleteHist = (k: string, id: string) => {
    const arr = readHist(k).filter((e:any)=> e.id !== id);
    writeHist(k, arr);
  };
  const updateHist = (k: string, id: string, patch: any) => {
    const arr = readHist(k).map((e:any)=> e.id === id ? { ...e, ...patch } : e);
    writeHist(k, arr);
  };
  const exportHist = (k: string, filename: string) => {
    try {
      const data = JSON.stringify(readHist(k), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e:any) {
      toast({ title: 'Export failed', description: e?.message || 'Could not export history.' });
    }
  };
  const importHist = (k: string) => {
    const text = window.prompt('Paste JSON array of history entries');
    if (!text) return;
    try {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('JSON must be an array');
      writeHist(k, arr);
      toast({ title: 'Imported', description: `${arr.length} entries imported.` });
    } catch (e:any) {
      toast({ title: 'Import failed', description: e?.message || 'Invalid JSON' });
    }
  };

  const addGoal = () => {
    if (!goal.trim()) return;
    setGoals((g) => [goal.trim(), ...g]);
    setGoal('');
  };

  useEffect(() => {
    try {
      const rawGoals = localStorage.getItem(PD_GOALS_KEY);
      const rawJournal = localStorage.getItem(PD_JOURNAL_KEY);
      const rawMindful = localStorage.getItem(PD_MINDFUL_KEY);
      if (rawGoals) {
        const parsed = JSON.parse(rawGoals);
        if (Array.isArray(parsed)) setGoals(parsed.filter((x) => typeof x === 'string'));
      }
      if (typeof rawJournal === 'string' && rawJournal) setJournal(rawJournal);
      if (rawMindful === '1') setMindfulOn(true);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PD_GOALS_KEY, JSON.stringify(goals.slice(0, 30)));
    } catch {}
  }, [goals]);

  useEffect(() => {
    try {
      localStorage.setItem(PD_JOURNAL_KEY, journal || '');
    } catch {}
  }, [journal]);

  useEffect(() => {
    try {
      localStorage.setItem(PD_MINDFUL_KEY, mindfulOn ? '1' : '0');
    } catch {}
  }, [mindfulOn]);

  useEffect(() => {
    if (!mindfulOn) return;
    toast({ title: 'Mindfulness reminders enabled', description: 'I’ll nudge you periodically to take a break.' });
    const id = window.setInterval(() => {
      toast({
        title: 'Mindfulness check-in',
        description: 'Take 30 seconds: breathe in… breathe out… relax your shoulders.',
      });
    }, 20 * 60 * 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [mindfulOn]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/persistence');
        setPersistence(r);
      } catch (e: any) {
        setPersistence(null);
        toast({ title: 'Persistence check failed', description: e?.message || 'Could not read storage mode.' });
      }
    })();
    // detect saved sessions
    setHasSavedPro(!!readLS('tools:pro'));
    setHasSavedCreator(!!readLS('tools:creator'));
    setHasSavedBusiness(!!readLS('tools:business'));
    // restore filters/tags per section
    const proF = readLS('tools:pro:filters');
    if (proF) { setProFilter(proF.filter || ''); setProTags(proF.tags || ''); }
    const creatorF = readLS('tools:creator:filters');
    if (creatorF) { setCreatorFilter(creatorF.filter || ''); setCreatorTags(creatorF.tags || ''); }
    const businessF = readLS('tools:business:filters');
    if (businessF) { setBusinessFilter(businessF.filter || ''); setBusinessTags(businessF.tags || ''); }
  }, []);

  // Save sessions when outputs change (successful runs)
  useEffect(() => {
    // Pro session save (input/output when any pro tool runs)
    saveLS('tools:pro', { input: proInput, output: proOutput });
    setHasSavedPro(true);
  }, [proOutput]);

  const restorePro = () => {
    const hist = readHist('tools:pro:history');
    const s = proSelected ? hist.find(h=>h.id===proSelected) : readLS('tools:pro');
    if (!s) return toast({ title: 'No session', description: 'No saved Pro session found.' });
    setProInput(s.input || '');
    setProOutput(s.output || null);
    toast({ title: 'Pro session restored', description: 'Prompt and output restored.' });
  };
  const clearPro = () => { try { localStorage.removeItem('tools:pro'); setHasSavedPro(false); toast({ title: 'Cleared', description: 'Saved Pro session removed.' }); } catch {} };

  // Creator session helpers (shares aiOutput)
  const saveCreator = () => {
    saveLS('tools:creator', { goal: creatorGoal, audience: assistantAudience, topic: assistantTopic, output: creatorOutput });
    setHasSavedCreator(true);
  };
  const restoreCreator = () => {
    const hist = readHist('tools:creator:history');
    const s = creatorSelected ? hist.find(h=>h.id===creatorSelected) : readLS('tools:creator');
    if (!s) return toast({ title: 'No session', description: 'No saved Creator session found.' });
    setCreatorGoal(s.goal || '');
    setAssistantAudience(s.audience || '');
    setAssistantTopic(s.topic || '');
    setCreatorOutput(s.output || null);
    toast({ title: 'Creator session restored', description: 'Inputs and output restored.' });
  };
  const clearCreator = () => { try { localStorage.removeItem('tools:creator'); setHasSavedCreator(false); toast({ title: 'Cleared', description: 'Saved Creator session removed.' }); } catch {} };

  // Business session helpers
  const saveBusiness = () => {
    saveLS('tools:business', { name: campaignName, budget: campaignBudget, schedule: campaignSchedule, output: businessOutput });
    setHasSavedBusiness(true);
  };
  const restoreBusiness = () => {
    const hist = readHist('tools:business:history');
    const s = businessSelected ? hist.find(h=>h.id===businessSelected) : readLS('tools:business');
    if (!s) return toast({ title: 'No session', description: 'No saved Business session found.' });
    setCampaignName(s.name || '');
    setCampaignBudget(s.budget || '');
    setCampaignSchedule(s.schedule || '');
    setBusinessOutput(s.output || null);
    toast({ title: 'Business session restored', description: 'Inputs and output restored.' });
  };
  const clearBusiness = () => { try { localStorage.removeItem('tools:business'); setHasSavedBusiness(false); toast({ title: 'Cleared', description: 'Saved Business session removed.' }); } catch {} };

  // Persist filters/tags per section
  useEffect(() => {
    saveLS('tools:pro:filters', { filter: proFilter, tags: proTags });
  }, [proFilter, proTags]);
  useEffect(() => {
    saveLS('tools:creator:filters', { filter: creatorFilter, tags: creatorTags });
  }, [creatorFilter, creatorTags]);
  useEffect(() => {
    saveLS('tools:business:filters', { filter: businessFilter, tags: businessTags });
  }, [businessFilter, businessTags]);

  const labelOf = (h: any, kind: 'pro'|'creator'|'business') => {
    if (h?.name) return h.name;
    if (kind==='pro') return (h.input||'').slice(0,30);
    if (kind==='creator') return (h.goal||'').slice(0,30);
    return (h.name||'').slice(0,30);
  };

  const parseImport = (text: string) => {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('JSON must be an array');
    return arr.map((e:any)=> ({ id: e.id || String(Date.now()+Math.random()), ts: e.ts || new Date().toISOString(), ...e }));
  };

  // Tag helpers and suggestions
  const quickTags = ['Launch', 'BTS', 'Fitness', 'Ads'];
  const splitTags = (s: string) => s.split(',').map(t=>t.trim()).filter(Boolean);
  const addTagTo = (curr: string, set: (v: string)=>void, tag: string) => {
    const list = splitTags(curr);
    if (!list.includes(tag)) list.push(tag);
    set(list.join(', '));
  };
  const fragOf = (s: string) => {
    const idx = s.lastIndexOf(',');
    const frag = (idx === -1 ? s : s.slice(idx+1)).trim().toLowerCase();
    return frag;
  };
  const getUniqueTags = (k: string): string[] => {
    const all = readHist(k).flatMap((e:any)=> Array.isArray(e.tags) ? e.tags : []);
    return Array.from(new Set(all));
  };
  const addSingleTag = (k: string, id: string, tag: string) => {
    if (!tag) return;
    const arr = readHist(k);
    const idx = arr.findIndex((e:any)=> e.id===id);
    if (idx === -1) return;
    const tags = Array.isArray(arr[idx].tags) ? arr[idx].tags.slice() : [];
    if (!tags.includes(tag)) tags.push(tag);
    updateHist(k, id, { tags });
  };
  const removeTag = (k: string, id: string, tag: string) => {
    const arr = readHist(k);
    const idx = arr.findIndex((e:any)=> e.id===id);
    if (idx === -1) return;
    const tags = (Array.isArray(arr[idx].tags) ? arr[idx].tags : []).filter((t:string)=> t !== tag);
    updateHist(k, id, { tags });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto pt-14 md:pt-16 p-4">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold">Tools</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Quiet, practical utilities for writing, planning, and professional growth.</p>
        </div>
        <div className="flex items-center justify-end mb-3">
          {persistence && (
            <Badge variant="secondary">Storage: {persistence.mode}</Badge>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
        {/* Pro Tools */}
        <Card className="rounded-2xl border border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4 text-muted-foreground" />
              <span>Pro Tools</span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">AI</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative overflow-hidden">
            <div className="text-sm text-muted-foreground">Requires Pro tier or higher.</div>
            <div className="space-y-3">
              <Input placeholder="Enter text/topic for AI tools" value={proInput} onChange={(e)=>setProInput(e.target.value)} disabled={!hasTier('pro')} title={!hasTier('pro') ? 'Requires Pro' : undefined} />
              {!hasTier('pro') && (
                <div className="text-xs text-muted-foreground">
                  Upgrade to <Link to="/pricing" className="underline">Pro</Link> to use Post Wizard, Caption Muse, and Trend Finder.
                </div>
              )}
              {!hasTier('pro') && (
                <div className="flex justify-end -mt-1">
                  <Button asChild>
                    <Link to="/pricing">Upgrade to Pro</Link>
                  </Button>
                </div>
              )}
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={()=> setProInput('')} disabled={!hasTier('pro')} title={!hasTier('pro') ? 'Requires Pro' : undefined}>Clear input</Button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>Try examples:</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={()=>setProInput('Boost engagement for my product launch post')} disabled={!hasTier('pro')} title={!hasTier('pro') ? 'Requires Pro' : undefined}>Launch post</Button>
                  <Button size="sm" variant="secondary" onClick={()=>setProInput('Captions for a behind-the-scenes video')} disabled={!hasTier('pro')} title={!hasTier('pro') ? 'Requires Pro' : undefined}>BTS captions</Button>
                  <Button size="sm" variant="secondary" onClick={()=>setProInput('Find trending topics in fitness niche')} disabled={!hasTier('pro')} title={!hasTier('pro') ? 'Requires Pro' : undefined}>Fitness trends</Button>
                </div>
              </div>
              {/* Pro Import Dialog */}
              <Dialog open={proImportOpen} onOpenChange={setProImportOpen}>
                <DialogContent className="sm:max-w-lg w-[95vw] max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Import Pro History</DialogTitle>
                    <DialogDescription>Paste JSON or drop a .json file. Review and import selected entries.</DialogDescription>
                  </DialogHeader>
                  <div
                    className="border rounded p-3 text-xs text-muted-foreground"
                    onDragOver={(e)=>{ e.preventDefault(); }}
                    onDrop={(e)=>{
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setProImportText(String(reader.result||''));
                        reader.onerror = () => toast({ title: 'Read failed', description: 'Could not read file.' });
                        reader.readAsText(file);
                      } else {
                        const t = e.dataTransfer.getData('text');
                        if (t) setProImportText(t);
                      }
                    }}
                  >Drag & drop JSON file here, or paste below.</div>
                  <Textarea rows={6} placeholder="[ { id, ts, input, output, name, tags }, ... ]" value={proImportText} onChange={(e)=> setProImportText(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={()=>{
                      try {
                        const arr = parseImport(proImportText);
                        setProImportParsed(arr);
                        const sel: Record<string, boolean> = {};
                        arr.forEach((e:any)=> sel[e.id] = true);
                        setProImportSel(sel);
                        toast({ title: 'Parsed', description: `${arr.length} entries ready.` });
                      } catch (e:any) {
                        toast({ title: 'Invalid JSON', description: e?.message || 'Please check the format.' });
                      }
                    }}>Parse</Button>
                    <Button size="sm" variant="ghost" onClick={()=>{ setProImportText(''); setProImportParsed([]); setProImportSel({}); }}>Clear</Button>
                    <Button size="sm" variant="secondary" onClick={()=>{
                      const selected = proImportParsed.filter((e:any)=> proImportSel[e.id]);
                      if (selected.length === 0) return toast({ title: 'Nothing selected', description: 'Select at least one entry.' });
                      const merged = [...selected, ...readHist('tools:pro:history')];
                      writeHist('tools:pro:history', merged);
                      toast({ title: 'Imported', description: `${selected.length} entries imported.` });
                      setProImportOpen(false);
                    }}>Import selected</Button>
                  </div>
                  {proImportParsed.length > 0 && (
                    <div className="max-h-40 overflow-auto border rounded p-2 text-sm">
                      {proImportParsed.map((e:any)=> (
                        <label key={e.id} className="flex items-center gap-2 py-1">
                          <input type="checkbox" checked={!!proImportSel[e.id]} onChange={(ev)=> setProImportSel({ ...proImportSel, [e.id]: ev.target.checked })} />
                          <span className="truncate">{new Date(e.ts).toLocaleString()} · {e.name || (e.input||'').slice(0,30)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={()=> setProImportOpen(false)}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>{proInput.length} characters</div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Filter..."
                    className="h-7 w-28"
                    value={proFilter}
                    onChange={(e)=> setProFilter(e.target.value)}
                  />
                  <Input
                    placeholder="tags (comma)"
                    className="h-7 w-36"
                    value={proTags}
                    onChange={(e)=> setProTags(e.target.value)}
                  />
                  {quickTags.map((t)=> (
                    <Button key={t} size="sm" variant="outline" className="h-7 shrink-0"
                      onClick={()=> addTagTo(proTags, setProTags, t)}
                    >{t}</Button>
                  ))}
                  {fragOf(proTags).length > 0 && (
                    <div className="flex flex-wrap gap-1 text-xs">
                      {getUniqueTags('tools:pro:history')
                        .filter(t=> t.toLowerCase().includes(fragOf(proTags)) && !splitTags(proTags).includes(t))
                        .slice(0,6)
                        .map(t=> (
                          <Button key={t} size="sm" variant="ghost" className="h-7 px-2"
                            onClick={()=> addTagTo(proTags, setProTags, t)}
                          >{t}</Button>
                        ))}
                    </div>
                  )}
                  {proSelected && (
                    <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={()=>{
                      const cand = splitTags(proTags)[0];
                      if (!cand) return toast({ title: 'Enter tag', description: 'Type a tag, then click Add.'});
                      addSingleTag('tools:pro:history', proSelected, cand);
                    }}>Add</Button>
                  )}
                  <Select value={proSelected} onValueChange={setProSelected}>
                    <SelectTrigger className="h-7 w-full sm:w-56">
                      <SelectValue placeholder="Select history" />
                    </SelectTrigger>
                    <SelectContent>
                      {readHist('tools:pro:history')
                        .filter((h:any)=>{
                          const q = proFilter.toLowerCase();
                          if (!q) return true;
                          const hay = `${h.name||''} ${(h.input||'')} ${(h.tags||[]).join(',')}`.toLowerCase();
                          return hay.includes(q);
                        })
                        .map((h:any)=> (
                          <SelectItem key={h.id} value={h.id}>{new Date(h.ts).toLocaleString()} · {h.name || (h.input||'').slice(0,30)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {proSelected && (
                    <div className="flex flex-wrap items-center gap-1">
                      {(readHist('tools:pro:history').find((h:any)=> h.id===proSelected)?.tags || []).map((t:string)=> (
                        <Badge key={t} variant="secondary" className="flex items-center gap-1">
                          {t}
                          <button className="ml-1 text-xs opacity-70 hover:opacity-100" onClick={()=> removeTag('tools:pro:history', proSelected, t)}>×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button size="sm" variant="secondary" className="shrink-0" onClick={restorePro} disabled={!hasSavedPro && !proSelected}>Restore</Button>
                  {proSelected && (
                    <Button size="sm" variant="ghost" className="shrink-0" onClick={()=>{ deleteHist('tools:pro:history', proSelected); setProSelected(''); }}>Delete</Button>
                  )}
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=>{
                    if (!proSelected) return toast({ title: 'Select an entry', description: 'Choose an entry.'});
                    const tags = proTags.split(',').map(s=>s.trim()).filter(Boolean);
                    updateHist('tools:pro:history', proSelected, { tags });
                  }}>Apply tags</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=>{
                    if (!proSelected) return toast({ title: 'Select an entry', description: 'Choose a history entry to rename.'});
                    const name = window.prompt('Rename entry to:');
                    if (name && name.trim()) updateHist('tools:pro:history', proSelected, { name: name.trim() });
                  }}>Rename</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=> exportHist('tools:pro:history', 'pro-history.json')}>Export</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=> setProImportOpen(true)}>Import</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={clearPro}>Clear saved</Button>
                </div>
              </div>
              {readHist('tools:pro:history').length === 0 && (
                <div className="text-xs text-muted-foreground">No history yet. Run a tool to save your first session.</div>
              )}
              {readHist('tools:pro:history').length >= 5 && (
                <div className="text-xs text-muted-foreground">Max 5 saved. Next save will replace the oldest: {labelOf(readHist('tools:pro:history')[4], 'pro')}</div>
              )}
              <div className="grid gap-2">
                <Button
                  disabled={!hasTier('pro') || aiBusy==='enhance' || !proInput.trim()}
                  title={!hasTier('pro') ? 'Requires Pro' : undefined}
                  onClick={async ()=>{
                    if (!hasTier('pro')) return;
                    setProAttempted(true);
                    setAiBusy('enhance');
                    try {
                      const r = await api.post('/api/ai/dev/post-enhancer', { text: proInput });
                      setProOutput(r.result);
                      addHist('tools:pro:history', { input: proInput, output: r.result });
                      saveLS('tools:pro', { input: proInput, output: r.result }); setHasSavedPro(true);
                      toast({ title: 'Post enhanced', description: 'AI improved your post content.' });
                    } catch (e:any) {
                      toast({ title: 'Failed to enhance', description: e?.message || 'Try again later' });
                    } finally { setAiBusy(null); }
                  }}
                >{aiBusy==='enhance'?'Working…':'Post Wizard'}</Button>
                <Button
                  disabled={!hasTier('pro') || aiBusy==='caption' || !proInput.trim()}
                  title={!hasTier('pro') ? 'Requires Pro' : undefined}
                  onClick={async ()=>{
                    if (!hasTier('pro')) return;
                    setProAttempted(true);
                    setAiBusy('caption');
                    try {
                      const r = await api.post('/api/ai/dev/caption-muse', { topic: proInput });
                      setProOutput(r.suggestions?.join('\n'));
                      addHist('tools:pro:history', { input: proInput, output: r.suggestions?.join('\n') });
                      saveLS('tools:pro', { input: proInput, output: r.suggestions?.join('\n') }); setHasSavedPro(true);
                      toast({ title: 'Captions ready', description: `${r.suggestions?.length || 0} suggestions generated.` });
                    } catch (e:any) {
                      toast({ title: 'Failed to generate captions', description: e?.message || 'Try again later' });
                    } finally { setAiBusy(null); }
                  }}
                >{aiBusy==='caption'?'Working…':'Caption Muse'}</Button>
                <Button
                  disabled={!hasTier('pro') || aiBusy==='trends'}
                  title={!hasTier('pro') ? 'Requires Pro' : undefined}
                  onClick={async ()=>{
                    if (!hasTier('pro')) return;
                    setProAttempted(true);
                    setAiBusy('trends');
                    try {
                      const r = await api.post('/api/ai/dev/trend-finder', { niche: proInput || 'general' });
                      const text = r.trends?.map((t:any)=> `${t.tag} (${t.score})`).join('\n');
                      setProOutput(text || 'No trends found');
                      addHist('tools:pro:history', { input: proInput, output: text || 'No trends found' });
                      saveLS('tools:pro', { input: proInput, output: text || 'No trends found' }); setHasSavedPro(true);
                      toast({ title: 'Trends fetched', description: `${r.trends?.length || 0} items found.` });
                    } catch (e:any) {
                      toast({ title: 'Failed to fetch trends', description: e?.message || 'Try again later' });
                    } finally { setAiBusy(null); }
                  }}
                >{aiBusy==='trends'?'Working…':'Trend Finder'}</Button>
              </div>
              <div className="flex items-center gap-2">
                {proOutput ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async ()=>{
                        try {
                          await navigator.clipboard.writeText(proOutput);
                          toast({ title: 'Copied', description: 'AI output copied to clipboard.' });
                        } catch {
                          toast({ title: 'Copy failed', description: 'Could not copy to clipboard.' });
                        }
                      }}
                    >Copy</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={()=>{ setProOutput(null); setProAttempted(false); }}
                    >Clear</Button>
                  </>
                ) : null}
              </div>
              {proOutput && (
                <div className="p-3 border rounded text-sm whitespace-pre-wrap bg-card">{proOutput}</div>
              )}
              {!proOutput && proAttempted && (
                <div className="p-3 border rounded text-xs text-muted-foreground bg-card">Results will appear here after you run a tool.</div>
              )}
            </div>
            {!hasTier('pro') && (
              <>
                <div className="absolute inset-0 z-10 bg-background/70 backdrop-blur-lg rounded-md overflow-hidden pointer-events-none" />
                <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                  <Badge variant="secondary"><Lock className="inline mr-1 h-3 w-3" /> Pro</Badge>
                </div>
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <div className="rounded-md bg-background/80 px-4 py-2 text-sm shadow border">
                    <Lock className="inline mr-2 h-4 w-4" />
                    <span>Upgrade to Pro to unlock</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Local DeepSeek Chat */}
        <Card className="rounded-2xl border border-border/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span>Local DeepSeek Chat</span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">Beta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Uses a local GPT4All DeepSeek model when AI provider is set to <span className="font-semibold">Local</span>. Otherwise falls back to the OpenAI-based assistant.
            </div>
            <Textarea
              placeholder="Ask DeepSeek for content ideas, copy help, or coaching…"
              value={deepseekPrompt}
              onChange={(e) => setDeepseekPrompt(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span>Provider: {getAiProvider() === 'local' ? 'Local DeepSeek' : 'OpenAI (cloud)'}</span>
              <Button
                size="sm"
                onClick={async () => {
                  if (!hasTier('creator')) {
                    toast({ title: 'Creator tier required', description: 'Upgrade to Creator to use Ask AI in Local DeepSeek Chat.' });
                    navigate('/pricing');
                    return;
                  }
                  const prompt = deepseekPrompt.trim();
                  if (!prompt) return;
                  setDeepseekBusy(true);
                  try {
                    const provider = getAiProvider();
                    if (provider === 'local') {
                      const r = await api.post('/api/ai/deepseek', { prompt }) as any;
                      setDeepseekReply(r.text || '');
                    } else {
                      const r = await api.post('/api/ai/dev/assistant', {
                        goal: 'general guidance',
                        audience: 'FaceMeX user',
                        topic: prompt,
                      }) as any;
                      const text = Array.isArray(r.tips) || Array.isArray(r.ideas)
                        ? `${(r.tips || []).join('\n')}${(r.ideas && r.ideas.length ? '\n\nIdeas:\n' + r.ideas.join('\n') : '')}`
                        : '';
                      setDeepseekReply(text || '');
                    }
                  } catch (e: any) {
                    toast({ title: 'AI failed', description: e?.message || 'Could not generate a reply.' });
                  } finally {
                    setDeepseekBusy(false);
                  }
                }}
                disabled={deepseekBusy || !deepseekPrompt.trim() || !hasTier('creator')}
                title={!hasTier('creator') ? 'Requires Creator tier or higher' : undefined}
              >
                {deepseekBusy ? 'Thinking…' : 'Ask AI'}
              </Button>
            </div>
            {deepseekReply && (
              <div className="p-3 border rounded text-sm whitespace-pre-wrap bg-card">
                {deepseekReply}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creator+ Tools */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-fuchsia-500/10 to-transparent dark:from-fuchsia-500/20 rounded-t-md">
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-fuchsia-600" /> Creator Tools <Badge variant="outline">Assistant</Badge></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative">
            <div className="text-sm text-muted-foreground">Requires Creator tier or higher.</div>
            <div className="grid gap-2">
              <Button variant="outline" asChild disabled={!hasTier('creator')}>
                <Link to={hasTier('creator') ? '#' : '/pricing'}>{hasTier('creator') ? 'AI Assistant' : 'Upgrade to Creator to use AI Assistant'}</Link>
              </Button>
              <div className="space-y-2">
                <div className="grid gap-2 md:grid-cols-3">
                  <Input placeholder="Goal (e.g., grow audience)" value={creatorGoal} onChange={(e)=>setCreatorGoal(e.target.value)} disabled={!hasTier('creator')} title={!hasTier('creator') ? 'Requires Creator' : undefined} />
                  <Input placeholder="Audience (e.g., designers)" value={assistantAudience} onChange={(e)=>setAssistantAudience(e.target.value)} disabled={!hasTier('creator')} title={!hasTier('creator') ? 'Requires Creator' : undefined} />
                  <Input placeholder="Topic (e.g., tutorials)" value={assistantTopic} onChange={(e)=>setAssistantTopic(e.target.value)} disabled={!hasTier('creator')} title={!hasTier('creator') ? 'Requires Creator' : undefined} />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost" onClick={()=>{ setCreatorGoal(''); setAssistantAudience(''); setAssistantTopic(''); }} disabled={!hasTier('creator')} title={!hasTier('creator') ? 'Requires Creator' : undefined}>Clear inputs</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    onClick={async ()=>{
                      setAiBusy('assistant');
                      try {
                        const r = await api.post('/api/ai/dev/assistant', {
                          goal: creatorGoal || 'grow audience',
                          audience: assistantAudience || 'general',
                          topic: assistantTopic || 'content',
                        });
                        const out = `Tips:\n- ${r.tips.join('\n- ')}\n\nIdeas:\n- ${r.ideas.join('\n- ')}`;
                        setCreatorOutput(out);
                        saveCreator();
                        addHist('tools:creator:history', { goal: creatorGoal, audience: assistantAudience, topic: assistantTopic, output: out });
                        toast({ title: 'Assistant ready', description: 'Coaching tips and ideas generated.' });
                      } catch (e:any) {
                        const msg = e?.message || 'Request failed';
                        setCreatorOutput(`Assistant error: ${msg}`);
                        saveCreator();
                        addHist('tools:creator:history', { goal: creatorGoal, audience: assistantAudience, topic: assistantTopic, output: `Assistant error: ${msg}` });
                        toast({ title: 'Assistant failed', description: msg });
                      } finally { setAiBusy(null); }
                    }}
                    disabled={aiBusy==='assistant' || !hasTier('creator')}
                    title={!hasTier('creator') ? 'Requires Creator' : undefined}
                  >{aiBusy==='assistant'?'Working…':'Get Coaching'}</Button>
                  <Input
                    placeholder="Filter..."
                    className="h-7 w-28"
                    value={creatorFilter}
                    onChange={(e)=> setCreatorFilter(e.target.value)}
                  />
                  <Input
                    placeholder="tags (comma)"
                    className="h-7 w-36"
                    value={creatorTags}
                    onChange={(e)=> setCreatorTags(e.target.value)}
                  />
                  {quickTags.map((t)=> (
                    <Button key={t} size="sm" variant="outline" className="h-7 shrink-0"
                      onClick={()=> addTagTo(creatorTags, setCreatorTags, t)}
                    >{t}</Button>
                  ))}
                  {fragOf(creatorTags).length > 0 && (
                    <div className="flex flex-wrap gap-1 text-xs">
                      {getUniqueTags('tools:creator:history')
                        .filter(t=> t.toLowerCase().includes(fragOf(creatorTags)) && !splitTags(creatorTags).includes(t))
                        .slice(0,6)
                        .map(t=> (
                          <Button key={t} size="sm" variant="ghost" className="h-7 px-2"
                            onClick={()=> addTagTo(creatorTags, setCreatorTags, t)}
                          >{t}</Button>
                        ))}
                    </div>
                  )}
                  {creatorSelected && (
                    <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={()=>{
                      const cand = splitTags(creatorTags)[0];
                      if (!cand) return toast({ title: 'Enter tag', description: 'Type a tag, then click Add.'});
                      addSingleTag('tools:creator:history', creatorSelected, cand);
                    }}>Add</Button>
                  )}
                  <Select value={creatorSelected} onValueChange={setCreatorSelected}>
                    <SelectTrigger className="h-7 w-full sm:w-56">
                      <SelectValue placeholder="Select history" />
                    </SelectTrigger>
                    <SelectContent>
                      {readHist('tools:creator:history')
                        .filter((h:any)=>{
                          const q = creatorFilter.toLowerCase();
                          if (!q) return true;
                          const hay = `${h.name||''} ${(h.goal||'')} ${(h.tags||[]).join(',')}`.toLowerCase();
                          return hay.includes(q);
                        })
                        .map((h:any)=> (
                          <SelectItem key={h.id} value={h.id}>{new Date(h.ts).toLocaleString()} · {h.name || (h.goal||'').slice(0,30)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="secondary" className="shrink-0" onClick={restoreCreator} disabled={!hasSavedCreator && !creatorSelected}>Restore</Button>
                  {creatorSelected && (
                    <Button size="sm" variant="ghost" className="shrink-0" onClick={()=>{ deleteHist('tools:creator:history', creatorSelected); setCreatorSelected(''); }}>Delete</Button>
                  )}
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=>{
                    if (!creatorSelected) return toast({ title: 'Select an entry', description: 'Choose an entry.'});
                    const tags = creatorTags.split(',').map(s=>s.trim()).filter(Boolean);
                    updateHist('tools:creator:history', creatorSelected, { tags });
                  }}>Apply tags</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=>{
                    if (!creatorSelected) return toast({ title: 'Select an entry', description: 'Choose a history entry to rename.'});
                    const name = window.prompt('Rename entry to:');
                    if (name && name.trim()) updateHist('tools:creator:history', creatorSelected, { name: name.trim() });
                  }}>Rename</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=> exportHist('tools:creator:history', 'creator-history.json')}>Export</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=> setCreatorImportOpen(true)}>Import</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={clearCreator}>Clear saved</Button>
                </div>
                {readHist('tools:creator:history').length === 0 && (
                  <div className="text-xs text-muted-foreground">No history yet. Run the assistant to save your first session.</div>
                )}
                {readHist('tools:creator:history').length >= 5 && (
                  <div className="text-xs text-muted-foreground">Max 5 saved. Next save will replace the oldest: {labelOf(readHist('tools:creator:history')[4], 'creator')}</div>
                )}
                {/* Creator Import Dialog */}
                <Dialog open={creatorImportOpen} onOpenChange={setCreatorImportOpen}>
                  <DialogContent className="sm:max-w-lg w-[95vw] max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>Import Creator History</DialogTitle>
                      <DialogDescription>Paste JSON or drop a .json file. Review and import selected entries.</DialogDescription>
                    </DialogHeader>
                    <div
                      className="border rounded p-3 text-xs text-muted-foreground"
                      onDragOver={(e)=>{ e.preventDefault(); }}
                      onDrop={(e)=>{
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setCreatorImportText(String(reader.result||''));
                          reader.onerror = () => toast({ title: 'Read failed', description: 'Could not read file.' });
                          reader.readAsText(file);
                        } else {
                          const t = e.dataTransfer.getData('text');
                          if (t) setCreatorImportText(t);
                        }
                      }}
                    >Drag & drop JSON file here, or paste below.</div>
                    <Textarea rows={6} placeholder="[ { id, ts, goal, audience, topic, output, name, tags }, ... ]" value={creatorImportText} onChange={(e)=> setCreatorImportText(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={()=>{
                        try {
                          const arr = parseImport(creatorImportText);
                          setCreatorImportParsed(arr);
                          const sel: Record<string, boolean> = {};
                          arr.forEach((e:any)=> sel[e.id] = true);
                          setCreatorImportSel(sel);
                          toast({ title: 'Parsed', description: `${arr.length} entries ready.` });
                        } catch (e:any) {
                          toast({ title: 'Invalid JSON', description: e?.message || 'Please check the format.' });
                        }
                      }}>Parse</Button>
                      <Button size="sm" variant="ghost" onClick={()=>{ setCreatorImportText(''); setCreatorImportParsed([]); setCreatorImportSel({}); }}>Clear</Button>
                      <Button size="sm" variant="secondary" onClick={()=>{
                        const selected = creatorImportParsed.filter((e:any)=> creatorImportSel[e.id]);
                        if (selected.length === 0) return toast({ title: 'Nothing selected', description: 'Select at least one entry.' });
                        const merged = [...selected, ...readHist('tools:creator:history')];
                        writeHist('tools:creator:history', merged);
                        toast({ title: 'Imported', description: `${selected.length} entries imported.` });
                        setCreatorImportOpen(false);
                      }}>Import selected</Button>
                    </div>
                    {creatorImportParsed.length > 0 && (
                      <div className="max-h-40 overflow-auto border rounded p-2 text-sm">
                        {creatorImportParsed.map((e:any)=> (
                          <label key={e.id} className="flex items-center gap-2 py-1">
                            <input type="checkbox" checked={!!creatorImportSel[e.id]} onChange={(ev)=> setCreatorImportSel({ ...creatorImportSel, [e.id]: ev.target.checked })} />
                            <span className="truncate">{new Date(e.ts).toLocaleString()} · {e.name || (e.goal||'').slice(0,30)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <DialogFooter>
                      <Button variant="outline" onClick={()=> setCreatorImportOpen(false)}>Close</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {creatorOutput && (
                  <div className="p-3 border rounded text-sm whitespace-pre-wrap bg-card">{creatorOutput}</div>
                )}
              </div>
              {!hasTier('creator') && (
                <div className="text-xs text-muted-foreground">
                  Upgrade to <Link to="/pricing" className="underline">Creator</Link> to get coaching tips and content ideas.
                </div>
              )}
              {!hasTier('creator') && (
                <div className="flex justify-end -mt-1">
                  <Button asChild>
                    <Link to="/pricing">Upgrade to Creator</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Tools */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-fuchsia-500/10 to-transparent dark:from-fuchsia-500/20 rounded-t-md">
            <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4 text-fuchsia-600" /> Business Campaign Tools <Badge variant="outline">Marketing</Badge></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative">
            <div className="text-sm text-muted-foreground">Requires Business tier or higher.</div>
            <div className="grid gap-2">
              <div className="grid gap-2 md:grid-cols-3">
                <Input placeholder="Campaign name" disabled={!hasTier('business')} value={campaignName} onChange={(e)=>setCampaignName(e.target.value)} title={!hasTier('business') ? 'Requires Business' : undefined} />
                <Input placeholder="Budget (e.g., 500)" disabled={!hasTier('business')} value={campaignBudget} onChange={(e)=>setCampaignBudget(e.target.value)} title={!hasTier('business') ? 'Requires Business' : undefined} />
                <Input placeholder="Schedule (e.g., ASAP)" disabled={!hasTier('business')} value={campaignSchedule} onChange={(e)=>setCampaignSchedule(e.target.value)} title={!hasTier('business') ? 'Requires Business' : undefined} />
              </div>
              {!hasTier('business') && (
                <div className="text-xs text-muted-foreground">
                  Upgrade to <Link to="/pricing" className="underline">Business</Link> to create campaigns and get ad estimates.
                </div>
              )}
              {!hasTier('business') && (
                <div className="flex justify-end -mt-1">
                  <Button asChild>
                    <Link to="/pricing">Upgrade to Business</Link>
                  </Button>
                </div>
              )}
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">Plan and estimate your campaigns, then restore later.</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Filter..."
                    className="h-7 w-28"
                    value={businessFilter}
                    onChange={(e)=> setBusinessFilter(e.target.value)}
                  />
                  <Input
                    placeholder="tags (comma)"
                    className="h-7 w-36"
                    value={businessTags}
                    onChange={(e)=> setBusinessTags(e.target.value)}
                  />
                  {quickTags.map((t)=> (
                    <Button key={t} size="sm" variant="outline" className="h-7 shrink-0"
                      onClick={()=> addTagTo(businessTags, setBusinessTags, t)}
                    >{t}</Button>
                  ))}
                  {fragOf(businessTags).length > 0 && (
                    <div className="flex flex-wrap gap-1 text-xs">
                      {getUniqueTags('tools:business:history')
                        .filter(t=> t.toLowerCase().includes(fragOf(businessTags)) && !splitTags(businessTags).includes(t))
                        .slice(0,6)
                        .map(t=> (
                          <Button key={t} size="sm" variant="ghost" className="h-7 px-2"
                            onClick={()=> addTagTo(businessTags, setBusinessTags, t)}
                          >{t}</Button>
                        ))}
                    </div>
                  )}
                  {businessSelected && (
                    <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={()=>{
                      const cand = splitTags(businessTags)[0];
                      if (!cand) return toast({ title: 'Enter tag', description: 'Type a tag, then click Add.'});
                      addSingleTag('tools:business:history', businessSelected, cand);
                    }}>Add</Button>
                  )}
                  <Select value={businessSelected} onValueChange={setBusinessSelected}>
                    <SelectTrigger className="h-7 w-full sm:w-56">
                      <SelectValue placeholder="Select history" />
                    </SelectTrigger>
                    <SelectContent>
                      {readHist('tools:business:history')
                        .filter((h:any)=>{
                          const q = businessFilter.toLowerCase();
                          if (!q) return true;
                          const hay = `${h.name||''} ${(h.output||'')} ${(h.tags||[]).join(',')}`.toLowerCase();
                          return hay.includes(q);
                        })
                        .map((h:any)=> (
                          <SelectItem key={h.id} value={h.id}>{new Date(h.ts).toLocaleString()} · {h.name || (h.name||'').slice(0,30)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="secondary" className="shrink-0" onClick={restoreBusiness} disabled={!hasSavedBusiness && !businessSelected}>Restore</Button>
                  {businessSelected && (
                    <Button size="sm" variant="ghost" className="shrink-0" onClick={()=>{ deleteHist('tools:business:history', businessSelected); setBusinessSelected(''); }}>Delete</Button>
                  )}
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=>{
                    if (!businessSelected) return toast({ title: 'Select an entry', description: 'Choose an entry.'});
                    const tags = businessTags.split(',').map(s=>s.trim()).filter(Boolean);
                    updateHist('tools:business:history', businessSelected, { tags });
                  }}>Apply tags</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=>{
                    if (!businessSelected) return toast({ title: 'Select an entry', description: 'Choose a history entry to rename.'});
                    const name = window.prompt('Rename entry to:');
                    if (name && name.trim()) updateHist('tools:business:history', businessSelected, { name: name.trim() });
                  }}>Rename</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=> exportHist('tools:business:history', 'business-history.json')}>Export</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={()=> setBusinessImportOpen(true)}>Import</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={clearBusiness}>Clear saved</Button>
                  <Button size="sm" variant="ghost" className="shrink-0" disabled={!hasTier('business')} onClick={()=>{ setCampaignName(''); setCampaignBudget(''); setCampaignSchedule(''); }} title={!hasTier('business') ? 'Requires Business' : undefined}>Clear inputs</Button>
                </div>
              </div>
              {readHist('tools:business:history').length === 0 && (
                <div className="text-xs text-muted-foreground">No history yet. Create a campaign or estimate to save your first session.</div>
              )}
              {readHist('tools:business:history').length >= 5 && (
                <div className="text-xs text-muted-foreground">Max 5 saved. Next save will replace the oldest: {labelOf(readHist('tools:business:history')[4], 'business')}</div>
              )}
              {/* Business Import Dialog */}
              <Dialog open={businessImportOpen} onOpenChange={setBusinessImportOpen}>
                <DialogContent className="sm:max-w-lg w-[95vw] max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Import Business History</DialogTitle>
                    <DialogDescription>Paste JSON or drop a .json file. Review and import selected entries.</DialogDescription>
                  </DialogHeader>
                  <div
                    className="border rounded p-3 text-xs text-muted-foreground"
                    onDragOver={(e)=>{ e.preventDefault(); }}
                    onDrop={(e)=>{
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setBusinessImportText(String(reader.result||''));
                        reader.onerror = () => toast({ title: 'Read failed', description: 'Could not read file.' });
                        reader.readAsText(file);
                      } else {
                        const t = e.dataTransfer.getData('text');
                        if (t) setBusinessImportText(t);
                      }
                    }}
                  >Drag & drop JSON file here, or paste below.</div>
                  <Textarea rows={6} placeholder="[ { id, ts, name, budget, schedule, output, tags }, ... ]" value={businessImportText} onChange={(e)=> setBusinessImportText(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={()=>{
                      try {
                        const arr = parseImport(businessImportText);
                        setBusinessImportParsed(arr);
                        const sel: Record<string, boolean> = {};
                        arr.forEach((e:any)=> sel[e.id] = true);
                        setBusinessImportSel(sel);
                        toast({ title: 'Parsed', description: `${arr.length} entries ready.` });
                      } catch (e:any) {
                        toast({ title: 'Invalid JSON', description: e?.message || 'Please check the format.' });
                      }
                    }}>Parse</Button>
                    <Button size="sm" variant="ghost" onClick={()=>{ setBusinessImportText(''); setBusinessImportParsed([]); setBusinessImportSel({}); }}>Clear</Button>
                    <Button size="sm" variant="secondary" onClick={()=>{
                      const selected = businessImportParsed.filter((e:any)=> businessImportSel[e.id]);
                      if (selected.length === 0) return toast({ title: 'Nothing selected', description: 'Select at least one entry.' });
                      const merged = [...selected, ...readHist('tools:business:history')];
                      writeHist('tools:business:history', merged);
                      toast({ title: 'Imported', description: `${selected.length} entries imported.` });
                      setBusinessImportOpen(false);
                    }}>Import selected</Button>
                  </div>
                  {businessImportParsed.length > 0 && (
                    <div className="max-h-40 overflow-auto border rounded p-2 text-sm">
                      {businessImportParsed.map((e:any)=> (
                        <label key={e.id} className="flex items-center gap-2 py-1">
                          <input type="checkbox" checked={!!businessImportSel[e.id]} onChange={(ev)=> setBusinessImportSel({ ...businessImportSel, [e.id]: ev.target.checked })} />
                          <span className="truncate">{new Date(e.ts).toLocaleString()} · {e.name || ''}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={()=> setBusinessImportOpen(false)}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={!hasTier('business') || aiBusy==='campaign'}
                  title={!hasTier('business') ? 'Requires Business' : undefined}
                  onClick={async ()=>{
                    if (!hasTier('business')) return;
                    setAiBusy('campaign');
                    try {
                      const r = await api.post('/api/business/dev/campaigns', {
                        name: campaignName || 'My Campaign',
                        budget: Number(campaignBudget) || 500,
                        schedule: campaignSchedule || 'ASAP',
                      });
                      setBusinessOutput(`Campaign: ${r.campaign.name} (ID: ${r.campaign.id})\nStatus: ${r.campaign.status}\nBudget: ${r.campaign.budget}`);
                      saveBusiness();
                      addHist('tools:business:history', { name: campaignName || 'My Campaign', budget: campaignBudget, schedule: campaignSchedule, output: `Campaign: ${r.campaign.name} (ID: ${r.campaign.id})\nStatus: ${r.campaign.status}\nBudget: ${r.campaign.budget}` });
                      toast({ title: 'Campaign created', description: r.message || 'Draft saved.' });
                    } catch (e:any) {
                      toast({ title: 'Failed to create campaign', description: e?.message || 'Try again later' });
                    } finally { setAiBusy(null); }
                  }}
                >{aiBusy==='campaign'?'Working…':'Create Campaign'}</Button>

                <Button
                  variant="outline"
                  disabled={!hasTier('business') || aiBusy==='estimate'}
                  title={!hasTier('business') ? 'Requires Business' : undefined}
                  onClick={async ()=>{
                    if (!hasTier('business')) return;
                    setAiBusy('estimate');
                    try {
                      const r = await api.post('/api/business/dev/ads/estimate', { audience: 'broad', objective: 'awareness', dailyBudget: 200 });
                      const est = r.estimates;
                      setBusinessOutput(`Ad Estimate\nAudience: ${est.audience}\nObjective: ${est.objective}\nDaily Budget: ${est.dailyBudget}\nEstimated Reach: ${est.estimatedReach}\nEstimated CPM: ${est.estimatedCPM}\nSuggestions:\n- ${est.suggestions.join('\n- ')}`);
                      saveBusiness();
                      addHist('tools:business:history', { name: campaignName, budget: campaignBudget, schedule: campaignSchedule, output: `Ad Estimate\nAudience: ${est.audience}\nObjective: ${est.objective}\nDaily Budget: ${est.dailyBudget}\nEstimated Reach: ${est.estimatedReach}\nEstimated CPM: ${est.estimatedCPM}\nSuggestions:\n- ${est.suggestions.join('\n- ')}` });
                      toast({ title: 'Estimate ready', description: 'Ad reach and CPM estimated.' });
                    } catch (e:any) {
                      toast({ title: 'Failed to estimate', description: e?.message || 'Try again later' });
                    } finally { setAiBusy(null); }
                  }}
                >{aiBusy==='estimate'?'Working…':'Ad Manager'}</Button>
              </div>
              {businessOutput && (
                <>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={()=> setBusinessOutput(null)}>Clear</Button>
                  </div>
                  <div className="p-3 border rounded text-sm whitespace-pre-wrap bg-card">{businessOutput}</div>
                </>
              )}
            </div>
            {!hasTier('business') && (
              <>
                <div className="absolute inset-0 z-10 bg-background/90 backdrop-blur-xl rounded-md pointer-events-none" />
                {/* Animated sheen */}
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full w-1/2 opacity-25 bg-gradient-to-r from-transparent via-white to-transparent"
                    style={{ animation: 'sheenMove 2.2s linear infinite' }}
                  />
                </div>
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <div className="rounded-md bg-background/80 px-4 py-2 text-sm shadow border">
                    <Lock className="inline mr-2 h-4 w-4" />
                    <span>Upgrade to Business to unlock</span>
                    <Button asChild>
                      <Link to="/pricing">Upgrade Now</Link>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {/* Mental Health Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Mental Health &amp; Wellbeing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Access information on crisis options, brief self‑care exercises, and guidance on using FaceMeX in a more balanced way. These resources are supportive in nature and do not replace professional care.
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                asChild
              >
                <Link to="/mental-health">Crisis information</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                asChild
              >
                <Link to="/mental-health">Breathing &amp; grounding</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                asChild
              >
                <Link to="/mental-health">Healthy use guidance</Link>
              </Button>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link to="/mental-health">Open mental health page</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Personal Development */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Development</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Goal Tracking</div>
              <div className="flex gap-2">
                <Input placeholder="Add a goal" value={goal} onChange={(e)=>setGoal(e.target.value)} />
                <Button onClick={addGoal}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {goals.map((g)=> (
                  <Badge key={g} variant="secondary">{g}</Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Journaling</div>
              <Textarea placeholder="Write your thoughts..." value={journal} onChange={(e)=>setJournal(e.target.value)} />
              <div className="text-xs text-muted-foreground">Saved locally (mock)</div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Mindfulness Reminders</div>
                <div className="text-xs text-muted-foreground">Periodic nudges to take breaks</div>
              </div>
              <Switch checked={mindfulOn} onCheckedChange={setMindfulOn} />
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
