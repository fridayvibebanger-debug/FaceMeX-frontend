import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

interface JournalEntry {
  _id: string;
  title: string;
  content: string;
  mood?: string;
  isPublic?: boolean;
  createdAt: string;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);

  const loadEntries = async () => {
    try {
      const res = await api.get('/api/journal/me') as any;
      setEntries(res.entries || []);
    } catch (e) {
      console.error('Failed to load journal entries', e);
    }
  };

  const handleShareAsPost = async () => {
    const text = `${title.trim() ? title.trim() + '\n\n' : ''}${content.trim()}`.trim();
    if (!text) return;
    setLoading(true);
    try {
      await api.post('/api/posts', {
        content: text,
        mode: 'social',
      });
    } catch (e) {
      console.error('Failed to share journal as post', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleSelect = (entry: JournalEntry) => {
    setSelectedId(entry._id);
    setTitle(entry.title || '');
    setContent(entry.content || '');
    setMood(entry.mood || '');
  };

  const handleNewEntry = () => {
    setSelectedId(null);
    setTitle('');
    setContent('');
    setMood('');
  };

  const handleSave = async () => {
    if (!content.trim() && !title.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/api/journal', {
        id: selectedId || undefined,
        title: title.trim(),
        content: content.trim(),
        mood: mood.trim(),
        isPublic: false,
      }) as any;
      const saved = res.entry as JournalEntry;
      if (!selectedId) {
        setEntries((prev) => [saved, ...prev]);
        setSelectedId(saved._id);
      } else {
        setEntries((prev) => prev.map((e) => (e._id === saved._id ? saved : e)));
      }
    } catch (e) {
      console.error('Failed to save journal entry', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await api.delete(`/api/journal/${selectedId}`);
      setEntries((prev) => prev.filter((e) => e._id !== selectedId));
      handleNewEntry();
    } catch (e) {
      console.error('Failed to delete journal entry', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrompt = async () => {
    setPromptLoading(true);
    try {
      const res = await api.post('/api/journal/prompt', {
        mood: mood.trim(),
        topic: title.trim() || undefined,
      }) as any;
      const promptText = res.prompt as string;
      if (promptText) {
        setContent((prev) => (prev ? prev + '\n\n' + promptText : promptText));
      }
    } catch (e) {
      console.error('Failed to get journal prompt', e);
    } finally {
      setPromptLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-16">
        <LeftSidebar />
        <main className="flex-1 max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4 md:flex-row">
          <div className="w-full md:w-1/3 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">FaceMeX Journal</h1>
              <Button size="sm" variant="outline" onClick={handleNewEntry} disabled={loading}>
                New entry
              </Button>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {entries.map((entry) => (
                <Card
                  key={entry._id}
                  className={`cursor-pointer transition-colors ${
                    selectedId === entry._id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleSelect(entry)}
                >
                  <CardContent className="py-3">
                    <div className="text-sm font-medium truncate">{entry.title || 'Untitled entry'}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {entries.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No entries yet. Start by writing a short reflection.
                </p>
              )}
            </div>
          </div>

          <div className="w-full md:w-2/3">
            <Card className="h-full">
              <CardHeader className="space-y-2">
                <CardTitle>Today&apos;s reflection</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="Title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Input
                    className="w-32"
                    placeholder="Mood"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  className="min-h-[220px]"
                  placeholder="Write anything that you want to remember or process. This space is private by default."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={loading}>
                      {loading ? 'Saving…' : 'Save entry'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDelete}
                      disabled={loading || !selectedId}
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleShareAsPost}
                      disabled={loading || (!title.trim() && !content.trim())}
                    >
                      Share as post
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrompt}
                    disabled={promptLoading}
                  >
                    {promptLoading ? 'Asking AI…' : 'AI journaling prompt'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
