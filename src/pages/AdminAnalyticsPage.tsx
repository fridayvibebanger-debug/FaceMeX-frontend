import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type AnalyticsReport = {
  overview: {
    registered_users: number;
    active_users_in_range: number;
    daily_active_users: number;
    weekly_active_users: number;
    monthly_active_users: number;
    returning_users_in_range: number;
    event_count: number;
    page_views: number;
    app_opens: number;
    new_signups: number;
    ai_successes: number;
    ai_failures: number;
    document_actions: number;
  };
  daily: Array<{ date: string; events: number; unique_users: number; signups: number }>;
  features: Array<{ feature: string; events: number; unique_users: number }>;
  buttons: Array<{ button_id: string; events: number; unique_users: number }>;
  devices: Array<{ device: string; events: number; unique_users: number }>;
  errors: Array<{ event_name: string; feature: string | null; error_category: string | null; events: number; unique_users: number }>;
  users: Array<{ user_id: string; events: number; features_used: number; last_seen: string }>;
  recent_activity: Array<{
    user_id: string;
    event_name: string;
    feature: string | null;
    button_id: string | null;
    route: string | null;
    device_category: string;
    outcome: string | null;
    error_category: string | null;
    occurred_at: string;
  }>;
  retention: { day_1: number | null; day_7: number | null; day_30: number | null };
  availability: { sessions: boolean; subscriptions: boolean };
};

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function metric(value: number | null | undefined) {
  return value == null ? '—' : new Intl.NumberFormat().format(value);
}

