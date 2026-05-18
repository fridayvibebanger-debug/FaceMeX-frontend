import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Clock,
  MapPin,
  Search,
  Star,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import { useWorldStore } from '@/store/worldStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

function readSavedEventIds(): string[] {
  try {
    const raw = localStorage.getItem('facemex:world:saved-events');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSavedEventIds(ids: string[]) {
  try {
    localStorage.setItem('facemex:world:saved-events', JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function readRsvpEventIds(): string[] {
  try {
    const raw = localStorage.getItem('facemex:world:rsvp-events');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRsvpEventIds(ids: string[]) {
  try {
    localStorage.setItem('facemex:world:rsvp-events', JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function formatDate(value: string | number | Date) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'Date not available';
  }
}

function sponsorTierClass(tier?: string) {
  const clean = String(tier || '').toLowerCase();

  if (clean === 'gold') return 'bg-yellow-300 text-slate-950 hover:bg-yellow-300';
  if (clean === 'silver') return 'bg-slate-200 text-slate-950 hover:bg-slate-200';
  if (clean === 'bronze') return 'bg-amber-200 text-slate-950 hover:bg-amber-200';

  return 'bg-slate-100 text-slate-900 hover:bg-slate-100';
}

export default function WorldEventsPage() {
  const navigate = useNavigate();
  const { events, stages } = useWorldStore();

  const [query, setQuery] = useState('');
  const [savedEventIds, setSavedEventIds] = useState<string[]>(() =>
    readSavedEventIds()
  );
  const [rsvpEventIds, setRsvpEventIds] = useState<string[]>(() =>
    readRsvpEventIds()
  );

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    return [...events]
      .filter((event: any) => {
        if (!q) return true;

        const stage = stages.find((item: any) => item.id === event.stageId);

        return (
          String(event.title || '').toLowerCase().includes(q) ||
          String(event.type || '').toLowerCase().includes(q) ||
          String(event.sponsor?.name || '').toLowerCase().includes(q) ||
          String(stage?.name || '').toLowerCase().includes(q)
        );
      })
      .sort((a: any, b: any) => {
        const featuredScore =
          (b.featured ? 1 : 0) - (a.featured ? 1 : 0);

        if (featuredScore !== 0) return featuredScore;

        const aTime = new Date(a.startAt || 0).getTime();
        const bTime = new Date(b.startAt || 0).getTime();

        return aTime - bTime;
      });
  }, [events, stages, query]);

  const getStageName = (stageId?: string) => {
    if (!stageId) return '';

    const stage = stages.find((item: any) => item.id === stageId);

    return stage?.name || `Stage ${stageId}`;
  };

  const toggleSave = (eventId: string) => {
    const isSaved = savedEventIds.includes(eventId);

    const next = isSaved
      ? savedEventIds.filter((id) => id !== eventId)
      : [eventId, ...savedEventIds];

    setSavedEventIds(next);
    saveSavedEventIds(next);

    toast({
      title: isSaved ? 'Event removed' : 'Event saved',
      description: isSaved
        ? 'This event was removed from your saved list.'
        : 'This event was saved to your World list.',
    });
  };

  const toggleRsvp = (eventId: string) => {
    const isRsvped = rsvpEventIds.includes(eventId);

    const next = isRsvped
      ? rsvpEventIds.filter((id) => id !== eventId)
      : [eventId, ...rsvpEventIds];

    setRsvpEventIds(next);
    saveRsvpEventIds(next);

    toast({
      title: isRsvped ? 'RSVP cancelled' : 'RSVP confirmed',
      description: isRsvped
        ? 'You are no longer marked as attending.'
        : 'You are now marked as attending this event.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-5xl space-y-4 p-4 pt-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">World Events</h1>
            <p className="text-xs text-muted-foreground">
              Explore upcoming stages, booths, sponsors and featured events.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => navigate('/world')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to World
          </Button>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Upcoming</CardTitle>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search events, sponsors, stages..."
                  className="rounded-full pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3">
            {sorted.length === 0 ? (
              <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                No world events found.
              </div>
            ) : (
              sorted.map((event: any) => {
                const isSaved = savedEventIds.includes(event.id);
                const isRsvped = rsvpEventIds.includes(event.id);
                const stageName = getStageName(event.stageId);

                return (
                  <div
                    key={event.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-sm ${
                      event.featured
                        ? 'bg-yellow-50 dark:bg-yellow-950/10'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {event.banner ? (
                        <img
                          src={event.banner}
                          alt={event.title}
                          className="h-12 w-20 rounded-xl border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-20 items-center justify-center rounded-xl border bg-muted">
                          <CalendarDays className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate font-medium">
                            {event.title}
                          </div>

                          <Badge variant="secondary" className="capitalize">
                            {event.type || 'event'}
                          </Badge>

                          {event.featured && (
                            <Badge className="bg-yellow-300 text-slate-950 hover:bg-yellow-300">
                              <Star className="mr-1 h-3 w-3" />
                              Featured
                            </Badge>
                          )}

                          {event.sponsor && (
                            <Badge
                              className={`capitalize ${sponsorTierClass(
                                event.sponsor.tier
                              )}`}
                            >
                              Sponsor: {event.sponsor.name}
                              {event.sponsor.tier
                                ? ` · ${event.sponsor.tier}`
                                : ''}
                            </Badge>
                          )}

                          {Array.isArray(event.boothIds) &&
                            event.boothIds.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {event.boothIds.length} booth
                                {event.boothIds.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(event.startAt)}
                          </span>

                          {event.stageId && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {stageName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        type="button"
                        onClick={() => navigate(`/world/event/${event.id}`)}
                      >
                        Details
                      </Button>

                      {event.stageId && (
                        <Button
                          size="sm"
                          className="rounded-full"
                          type="button"
                          onClick={() => navigate(`/world/stage/${event.stageId}`)}
                        >
                          Go to Stage
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant={isRsvped ? 'secondary' : 'outline'}
                        className="rounded-full"
                        type="button"
                        onClick={() => toggleRsvp(event.id)}
                      >
                        {isRsvped ? 'Attending' : 'RSVP'}
                      </Button>

                      <Button
                        size="sm"
                        variant={isSaved ? 'secondary' : 'outline'}
                        className="rounded-full"
                        type="button"
                        onClick={() => toggleSave(event.id)}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="h-4 w-4" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
