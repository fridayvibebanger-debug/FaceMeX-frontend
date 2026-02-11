import { useState, useMemo, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { uploadMedia } from '@/lib/storage';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api } from '@/lib/api';

interface StoryItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: number; // timestamp ms
}

const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY_STORIES = 'faceme_stories_v1';
const STORAGE_KEY_SEEN = 'faceme_stories_seen_v1';

export default function StoriesBar() {
  const { user } = useAuthStore();
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [seenStoryIds, setSeenStoryIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);

  // Load persisted stories and seen ids on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STORIES);
      if (raw) {
        const parsed = JSON.parse(raw) as StoryItem[];
        setStories(parsed);
      }
    } catch {}
    try {
      const rawSeen = localStorage.getItem(STORAGE_KEY_SEEN);
      if (rawSeen) {
        const arr = JSON.parse(rawSeen) as string[];
        setSeenStoryIds(new Set(arr));
      }
    } catch {}
  }, []);

  // Persist stories whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STORIES, JSON.stringify(stories));
    } catch {}
  }, [stories]);

  // Persist seen state whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(Array.from(seenStoryIds)));
    } catch {}
  }, [seenStoryIds]);

  const visibleStories = useMemo(() => {
    const cutoff = Date.now() - STORY_TTL_MS;
    return stories.filter((s) => s.createdAt >= cutoff);
  }, [stories]);

  // Initial load from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/status-stories');
        const list = Array.isArray(res?.stories) ? res.stories : [];
        if (!cancelled) {
          const mapped: StoryItem[] = list.map((s: any) => ({
            id: String(s._id || s.id),
            userId: String(s.userId || ''),
            userName: s.userName || 'User',
            userAvatar: s.userAvatar || '',
            mediaUrl: s.mediaUrl,
            mediaType: s.mediaType === 'video' ? 'video' : 'image',
            createdAt: new Date(s.createdAt || Date.now()).getTime(),
          }));
          setStories((prev) => {
            if (prev.length === 0) return mapped;
            const existingIds = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            for (const m of mapped) {
              if (!existingIds.has(m.id)) merged.push(m);
            }
            return merged;
          });
        }
      } catch (e) {
        // ignore, stay on local-only stories
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myStory = useMemo(
    () => visibleStories.find((s) => s.userId === (user?.id ?? '1')),
    [visibleStories, user?.id],
  );

  const handlePickStory = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  // Auto-advance timer: move through visibleStories in order
  useEffect(() => {
    if (!activeStory || activeIndex === null) return;

    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    const isVideo = activeStory.mediaType === 'video';
    const delay = isVideo ? 10000 : 6000; // 10s for video, 6s for image

    autoAdvanceTimeoutRef.current = window.setTimeout(() => {
      const nextIndex = activeIndex + 1;
      if (nextIndex >= visibleStories.length) {
        closeStory();
        return;
      }
      const next = visibleStories[nextIndex];
      if (!next) {
        closeStory();
        return;
      }
      setActiveIndex(nextIndex);
      setActiveStory(next);
      setSeenStoryIds((prev) => new Set(prev).add(next.id));
    }, delay);

    return () => {
      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    };
  }, [activeStory, activeIndex, visibleStories]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadMedia(file, 'stories');
      const type: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image';
      let created: any = null;
      try {
        created = await api.post('/api/status-stories', {
          mediaUrl: url,
          mediaType: type,
        });
      } catch {
        // backend might be down; still show local story
      }

      const storyPayload = created?.story || created;
      const base: StoryItem = {
        id: storyPayload?._id || storyPayload?.id || `local-${Date.now()}`,
        userId: String(storyPayload?.userId || user?.id || '1'),
        userName: storyPayload?.userName || user?.name || 'You',
        userAvatar: storyPayload?.userAvatar || user?.avatar,
        mediaUrl: storyPayload?.mediaUrl || url,
        mediaType: storyPayload?.mediaType === 'video' ? 'video' : type,
        createdAt: new Date(storyPayload?.createdAt || Date.now()).getTime(),
      };
      setStories((prev) => [base, ...prev]);
    } catch (err) {
      console.error('Failed to upload story', err);
      alert('Failed to upload story. Please try again.');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const openStory = (story: StoryItem) => {
    const index = visibleStories.findIndex((s) => s.id === story.id);
    setActiveIndex(index >= 0 ? index : null);
    setActiveStory(story);
    setSeenStoryIds((prev) => new Set(prev).add(story.id));
  };

  const closeStory = () => {
    setActiveStory(null);
    setActiveIndex(null);
    if (autoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  };

  if (!user) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Status stories</span>
        <span className="text-[11px] text-muted-foreground">Disappears after 24 hours</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
        {/* Add story */}
        <button
          type="button"
          onClick={handlePickStory}
          className="flex flex-col items-center gap-1 focus:outline-none"
        >
          <div className="relative">
            <Avatar className="h-14 w-14 border-2 border-dashed border-primary/60 bg-muted flex items-center justify-center">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>+</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-primary text-background rounded-full text-[10px] px-1.5 py-0.5">
              +
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground">Add story</span>
        </button>

        {/* Existing stories */}
        {visibleStories.map((story) => {
          const isMine = story.userId === (user.id ?? '1');
          const isSeen = seenStoryIds.has(story.id);
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => openStory(story)}
              className="flex flex-col items-center gap-1 focus:outline-none"
            >
              <div
                className={`p-[2px] rounded-full ${isSeen ? 'bg-muted' : 'bg-gradient-to-tr from-purple-500 to-blue-500'}`}
              >
                <Avatar className="h-14 w-14 border border-background">
                  <AvatarImage src={story.userAvatar || user.avatar} alt={story.userName} />
                  <AvatarFallback>{story.userName.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[11px] text-muted-foreground max-w-[70px] truncate">
                {isMine ? 'Your story' : story.userName}
              </span>
            </button>
          );
        })}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Dialog open={!!activeStory} onOpenChange={(open) => !open && closeStory()}>
        <DialogContent className="max-w-sm sm:max-w-md bg-black/95 border-none p-2">
          {activeStory && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 w-full px-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={activeStory.userAvatar || user.avatar} alt={activeStory.userName} />
                  <AvatarFallback>{activeStory.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-white/90 font-medium">{activeStory.userName}</span>
              </div>
              <div className="w-full rounded-lg overflow-hidden bg-black aspect-[9/16] flex items-center justify-center">
                {activeStory.mediaType === 'video' ? (
                  <video src={activeStory.mediaUrl} controls autoPlay className="h-full w-full object-contain" />
                ) : (
                  <img src={activeStory.mediaUrl} alt="Story" className="h-full w-full object-contain" />
                )}
              </div>
              {/* Auto-advance hint for now; real auto-advance could be timer-based per story */}
              <div className="flex items-center justify-between w-full px-1 pt-1 text-[11px] text-white/60">
                <span>Tap outside to close</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
