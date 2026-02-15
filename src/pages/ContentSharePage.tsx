import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSearchParams } from 'react-router-dom';
import { generateAIReply } from '@/lib/aiReply';
import { toast } from '@/components/ui/use-toast';
import { uploadMedia } from '@/lib/storage';
import { usePostStore } from '@/store/postStore';

export default function ContentSharePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') || 'editor') as 'editor' | 'caption' | 'templates';
  const { addPost } = usePostStore();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [music, setMusic] = useState<string>('');
  const [suggesting, setSuggesting] = useState(false);
  const [captionPrompt, setCaptionPrompt] = useState('');
  const [captionTone, setCaptionTone] = useState<'professional' | 'casual' | 'friendly'>('casual');
  const [captionBusy, setCaptionBusy] = useState(false);
  const [posting, setPosting] = useState(false);

  const onFilesSelected = useCallback((list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list);
    const imagesOnly = next.filter((f) => (f.type || '').startsWith('image/')).slice(0, 5);
    setFiles(imagesOnly);
    setPreviews(imagesOnly.map((f) => URL.createObjectURL(f)));
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onFilesSelected(e.dataTransfer.files);
  }, [onFilesSelected]);

  const trendingTags = useMemo(() => ['#AI', '#NowPlaying', '#Inspo', '#Tech', '#Vibes', '#Trending'], []);

  const templates = useMemo(
    () => [
      {
        id: 'reel-hook',
        name: 'Reel Hook',
        description: 'Short punchy hook + CTA',
        preset: { filter: 'Vivid', music: 'Synthwave 92 BPM' },
        captionHint: 'Write a short hook (1 line) and a CTA (1 line).',
        tags: ['#reels', '#creator', '#facemex'],
      },
      {
        id: 'carousel-educate',
        name: 'Carousel (Educate)',
        description: 'Teach something quickly',
        preset: { filter: 'Clean', music: '' },
        captionHint: 'Write a headline + 3 quick points + a closing line.',
        tags: ['#learn', '#tips', '#growth'],
      },
      {
        id: 'story-bts',
        name: 'Story (BTS)',
        description: 'Behind-the-scenes vibe',
        preset: { filter: 'Warm', music: 'Lo-fi 84 BPM' },
        captionHint: 'Write a casual behind-the-scenes caption with 1 emoji.',
        tags: ['#bts', '#dayinmylife', '#creator'],
      },
    ],
    []
  );

  const handleAutoCaption = () => {
    if (files.length === 0) return;
    setCaption('Enjoying the moment ✨');
  };

  const handleSmartFilter = () => {
    if (files.length === 0) return;
    setFilter('Vivid');
  };

  const handleMusicSync = () => {
    if (files.length === 0) return;
    setMusic('Synthwave 92 BPM');
  };

  const handleSuggestPost = async () => {
    setSuggesting(true);
    setTimeout(() => {
      setCaption((c) => c || 'Weekend vibes with friends!');
      setTags(['#weekend', '#friends', '#goodtimes']);
      setSuggesting(false);
    }, 600);
  };

  const handleTrendingTags = () => {
    setTags(trendingTags.slice(0, 3));
  };

  const openTab = (next: 'editor' | 'caption' | 'templates') => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', next);
      return p;
    });
  };

  const handleGenerateCaption = async () => {
    const hasMedia = files.length > 0;
    const base = captionPrompt.trim() || (hasMedia ? 'A photo/video I want to post.' : 'A post I want to write.')
    if (!base) return;
    setCaptionBusy(true);
    try {
      const text = await generateAIReply({
        context: [
          { sender: 'User', content: `Media: ${hasMedia ? `${files.length} file(s)` : 'none'}` },
          { sender: 'User', content: `Current filter: ${filter || 'none'}` },
          { sender: 'User', content: `Current music: ${music || 'none'}` },
        ],
        userMessage: `Generate a social media caption. ${base}`,
        tone: captionTone,
        maxLength: 220,
      });
      setCaption(text);
      toast({ title: 'Caption generated', description: 'You can edit it before posting.' });
    } catch (e: any) {
      toast({ title: 'Caption failed', description: e?.message || 'Could not generate caption', variant: 'destructive' });
    } finally {
      setCaptionBusy(false);
    }
  };

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setFilter(t.preset.filter);
    setMusic(t.preset.music);
    setTags(t.tags);
    setCaptionPrompt((prev) => prev || t.captionHint);
    toast({ title: 'Template applied', description: `${t.name} presets loaded.` });
    openTab('caption');
  };

  const handlePost = async () => {
    if (files.length === 0) return;
    if (posting) return;

    setPosting(true);
    try {
      const toUpload = files.filter((f) => (f.type || '').startsWith('image/')).slice(0, 5);
      const uploadedUrls = await Promise.all(toUpload.map((f) => uploadMedia(f, 'posts/images')));

      const cleanedTags = tags
        .map((t) => String(t || '').trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t.slice(1) : t));

      const content = [caption.trim(), cleanedTags.map((t) => `#${t}`).join(' ')].filter(Boolean).join('\n');

      await addPost(content || 'New post', uploadedUrls, undefined, cleanedTags);

      setFiles([]);
      setPreviews([]);
      setCaption('');
      setTags([]);
      setFilter('');
      setMusic('');
      setCaptionPrompt('');
      toast({ title: 'Posted', description: 'Your content was posted to the feed.' });
      openTab('editor');
    } catch (e: any) {
      toast({ title: 'Post failed', description: e?.message || 'Could not post content', variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const canPost = files.length > 0;

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Content Creation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant={tab === 'editor' ? 'default' : 'outline'} onClick={() => openTab('editor')}>Open Editing Suite</Button>
              <Button variant={tab === 'caption' ? 'default' : 'outline'} onClick={() => openTab('caption')}>AI Caption Helper</Button>
              <Button variant={tab === 'templates' ? 'default' : 'outline'} onClick={() => openTab('templates')}>Browse Templates</Button>
            </div>

            {tab === 'templates' && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Pick a template to apply presets (caption structure, tags, filter/music).</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-lg border p-3 bg-card">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.preset.filter && <Badge variant="secondary">Filter: {t.preset.filter}</Badge>}
                        {t.preset.music && <Badge variant="secondary">Music: {t.preset.music}</Badge>}
                      </div>
                      <Button className="mt-3 w-full" variant="outline" onClick={() => applyTemplate(t.id)}>
                        Use template
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'caption' && (
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Input
                    placeholder="Describe your photo/video (or what you want to say)…"
                    value={captionPrompt}
                    onChange={(e) => setCaptionPrompt(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant={captionTone === 'casual' ? 'default' : 'outline'} size="sm" onClick={() => setCaptionTone('casual')}>Casual</Button>
                    <Button variant={captionTone === 'friendly' ? 'default' : 'outline'} size="sm" onClick={() => setCaptionTone('friendly')}>Friendly</Button>
                    <Button variant={captionTone === 'professional' ? 'default' : 'outline'} size="sm" onClick={() => setCaptionTone('professional')}>Professional</Button>
                    <Button onClick={handleGenerateCaption} disabled={captionBusy}>
                      {captionBusy ? 'Generating…' : 'Generate caption'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'editor' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="border-2 border-dashed rounded-lg p-6 text-center bg-card"
            >
              <p className="mb-2">Drag and drop images here (up to 5)</p>
              <Input type="file" accept="image/*" multiple onChange={(e) => onFilesSelected(e.target.files)} />
            </div>

            )}

            {previews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square bg-black/5 rounded overflow-hidden">
                    {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                    <img src={src} alt={`preview ${i}`} className={`object-cover w-full h-full ${filter ? 'saturate-150 contrast-110' : ''}`} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleAutoCaption} disabled={files.length === 0}>Auto-caption</Button>
              <Button variant="outline" onClick={handleSmartFilter} disabled={files.length === 0}>Smart filter</Button>
              <Button variant="outline" onClick={handleMusicSync} disabled={files.length === 0}>Music sync</Button>
              <Button onClick={handleSuggestPost} disabled={suggesting}>Suggest post</Button>
              <Button variant="secondary" onClick={handleTrendingTags}>Trending tags</Button>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Say something about this..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              {music && <div className="text-sm text-muted-foreground">Music: {music}</div>}
              {filter && <div className="text-sm text-muted-foreground">Filter: {filter}</div>}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button disabled={!canPost || posting} onClick={handlePost}>{posting ? 'Posting…' : 'Post'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
