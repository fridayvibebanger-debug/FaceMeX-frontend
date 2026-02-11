import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, MapPin, Building2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useUserStore } from '@/store/userStore';
import Navbar from '@/components/layout/Navbar';
import { useNavigate } from 'react-router-dom';
import { assessJobLegitimacy, jobRegionRank } from '@/lib/jobs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const APPLICATIONS_STORAGE_KEY = 'faceme:jobs:applications_v1';

const MOCK_JOBS = [
  {
    id: 'j1',
    title: 'Frontend Engineer',
    company: 'Aurora Labs',
    location: 'Remote',
    skills: ['React', 'TypeScript', 'UX'],
    type: 'Full-time',
  },
  {
    id: 'j2',
    title: 'Product Designer',
    company: 'Orbit Studio',
    location: 'Cape Town, ZA',
    skills: ['Figma', 'Design Systems', 'Prototyping'],
    type: 'Hybrid',
  },
  {
    id: 'j3',
    title: 'Backend Engineer',
    company: 'SignalWorks',
    location: 'Remote',
    skills: ['Node.js', 'PostgreSQL', 'APIs'],
    type: 'Contract',
  },
  {
    id: 'j4',
    title: 'Growth Marketer',
    company: 'Nova Collective',
    location: 'Johannesburg, ZA',
    skills: ['Performance Marketing', 'Analytics'],
    type: 'Full-time',
  },
];

