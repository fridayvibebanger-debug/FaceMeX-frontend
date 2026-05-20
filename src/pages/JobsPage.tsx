import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { supabase } from '@/lib/supabaseClient';
import { uploadMedia } from '@/lib/storage';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle,
  Download,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  UploadCloud,
  Users,
  XCircle,
} from 'lucide-react';

export type JobLegitimacyLevel = 'ok' | 'caution' | 'risky';

export type JobLike = {
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  type?: string;
  skills?: string[];
  website?: string;
  contactEmail?: string;
};

type JobRow = {
  id: string;
  author_id: string;
  title: string;
  company: string;
  location?: string | null;
  type?: string | null;
  description: string;
  skills?: string[] | null;
  website?: string | null;
  contact_email?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApplicationRow = {
  id: string;
  job_id: string;
  applicant_id?: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string | null;
  note?: string | null;
  document_url?: string | null;
  document_name?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const normalize = (x: any) => String(x || '').trim().toLowerCase();

const SA_CITY_HINTS = [
  'south africa',
  'za',
  'cape town',
  'johannesburg',
  'joburg',
  'pretoria',
  'durban',
  'gqeberha',
  'port elizabeth',
  'bloemfontein',
  'east london',
  'polokwane',
  'nelspruit',
  'mbombela',
  'kimberley',
  'tzaneen',
  'lenyenye',
  'nkowankowa',
  'limpopo',
];

const FREE_EMAIL_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
];

function isSouthAfricaLocation(location: string): boolean {
  const l = normalize(location);
  if (!l) return false;
  if (/\bza\b/.test(l)) return true;
  return SA_CITY_HINTS.some((h) => l.includes(h));
}

function jobRegionRank(job: JobLike): number {
  const l = normalize(job.location);
  if (isSouthAfricaLocation(l)) return 0;
  if (!l) return 2;
  if (l.includes('remote')) return 1;
  return 2;
}

function assessJobLegitimacy(job: JobLike): {
  level: JobLegitimacyLevel;
  reasons: string[];
  summary: string;
} {
  const reasons: string[] = [];

  const company = normalize(job.company);
  const location = normalize(job.location);
  const description = normalize(job.description);
  const website = normalize(job.website);
  const email = normalize(job.contactEmail);

  const hasFeeLanguage =
    /\b(application\s*fee|processing\s*fee|training\s*fee|pay\s*to\s*apply|starter\s*pack|registration\s*fee)\b/.test(
      description
    );

  const asksForMoney =
    /\b(pay|deposit|transfer|send\s*money|bitcoin|crypto|gift\s*card|voucher)\b/.test(
      description
    );

  const urgency =
    /\b(urgent|immediately|asap|limited\s*time|final\s*notice)\b/.test(
      description
    );

  const vagueCompany =
    !company ||
    company.length < 2 ||
    company.includes('confidential') ||
    company.includes('private');

  const noLocation = !location;
  const noDescription = !description || description.length < 60;

  if (hasFeeLanguage) reasons.push('Mentions fees to apply.');
  if (asksForMoney) reasons.push('Mentions payments or money transfers.');
  if (urgency) reasons.push('Uses urgency or pressure language.');
  if (vagueCompany) reasons.push('Company details are missing or vague.');
  if (noLocation) reasons.push('Location is missing.');
  if (noDescription) reasons.push('Description is very short or missing.');

  if (email) {
    const domain = email.includes('@') ? email.split('@')[1] : '';
    if (domain && FREE_EMAIL_DOMAINS.includes(domain)) {
      reasons.push('Uses a free email domain for hiring contact.');
    }
  }

  if (website && !/^https?:\/\//.test(website)) {
    reasons.push('Website URL format looks unusual.');
  }

  let level: JobLegitimacyLevel = 'ok';

  if (reasons.length >= 3 || hasFeeLanguage || asksForMoney) {
    level = 'risky';
  } else if (reasons.length >= 1) {
    level = 'caution';
  }

  const summary =
    level === 'ok'
      ? 'No obvious scam signals. Still verify before sharing sensitive information.'
      : level === 'caution'
        ? 'Some details look incomplete. Verify the employer before applying.'
        : 'This job post looks risky. Avoid paying fees or sharing sensitive information.';

  return { level, reasons, summary };
}

function safeWebsite(url?: string | null) {
  const clean = String(url || '').trim();
  if (!clean) return '';
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  return `https://${clean}`;
}

export default function JobsPage() {
  const userStore = useUserStore() as any;
  const authStore = useAuthStore() as any;

  const currentUserId =
    userStore?.id || authStore?.user?.id || authStore?.user?.user?.id || '';

  const currentName =
    userStore?.name ||
    authStore?.user?.name ||
    authStore?.user?.email?.split('@')[0] ||
    '';

  const currentEmail =
    authStore?.user?.email || userStore?.email || '';

  const tier = String(
    userStore?.tier || authStore?.user?.tier || 'free'
  ).toLowerCase();

  const canPostJobs =
    tier === 'business' ||
    tier === 'exclusive' ||
    (typeof userStore?.hasTier === 'function' && userStore.hasTier('business'));

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [jobForm, setJobForm] = useState({
    title: '',
    company: '',
    location: '',
    type: 'Full-time',
    website: '',
    contactEmail: '',
    description: '',
    skillsText: '',
  });

  const [applicationForm, setApplicationForm] = useState({
    name: currentName,
    email: currentEmail,
    phone: '',
    note: '',
    documentUrl: '',
    documentName: '',
  });

  useEffect(() => {
    setApplicationForm((prev) => ({
      ...prev,
      name: prev.name || currentName,
      email: prev.email || currentEmail,
    }));
  }, [currentName, currentEmail]);

  const loadJobs = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setJobs([]);
      setLoading(false);
      return;
    }

    setJobs((data || []) as JobRow[]);
    setLoading(false);
  };

  const loadApplications = async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setApplications([]);
      return;
    }

    setApplications((data || []) as ApplicationRow[]);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    loadApplications();
  }, [currentUserId]);

  const appCountByJob = useMemo(() => {
    const map: Record<string, number> = {};

    applications.forEach((application) => {
      map[application.job_id] = (map[application.job_id] || 0) + 1;
    });

    return map;
  }, [applications]);

  const filteredJobs = useMemo(() => {
    const q = normalize(search);

    return [...jobs]
      .filter((job) => {
        if (!q) return true;

        return (
          normalize(job.title).includes(q) ||
          normalize(job.company).includes(q) ||
          normalize(job.location).includes(q) ||
          normalize(job.description).includes(q) ||
          (job.skills || []).some((skill) => normalize(skill).includes(q))
        );
      })
      .sort((a, b) => {
        const regionA = jobRegionRank({
          location: a.location || '',
        });

        const regionB = jobRegionRank({
          location: b.location || '',
        });

        if (regionA !== regionB) return regionA - regionB;

        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });
  }, [jobs, search]);

  const selectedJobApplications = useMemo(() => {
    if (!selectedJob) return [];

    return applications.filter(
      (application) => application.job_id === selectedJob.id
    );
  }, [applications, selectedJob]);

  const resetJobForm = () => {
    setJobForm({
      title: '',
      company: '',
      location: '',
      type: 'Full-time',
      website: '',
      contactEmail: '',
      description: '',
      skillsText: '',
    });
  };

  const handleCreateJob = async () => {
    if (!currentUserId) {
      alert('Please sign in first.');
      return;
    }

    if (!canPostJobs) {
      alert('Only Business and Exclusive accounts can post jobs.');
      return;
    }

    if (!jobForm.title.trim() || !jobForm.company.trim() || !jobForm.description.trim()) {
      alert('Add job title, company, and description.');
      return;
    }

    setBusy(true);

    const skills = jobForm.skillsText
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    const { error } = await supabase.from('jobs').insert({
      author_id: currentUserId,
      title: jobForm.title.trim(),
      company: jobForm.company.trim(),
      location: jobForm.location.trim(),
      type: jobForm.type.trim() || 'Full-time',
      description: jobForm.description.trim(),
      skills,
      website: jobForm.website.trim(),
      contact_email: jobForm.contactEmail.trim(),
      status: 'open',
    });

    setBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetJobForm();
    setCreateOpen(false);
    await loadJobs();
  };

  const openApply = (job: JobRow) => {
    setSelectedJob(job);

    setApplicationForm((prev) => ({
      ...prev,
      name: prev.name || currentName,
      email: prev.email || currentEmail,
      phone: prev.phone || '',
      note: '',
      documentUrl: '',
      documentName: '',
    }));

    setApplyOpen(true);
  };

  const handleUploadDocument = async (file: File) => {
    setUploadingDoc(true);

    try {
      const url = await uploadMedia(file, 'job-applications');

      setApplicationForm((prev) => ({
        ...prev,
        documentUrl: url,
        documentName: file.name,
      }));
    } catch (error: any) {
      alert(error?.message || 'Document upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!currentUserId) {
      alert('Please sign in before applying.');
      return;
    }

    if (!selectedJob) return;

    if (!applicationForm.name.trim() || !applicationForm.email.trim()) {
      alert('Add your name and email.');
      return;
    }

    setBusy(true);

    const { error } = await supabase.from('job_applications').insert({
      job_id: selectedJob.id,
      applicant_id: currentUserId,
      applicant_name: applicationForm.name.trim(),
      applicant_email: applicationForm.email.trim(),
      applicant_phone: applicationForm.phone.trim(),
      note: applicationForm.note.trim(),
      document_url: applicationForm.documentUrl || null,
      document_name: applicationForm.documentName || null,
      status: 'submitted',
    });

    setBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setApplyOpen(false);
    setSelectedJob(null);
    await loadApplications();
    alert('Application submitted.');
  };

  const openPortal = async (job: JobRow) => {
    setSelectedJob(job);
    await loadApplications();
    setPortalOpen(true);
  };

  const closeJob = async (job: JobRow) => {
    if (job.author_id !== currentUserId) return;

    const ok = window.confirm('Close this job? Applicants will still remain visible.');

    if (!ok) return;

    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('author_id', currentUserId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadJobs();
  };

  const deleteJob = async (job: JobRow) => {
    if (job.author_id !== currentUserId) return;

    const ok = window.confirm('Delete this job and all applications?');

    if (!ok) return;

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', job.id)
      .eq('author_id', currentUserId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadJobs();
    await loadApplications();
  };

  const updateApplicationStatus = async (
    application: ApplicationRow,
    status: 'shortlisted' | 'rejected' | 'hired'
  ) => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', application.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadApplications();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <div className="flex pt-14 md:pt-16 pb-16 md:pb-0">
        <LeftSidebar />

        <main className="flex-1 lg:ml-64">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 md:py-8 space-y-5">
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900">
                    <Briefcase className="h-3.5 w-3.5" />
                    FaceMeX Recruitment Portal
                  </div>

                  <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-4xl">
                    Jobs & Hiring
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                    Apply for real opportunities, upload documents, and let verified businesses manage applicants in one place.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {canPostJobs ? (
                    <Button
                      type="button"
                      className="rounded-full"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Post a job
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      disabled
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Business+ required
                    </Button>
                  )}
                </div>
              </div>

              {!canPostJobs && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Only Business and Exclusive accounts can post jobs. Free, Pro, and Creator users can apply and upload documents.
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by role, company, skill, or location..."
                    className="h-12 rounded-full border-slate-200 bg-white pl-11 shadow-sm"
                  />
                </div>

                {loading ? (
                  <Card className="rounded-[28px]">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Loading jobs...
                    </CardContent>
                  </Card>
                ) : filteredJobs.length === 0 ? (
                  <Card className="rounded-[28px]">
                    <CardContent className="py-12 text-center">
                      <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="font-semibold">No jobs found yet.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        When Business+ accounts post jobs, they will appear here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredJobs.map((job) => {
                    const trust = assessJobLegitimacy({
                      title: job.title,
                      company: job.company,
                      location: job.location || '',
                      description: job.description,
                      type: job.type || '',
                      skills: job.skills || [],
                      website: job.website || '',
                      contactEmail: job.contact_email || '',
                    });

                    const isAuthor = job.author_id === currentUserId;
                    const isClosed = job.status === 'closed';

                    return (
                      <Card
                        key={job.id}
                        className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="truncate text-lg md:text-xl">
                                  {job.title}
                                </CardTitle>

                                {isClosed ? (
                                  <Badge variant="secondary">Closed</Badge>
                                ) : (
                                  <Badge className="bg-emerald-500">
                                    Open
                                  </Badge>
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  {job.company}
                                </span>

                                {job.location && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {job.location}
                                  </span>
                                )}

                                <span className="inline-flex items-center gap-1">
                                  <Briefcase className="h-4 w-4" />
                                  {job.type || 'Full-time'}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <Badge
                                variant={
                                  trust.level === 'ok'
                                    ? 'secondary'
                                    : trust.level === 'caution'
                                      ? 'outline'
                                      : 'destructive'
                                }
                                className="capitalize"
                              >
                                {trust.level === 'ok' && (
                                  <ShieldCheck className="mr-1 h-3 w-3" />
                                )}
                                {trust.level === 'caution' && (
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                )}
                                {trust.level === 'risky' && (
                                  <XCircle className="mr-1 h-3 w-3" />
                                )}
                                {trust.level}
                              </Badge>

                              <p className="mt-2 text-xs text-muted-foreground">
                                {new Date(job.created_at || Date.now()).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <p className="line-clamp-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                            {job.description}
                          </p>

                          {job.skills && job.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {job.skills.slice(0, 10).map((skill) => (
                                <Badge key={skill} variant="outline">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm dark:bg-slate-900">
                            <div className="flex items-start gap-2">
                              {trust.level === 'ok' ? (
                                <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
                              ) : trust.level === 'caution' ? (
                                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                              ) : (
                                <XCircle className="mt-0.5 h-4 w-4 text-red-600" />
                              )}

                              <div>
                                <p className="font-medium">{trust.summary}</p>

                                {trust.reasons.length > 0 && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {trust.reasons.join(' ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-2">
                              {job.website && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full"
                                  onClick={() => window.open(safeWebsite(job.website), '_blank')}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Website
                                </Button>
                              )}

                              {isAuthor && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-full"
                                  onClick={() => openPortal(job)}
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  Applicants {appCountByJob[job.id] || 0}
                                </Button>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {isAuthor ? (
                                <>
                                  {!isClosed && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="rounded-full"
                                      onClick={() => closeJob(job)}
                                    >
                                      Close job
                                    </Button>
                                  )}

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-full"
                                    onClick={() => deleteJob(job)}
                                  >
                                    Delete
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-full"
                                  disabled={isClosed}
                                  onClick={() => openApply(job)}
                                >
                                  Apply now
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              <aside className="space-y-4">
                <Card className="rounded-[28px] border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Applicant Safety Rules
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>Never pay money to apply for a job.</p>
                    <p>Verify the company website and hiring email.</p>
                    <p>Do not send ID copies unless the employer is verified and trusted.</p>
                    <p>Use the recruitment portal to keep your documents organized.</p>
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Business+ Hiring Tools
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>Post jobs.</p>
                    <p>Receive applicant documents.</p>
                    <p>Download CVs and certificates.</p>
                    <p>Shortlist, reject, or hire applicants.</p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post a job</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Job title</Label>
                <Input
                  value={jobForm.title}
                  onChange={(e) =>
                    setJobForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Sales Assistant"
                />
              </div>

              <div className="space-y-1">
                <Label>Company</Label>
                <Input
                  value={jobForm.company}
                  onChange={(e) =>
                    setJobForm((prev) => ({ ...prev, company: e.target.value }))
                  }
                  placeholder="e.g. Tzaneen Retail Group"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Location</Label>
                <Input
                  value={jobForm.location}
                  onChange={(e) =>
                    setJobForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="e.g. Tzaneen, Limpopo"
                />
              </div>

              <div className="space-y-1">
                <Label>Job type</Label>
                <Input
                  value={jobForm.type}
                  onChange={(e) =>
                    setJobForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                  placeholder="Full-time, Part-time, Contract"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Website</Label>
                <Input
                  value={jobForm.website}
                  onChange={(e) =>
                    setJobForm((prev) => ({ ...prev, website: e.target.value }))
                  }
                  placeholder="company.co.za"
                />
              </div>

              <div className="space-y-1">
                <Label>Hiring email</Label>
                <Input
                  value={jobForm.contactEmail}
                  onChange={(e) =>
                    setJobForm((prev) => ({
                      ...prev,
                      contactEmail: e.target.value,
                    }))
                  }
                  placeholder="hr@company.co.za"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Skills</Label>
              <Input
                value={jobForm.skillsText}
                onChange={(e) =>
                  setJobForm((prev) => ({
                    ...prev,
                    skillsText: e.target.value,
                  }))
                }
                placeholder="Sales, Communication, Excel"
              />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={jobForm.description}
                onChange={(e) =>
                  setJobForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={6}
                placeholder="Explain the role, requirements, salary range if available, and how the recruitment process works."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>

            <Button type="button" onClick={handleCreateJob} disabled={busy}>
              {busy ? 'Posting...' : 'Post job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Apply for {selectedJob?.title || 'job'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Your name</Label>
                <Input
                  value={applicationForm.name}
                  onChange={(e) =>
                    setApplicationForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={applicationForm.email}
                  onChange={(e) =>
                    setApplicationForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={applicationForm.phone}
                onChange={(e) =>
                  setApplicationForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="+27..."
              />
            </div>

            <div className="space-y-1">
              <Label>Short note</Label>
              <Textarea
                value={applicationForm.note}
                onChange={(e) =>
                  setApplicationForm((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
                }
                rows={4}
                placeholder="Tell the employer why you are a good fit."
              />
            </div>

            <div className="rounded-2xl border border-dashed p-4">
              <Label className="mb-2 block">Upload CV or document</Label>

              <label className="flex cursor-pointer items-center justify-center rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground hover:bg-slate-100 dark:bg-slate-900">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument(file);
                    e.currentTarget.value = '';
                  }}
                />

                <span>
                  <UploadCloud className="mx-auto mb-2 h-6 w-6" />
                  {uploadingDoc
                    ? 'Uploading...'
                    : applicationForm.documentName
                      ? applicationForm.documentName
                      : 'Choose CV, certificate, or document'}
                </span>
              </label>

              {applicationForm.documentUrl && (
                <p className="mt-2 text-xs text-emerald-600">
                  Document uploaded and ready to submit.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={busy || uploadingDoc}
              onClick={handleSubmitApplication}
            >
              {busy ? 'Submitting...' : 'Submit application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={portalOpen} onOpenChange={setPortalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Applicants — {selectedJob?.title || 'Job'}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {selectedJobApplications.length === 0 ? (
              <div className="rounded-2xl border py-10 text-center">
                <Users className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
                <p className="font-semibold">No applicants yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  When users apply, their documents will show here.
                </p>
              </div>
            ) : (
              selectedJobApplications.map((application) => (
                <div
                  key={application.id}
                  className="rounded-2xl border bg-white p-4 dark:bg-slate-950"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {application.applicant_name}
                        </p>

                        <Badge variant="outline" className="capitalize">
                          {application.status || 'submitted'}
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {application.applicant_email}
                        {application.applicant_phone
                          ? ` · ${application.applicant_phone}`
                          : ''}
                      </p>

                      {application.note && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                          {application.note}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-muted-foreground">
                        Applied{' '}
                        {new Date(
                          application.created_at || Date.now()
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      {application.document_url ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() =>
                            window.open(application.document_url || '', '_blank')
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download document
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled
                          className="rounded-full"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          No document
                        </Button>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() =>
                            updateApplicationStatus(application, 'shortlisted')
                          }
                        >
                          Shortlist
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() =>
                            updateApplicationStatus(application, 'rejected')
                          }
                        >
                          Reject
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          className="rounded-full"
                          onClick={() =>
                            updateApplicationStatus(application, 'hired')
                          }
                        >
                          Hire
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
