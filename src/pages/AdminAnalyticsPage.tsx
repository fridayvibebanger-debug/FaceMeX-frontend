import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Users,
  Activity,
  Flame,
  AlertTriangle,
  Eye,
  MousePointer,
  Search,
  MessageCircle,
  BarChart3,
  Clock,
  ListChecks,
} from 'lucide-react';

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

type UserAnalyticsRow = {
  id: string;
  name: string;
  email: string;
  lastSeen?: string | null;
  sessions: number;
  totalEvents: number;
  pageViews: number;
  featureUses: number;
  workspacePrompts: number;
  lastPrompt: string;
  topAction: string;
  topPage: string;
  returned: boolean;
  risk: {
    label: string;
    className: string;
  };
};

const ADMIN_EMAILS = [
  'luckymawasha72@gmail.com',
  'fridayvibebanger@gmail.com',
];

const SYSTEM_EVENTS = [
  'app_open',
  'page_view',
  'login',
  'session_start',
  'route_change',
];

function clean(value: unknown) {
  return String(value || '').trim();
}

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

function formatShortDate(value?: string | null) {
  if (!value) return 'Never';

  try {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
}

function getRisk(lastSeen?: string | null) {
  if (!lastSeen) {
    return {
      label: 'Lost',
      className: 'bg-red-100 text-red-700 border-red-200',
    };
  }

  const last = new Date(lastSeen).getTime();
  const now = Date.now();
  const diffDays = (now - last) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) {
    return {
      label: 'Hot',
      className: 'bg-green-100 text-green-700 border-green-200',
    };
  }

  if (diffDays <= 3) {
    return {
      label: 'Warm',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
  }

  if (diffDays >= 7) {
    return {
      label: 'Cold',
      className: 'bg-orange-100 text-orange-700 border-orange-200',
    };
  }

  return {
    label: 'Cooling',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

function countBy<T extends string>(items: T[]) {
  const map = new Map<T, number>();

  items.forEach((item) => {
    if (!item) return;
    map.set(item, (map.get(item) || 0) + 1);
  });

  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function isAdminEmail(email?: string | null) {
  return ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());
}

function getMetadataText(metadata: any) {
  if (!metadata) return '';

  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata || '');
  }
}

function shorten(text: string, max = 90) {
  const value = clean(text).replace(/\s+/g, ' ');

  if (value.length <= max) return value;

  return `${value.slice(0, max)}...`;
}

function extractPromptFromMetadata(metadata: any) {
  if (!metadata || typeof metadata !== 'object') return '';

  const keys = [
    'prompt',
    'message',
    'question',
    'input',
    'text',
    'userPrompt',
    'cleanPrompt',
    'workspacePrompt',
    'aiPrompt',
    'query',
  ];

  for (const key of keys) {
    const value = metadata?.[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const nestedValues = [
    metadata?.request?.prompt,
    metadata?.request?.message,
    metadata?.request?.question,
    metadata?.payload?.prompt,
    metadata?.payload?.message,
    metadata?.body?.prompt,
    metadata?.body?.message,
  ];

  for (const value of nestedValues) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function isWorkspaceEvent(event: EventRow) {
  const eventName = clean(event.event_name).toLowerCase();
  const page = clean(event.page).toLowerCase();
  const metadataText = getMetadataText(event.metadata).toLowerCase();

  return (
    eventName.includes('workspace') ||
    eventName.includes('job_assistant') ||
    eventName.includes('ai_job') ||
    eventName.includes('ai_prompt') ||
    eventName.includes('prompt_sent') ||
    eventName.includes('career_workspace') ||
    page.includes('workspace') ||
    page.includes('job-assistant') ||
    page.includes('career') ||
    metadataText.includes('workspace')
  );
}

function isPromptEvent(event: EventRow) {
  const eventName = clean(event.event_name).toLowerCase();

  return (
    isWorkspaceEvent(event) &&
    (
      eventName.includes('prompt') ||
      eventName.includes('send') ||
      eventName.includes('submit') ||
      Boolean(extractPromptFromMetadata(event.metadata))
    )
  );
}

function isFeatureEvent(event: EventRow) {
  return !SYSTEM_EVENTS.includes(clean(event.event_name).toLowerCase());
}

function getEventCategory(event: EventRow) {
  const eventName = clean(event.event_name).toLowerCase();
  const page = clean(event.page).toLowerCase();

  if (isPromptEvent(event)) return 'Workspace prompt';
  if (isWorkspaceEvent(event)) return 'Workspace';
  if (eventName.includes('post')) return 'Posts';
  if (eventName.includes('comment')) return 'Comments';
  if (eventName.includes('reaction') || eventName.includes('like')) return 'Reactions';
  if (eventName.includes('marketplace') || page.includes('marketplace')) return 'Marketplace';
  if (eventName.includes('profile') || page.includes('profile')) return 'Profile';
  if (eventName.includes('search')) return 'Search';
  if (eventName.includes('upload')) return 'Uploads';
  if (eventName.includes('page_view')) return 'Page view';
  if (eventName.includes('app_open')) return 'App open';

  return 'Other';
}

function getEventColor(category: string) {
  if (category === 'Workspace prompt') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (category === 'Workspace') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (category === 'Posts') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (category === 'Marketplace') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (category === 'Uploads') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (category === 'Page view') return 'bg-slate-100 text-slate-700 border-slate-200';

  return 'bg-muted text-muted-foreground border-border';
}

export default function AdminAnalyticsPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [adminUserId, setAdminUserId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('all');

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = String(userData.user?.email || '').toLowerCase();
      const currentUserId = userData.user?.id || '';

      if (!ADMIN_EMAILS.includes(email)) {
        setAdminAllowed(false);
        setLoading(false);
        return;
      }

      setAdminAllowed(true);
      setAdminUserId(currentUserId);

      const since = daysAgo(90).toISOString();

      const [profilesResult, eventsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'id, full_name, name, username, email, last_seen_at, first_seen_at, total_sessions, created_at'
          )
          .order('last_seen_at', { ascending: false, nullsFirst: false }),

        supabase
          .from('user_events')
          .select('id, user_id, event_name, page, metadata, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(3000),
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

  const adminIds = useMemo(() => {
    const ids = new Set<string>();

    if (adminUserId) ids.add(adminUserId);

    profiles.forEach((profile) => {
      if (isAdminEmail(profile.email)) {
        ids.add(profile.id);
      }
    });

    return ids;
  }, [profiles, adminUserId]);

  const visibleProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      if (adminIds.has(profile.id)) return false;
      if (isAdminEmail(profile.email)) return false;
      return true;
    });
  }, [profiles, adminIds]);

  const visibleEvents = useMemo(() => {
    return events.filter((event) => !adminIds.has(event.user_id));
  }, [events, adminIds]);

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();

    visibleProfiles.forEach((profile) => {
      map.set(profile.id, profile);
    });

    return map;
  }, [visibleProfiles]);

  const eventOptions = useMemo(() => {
    return countBy(visibleEvents.map((event) => event.event_name)).slice(0, 40);
  }, [visibleEvents]);

  const stats = useMemo(() => {
    const today = startOfToday();
    const weekAgo = daysAgo(7);

    const activeTodayUsers = new Set(
      visibleEvents
        .filter((event) => new Date(event.created_at) >= today)
        .map((event) => event.user_id)
    );

    const activeDayMap = new Map<string, Set<string>>();

    visibleEvents
      .filter((event) => new Date(event.created_at) >= weekAgo)
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

    const coldUsers = visibleProfiles.filter((profile) => {
      if (!profile.last_seen_at) return true;
      return new Date(profile.last_seen_at) < daysAgo(7);
    });

    const featureEvents = visibleEvents.filter(isFeatureEvent);
    const promptEvents = visibleEvents.filter(isPromptEvent);
    const workspaceUsers = new Set(promptEvents.map((event) => event.user_id));

    const topFeature =
      countBy(featureEvents.map((event) => event.event_name))[0]?.[0] ||
      'No feature data yet';

    const mostUsedPage =
      countBy(visibleEvents.map((event) => event.page || 'unknown'))[0]?.[0] ||
      'No page data yet';

    return {
      totalUsers: visibleProfiles.length,
      totalEvents: visibleEvents.length,
      activeToday: activeTodayUsers.size,
      returnedThisWeek: returnedThisWeekUsers.length,
      coldUsers: coldUsers.length,
      topFeature,
      mostUsedPage,
      workspacePrompts: promptEvents.length,
      workspaceUsers: workspaceUsers.size,
      activeDayMap,
    };
  }, [visibleProfiles, visibleEvents]);

  const userRows: UserAnalyticsRow[] = useMemo(() => {
    return visibleProfiles.map((profile) => {
      const userEvents = visibleEvents.filter((event) => event.user_id === profile.id);

      const featureEvents = userEvents.filter(isFeatureEvent);
      const promptEvents = userEvents.filter(isPromptEvent);
      const pageViewEvents = userEvents.filter(
        (event) => clean(event.event_name).toLowerCase() === 'page_view'
      );

      const topAction =
        countBy(featureEvents.map((event) => event.event_name))[0]?.[0] ||
        countBy(userEvents.map((event) => event.event_name))[0]?.[0] ||
        'No activity';

      const topPage =
        countBy(userEvents.map((event) => event.page || 'unknown'))[0]?.[0] ||
        'No page';

      const lastPrompt =
        promptEvents
          .map((event) => extractPromptFromMetadata(event.metadata))
          .find(Boolean) || '';

      const activeDays = stats.activeDayMap.get(profile.id)?.size || 0;
      const returned = activeDays >= 2;
      const risk = getRisk(profile.last_seen_at);

      return {
        id: profile.id,
        name: getName(profile),
        email: profile.email || '',
        lastSeen: profile.last_seen_at,
        sessions: Number(profile.total_sessions || 0),
        totalEvents: userEvents.length,
        pageViews: pageViewEvents.length,
        featureUses: featureEvents.length,
        workspacePrompts: promptEvents.length,
        lastPrompt,
        topAction,
        topPage,
        returned,
        risk,
      };
    });
  }, [visibleProfiles, visibleEvents, stats.activeDayMap]);

  const filteredUserRows = useMemo(() => {
    const q = search.toLowerCase().trim();

    return userRows
      .filter((row) => {
        if (!q) return true;

        return (
          row.name.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          row.topAction.toLowerCase().includes(q) ||
          row.topPage.toLowerCase().includes(q) ||
          row.lastPrompt.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const bTime = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
        const aTime = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
        return bTime - aTime;
      });
  }, [userRows, search]);

  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase().trim();

    return visibleEvents.filter((event) => {
      const profile = profileMap.get(event.user_id);
      const name = getName(profile);
      const email = profile?.email || '';
      const prompt = extractPromptFromMetadata(event.metadata);
      const meta = getMetadataText(event.metadata);

      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        event.event_name.toLowerCase().includes(q) ||
        clean(event.page).toLowerCase().includes(q) ||
        prompt.toLowerCase().includes(q) ||
        meta.toLowerCase().includes(q);

      const matchesEvent =
        selectedEvent === 'all' || event.event_name === selectedEvent;

      const matchesUser =
        selectedUserId === 'all' || event.user_id === selectedUserId;

      return matchesSearch && matchesEvent && matchesUser;
    });
  }, [visibleEvents, profileMap, search, selectedEvent, selectedUserId]);

  const topReturningUsers = useMemo(() => {
    return userRows
      .filter((user) => user.returned)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }, [userRows]);

  const featureStats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        eventName: string;
        totalUses: number;
        users: Set<string>;
        lastUsed: string;
        pages: string[];
      }
    >();

    visibleEvents.filter(isFeatureEvent).forEach((event) => {
      const existing =
        grouped.get(event.event_name) ||
        {
          eventName: event.event_name,
          totalUses: 0,
          users: new Set<string>(),
          lastUsed: event.created_at,
          pages: [],
        };

      existing.totalUses += 1;
      existing.users.add(event.user_id);

      if (new Date(event.created_at).getTime() > new Date(existing.lastUsed).getTime()) {
        existing.lastUsed = event.created_at;
      }

      if (event.page) {
        existing.pages.push(event.page);
      }

      grouped.set(event.event_name, existing);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        eventName: item.eventName,
        totalUses: item.totalUses,
        uniqueUsers: item.users.size,
        lastUsed: item.lastUsed,
        topPage: countBy(item.pages)[0]?.[0] || 'Unknown',
      }))
      .sort((a, b) => b.totalUses - a.totalUses)
      .slice(0, 30);
  }, [visibleEvents]);

  const recentPrompts = useMemo(() => {
    return visibleEvents
      .filter(isPromptEvent)
      .map((event) => {
        const profile = profileMap.get(event.user_id);

        return {
          id: event.id,
          userId: event.user_id,
          name: getName(profile),
          email: profile?.email || '',
          page: event.page || 'unknown',
          prompt: extractPromptFromMetadata(event.metadata) || '[Prompt was tracked without text]',
          createdAt: event.created_at,
        };
      })
      .slice(0, 20);
  }, [visibleEvents, profileMap]);

  const selectedUser = selectedUserId === 'all'
    ? null
    : userRows.find((user) => user.id === selectedUserId) || null;

  if (!adminAllowed && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background">
        <Navbar />

        <main className="mx-auto max-w-4xl px-4 pt-20">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="font-semibold">Admin only</p>
              <p className="mt-2 text-sm text-muted-foreground">
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

      <main className="mx-auto max-w-7xl space-y-6 px-3 pb-20 pt-20 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">FaceMeX Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Track users, pages, features, workspace prompts, and app activity.
            </p>
          </div>

          <Button onClick={loadAnalytics} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Users className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total users</p>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Activity className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Active today</p>
              <p className="text-3xl font-bold">{stats.activeToday}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Flame className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Returned this week</p>
              <p className="text-3xl font-bold">{stats.returnedThisWeek}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <AlertTriangle className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Cold users</p>
              <p className="text-3xl font-bold">{stats.coldUsers}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <BarChart3 className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total tracked events</p>
              <p className="text-3xl font-bold">{stats.totalEvents}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <MessageCircle className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Workspace prompts</p>
              <p className="text-3xl font-bold">{stats.workspacePrompts}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Users className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Workspace users</p>
              <p className="text-3xl font-bold">{stats.workspaceUsers}</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <Clock className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Data window</p>
              <p className="text-3xl font-bold">90d</p>
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
                <p className="break-all font-semibold">{stats.topFeature}</p>
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
                <p className="break-all font-semibold">{stats.mostUsedPage}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Top returning users</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              {topReturningUsers.length ? (
                topReturningUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{user.name}</span>
                    <Badge variant="secondary">{user.sessions} sessions</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No returning users yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-3 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search user, email, feature, page, prompt..."
                className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <select
              value={selectedEvent}
              onChange={(event) => setSelectedEvent(event.target.value)}
              className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All events</option>
              {eventOptions.map(([eventName, count]) => (
                <option key={eventName} value={eventName}>
                  {eventName} ({count})
                </option>
              ))}
            </select>

            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All users</option>
              {userRows.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.email ? `- ${user.email}` : ''}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {selectedUser && (
          <Card className="rounded-2xl border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Selected user deep view</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">User</p>
                <p className="font-semibold">{selectedUser.name}</p>
                <p className="break-all text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Total actions</p>
                <p className="text-2xl font-bold">{selectedUser.totalEvents}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Workspace prompts</p>
                <p className="text-2xl font-bold">{selectedUser.workspacePrompts}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Top action</p>
                <p className="break-all font-semibold">{selectedUser.topAction}</p>
              </div>

              {selectedUser.lastPrompt && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <p className="text-xs text-muted-foreground">Last workspace prompt</p>
                  <div className="mt-1 rounded-xl border bg-muted/30 p-3 text-sm">
                    {selectedUser.lastPrompt}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" />
              Feature usage summary
            </CardTitle>
          </CardHeader>

          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Feature / Event</th>
                  <th className="p-3 text-left">Uses</th>
                  <th className="p-3 text-left">Unique users</th>
                  <th className="p-3 text-left">Top page</th>
                  <th className="p-3 text-left">Last used</th>
                </tr>
              </thead>

              <tbody>
                {featureStats.map((item) => (
                  <tr key={item.eventName} className="border-t">
                    <td className="min-w-[220px] break-all p-3 font-medium">
                      {item.eventName}
                    </td>
                    <td className="p-3">{item.totalUses}</td>
                    <td className="p-3">{item.uniqueUsers}</td>
                    <td className="min-w-[180px] break-all p-3 text-muted-foreground">
                      {item.topPage}
                    </td>
                    <td className="min-w-[150px] p-3 text-muted-foreground">
                      {formatShortDate(item.lastUsed)}
                    </td>
                  </tr>
                ))}

                {!featureStats.length && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No feature usage found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              Recent workspace prompts
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {recentPrompts.length ? (
              recentPrompts.map((item) => (
                <div key={item.id} className="rounded-xl border bg-background p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="break-all text-xs text-muted-foreground">{item.email}</p>
                    </div>

                    <Badge variant="outline">{formatShortDate(item.createdAt)}</Badge>
                  </div>

                  <p className="whitespace-pre-wrap break-words text-sm">
                    {item.prompt}
                  </p>

                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    Page: {item.page}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No workspace prompts tracked yet. Make sure AIJobAssistantPage sends prompt metadata to trackEvent.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">User activity table</CardTitle>
          </CardHeader>

          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Last seen</th>
                  <th className="p-3 text-left">Sessions</th>
                  <th className="p-3 text-left">Actions</th>
                  <th className="p-3 text-left">Workspace prompts</th>
                  <th className="p-3 text-left">Top action</th>
                  <th className="p-3 text-left">Top page</th>
                  <th className="p-3 text-left">Returned?</th>
                  <th className="p-3 text-left">Risk</th>
                </tr>
              </thead>

              <tbody>
                {filteredUserRows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t hover:bg-muted/30"
                    onClick={() => setSelectedUserId(row.id)}
                  >
                    <td className="min-w-[190px] p-3">
                      <div className="font-medium">{row.name}</div>
                      <div className="break-all text-xs text-muted-foreground">{row.email}</div>
                    </td>

                    <td className="min-w-[170px] p-3 text-muted-foreground">
                      {formatDate(row.lastSeen)}
                    </td>

                    <td className="p-3">{row.sessions}</td>
                    <td className="p-3">{row.totalEvents}</td>
                    <td className="p-3">{row.workspacePrompts}</td>

                    <td className="min-w-[160px] break-all p-3">
                      {row.topAction}
                    </td>

                    <td className="min-w-[160px] break-all p-3 text-muted-foreground">
                      {row.topPage}
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

                {!filteredUserRows.length && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">
              Everything users did recently
            </CardTitle>
          </CardHeader>

          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Event</th>
                  <th className="p-3 text-left">Page</th>
                  <th className="p-3 text-left">Prompt / Metadata</th>
                </tr>
              </thead>

              <tbody>
                {filteredEvents.slice(0, 500).map((event) => {
                  const profile = profileMap.get(event.user_id);
                  const category = getEventCategory(event);
                  const prompt = extractPromptFromMetadata(event.metadata);
                  const metadataPreview = prompt
                    ? prompt
                    : shorten(getMetadataText(event.metadata), 120);

                  return (
                    <tr key={event.id} className="border-t align-top">
                      <td className="min-w-[150px] p-3 text-muted-foreground">
                        {formatShortDate(event.created_at)}
                      </td>

                      <td className="min-w-[190px] p-3">
                        <div className="font-medium">{getName(profile)}</div>
                        <div className="break-all text-xs text-muted-foreground">
                          {profile?.email || event.user_id}
                        </div>
                      </td>

                      <td className="p-3">
                        <Badge variant="outline" className={getEventColor(category)}>
                          {category}
                        </Badge>
                      </td>

                      <td className="min-w-[180px] break-all p-3 font-medium">
                        {event.event_name}
                      </td>

                      <td className="min-w-[180px] break-all p-3 text-muted-foreground">
                        {event.page || 'unknown'}
                      </td>

                      <td className="min-w-[260px] max-w-[420px] break-words p-3">
                        {metadataPreview || '-'}
                      </td>
                    </tr>
                  );
                })}

                {!filteredEvents.length && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No activity found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4 text-sm text-orange-800 dark:text-orange-200">
            This page can only show actions that your app sends to the
            <span className="font-semibold"> user_events </span>
            table. To see every click, post, reaction, upload, prompt, marketplace action, and profile view,
            call <span className="font-semibold">trackEvent()</span> inside those buttons/pages.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
