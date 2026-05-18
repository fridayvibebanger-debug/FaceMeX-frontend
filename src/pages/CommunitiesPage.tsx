import { useMemo, useState, useEffect } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Clock,
  Ticket,
} from 'lucide-react';
import { useSocialStore } from '@/store/socialStore';
import { useUserStore } from '@/store/userStore';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';

type LocalEvent = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  type: 'virtual' | 'in-person' | 'hybrid';
  startTime: string;
  endTime: string;
  location: string;
  tags: string[];
  isPaid: boolean;
  price: number;
  isAttending: boolean;
  attendeeCount: number;
  maxAttendees?: number;
  hostName: string;
  hostAvatar?: string;
};

function readLocalEvents(): LocalEvent[] {
  try {
    const raw = localStorage.getItem('facemex:communities:events');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalEvents(events: LocalEvent[]) {
  try {
    localStorage.setItem('facemex:communities:events', JSON.stringify(events));
  } catch {
    // ignore storage error
  }
}

function safeDate(value: any) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getInitials(name?: string) {
  const clean = String(name || 'U').trim();
  return clean.charAt(0).toUpperCase();
}

export default function CommunitiesPage() {
  const { events, attendEvent, unattendEvent } = useSocialStore();
  const userStore: any = useUserStore();

  const userName =
    userStore.name ||
    userStore.user?.name ||
    userStore.profile?.name ||
    'You';

  const avatar =
    userStore.avatar ||
    userStore.user?.avatar ||
    userStore.profile?.avatar ||
    userStore.profile?.avatar_url ||
    '';

  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const [localEvents, setLocalEvents] = useState<LocalEvent[]>(() =>
    readLocalEvents()
  );

  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventCover, setEventCover] = useState('');
  const [eventType, setEventType] =
    useState<'virtual' | 'in-person' | 'hybrid'>('virtual');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventTags, setEventTags] = useState('');
  const [eventIsPaid, setEventIsPaid] = useState(false);
  const [eventPrice, setEventPrice] = useState('');

  useEffect(() => {
    saveLocalEvents(localEvents);
  }, [localEvents]);

  const allEvents = useMemo(() => {
    return [...localEvents, ...events];
  }, [localEvents, events]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allEvents.filter((event: any) => {
      if (!query) return true;

      return (
        String(event.title || '').toLowerCase().includes(query) ||
        String(event.description || '').toLowerCase().includes(query) ||
        String(event.location || '').toLowerCase().includes(query) ||
        String(event.hostName || '').toLowerCase().includes(query) ||
        (Array.isArray(event.tags) &&
          event.tags.some((tag: string) =>
            String(tag).toLowerCase().includes(query)
          ))
      );
    });
  }, [allEvents, searchQuery]);

  const resetEventForm = () => {
    setEventTitle('');
    setEventDesc('');
    setEventCover('');
    setEventType('virtual');
    setEventLocation('');
    setEventDate('');
    setEventStartTime('');
    setEventEndTime('');
    setEventTags('');
    setEventIsPaid(false);
    setEventPrice('');
  };

  const createEvent = () => {
    if (!eventTitle.trim()) return;

    const start = eventDate && eventStartTime
      ? new Date(`${eventDate}T${eventStartTime}`).toISOString()
      : new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const end = eventDate && eventEndTime
      ? new Date(`${eventDate}T${eventEndTime}`).toISOString()
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const newEvent: LocalEvent = {
      id: `local-event-${Date.now()}`,
      title: eventTitle.trim(),
      description:
        eventDesc.trim() ||
        'A FaceMeX community event for networking, learning and connection.',
      coverImage:
        eventCover.trim() ||
        'https://images.unsplash.com/photo-1515169067865-5387ec356754?w=1000&q=80',
      type: eventType,
      startTime: start,
      endTime: end,
      location:
        eventLocation.trim() ||
        (eventType === 'virtual' ? 'Online event' : 'Location to be confirmed'),
      tags: eventTags
        .split(',')
        .map((tag) => tag.trim().replace('#', ''))
        .filter(Boolean),
      isPaid: eventIsPaid,
      price: eventIsPaid ? Number(eventPrice || 0) : 0,
      isAttending: true,
      attendeeCount: 1,
      hostName: userName,
      hostAvatar: avatar,
    };

    setLocalEvents((current) => [newEvent, ...current]);
    resetEventForm();
    setCreateOpen(false);
  };

  const handleAttend = (event: any) => {
    if (String(event.id).startsWith('local-event-')) {
      setLocalEvents((current) =>
        current.map((item) =>
          item.id === event.id
            ? {
                ...item,
                isAttending: true,
                attendeeCount: item.isAttending
                  ? item.attendeeCount
                  : item.attendeeCount + 1,
              }
            : item
        )
      );
      return;
    }

    attendEvent(event.id);
  };

  const handleCancelAttendance = (event: any) => {
    if (String(event.id).startsWith('local-event-')) {
      setLocalEvents((current) =>
        current.map((item) =>
          item.id === event.id
            ? {
                ...item,
                isAttending: false,
                attendeeCount: Math.max(
                  0,
                  item.isAttending
                    ? item.attendeeCount - 1
                    : item.attendeeCount
                ),
              }
            : item
        )
      );
      return;
    }

    unattendEvent(event.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <div className="flex pt-14 md:pt-16 pb-16 md:pb-0">
        <LeftSidebar />

        <main className="flex-1 lg:ml-64">
          <div className="max-w-6xl mx-auto py-4 md:py-8 px-3 sm:px-4">
            <div className="mb-8">
              <h1 className="text-2xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Communities & Events
              </h1>

              <p className="text-muted-foreground">
                Discover events, meet people, and join experiences happening across FaceMeX.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Input
                  placeholder="Search events by title, host, location or tag..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10 rounded-2xl"
                />
              </div>

              <Button
                className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </div>

            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Events</h2>
                  <p className="text-xs text-muted-foreground">
                    Attend, host, and grow your network through live experiences.
                  </p>
                </div>

                <Badge variant="secondary" className="rounded-full">
                  {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
                </Badge>
              </div>

              {filteredEvents.length === 0 ? (
                <Card className="rounded-3xl border bg-card shadow-sm">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No events found. Try another search or create the first event.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredEvents.map((event: any, index) => {
                    const attending = Boolean(event.isAttending);
                    const startDate = safeDate(event.startTime);
                    const endDate = safeDate(event.endTime);

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.05, 0.3) }}
                      >
                        <Card className="overflow-hidden rounded-3xl hover:shadow-xl transition-shadow bg-card">
                          <div className="relative h-48">
                            <img
                              src={event.coverImage}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />

                            {event.isPaid && (
                              <div className="absolute top-2 right-2">
                                <Badge className="bg-green-500 text-white">
                                  <Ticket className="h-3 w-3 mr-1" />
                                  R{event.price}
                                </Badge>
                              </div>
                            )}

                            <div className="absolute top-2 left-2">
                              <Badge
                                variant="secondary"
                                className={`bg-background/90 capitalize ${
                                  event.type === 'virtual'
                                    ? 'text-blue-600'
                                    : event.type === 'in-person'
                                      ? 'text-green-600'
                                      : 'text-purple-600'
                                }`}
                              >
                                {event.type}
                              </Badge>
                            </div>
                          </div>

                          <CardHeader>
                            <CardTitle className="line-clamp-2">
                              {event.title}
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {event.description}
                            </p>

                            <div className="space-y-2">
                              <div className="flex items-center text-sm">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{format(startDate, 'PPP')}</span>
                              </div>

                              <div className="flex items-center text-sm">
                                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>
                                  {format(startDate, 'p')} - {format(endDate, 'p')}
                                </span>
                              </div>

                              <div className="flex items-center text-sm">
                                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            </div>

                            {Array.isArray(event.tags) && event.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {event.tags.map((tag: string) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="rounded-full"
                                  >
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-3 border-t">
                              <div className="flex items-center space-x-3 min-w-0">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={event.hostAvatar} />
                                  <AvatarFallback>
                                    {getInitials(event.hostName)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">
                                    Hosted by
                                  </p>
                                  <p className="text-sm font-semibold truncate">
                                    {event.hostName}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">
                                  Attendees
                                </p>
                                <p className="text-sm font-semibold">
                                  {event.attendeeCount}
                                  {event.maxAttendees &&
                                    ` / ${event.maxAttendees}`}
                                </p>
                              </div>
                            </div>

                            {attending ? (
                              <Button
                                onClick={() => handleCancelAttendance(event)}
                                variant="outline"
                                className="w-full rounded-2xl"
                              >
                                Cancel Attendance
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleAttend(event)}
                                className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                              >
                                {event.isPaid
                                  ? `Get Ticket - R${event.price}`
                                  : 'Attend Event'}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogContent className="sm:max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                  <DialogDescription>
                    Set up an event for your community, audience, or professional network.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Event title</label>
                    <Input
                      placeholder="Example: Tzaneen Founders Meetup"
                      value={eventTitle}
                      onChange={(event) => setEventTitle(event.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="What is this event about?"
                      value={eventDesc}
                      onChange={(event) => setEventDesc(event.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Type</label>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={eventType}
                        onChange={(event) =>
                          setEventType(event.target.value as any)
                        }
                      >
                        <option value="virtual">Virtual</option>
                        <option value="in-person">In-person</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Location</label>
                      <Input
                        placeholder="Online / Tzaneen / Johannesburg"
                        value={eventLocation}
                        onChange={(event) =>
                          setEventLocation(event.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Date</label>
                      <Input
                        type="date"
                        value={eventDate}
                        onChange={(event) => setEventDate(event.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Start</label>
                      <Input
                        type="time"
                        value={eventStartTime}
                        onChange={(event) =>
                          setEventStartTime(event.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">End</label>
                      <Input
                        type="time"
                        value={eventEndTime}
                        onChange={(event) =>
                          setEventEndTime(event.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tags</label>
                    <Input
                      placeholder="business, networking, tech"
                      value={eventTags}
                      onChange={(event) => setEventTags(event.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Ticket type</label>
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                        value={eventIsPaid ? 'paid' : 'free'}
                        onChange={(event) =>
                          setEventIsPaid(event.target.value === 'paid')
                        }
                      >
                        <option value="free">Free</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Price</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={eventPrice}
                        disabled={!eventIsPaid}
                        onChange={(event) => setEventPrice(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Cover image URL optional
                    </label>
                    <Input
                      placeholder="https://images.unsplash.com/..."
                      value={eventCover}
                      onChange={(event) => setEventCover(event.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>

                  <Button
                    onClick={createEvent}
                    disabled={!eventTitle.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    Create Event
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
