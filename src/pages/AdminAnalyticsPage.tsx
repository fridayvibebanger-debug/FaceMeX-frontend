import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Activity, Flame, AlertTriangle, Eye, MousePointer } from 'lucide-react';

type ProfileRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  last_seen_at?: string | null;
  first_seen_at?: string | null;
  total_sessions?: number | null;
  created_at?: string | null;
};

type EventRow = {
  id: string;
  user_id: string;
  event_name: string;
  page?: string | null;
  metadata?: any;
  created_at: string;
};

function getName(profile?: ProfileRow) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.username ||
    profile?.email?.split('@')[0] ||
    'Unknown user'
  );
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'Unknown';
  }
}

function getRisk(lastSeen?: string | null) {
  if (!lastSeen) return { label: 'Lost', className: 'bg-red-100 text-red-700 border-red-200' };

  const last = new Date(lastSeen).getTime();
  const now = Date.now();
  const diffDays = (now - last) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return { label: 'Hot', className: 'bg-green-100 text-green-700 border-green-200' };
  if (diffDays <= 3) return { label: 'Warm', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  if (diffDays >= 7) return { label: 'Cold', className: 'bg-orange-100 text-orange-700 border-orange-200' };

  return { label: 'Cooling', className: 'bg-slate-100 text-slate-700 border-slate-200' };
}

function countBy<T extends string>(items: T[]) {
  const map = new Map<T, number>();

  items.forEach((item) => {
    map.set(item, (map.get(item) || 0) + 1);
  });

  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

export default function AdminAnalyticsPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminAllowed, setAdminAllowed] = useState(false);

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email || '';

      // Frontend gate. Real protection is Supabase RLS policy.
      const allowedEmails = ['luckymawasha72@gmail.com'];

      if (!allowedEmails.includes(email)) {
        setAdminAllowed(false);
        setLoading(false);
        return;
      }

      setAdminAllowed(true);

      const since = daysAgo(30).toISOString();

      const [profilesResult, eventsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, name, username, email, last_seen_at, first_seen_at, total_sessions, created_at')
          .order('last_seen_at', { ascending: false, nullsFirst: false }),

        supabase
          .from('user_events')
          .select('id, user_id, event_name, page, metadata, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (eventsResult.error) throw eventsResult.error;

      setProfiles((profilesResult.data || []) as ProfileRow[]);
      setEvents((eventsResult.data || []) as EventRow[]);
    } catch (error: any) {
      console.error('Analytics load failed:', error);
      alert(error?.message || 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const stats = useMemo(() => {
    const today = startOfToday();
    const weekAgo = daysAgo(7);

    const activeTodayUsers = new Set(
      events
        .filter((e) => new Date(e.created_at) >= today)
        .map((e) => e.user_id)
    );

    const activeDayMap = new Map<string, Set<string>>();

    events
      .filter((e) => new Date(e.created_at) >= weekAgo)
      .forEach((event) => {
        const day = new Date(event.created_at).toISOString().slice(0, 10);

        if (!activeDayMap.has(event.user_id)) {
          activeDayMap.set(event.user_id, new Set());
        }

        activeDayMap.get(event.user_id)?.add(day);
      });

    const returnedThisWeekUsers = Array.from(activeDayMap.entries())
      .filter(([, days]) => days.size >= 2)
      .map(([userId]) => userId);

    const coldUsers = profiles.filter((p) => {
      if (!p.last_seen_at) return true;
      return new Date(p.last_seen_at) < daysAgo(7);
    });

    const featureEvents = events.filter(
      (e) => !['app_open', 'page_view', 'login'].includes(e.event_name)
    );

    const topFeature =
      countBy(featureEvents.map((e) => e.event_name))[0]?.[0] || 'No feature data yet';

    const mostUsedPage =
      countBy(events.map((e) => e.page || 'unknown'))[0]?.[0] || 'No page data yet';

    return {
      totalUsers: profiles.length,
      activeToday: activeTodayUsers.size,
      returnedThisWeek: returnedThisWeekUsers.length,
      coldUsers: coldUsers.length,
      topFeature,
      mostUsedPage,
      activeDayMap,
    };
  }, [profiles, events]);

  const userRows = useMemo(() => {
    return profiles.map((profile) => {
      const userEvents = events.filter((e) => e.user_id === profile.id);
      const featureEvents = userEvents.filter(
        (e) => !['app_open', 'page_view', 'login'].includes(e.event_name)
      );

      const topAction =
        countBy(featureEvents.map((e) => e.event_name))[0]?.[0] ||
        countBy(userEvents.map((e) => e.event_name))[0]?.[0] ||
        'No activity';

      const activeDays =
        stats.activeDayMap.get(profile.id)?.size || 0;

      const returned = activeDays >= 2;
      const risk = getRisk(profile.last_seen_at);

      return {
        id: profile.id,
        name: getName(profile),
        email: profile.email || '',
        lastSeen: profile.last_seen_at,
        sessions: Number(profile.total_sessions || 0),
        topAction,
        returned,
        risk,
      };
    });
  }, [profiles, events, stats.activeDayMap]);

  const topReturningUsers = userRows
    .filter((u) => u.returned)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  if (!adminAllowed && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 pt-20">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-semibold">Admin only</p>
              <p className="text-sm text-muted-foreground mt-2">
                You do not have access to analytics.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-20 pb-20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">FaceMeX Analytics</h1>
            <p className="text-sm text-muted-foreground">
              See who returns, what they use, and who is going cold.
            </p>
          </div>

          <Button onClick={loadAnalytics} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Users className="h-5 w-5 text-muted-foreground mb-3" />
              <p className="text-xs text-muted-foreground">Total users</p>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Activity className="h-5 w-5 text-muted-foreground mb-3" />
              <p className="text-xs text-muted-foreground">Active today</p>
              <p className="text-3xl font-bold">{stats.activeToday}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Flame className="h-5 w-5 text-muted-foreground mb-3" />
              <p className="text-xs text-muted-foreground">Returned this week</p>
              <p className="text-3xl font-bold">{stats.returnedThisWeek}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <AlertTriangle className="h-5 w-5 text-muted-foreground mb-3" />
              <p className="text-xs text-muted-foreground">Cold users</p>
              <p className="text-3xl font-bold">{stats.coldUsers}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Top feature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold break-all">{stats.topFeature}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Most used page</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold break-all">{stats.mostUsedPage}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Top returning users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topReturningUsers.length ? (
                topReturningUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{u.name}</span>
                    <Badge variant="secondary">{u.sessions} sessions</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No returning users yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">User retention table</CardTitle>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Last seen</th>
                  <th className="text-left p-3">Sessions</th>
                  <th className="text-left p-3">Top action</th>
                  <th className="text-left p-3">Returned?</th>
                  <th className="text-left p-3">Risk</th>
                </tr>
              </thead>

              <tbody>
                {userRows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 min-w-[180px]">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground break-all">{row.email}</div>
                    </td>

                    <td className="p-3 min-w-[180px] text-muted-foreground">
                      {formatDate(row.lastSeen)}
                    </td>

                    <td className="p-3">{row.sessions}</td>

                    <td className="p-3 min-w-[150px] break-all">
                      {row.topAction}
                    </td>

                    <td className="p-3">
                      {row.returned ? (
                        <Badge className="bg-green-600">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </td>

                    <td className="p-3">
                      <Badge variant="outline" className={row.risk.className}>
                        {row.risk.label}
                      </Badge>
                    </td>
                  </tr>
                ))}

                {!userRows.length && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No users found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