export default function JobsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'browse' | 'post'>('browse');
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_JOBS[0]?.id ?? null);
  const [question, setQuestion] = useState('How can I position my profile for this role?');
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { hasTier } = useUserStore();
  const canPostJob = hasTier('business');
  const canRecruit = hasTier('business');

  const [postBusy, setPostBusy] = useState(false);
  const [postForm, setPostForm] = useState({
    title: '',
    company: '',
    location: '',
    type: 'Full-time',
    skills: '',
    description: '',
  });

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyOk, setApplyOk] = useState<string | null>(null);
  const [applyErr, setApplyErr] = useState<string | null>(null);
  const [applyRiskAck, setApplyRiskAck] = useState(false);
  const [applyForm, setApplyForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [applyFiles, setApplyFiles] = useState<File[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get('/api/jobs');
        if (Array.isArray(list) && list.length) {
          setJobs(list);
          if (!selectedId) setSelectedId(list[0]?.id ?? null);
          return;
        }
      } catch {
      }
      setJobs(MOCK_JOBS);
      if (!selectedId) setSelectedId(MOCK_JOBS[0]?.id ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jobList = useMemo(() => (jobs.length ? jobs : MOCK_JOBS), [jobs]);

  const sortedJobs = useMemo(() => {
    return [...jobList].sort((a, b) => {
      const ar = jobRegionRank(a);
      const br = jobRegionRank(b);
      if (ar !== br) return ar - br;
      return String(a?.title || '').localeCompare(String(b?.title || ''));
    });
  }, [jobList]);

  const selectedJob = useMemo(() => sortedJobs.find((j) => j.id === selectedId) || null, [sortedJobs, selectedId]);

  const selectedLegitimacy = useMemo(() => {
    if (!selectedJob) return null;
    return assessJobLegitimacy(selectedJob);
  }, [selectedJob]);

  useEffect(() => {
    if (!applyOpen) return;
    setApplyRiskAck(false);
  }, [applyOpen, selectedId]);

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('file_read_failed'));
      reader.readAsDataURL(file);
    });

  const handlePostJob = async () => {
    if (!postForm.title.trim() || !postForm.company.trim()) return;
    setPostBusy(true);
    try {
      const created = await api.post('/api/jobs', {
        title: postForm.title,
        company: postForm.company,
        location: postForm.location,
        type: postForm.type,
        skills: postForm.skills,
        description: postForm.description,
      });
      setJobs((prev) => [created, ...prev]);
      setSelectedId(created?.id ?? null);
      setTab('browse');
      setPostForm({ title: '', company: '', location: '', type: 'Full-time', skills: '', description: '' });
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('tier_required')) {
        setAnswer('Posting jobs is available for Business tier or higher.');
      }
    } finally {
      setPostBusy(false);
    }
  };

  const handleApply = async () => {
    if (!selectedJob) return;
    if (selectedLegitimacy?.level === 'risky' && !applyRiskAck) {
      setApplyErr('Please review the safety notice and confirm before applying.');
      return;
    }
    if (!coverLetterFile) {
      setApplyErr('Cover letter document is required.');
      return;
    }
    if (applyFiles.length > 5) {
      setApplyErr('You can upload up to 5 documents.');
      return;
    }
    setApplyBusy(true);
    setApplyOk(null);
    setApplyErr(null);
    try {
      const attachments = await Promise.all([
        (async () => ({
          name: coverLetterFile.name,
          type: coverLetterFile.type,
          dataUrl: await readAsDataUrl(coverLetterFile),
          kind: 'cover_letter',
        }))(),
        ...applyFiles.slice(0, 5).map(async (f) => ({
          name: f.name,
          type: f.type,
          dataUrl: await readAsDataUrl(f),
          kind: 'document',
        })),
      ]);
      const res = await api.post(`/api/jobs/${selectedJob.id}/apply`, {
        ...applyForm,
        attachments,
      });
      setApplyOk(res?.applicationId ? `Application sent (ID: ${res.applicationId})` : 'Application sent.');

      try {
        const appId = res?.applicationId ? String(res.applicationId) : `app_${Date.now()}`;
        const record = {
          id: appId,
          jobId: String(selectedJob.id),
          jobTitle: String(selectedJob.title || ''),
          company: String(selectedJob.company || ''),
          createdAt: new Date().toISOString(),
          applicant: {
            fullName: applyForm.fullName,
            email: applyForm.email,
            phone: applyForm.phone,
          },
          attachments,
        };
        const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(parsed) ? [record, ...parsed] : [record];
        localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore local persistence errors
      }

      setApplyFiles([]);
      setCoverLetterFile(null);
      setApplyForm({ fullName: '', email: '', phone: '' });
    } catch (e: any) {
      setApplyErr(e?.message || 'Failed to submit application.');
    } finally {
      setApplyBusy(false);
    }
  };

  const handleAsk = async () => {
    if (!selectedJob || !question.trim()) return;
    setBusy(true);
    setAnswer(null);
    try {
      // Reuse dev assistant endpoint in a simple way
      const res = await api.post('/api/ai/dev/assistant', {
        goal: 'apply for job',
        audience: selectedJob.company,
        topic: selectedJob.title,
      });
      const tips = Array.isArray(res.tips) ? res.tips : [];
      const ideas = Array.isArray(res.ideas) ? res.ideas : [];
      const text = [
        'How to position your profile:',
        ...tips.map((t: string) => `- ${t}`),
        '',
        'Suggested outreach message:',
        ...ideas.map((i: string) => `- ${i}`),
      ].join('\n');
      setAnswer(text || 'No suggestions returned.');
    } catch (e: any) {
      setAnswer(e?.message || 'Recruiter assistant is unavailable right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4 space-y-4 pt-14 md:pt-16">
        <div className="rounded-2xl border bg-gradient-to-r from-sky-50 via-purple-50 to-emerald-50 dark:from-sky-950/40 dark:via-purple-950/40 dark:to-emerald-950/40 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-background/80 flex items-center justify-center shadow-sm border">
              <Briefcase className="h-4 w-4 text-sky-600 dark:text-sky-300" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-sm sm:text-base font-semibold">Jobs & Opportunities</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground max-w-xl">
                Browse example roles and use the AI recruiter assistant to explore how your professional profile could align with different opportunities.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="hidden md:flex rounded-full border bg-background/70 p-1">
              <button
                type="button"
                onClick={() => setTab('browse')}
                className={`h-8 px-3 rounded-full text-xs font-semibold ${tab === 'browse' ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Browse
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canPostJob) return;
                  setTab('post');
                }}
                disabled={!canPostJob}
                className={`h-8 px-3 rounded-full text-xs font-semibold ${tab === 'post' ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900' : 'text-muted-foreground hover:text-foreground'} ${!canPostJob ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Post a job
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-fuchsia-500" />
              <span>Professional layer preview</span>
            </div>
          </div>
          {canRecruit && (
            <Button size="sm" variant="outline" onClick={() => navigate('/recruiter-portal')}>
              Recruiter Portal
            </Button>
          )}
        </div>

        {tab === 'post' ? (
          <div className="hidden md:block">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Company: post a job
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setTab('browse')}>
                    Back
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {!canPostJob && (
                  <div className="md:col-span-2 rounded-lg border bg-card p-3 text-sm">
                    <div className="font-semibold">Business tier required</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Posting jobs is available for Business tier or higher.
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Job title</Label>
                    <Input value={postForm.title} onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Company</Label>
                    <Input value={postForm.company} onChange={(e) => setPostForm((p) => ({ ...p, company: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Location</Label>
                      <Input value={postForm.location} onChange={(e) => setPostForm((p) => ({ ...p, location: e.target.value }))} placeholder="Remote / City" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Input value={postForm.type} onChange={(e) => setPostForm((p) => ({ ...p, type: e.target.value }))} placeholder="Full-time" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Skills (comma separated)</Label>
                    <Input value={postForm.skills} onChange={(e) => setPostForm((p) => ({ ...p, skills: e.target.value }))} placeholder="React, Node.js, Sales" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Textarea value={postForm.description} onChange={(e) => setPostForm((p) => ({ ...p, description: e.target.value }))} rows={8} />
                  </div>
                  <Button size="sm" onClick={handlePostJob} disabled={!canPostJob || postBusy || !postForm.title.trim() || !postForm.company.trim()}>
                    {postBusy ? 'Posting…' : 'Post job'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Job opportunities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                {sortedJobs.map((job: any) => {
                  const leg = assessJobLegitimacy(job);
                  return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedId(job.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedId === job.id ? 'bg-accent/60 border-primary' : 'bg-card hover:bg-accent/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        <div className="font-semibold text-sm">{job.title}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {leg.level !== 'ok' ? (
                          <Badge
                            variant={leg.level === 'risky' ? 'destructive' : 'secondary'}
                            className="text-[10px]"
                          >
                            {leg.level === 'risky' ? 'Caution' : 'Verify'}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="text-[10px]">{job.type}</Badge>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>{job.company}</span>
                      <span>•</span>
                      <MapPin className="h-3 w-3" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(job.skills || []).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </button>
                  );
                })}
                {!jobList.length && (
                  <p className="text-sm text-muted-foreground">No jobs available right now.</p>
                )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-fuchsia-500" />
                      AI Recruiter Assistant
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                {selectedJob ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="font-medium">{selectedJob.title}</div>
                      <div className="text-xs text-muted-foreground">{selectedJob.company} • {selectedJob.location}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(selectedJob.skills || []).map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </div>

                    {selectedLegitimacy && selectedLegitimacy.level !== 'ok' ? (
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <div className="text-xs font-semibold">
                          {selectedLegitimacy.level === 'risky' ? 'Safety warning' : 'Verify before applying'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {selectedLegitimacy.summary}
                        </div>
                        {selectedLegitimacy.reasons?.length ? (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {selectedLegitimacy.reasons.slice(0, 3).map((r) => (
                              <div key={r}>- {r}</div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {selectedJob.description && (
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap border rounded p-3 bg-card">
                        {selectedJob.description}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Select a job on the left to get tailored advice.</p>
                )}

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Question for the recruiter assistant</label>
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleAsk} disabled={busy || !selectedJob}>
                    {busy ? 'Thinking…' : 'Get advice'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setApplyOpen(true)} disabled={!selectedJob}>
                    Apply via FaceMeX
                  </Button>
                </div>

                {answer && (
                  <div className="mt-2 p-3 border rounded text-xs whitespace-pre-wrap bg-card">
                    {answer}
                  </div>
                )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply via FaceMeX</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {selectedJob ? `${selectedJob.title} • ${selectedJob.company}` : 'Select a job first.'}
              </div>

              {selectedLegitimacy?.level === 'risky' ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="text-xs font-semibold">Safety warning</div>
                  <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {selectedLegitimacy.summary}
                  </div>
                  <label className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={applyRiskAck}
                      onChange={(e) => setApplyRiskAck(e.target.checked)}
                    />
                    <span>I understand the risk and still want to apply.</span>
                  </label>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Full name</Label>
                  <Input value={applyForm.fullName} onChange={(e) => setApplyForm((p) => ({ ...p, fullName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={applyForm.email} onChange={(e) => setApplyForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Phone (optional)</Label>
                <Input value={applyForm.phone} onChange={(e) => setApplyForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Cover letter document (required)</Label>
                <Input
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setCoverLetterFile(f);
                  }}
                />
                {coverLetterFile && (
                  <div className="text-xs text-muted-foreground">
                    {coverLetterFile.name}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Upload CV / Resume / Documents (up to 5)</Label>
                <Input
                  type="file"
                  multiple
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setApplyFiles(files.slice(0, 5));
                  }}
                />
                {applyFiles.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {applyFiles.map((f) => f.name).join(', ')}
                  </div>
                )}
              </div>

              {applyOk && <div className="text-xs text-emerald-600">{applyOk}</div>}
              {applyErr && <div className="text-xs text-red-600">{applyErr}</div>}
            </div>

            <DialogFooter>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={
                  applyBusy ||
                  !selectedJob ||
                  !applyForm.fullName.trim() ||
                  !applyForm.email.trim() ||
                  !coverLetterFile ||
                  (selectedLegitimacy?.level === 'risky' && !applyRiskAck)
                }
              >
                {applyBusy ? 'Sending…' : 'Send application'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