function MetricCard({ label, value, help }: { label: string; value: number | null | undefined; help: string }) {
  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
      <p className="break-words text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{metric(value)}</p>
      <p className="mt-1 break-words text-xs leading-4 text-muted-foreground sm:leading-5">{help}</p>
    </article>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-border [touch-action:pan-x]">
      <table className="w-full min-w-[500px] text-left text-sm sm:min-w-[540px]">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>{headers.map((header) => <th key={header} className="px-3 py-2.5 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="max-w-[280px] break-words px-2 py-2 align-top sm:px-3 sm:py-2.5">{children}</td>;
}

export default function AdminAnalyticsPage() {
  const today = useMemo(() => dateString(new Date()), []);
  const monthAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return dateString(date);
  }, []);
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [feature, setFeature] = useState('');
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session?.access_token) throw new Error('Sign in to view product analytics.');
      const response = await fetch('/.netlify/functions/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          action: 'report',
          start_date: startDate,
          end_date: endDate,
          feature: feature || null,
        }),
      });
      const responseBody = await response.text();
      let result: { message?: string; report?: AnalyticsReport } | null = null;
      if (responseBody) {
        try {
          result = JSON.parse(responseBody) as { message?: string; report?: AnalyticsReport };
        } catch {
          if (response.ok) throw new Error('Analytics service returned an invalid response.');
        }
      }
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('This dashboard is private to the FaceMeX owner account.');
        }
        if (response.status === 404) {
          throw new Error('Analytics service was not found. Use Netlify Dev for local testing, or verify the deployed function.');
        }
        throw new Error(result?.message || `Analytics could not be loaded (HTTP ${response.status}).`);
      }
      if (!result?.report) throw new Error('Analytics service returned an invalid report.');
      setReport(result.report);
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : 'Analytics could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, feature]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const overview = report?.overview;
  const maxEvents = Math.max(1, ...(report?.daily.map((item) => item.events) || []));

  return (
    <main className="mx-auto min-h-screen w-full min-w-0 max-w-7xl space-y-4 overflow-x-hidden px-3 py-4 text-foreground sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Private · owner access</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Product activity</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Real recorded activity only. Active users are distinct signed-in accounts with events in the selected period.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-border px-3 text-sm hover:bg-muted disabled:opacity-50 sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <section aria-label="Analytics filters" className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-border bg-card p-3 sm:flex sm:items-end sm:p-4">
        <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
          From
          <input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="h-10 min-w-0 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground sm:px-3" />
        </label>
        <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
          Through
          <input type="date" value={endDate} min={startDate} max={today} onChange={(event) => setEndDate(event.target.value)} className="h-10 min-w-0 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground sm:px-3" />
        </label>
        <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground sm:min-w-56">
          Feature
          <select value={feature} onChange={(event) => setFeature(event.target.value)} className="h-10 min-w-0 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="">All features</option>
            {report?.features.map((item) => <option key={item.feature} value={item.feature}>{item.feature}</option>)}
          </select>
        </label>
        <p className="min-w-0 break-words text-xs text-muted-foreground sm:ml-auto">Showing {startDate} through {endDate}</p>
      </section>

      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      {loading && !report && <p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">Loading recorded activity…</p>}
      {!loading && !error && report && overview?.event_count === 0 && (
        <p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">No analytics events were recorded in this date range. Events are collected only after the user has granted analytics consent.</p>
      )}

      {report && (
        <>
          <section aria-label="Overview metrics" className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            <MetricCard label="Registered users" value={overview?.registered_users} help="Accounts currently registered; not limited to the selected dates." />
            <MetricCard label="Daily active users" value={overview?.daily_active_users} help={`Unique users active on ${endDate}.`} />
            <MetricCard label="Weekly active users" value={overview?.weekly_active_users} help="Unique users active in the 7 days ending on the selected end date." />
            <MetricCard label="Monthly active users" value={overview?.monthly_active_users} help="Unique users active in the 30 days ending on the selected end date." />
            <MetricCard label="Active in selected period" value={overview?.active_users_in_range} help="Distinct signed-in users with at least one recorded event." />
            <MetricCard label="Returning users" value={overview?.returning_users_in_range} help="Users with activity on more than one day in the selected range." />
            <MetricCard label="New sign-ups" value={overview?.new_signups} help="Supabase account creation dates in the selected range." />
            <MetricCard label="Recorded events" value={overview?.event_count} help={`${metric(overview?.page_views)} page views · ${metric(overview?.app_opens)} app opens.`} />
            <MetricCard label="AI successes" value={overview?.ai_successes} help="Recorded successful AI-workspace response events." />
            <MetricCard label="AI failures" value={overview?.ai_failures} help="Recorded failed AI-workspace response events." />
            <MetricCard label="Document actions" value={overview?.document_actions} help="Recorded document generation, editing, saving, or export events." />
            <MetricCard label="D1 / D7 / D30 retention" value={null} help={report.retention.day_1 == null && report.retention.day_7 == null && report.retention.day_30 == null
              ? 'Not enough recorded historical cohorts.'
              : `${report.retention.day_1 ?? '—'}% / ${report.retention.day_7 ?? '—'}% / ${report.retention.day_30 ?? '—'}%` } />
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-2 xl:gap-5">
            <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <div>
                <h2 className="font-semibold">Events and sign-ups over time</h2>
                <p className="text-xs text-muted-foreground">Bars show total event counts per day; labels show unique users and sign-ups.</p>
              </div>
              {report.daily.length ? (
                <div className="max-h-80 min-w-0 space-y-2 overflow-y-auto pr-1">
                  {report.daily.map((item) => (
                    <div key={item.date} className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1 text-xs sm:grid-cols-[5.5rem_minmax(0,1fr)_7rem]">
                      <span className="text-muted-foreground">{item.date}</span>
                      <div className="h-2 overflow-hidden rounded bg-muted">
                        <div className="h-full rounded bg-primary" style={{ width: `${(item.events / maxEvents) * 100}%` }} />
                      </div>
                      <span className="col-start-2 min-w-0 break-words text-[11px] leading-4 text-muted-foreground tabular-nums sm:col-start-3 sm:text-right sm:text-xs sm:leading-normal">{item.events} events · {item.unique_users} users · +{item.signups} sign-ups</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No daily data available.</p>}
            </div>
            <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <div>
                <h2 className="font-semibold">Feature usage</h2>
                <p className="text-xs text-muted-foreground">Events are total actions; unique users count each account once per feature.</p>
              </div>
              <DataTable headers={['Feature', 'Events', 'Unique users']}>
                {report.features.map((item) => <tr key={item.feature}><Cell>{item.feature}</Cell><Cell>{metric(item.events)}</Cell><Cell>{metric(item.unique_users)}</Cell></tr>)}
                {!report.features.length && <tr><Cell>No feature events recorded.</Cell><Cell>—</Cell><Cell>—</Cell></tr>}
              </DataTable>
            </div>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-2 xl:gap-5">
            <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <h2 className="font-semibold">Button and action activity</h2>
              <DataTable headers={['Button / action', 'Events', 'Unique users']}>
                {report.buttons.map((item) => <tr key={item.button_id}><Cell>{item.button_id}</Cell><Cell>{metric(item.events)}</Cell><Cell>{metric(item.unique_users)}</Cell></tr>)}
                {!report.buttons.length && <tr><Cell>No button identifiers recorded yet.</Cell><Cell>—</Cell><Cell>—</Cell></tr>}
              </DataTable>
            </div>
            <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <h2 className="font-semibold">Errors and failed actions</h2>
              <DataTable headers={['Event', 'Feature', 'Category', 'Events']}>
                {report.errors.map((item, index) => <tr key={`${item.event_name}-${item.error_category}-${index}`}><Cell>{item.event_name}</Cell><Cell>{item.feature || '—'}</Cell><Cell>{item.error_category || 'Unclassified'}</Cell><Cell>{metric(item.events)}</Cell></tr>)}
                {!report.errors.length && <tr><Cell>No failed actions recorded.</Cell><Cell>—</Cell><Cell>—</Cell><Cell>—</Cell></tr>}
              </DataTable>
            </div>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-2 xl:gap-5">
            <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <h2 className="font-semibold">Device usage</h2>
              <DataTable headers={['Device', 'Events', 'Unique users']}>
                {report.devices.map((item) => <tr key={item.device}><Cell>{item.device}</Cell><Cell>{metric(item.events)}</Cell><Cell>{metric(item.unique_users)}</Cell></tr>)}
                {!report.devices.length && <tr><Cell>No device events recorded.</Cell><Cell>—</Cell><Cell>—</Cell></tr>}
              </DataTable>
            </div>
            <div className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
              <h2 className="font-semibold">User activity</h2>
              <p className="text-xs text-muted-foreground">User IDs are pseudonymous account identifiers. No email or content is shown.</p>
              <DataTable headers={['User ID', 'Events', 'Features', 'Last active']}>
                {report.users.map((item) => <tr key={item.user_id}><Cell>{item.user_id}</Cell><Cell>{metric(item.events)}</Cell><Cell>{metric(item.features_used)}</Cell><Cell>{new Date(item.last_seen).toLocaleString()}</Cell></tr>)}
                {!report.users.length && <tr><Cell>No user activity in this range.</Cell><Cell>—</Cell><Cell>—</Cell><Cell>—</Cell></tr>}
              </DataTable>
            </div>
          </section>

          <section className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
            <h2 className="font-semibold">Recent activity</h2>
            <DataTable headers={['Time', 'User ID', 'Event', 'Feature / button', 'Route', 'Result']}>
              {report.recent_activity.map((item, index) => <tr key={`${item.user_id}-${item.event_name}-${item.occurred_at}-${index}`}>
                <Cell>{new Date(item.occurred_at).toLocaleString()}</Cell>
                <Cell>{item.user_id}</Cell>
                <Cell>{item.event_name}</Cell>
                <Cell>{[item.feature, item.button_id].filter(Boolean).join(' / ') || '—'}</Cell>
                <Cell>{item.route || '—'}</Cell>
                <Cell>{item.outcome || item.error_category || '—'}</Cell>
              </tr>)}
              {!report.recent_activity.length && <tr><Cell>No activity recorded in this range.</Cell><Cell>—</Cell><Cell>—</Cell><Cell>—</Cell><Cell>—</Cell><Cell>—</Cell></tr>}
            </DataTable>
          </section>

          <p className="text-xs leading-5 text-muted-foreground">
            Session counts and subscription conversions are unavailable because the current product does not emit reliable session or payment events. No historical events are fabricated. Analytics capture starts only after consent.
          </p>
        </>
      )}
    </main>
  );
}
