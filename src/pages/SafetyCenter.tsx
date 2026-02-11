import Navbar from '@/components/layout/Navbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface SafetyLog {
  _id: string;
  type: string;
  createdAt: string;
  details?: any;
}

type ScamReport = {
  id: string;
  createdAt: string;
  summary: string;
  status: 'needs_review' | 'reviewed';
};

const SCAM_REPORTS_KEY = 'faceme:safety:scam_reports_v1';

export default function SafetyCenter() {
  const [logs, setLogs] = useState<SafetyLog[]>([]);
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [reportDraft, setReportDraft] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/safety/logs') as any;
        if (res?.logs) setLogs(res.logs);
      } catch {
        // ignore for now
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCAM_REPORTS_KEY);
      const parsed = raw ? (JSON.parse(raw) as ScamReport[]) : [];
      setReports(Array.isArray(parsed) ? parsed : []);
    } catch {
      setReports([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SCAM_REPORTS_KEY, JSON.stringify(reports));
    } catch {}
  }, [reports]);

  const submitReport = async () => {
    const summary = reportDraft.trim();
    if (!summary) return;
    setReportSubmitting(true);
    try {
      const report: ScamReport = {
        id: `sr_${Date.now()}`,
        createdAt: new Date().toISOString(),
        summary,
        status: 'needs_review',
      };
      setReports((prev) => [report, ...prev]);
      setReportDraft('');
      try {
        await api.post('/api/safety/report-scam', { summary });
      } catch {
        // backend may not exist yet; keep local queue
      }
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="pt-14 md:pt-16 max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">FaceMeX Safety Center</h1>
        <p className="text-muted-foreground text-sm">
          Tools, policies, and transparency to help keep your experience safe.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Report a Problem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                See something that looks like a scam, abuse, or safety risk? Report it and our systems will review.
              </p>
              <textarea
                value={reportDraft}
                onChange={(e) => setReportDraft(e.target.value)}
                placeholder="Describe the scam (profile name, message, link, what happened...)"
                className="w-full min-h-[86px] rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={submitReport}
                  disabled={reportSubmitting || !reportDraft.trim()}
                >
                  {reportSubmitting ? 'Submitting…' : 'Report Potential Scam'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reports to review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {reports.filter((r) => r.status === 'needs_review').length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending scam reports.</p>
              ) : (
                <ul className="space-y-2">
                  {reports
                    .filter((r) => r.status === 'needs_review')
                    .slice(0, 20)
                    .map((r) => (
                      <li key={r.id} className="rounded-lg border bg-background p-3">
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                        <div className="text-sm mt-1 whitespace-pre-wrap break-words">{r.summary}</div>
                        <div className="mt-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-xs"
                            onClick={() =>
                              setReports((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, status: 'reviewed' } : x))
                              )
                            }
                          >
                            Mark reviewed
                          </Button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Screenshot & Download Protection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                We detect screenshot and screen recording attempts and log them here for your account awareness.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blocked Screenshot Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.length === 0 && (
                <p className="text-sm text-muted-foreground">No recent screenshot or safety events.</p>
              )}
              {logs.length > 0 && (
                <ul className="space-y-1 text-sm max-h-60 overflow-y-auto">
                  {logs.map((log) => (
                    <li key={log._id} className="flex justify-between border-b py-1 text-xs">
                      <span>{log.type}</span>
                      <span className="text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Policy Library</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">Read our core safety and privacy policies:</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Button asChild size="sm" variant="outline"><a href="/tos">Terms of Service</a></Button>
                <Button asChild size="sm" variant="outline"><a href="/privacy">Privacy Policy</a></Button>
                <Button asChild size="sm" variant="outline"><a href="/ethics">AI Ethics Policy</a></Button>
                <Button asChild size="sm" variant="outline"><a href="/screenshot-policy">Screenshot Policy</a></Button>
                <Button asChild size="sm" variant="outline"><a href="/community-rules">Community Rules</a></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
