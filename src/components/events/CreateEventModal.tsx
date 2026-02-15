import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSocialStore } from '@/store/socialStore';

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateEventModal({ open, onOpenChange }: CreateEventModalProps) {
  const { createEvent } = useSocialStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'virtual' | 'in-person' | 'hybrid'>('virtual');
  const [price, setPrice] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setStart('');
    setEnd('');
    setLocation('');
    setType('virtual');
    setPrice('');
    setTags('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) return alert('Title is required');
    if (!start) return alert('Start date/time is required');
    if (!end) return alert('End date/time is required');
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return alert('Invalid dates');
    if (endDate <= startDate) return alert('End must be after start');
    const p = Number(price);
    if (price && (isNaN(p) || p < 0)) return alert('Invalid price');

    setSubmitting(true);
    try {
      await createEvent({
        id: '' as any, // not used by store input type
        title: title.trim(),
        description: description.trim(),
        coverImage: '',
        hostId: '1',
        hostName: 'User',
        hostAvatar: '',
        startTime: startDate,
        endTime: endDate,
        location: location.trim(),
        type,
        attendeeCount: 0,
        maxAttendees: undefined,
        isAttending: true,
        isPaid: !!price,
        price: price ? p : undefined,
        tags: tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      } as any);
      alert('Event created');
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      alert('Failed to create event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Start</label>
              <Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">End</label>
              <Input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>
          <Input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={type}
                onChange={e => setType(e.target.value as any)}
              >
                <option value="virtual">Virtual</option>
                <option value="in-person">In-person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Price (optional)</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
          </div>
          <Input placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Creating...' : 'Create Event'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
