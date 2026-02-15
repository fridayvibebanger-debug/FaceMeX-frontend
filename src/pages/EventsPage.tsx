import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useSocialStore } from '@/store/socialStore';
import CreateEventModal from '@/components/events/CreateEventModal';

interface EventItem {
  id: string;
  title: string;
  date: Date;
  price?: number;
  category: string;
  image?: string;
  location?: string;
}

export default function EventsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [tickets, setTickets] = useState<Record<string, boolean>>({});
  const [interests] = useState<string[]>(['music', 'tech', 'art']);
  const { events, loadEvents, attendEvent, unattendEvent } = useSocialStore();
  const [createOpen, setCreateOpen] = useState(false);
  const currency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

  useEffect(() => {
    loadEvents().catch(() => {});
  }, [loadEvents]);

  const recommendations = useMemo(() => {
    return events.filter(e => (e.tags || []).some(t => interests.includes(t)));
  }, [events, interests]);

  const handleGetTicket = (id: string) => {
    setTickets((t) => ({ ...t, [id]: true }));
  };

  const dateMatches = (d1: Date, d2?: Date) => d2 && d1.toDateString() === d2.toDateString();

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-6xl mx-auto p-4 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreateOpen(true)}>Create Event</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {events.map((e) => (
                <div key={e.id} className="p-4 border rounded-lg bg-card flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{e.title}</h3>
                      {e.type && <Badge variant="secondary">{e.type}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {e.startTime.toLocaleString()} {e.isPaid && typeof e.price === 'number' ? `• ${currency.format(e.price)}` : '• Free'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.isAttending ? (
                      <>
                        <Badge>Attending</Badge>
                        <Button variant="outline" onClick={() => unattendEvent(e.id)}>Unattend</Button>
                      </>
                    ) : (
                      <Button onClick={() => attendEvent(e.id)}>Attend</Button>
                    )}
                    {e.isPaid && (
                      tickets[e.id] ? (
                        <Badge>Ticketed</Badge>
                      ) : (
                        <Button onClick={() => handleGetTicket(e.id)}>
                          Get Ticket
                        </Button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.length === 0 && (
                <div className="text-sm text-muted-foreground">No recommendations yet</div>
              )}
              {recommendations.map((e) => (
                <div key={e.id} className="p-3 border rounded-lg bg-card flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">Based on your interest in {(e.tags && e.tags[0]) || e.type}</div>
                  </div>
                  <Button variant="secondary">View</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reminders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events.filter(e => dateMatches(e.startTime, selectedDate)).length === 0 ? (
                <div className="text-sm text-muted-foreground">No events on this date</div>
              ) : (
                events.filter(e => dateMatches(e.startTime, selectedDate)).map(e => (
                  <div key={e.id} className="text-sm">{e.title} • {e.startTime.toLocaleTimeString()}</div>
                ))
              )}
              <Button variant="outline" className="w-full">Add to Calendar</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <CreateEventModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
