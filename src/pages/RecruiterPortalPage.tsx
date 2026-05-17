import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store/userStore';
import { useNavigate } from 'react-router-dom';

type ApplicationStatus = 'new' | 'shortlisted' | 'rejected' | 'reviewed';

type ApplicationAttachment = {
  name: string;
  type: string;
  dataUrl?: string;
  kind?: 'cover_letter' | 'document';
};

type JobApplication = {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  createdAt: string;
  status?: ApplicationStatus;
  applicant: {
    fullName: string;
    email: string;
    phone?: string;
  };
  attachments: ApplicationAttachment[];
};

const STORAGE_KEY = 'faceme:jobs:applications_v1';
const DEV_PREVIEW_KEY = 'faceme:dev:recruiter_portal_preview_v1';

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename || 'document';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function readApplications(): JobApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as JobApplication[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveApplications(apps: JobApplication[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch {
    // ignore storage error
  }
}

function openDataUrl(dataUrl?: string) {
  if (!dataUrl) return;

  const win = window.open('', '_blank', 'noopener,noreferrer');

  if (!win) {
    window.location.href = dataUrl;
    return;
  }

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Application Document</title>
        <style>
          body { margin: 0; background: #111; }
          iframe { width: 100vw; height: 100vh; border: 0; background: #fff; }
        </style>
      </head>
      <body>
        <iframe src="${dataUrl}"></iframe>
      </body>
    </html>
  `);

  win.document.close();
}

function createDemoApplications(): JobApplication[] {
  const now = new Date().toISOString();

  const coverLetterText =
    'Good day,\n\nI am applying for this role because I believe my skills, discipline, and willingness to learn can add value to your company.\n\nKind regards';

  const coverLetterDataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(
    coverLetterText
  )}`;

  return [
    {
      id: `demo-app-${Date.now()}-1`,
      jobId: 'JOB-001',
      jobTitle: 'Junior Admin Assistant',
      company: 'FaceMeX Demo Business',
      createdAt: now,
      status: 'new',
      applicant: {
        fullName: 'Thabo Mokoena',
        email: 'thabo.demo@example.com',
        phone: '0760000000',
      },
      attachments: [
        {
          name: 'Thabo_Mokoena_Cover_Letter.txt',
          type: 'text/plain',
          dataUrl: coverLetterDataUrl,
          kind: 'cover_letter',
        },
        {
          name: 'Thabo_Mokoena_CV.txt',
          type: 'text/plain',
          dataUrl:
            'data:text/plain;charset=utf-8,' +
            encodeURIComponent(
              'THABO MOKOENA\n\nProfessional Summary\nReliable junior admin candidate with communication, computer literacy and organisation skills.\n\nSkills\n• Admin support\n• Email communication\n• Filing\n• Customer service'
            ),
          kind: 'document',
        },
      ],
    },
    {
      id: `demo-app-${Date.now()}-2`,
      jobId: 'JOB-002',
      jobTitle: 'Sales Assistant',
      company: 'Tzaneen Retail Demo',
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      status: 'new',
      applicant: {
        fullName: 'Lerato Nkuna',
        email: 'lerato.demo@example.com',
        phone: '0710000000',
      },
      attachments: [
        {
          name: 'Lerato_Nkuna_CV.txt',
          type: 'text/plain',
          dataUrl:
            'data:text/plain;charset=utf-8,' +
            encodeURIComponent(
              'LERATO NKUNA\n\nProfessional Summary\nCustomer-focused candidate with retail, communication and teamwork skills.\n\nSkills\n• Customer service\n• Sales support\n• Stock packing\n• Teamwork'
            ),
          kind: 'document',
        },
      ],
    },
  ];
}

function statusBadgeVariant(status: ApplicationStatus) {
  if (status === 'shortlisted') return 'default';
  if (status === 'rejected') return 'destructive';
  if (status === 'reviewed') return 'secondary';
  return 'outline';
}

export default function RecruiterPortalPage() {
  const navigate = useNavigate();
  const { hasTier, tier } = useUserStore();

  const currentTier = String(tier || 'free').toLowerCase();

  const canAccess =
    Boolean(hasTier?.('business')) ||
    currentTier === 'business' ||
    currentTier === 'exclusive';

  const [devPreviewEnabled, setDevPreviewEnabled] = useState(false);
  const canPreview = Boolean((import.meta as any).env?.DEV && devPreviewEnabled);
  const allowed = canAccess || canPreview;

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | 'all'>('all');

  useEffect(() => {
    if (!(import.meta as any).env?.DEV) return;

    try {
      const raw = localStorage.getItem(DEV_PREVIEW_KEY);
      setDevPreviewEnabled(raw === '1');
    } catch {
      setDevPreviewEnabled(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    setApplications(readApplications());
  }, [allowed]);

  const sorted = useMemo(() => {
    const list = [...applications].sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );

    if (selectedStatus === 'all') return list;

    return list.filter((app) => (app.status || 'new') === selectedStatus);
  }, [applications, selectedStatus]);

  const counts = useMemo(() => {
    return applications.reduce(
      (acc, app) => {
        const status = app.status || 'new';
        acc[status] += 1;
        return acc;
      },
      {
        new: 0,
        shortlisted: 0,
        rejected: 0,
        reviewed: 0,
      } as Record<ApplicationStatus, number>
    );
  }, [applications]);

  const updateStatus = (id: string, status: ApplicationStatus) => {
    const next = applications.map((app) =>
      app.id === id ? { ...app, status } : app
    );

    setApplications(next);
    saveApplications(next);
  };

  const deleteApplication = (id: string) => {
    const next = applications.filter((app) => app.id !== id);
    setApplications(next);
    saveApplications(next);
  };

  const loadDemo = () => {
    const demo = createDemoApplications();
    const next = [...demo, ...applications];

    setApplications(next);
    saveApplications(next);
  };

  const clearAll = () => {
    setApplications([]);
    saveApplications([]);
  };

  const contactApplicant = (app: JobApplication) => {
    const subject = encodeURIComponent(`Application for ${app.jobTitle}`);
    const body = encodeURIComponent(
      `Good day ${app.applicant.fullName},\n\nThank you for applying for ${app.jobTitle} at ${app.company}.\n\nKind regards`
    );

    window.location.href = `mailto:${app.applicant.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <div className="pt-14 md:pt-16 max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Recruiter Portal</h1>
            <p className="text-sm text-muted-foreground">
              Business+ inbox for job applications and documents.
            </p>
          </div>

          <Button variant="outline" onClick={() => navigate('/jobs')}>
            Back to Jobs
          </Button>
        </div>

        {!allowed ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Business tier required</CardTitle>
            </CardHeader>

            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div>
                The Recruiter Portal is available for Business tier or higher.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => navigate('/pricing')}>
                  Upgrade
                </Button>

                <Button variant="outline" onClick={() => navigate('/jobs')}>
                  Back to Jobs
                </Button>

                {(import.meta as any).env?.DEV && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        const next = !devPreviewEnabled;
                        localStorage.setItem(DEV_PREVIEW_KEY, next ? '1' : '0');
                        setDevPreviewEnabled(next);
                      } catch {
                        setDevPreviewEnabled(true);
                      }
                    }}
                  >
                    {devPreviewEnabled ? 'Disable Dev Preview' : 'Enable Dev Preview'}
                  </Button>
                )}

                {(import.meta as any).env?.DEV && devPreviewEnabled && (
                  <Button onClick={() => navigate(0)}>
                    Open Preview
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {allowed && (
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-3">
                  <span>Applications</span>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[11px]">
                      Total {applications.length}
                    </Badge>

                    <Badge variant="outline" className="text-[11px]">
                      New {counts.new}
                    </Badge>

                    <Badge variant="default" className="text-[11px]">
                      Shortlisted {counts.shortlisted}
                    </Badge>

                    <Button size="sm" variant="outline" onClick={() => setApplications(readApplications())}>
                      Refresh
                    </Button>

                    <Button size="sm" variant="outline" onClick={loadDemo}>
                      Add Demo
                    </Button>

                    {applications.length > 0 && (
                      <Button size="sm" variant="destructive" onClick={clearAll}>
                        Clear All
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'new', 'shortlisted', 'reviewed', 'rejected'] as const).map(
                    (status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={selectedStatus === status ? 'default' : 'outline'}
                        onClick={() => setSelectedStatus(status)}
                      >
                        {status === 'all'
                          ? 'All'
                          : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    )
                  )}
                </div>

                {sorted.length === 0 ? (
                  <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                    No applications yet. Use <span className="font-medium">Add Demo</span> to preview how the recruiter inbox works.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sorted.map((app) => {
                      const status = (app.status || 'new') as ApplicationStatus;

                      return (
                        <Card key={app.id} className="shadow-sm">
                          <CardHeader>
                            <CardTitle className="text-sm flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold truncate">
                                  {app.jobTitle}
                                </div>

                                <div className="text-xs text-muted-foreground truncate">
                                  {app.company} •{' '}
                                  {new Date(app.createdAt).toLocaleString()}
                                </div>

                                <div className="text-xs mt-1">
                                  <span className="font-medium">
                                    {app.applicant.fullName}
                                  </span>

                                  <span className="text-muted-foreground">
                                    {' '}
                                    • {app.applicant.email}
                                    {app.applicant.phone
                                      ? ` • ${app.applicant.phone}`
                                      : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <Badge
                                  variant={statusBadgeVariant(status)}
                                  className="text-[10px] capitalize"
                                >
                                  {status}
                                </Badge>

                                <Badge variant="outline" className="text-[10px]">
                                  {app.jobId}
                                </Badge>
                              </div>
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => contactApplicant(app)}
                              >
                                Contact
                              </Button>

                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => updateStatus(app.id, 'shortlisted')}
                              >
                                Shortlist
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus(app.id, 'reviewed')}
                              >
                                Mark reviewed
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus(app.id, 'rejected')}
                              >
                                Reject
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteApplication(app.id)}
                              >
                                Delete
                              </Button>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Documents
                            </div>

                            <div className="flex flex-col gap-2">
                              {(app.attachments || []).length === 0 ? (
                                <div className="text-xs text-muted-foreground">
                                  No documents attached.
                                </div>
                              ) : (
                                (app.attachments || []).map((att, idx) => (
                                  <div
                                    key={`${att.name}_${idx}`}
                                    className="flex items-center justify-between gap-3 rounded-lg border p-2 bg-card"
                                  >
                                    <div className="min-w-0">
                                      <div className="text-sm truncate">
                                        {att.name}
                                      </div>

                                      <div className="text-[11px] text-muted-foreground">
                                        {att.kind || 'document'}
                                        {att.type ? ` • ${att.type}` : ''}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!att.dataUrl}
                                        onClick={() => openDataUrl(att.dataUrl)}
                                      >
                                        View
                                      </Button>

                                      <Button
                                        size="sm"
                                        disabled={!att.dataUrl}
                                        onClick={() => {
                                          if (!att.dataUrl) return;
                                          downloadDataUrl(att.dataUrl, att.name);
                                        }}
                                      >
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>

              <CardContent className="text-sm text-muted-foreground">
                This portal currently reads job applications from local device storage. The buttons now work for demo preview, viewing documents, downloading documents, contacting applicants, shortlisting, reviewing, rejecting and deleting applications.
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
