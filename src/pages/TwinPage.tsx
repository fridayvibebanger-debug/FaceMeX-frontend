import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTwinStore, buildStylePrompt, TwinProfile } from '@/store/twinStore';
import { useMessageStore } from '@/store/messageStore';
import { usePostStore } from '@/store/postStore';

export default function TwinPage() {
  const { profile, consent, logs, training, load, saveProfile, saveConsent, addLog, clearLogs, addTraining, removeTraining } = useTwinStore();
  const [local, setLocal] = useState<TwinProfile>(profile);
  const [previewInput, setPreviewInput] = useState('Meeting moved to 3pm. Can you still join?');
  const style = useMemo(()=> buildStylePrompt(local), [local]);
  const { conversations, messages } = useMessageStore();
  const { posts } = usePostStore();

  useEffect(()=> { load(); setLocal(profile); }, [load]);
  useEffect(()=> { setLocal(profile); }, [profile]);

  const genPreview = () => {
    // simple client-side preview using profile settings
    const base = `Reply to: "${previewInput}"`;
    const body = local.tone === 'professional'
      ? 'Thank you for the update. 3pm works for me. I will be there on time.'
      : local.tone === 'playful'
        ? 'Got it! 3pm works for me 😄 See you then!'
        : local.tone === 'casual'
          ? 'Cool, 3pm works for me. See you then!'
          : 'Thanks for the update — 3pm is good. I’ll join.';
    const emo = local.emojis && !/\p{Extended_Pictographic}/u.test(body) ? ' ✨' : '';
    const out = `${body}${emo}`;
    addLog({ surface: 'messages', inputPreview: previewInput.slice(0,120), output: out, mode: 'suggest', approved: false });
    return out;
  };

  const dmContacts = useMemo(() => {
    return (conversations || [])
      .filter(c => c.type === 'dm')
      .map(c => ({
        convId: c.id,
        id: c.participants[0]?.id,
        name: c.participants[0]?.name,
        avatar: c.participants[0]?.avatar,
      }))
      .filter(c => !!c.id);
  }, [conversations]);

  const recentMessages = useMemo(() => {
    const all: { id: string; text: string }[] = [];
    Object.values(messages || {}).forEach(arr => {
      (arr || []).slice(-10).forEach(m => {
        if (m?.content) all.push({ id: m.id, text: m.content });
      });
    });
    return all.slice(-20).reverse();
  }, [messages]);

  const recentPosts = useMemo(() => {
    return (posts || []).slice(0, 10).map(p => ({ id: p.id, text: p.content }));
  }, [posts]);

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-5xl mx-auto p-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm">Tone</label>
              <select className="h-9 rounded-md border bg-background px-2" value={local.tone} onChange={(e)=> setLocal({ ...local, tone: e.target.value as any })}>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="playful">Playful</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Formality ({local.formality})</label>
              <input type="range" min={0} max={100} value={local.formality} onChange={(e)=> setLocal({ ...local, formality: parseInt(e.target.value,10) })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={local.emojis} onChange={(e)=> setLocal({ ...local, emojis: e.target.checked })} />
              Use emojis
            </label>
            <div className="grid gap-2">
              <label className="text-sm">Preferred topics (comma-separated)</label>
              <Input value={local.topics.join(', ')} onChange={(e)=> setLocal({ ...local, topics: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Boundaries (comma-separated)</label>
              <Input value={local.boundaries.join(', ')} onChange={(e)=> setLocal({ ...local, boundaries: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Notes</label>
              <Textarea value={local.bioNotes} onChange={(e)=> setLocal({ ...local, bioNotes: e.target.value })} />
            </div>
            <div className="text-xs text-muted-foreground">Style prompt</div>
            <div className="text-xs p-2 rounded border bg-card whitespace-pre-wrap">{style}</div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={()=> saveProfile(local)}>Save</Button>
            <Button variant="ghost" onClick={()=> setLocal(profile)}>Reset</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consent & Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={consent.messages} onChange={(e)=> saveConsent({ messages: e.target.checked })} />
              Enable in Messages
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={consent.feedSuggestions} onChange={(e)=> saveConsent({ feedSuggestions: e.target.checked })} />
              Enable Feed suggestions
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={consent.showBadge} onChange={(e)=> saveConsent({ showBadge: e.target.checked })} />
              Show "Twin" badge on sent content
            </label>
            <div className="grid gap-2">
              <label className="text-sm">Mode</label>
              <select className="h-9 rounded-md border bg-background px-2" value={consent.mode} onChange={(e)=> saveConsent({ mode: e.target.value as any })}>
                <option value="off">Off</option>
                <option value="suggest">Suggest only</option>
                <option value="auto">Auto (respect limits)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm">Daily max auto</label>
                <Input type="number" value={consent.dailyMaxAuto} onChange={(e)=> saveConsent({ dailyMaxAuto: parseInt(e.target.value||'0',10) })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Cooldown (sec)</label>
                <Input type="number" value={consent.cooldownSec} onChange={(e)=> saveConsent({ cooldownSec: parseInt(e.target.value||'0',10) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm">Quiet hours start (0-23)</label>
                <Input type="number" min={0} max={23} value={consent.quietHours?.start ?? 0} onChange={(e)=> saveConsent({ quietHours: { start: Math.max(0, Math.min(23, parseInt(e.target.value||'0',10))), end: consent.quietHours?.end ?? 0 } })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Quiet hours end (0-23)</label>
                <Input type="number" min={0} max={23} value={consent.quietHours?.end ?? 0} onChange={(e)=> saveConsent({ quietHours: { start: consent.quietHours?.start ?? 0, end: Math.max(0, Math.min(23, parseInt(e.target.value||'0',10))) } })} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <div className="text-xs text-muted-foreground">Logs: {logs.length}</div>
            <Button variant="outline" onClick={clearLogs}>Clear logs</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts & Overrides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">Per-contact allow/deny for Auto, and per-conversation mode overrides.</div>
            <div className="grid gap-2">
              {dmContacts.length === 0 && (
                <div className="text-sm text-muted-foreground">No DM contacts yet.</div>
              )}
              {dmContacts.map(c => {
                const allowed = (consent.allowList||[]).includes(c.id!);
                const denied = (consent.denyList||[]).includes(c.id!);
                const override = consent.overrides?.[c.id!];
                return (
                  <div key={c.id} className="flex items-center justify-between border rounded p-2">
                    <div className="flex items-center gap-2">
                      <img src={c.avatar} alt="" className="h-6 w-6 rounded-full" />
                      <div className="text-sm">{c.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={allowed ? 'default' : 'outline'} onClick={()=> {
                        const set = new Set(consent.allowList||[]);
                        if (allowed) set.delete(c.id!); else set.add(c.id!);
                        saveConsent({ allowList: Array.from(set) });
                      }}>Allow</Button>
                      <Button size="sm" variant={denied ? 'default' : 'outline'} onClick={()=> {
                        const set = new Set(consent.denyList||[]);
                        if (denied) set.delete(c.id!); else set.add(c.id!);
                        saveConsent({ denyList: Array.from(set) });
                      }}>Deny</Button>
                      <select className="h-9 rounded-md border bg-background px-2" value={override || ''} onChange={(e)=> {
                        const val = e.target.value as any;
                        const next = { ...(consent.overrides||{}) } as Record<string, any>;
                        if (!val) delete next[c.id!]; else next[c.id!] = val;
                        saveConsent({ overrides: next });
                      }}>
                        <option value="">Override: None</option>
                        <option value="off">Off</option>
                        <option value="suggest">Suggest</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm">Blocklist phrases (comma-separated)</label>
              <Input value={(consent.safety?.blocklist||[]).join(', ')} onChange={(e)=> {
                const arr = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
                saveConsent({ safety: { ...(consent.safety||{ blocklist: [], maxLength: 220, emojiMax: 6, escalate: [] }), blocklist: arr } });
              }} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Escalate keywords (comma-separated)</label>
              <Input value={(consent.safety?.escalate||[]).join(', ')} onChange={(e)=> {
                const arr = e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
                saveConsent({ safety: { ...(consent.safety||{ blocklist: [], maxLength: 220, emojiMax: 6, escalate: [] }), escalate: arr } });
              }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm">Max length</label>
                <Input type="number" value={consent.safety?.maxLength ?? 220} onChange={(e)=> {
                  const v = parseInt(e.target.value||'0',10) || 0;
                  saveConsent({ safety: { ...(consent.safety||{ blocklist: [], maxLength: 220, emojiMax: 6, escalate: [] }), maxLength: v } });
                }} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Emoji cap</label>
                <Input type="number" value={consent.safety?.emojiMax ?? 6} onChange={(e)=> {
                  const v = parseInt(e.target.value||'0',10) || 0;
                  saveConsent({ safety: { ...(consent.safety||{ blocklist: [], maxLength: 220, emojiMax: 6, escalate: [] }), emojiMax: v } });
                }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <label className="text-sm">Sample input</label>
              <Textarea value={previewInput} onChange={(e)=> setPreviewInput(e.target.value)} />
            </div>
            <Button onClick={genPreview}>Generate Preview</Button>
            <div className="text-xs text-muted-foreground">Last 5 logs</div>
            <div className="grid gap-2">
              {logs.slice(0,5).map(l => (
                <div key={l.id} className="rounded border p-2 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{l.surface} · {l.mode} {l.approved ? <Badge className="ml-2">Sent</Badge> : <Badge variant="secondary" className="ml-2">Preview</Badge>}</div>
                    <div className="text-xs text-muted-foreground">{new Date(l.ts).toLocaleString()}</div>
                  </div>
                  <div className="text-xs"><span className="font-medium">In:</span> {l.inputPreview}</div>
                  <div className="text-xs"><span className="font-medium">Out:</span> {l.output}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Training</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Current training ({training.length})</div>
                <div className="grid gap-2 max-h-64 overflow-auto">
                  {training.length === 0 && <div className="text-sm text-muted-foreground">No training snippets yet.</div>}
                  {training.map(t => (
                    <div key={t.id} className="border rounded p-2 text-sm flex items-center justify-between">
                      <div className="truncate pr-2">{t.text}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={t.score === 1 ? 'default' : 'secondary'}>{t.score === 1 ? '👍' : '👎'}</Badge>
                        <Button size="sm" variant="outline" onClick={()=> removeTraining(t.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Add custom snippet</div>
                <Textarea placeholder="Paste text..." id="custom-train-text" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={()=> {
                    const el = document.getElementById('custom-train-text') as HTMLTextAreaElement | null;
                    const v = (el?.value||'').trim(); if (!v) return; addTraining(v, 1); if (el) el.value='';
                  }}>Add 👍</Button>
                  <Button size="sm" variant="outline" onClick={()=> {
                    const el = document.getElementById('custom-train-text') as HTMLTextAreaElement | null;
                    const v = (el?.value||'').trim(); if (!v) return; addTraining(v, -1); if (el) el.value='';
                  }}>Add 👎</Button>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Picker: recent Messages</div>
                <div className="grid gap-2 max-h-56 overflow-auto">
                  {recentMessages.map(m => (
                    <div key={m.id} className="border rounded p-2 text-sm flex items-center justify-between">
                      <div className="truncate pr-2">{m.text}</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={()=> addTraining(m.text, 1)}>👍</Button>
                        <Button size="sm" variant="outline" onClick={()=> addTraining(m.text, -1)}>👎</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Picker: recent Posts</div>
                <div className="grid gap-2 max-h-56 overflow-auto">
                  {recentPosts.map(p => (
                    <div key={p.id} className="border rounded p-2 text-sm flex items-center justify-between">
                      <div className="truncate pr-2">{p.text}</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={()=> addTraining(p.text, 1)}>👍</Button>
                        <Button size="sm" variant="outline" onClick={()=> addTraining(p.text, -1)}>👎</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
