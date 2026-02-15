import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/store/userStore';
import { useNavigate } from 'react-router-dom';

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
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function RecruiterPortalPage() {
  const navigate = useNavigate();
  const { hasTier } = useUserStore();
  const canAccess = hasTier('business');

  const [devPreviewEnabled, setDevPreviewEnabled] = useState(false);
  const canPreview = (import.meta as any).env?.DEV && devPreviewEnabled;
  const allowed = canAccess || canPreview;

  const [applications, setApplications] = useState<JobApplication[]>([]);

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
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as JobApplication[]) : [];
      setApplications(Array.isArray(parsed) ? parsed : []);
    } catch {
      setApplications([]);
    }
  }, [allowed]);

  const sorted = useMemo(() => {
    return [...applications].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [applications]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="pt-14 md:pt-16 max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Recruiter Portal</h1>
            <p className="text-sm text-muted-foreground">Business+ inbox for job applications and documents.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/jobs')}>Back to Jobs</Button>
        </div>

        {!canAccess ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Business tier required</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div>
                The Recruiter Portal is available for Business tier or higher.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => navigate('/pricing')}>Upgrade</Button>
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
                  <Button onClick={() => navigate(0)}>Open Preview</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {allowed && (
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Applications</span>
                  <Badge variant="secondary" className="text-[11px]">{sorted.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sorted.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No applications yet.</div>
                ) : (
                  <div className="space-y-3">
                    {sorted.map((app) => (
                      <Card key={app.id} className="shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{app.jobTitle}</div>
                              <div className="text-xs text-muted-foreground truncate">{app.company} • {new Date(app.createdAt).toLocaleString()}</div>
                              <div className="text-xs mt-1">
                                <span className="font-medium">{app.applicant.fullName}</span>
                                <span className="text-muted-foreground"> • {app.applicant.email}{app.applicant.phone ? ` • ${app.applicant.phone}` : ''}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{app.jobId}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="text-xs text-muted-foreground">Documents</div>
                          <div className="flex flex-col gap-2">
                            {(app.attachments || []).map((att, idx) => (
                              <div key={`${att.name}_${idx}`} className="flex items-center justify-between gap-3 rounded-lg border p-2 bg-card">
                                <div className="min-w-0">
                                  <div className="text-sm truncate">{att.name}</div>
                                  <div className="text-[11px] text-muted-foreground">{att.kind || 'document'}{att.type ? ` • ${att.type}` : ''}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!att.dataUrl}
                                    onClick={() => {
                                      if (!att.dataUrl) return;
                                      window.open(att.dataUrl, '_blank', 'noreferrer');
                                    }}
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
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                This portal currently reads from local device storage as a fallback. If you connect a backend endpoint for recruiter inbox, we can switch this to a live multi-device view.
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
