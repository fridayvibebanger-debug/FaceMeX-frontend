import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarPlus,
  Bookmark,
  BookmarkCheck,
  Clock,
  ExternalLink,
  MapPin,
  Share2,
  Star,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import { useWorldStore } from '@/store/worldStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    // ignore localStorage error
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
    // ignore localStorage error
  }
}

function formatDate(value: string | number | Date) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return 'Date not available';
  }
}

function formatICSDate(value: string | number | Date) {
  const date = new Date(value);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function sponsorTierClass(tier?: string) {
  const clean = String(tier || '').toLowerCase();

  if (clean === 'gold') return 'bg-yellow-300 text-slate-950';
  if (clean === 'silver') return 'bg-slate-200 text-slate-950';
  if (clean === 'bronze') return 'bg-amber-200 text-slate-950';

  return 'bg-gray-100 text-slate-900';
}

export default function WorldEventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { events, getStage, getBooth } = useWorldStore();

  const event = useMemo(() => {
    return (events as any[]).find((item) => item.id === String(id || ''));
  }, [events, id]);

  const stage = event?.stageId ? getStage(event.stageId) : undefined;

  const [savedEventIds, setSavedEventIds] = useState<string[]>(() =>
    readSavedEventIds()
  );

  const [rsvpEventIds, setRsvpEventIds] = useState<string[]>(() =>
    readRsvpEventIds()
  );

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="mx-auto max-w-4xl p-6 pt-16">
          <Button
            type="button"
            variant="ghost"
            className="mb-4 rounded-full"
            onClick={() => navigate('/world/events')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>

          <Card className="rounded-2xl">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Event not found.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isSaved = savedEventIds.includes(event.id);
  const isRsvped = rsvpEventIds.includes(event.id);

  const booths = Array.isArray(event.boothIds)
    ? event.boothIds
        .map((boothId: string) => getBooth(boothId))
        .filter(Boolean)
    : [];

  const toggleSave = () => {
    const next = isSaved
      ? savedEventIds.filter((eventId) => eventId !== event.id)
      : [event.id, ...savedEventIds];

    setSavedEventIds(next);
    saveSavedEventIds(next);

    toast({
      title: isSaved ? 'Event removed' : 'Event saved',
      description: isSaved
        ? 'This event was removed from your saved list.'
        : 'This event was saved to your world list.',
    });
  };

  const toggleRsvp = () => {
    const next = isRsvped
      ? rsvpEventIds.filter((eventId) => eventId !== event.id)
      : [event.id, ...rsvpEventIds];

    setRsvpEventIds(next);
    saveRsvpEventIds(next);

    toast({
      title: isRsvped ? 'RSVP cancelled' : 'RSVP confirmed',
      description: isRsvped
        ? 'You are no longer marked as attending.'
        : 'You are now marked as attending this event.',
    });
  };

  const shareEvent = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: `Check out this FaceMeX World event: ${event.title}`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);

      toast({
        title: 'Link copied',
        description: 'Event link copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Could not share',
        description: 'Please copy the event link manually.',
        variant: 'destructive',
      });
    }
  };

  const addToCalendar = () => {
    const start = formatICSDate(event.startAt);
    const end = event.endAt
      ? formatICSDate(event.endAt)
      : formatICSDate(new Date(new Date(event.startAt).getTime() + 60 * 60 * 1000));

    const location = stage ? `FaceMeX World - ${stage.name}` : 'FaceMeX World';

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FaceMeX//World Event//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@facemex`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.type || 'FaceMeX World event'}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([ics], {
      type: 'text/calendar;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${String(event.title || 'facemex-event')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()}.ics`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-4xl space-y-4 p-4 pt-16">
        {event.banner && (
          <div className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
            <img
              src={event.banner}
              alt={event.title}
              className="h-48 w-full object-cover md:h-64"
            />
          </div>
        )}

        {(event.sponsor || event.featured) && (
          <div className="flex w-full items-center justify-between rounded-2xl border bg-card px-3 py-2 text-sm shadow-sm">
            <div className="flex min-w-0 items-center gap-2">
              {event.sponsor && (
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="text-muted-foreground">Sponsored by</span>

                  <span className="truncate font-medium">
                    {event.sponsor.name}
                  </span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${sponsorTierClass(
                      event.sponsor.tier
                    )}`}
                  >
                    {event.sponsor.tier || 'partner'}
                  </span>
                </span>
              )}
            </div>

            {event.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-200 px-2 py-0.5 text-[10px] text-slate-950">
                <Star className="h-3 w-3" />
                Featured
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <span className="truncate">{event.title}</span>

              <Badge variant="secondary" className="capitalize">
                {event.type || 'event'}
              </Badge>

              {event.featured && (
                <Badge className="bg-yellow-300 text-slate-950 hover:bg-yellow-300">
                  Featured
                </Badge>
              )}
            </h1>

            {booths.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {booths.map((booth: any) => (
                  <Link
                    key={booth.id}
                    to={`/world/booth/${booth.id}`}
                    className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] hover:bg-accent"
                  >
                    <img
                      src={booth.brandAvatar}
                      alt={booth.name}
                      className="h-4 w-4 rounded object-cover"
                    />

                    <span className="max-w-[120px] truncate">{booth.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => navigate('/world')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            World
          </Button>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Date: {formatDate(event.startAt)}</span>
            </div>

            {stage && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  Stage:{' '}
                  <Link
                    to={`/world/stage/${stage.id}`}
                    className="font-medium underline"
                  >
                    {stage.name}
                  </Link>
                </span>
              </div>
            )}

            {event.description && (
              <div className="rounded-xl border bg-muted/30 p-3 text-muted-foreground">
                {event.description}
              </div>
            )}
          </CardContent>
        </Card>

        {booths.length > 0 && (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Attached Booths</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-2 md:grid-cols-2">
              {booths.map((booth: any) => (
                <Link
                  key={booth.id}
                  to={`/world/booth/${booth.id}`}
                  className="flex items-center gap-3 rounded-xl border p-2 transition hover:bg-accent"
                >
                  <img
                    src={booth.brandAvatar}
                    alt={booth.name}
                    className="h-8 w-8 rounded object-cover"
                  />

                  <div className="min-w-0 text-sm">
                    <div className="truncate font-medium">{booth.name}</div>

                    <div className="text-xs text-muted-foreground">
                      Zone {booth.location?.zone || 'A'} · (
                      {booth.location?.x ?? 0},{booth.location?.y ?? 0})
                    </div>
                  </div>

                  <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {stage && (
            <Button asChild className="rounded-full">
              <Link to={`/world/stage/${stage.id}`}>Go to Stage</Link>
            </Button>
          )}

          <Button asChild variant="outline" className="rounded-full">
            <Link to="/world/events">All Events</Link>
          </Button>

          <Button
            type="button"
            variant={isRsvped ? 'secondary' : 'outline'}
            className="rounded-full"
            onClick={toggleRsvp}
          >
            {isRsvped ? 'Attending' : 'RSVP'}
          </Button>

          <Button
            type="button"
            variant={isSaved ? 'secondary' : 'outline'}
            className="rounded-full"
            onClick={toggleSave}
          >
            {isSaved ? (
              <BookmarkCheck className="mr-2 h-4 w-4" />
            ) : (
              <Bookmark className="mr-2 h-4 w-4" />
            )}
            {isSaved ? 'Saved' : 'Save'}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={addToCalendar}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Calendar
          </Button>

          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={shareEvent}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
