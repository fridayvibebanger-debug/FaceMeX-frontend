import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Clock, Filter } from 'lucide-react';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import { usePostStore } from '@/store/postStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { api } from '@/lib/api';

interface BusinessPromotion {
  id: string;
  businessName: string;
  headline: string;
  description: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  tags: string[];
  startAt?: number;
  endAt?: number;
  paidAmountZar?: number;
  paidDays?: number;
  monthlyPaidUntil?: number;
  billing?: 'monthly';
}

type FeedFilter = 'ai-curated' | 'recent' | 'trending';

const STORAGE_KEY_PROMOTIONS = 'faceme_business_promotions_v1';
  Clock,
  Filter,
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import PostCard from '@/components/feed/PostCard';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePostStore } from '@/store/postStore';

function BusinessPromotionsStrip() {
  const [items, setItems] = useState<BusinessPromotion[]>(() => []);
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROMOTIONS);
      if (raw) {
        const parsed = JSON.parse(raw) as BusinessPromotion[];
        setItems(parsed);
      }
    } catch {}
  }, []);
type FeedFilter = 'ai' | 'recent' | 'trending';

  const displayItems = useMemo(() => {
    const now = Date.now();
    const raw = localStorage.getItem(STORAGE_KEY_PROMOTIONS);
    if (!raw) return [];
export default function NewsFeed() {
  const { user } = useAuthStore();
  const { posts, loadPosts, addPost } = usePostStore();

    try {
      const parsed = JSON.parse(raw) as BusinessPromotion[];
      const active = parsed.filter((p) => {
        const until = typeof p.monthlyPaidUntil === 'number' ? p.monthlyPaidUntil : p.endAt;
        if (!until) return true;
        if (p.startAt && now < p.startAt) return false;
        return now <= until;
      });
      return active.length ? active : [];
    } catch {
      return [];
    }
  }, [items]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  if (displayItems.length === 0) return null;
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('ai');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Sponsored</span>
        <span className="text-[11px] text-muted-foreground">
          Businesses on the feed slide
        </span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/90 px-3 py-2">
        <div className="relative h-24 sm:h-28">
          <motion.div
            className="absolute inset-y-0 left-0 flex items-center gap-3 pr-8"
            initial={{ x: '0%' }}
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          >
            {[...displayItems, ...displayItems].map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/90 px-3 py-2 min-w-[240px] shadow-sm"
              >
                <div className="h-12 w-12 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden flex items-center justify-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.businessName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-700 via-slate-900 to-slate-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{item.headline}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {item.businessName}
                  </div>
                </div>
                {item.ctaLabel && item.ctaUrl && (
                  <a
                    href={item.ctaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] px-2 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300 whitespace-nowrap"
                  >
                    {item.ctaLabel}
                  </a>
                )}
              </div>
            ))}
          </motion.div>

          {/* Right-side blue light sweep */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent" />
          <motion.div
            className="pointer-events-none absolute top-2 bottom-2 right-4 w-1.5 rounded-full bg-gradient-to-b from-blue-400 via-blue-500 to-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.9)]"
            initial={{ opacity: 0.4, y: 0 }}
            animate={{ opacity: [0.2, 0.8, 0.2], y: [0, 4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  );
}
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());

export default function NewsFeed() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>('ai-curated');
  const { posts, trendingHashtags, loadPosts } = usePostStore();
  const [displayPosts, setDisplayPosts] = useState(posts);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const [observerNode, setObserverNode] = useState<HTMLDivElement | null>(null);
  const { mode, setMode } = useUserStore();
  const [skillQuery, setSkillQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setNewPostsAvailable(true);
      }
    }, 10000);
  const visibleIdsReadyRef = useRef(false);
  const latestKnownPostIdRef = useRef<string | null>(null);

    return () => clearInterval(interval);
  }, []);
  const cleanContent = content.trim();
  const cleanMediaUrl = mediaUrl.trim();
  const canPost = cleanContent.length > 0 || cleanMediaUrl.length > 0;

  // Sync skill filter from URL (?skill=) and ensure professional mode on deep-link
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const skill = params.get('skill') || '';
    if (skill) {
      setSkillQuery(skill);
      if (mode !== 'professional') {
        // fire and forget; local state already updates immediately
        setMode('professional');
      }
    } else {
      // if URL no longer has a skill param, reset local query
      setSkillQuery('');
    if (!newPostsAvailable && posts[0]?.id) {
      latestKnownPostIdRef.current = posts[0].id;
    }
  }, [location.search, mode, setMode]);
  }, [posts, newPostsAvailable]);

  // Initial load from API and reload on mode / skill change
  useEffect(() => {
  setLoading(true);
    if (visibleIdsReadyRef.current) return;
    if (posts.length === 0) return;

  Promise.all([
    loadPosts().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 400)),
  ]).finally(() => {
    setLoading(false);
  });
}, [mode, skillQuery, loadPosts]);
    setVisiblePostIds(new Set(posts.map((post) => post.id)));
    visibleIdsReadyRef.current = true;
  }, [posts]);

  // Filter posts based on selected filter and current mode
  useEffect(() => {
    let filtered = [...posts];
    // Safety: ensure we only show posts for the active mode
    if (mode) filtered = filtered.filter((p: any) => (p.mode === 'professional' ? 'professional' : 'social') === mode);
    
    switch (filter) {
      case 'ai-curated':
        filtered.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
        break;
      case 'recent':
        filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        break;
      case 'trending':
        filtered.sort((a, b) => (b.likes + b.shares * 2) - (a.likes + a.shares * 2));
        break;
    let cancelled = false;
    let pollTimer: number | null = null;

    async function setInitialLatestPost() {
      const { data, error } = await supabase
        .from('posts')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.log('Initial latest post check failed:', error.message);
        return;
      }

      if (!cancelled && data?.[0]?.id) {
        latestKnownPostIdRef.current = data[0].id;
      }
    }
    
    setDisplayPosts(filtered);
    setVisibleCount(5);
  }, [posts, filter, mode]);

  useEffect(() => {
    if (!observerNode) return;
    const onIntersect: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => c + 5);
    setInitialLatestPost();

    const channel = supabase
      .channel('facemex-new-post-banner')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const newPostId = String(payload.new?.id || '');
          const latestKnownPostId = latestKnownPostIdRef.current;

          if (!newPostId) return;

          if (!latestKnownPostId) {
            latestKnownPostIdRef.current = newPostId;
            return;
          }

          if (newPostId !== latestKnownPostId) {
            setNewPostsAvailable(true);
          }
        }
      )
      .subscribe((status) => {
        console.log('FaceMeX new post banner:', status);
      });
    };
    const io = new IntersectionObserver(onIntersect, { rootMargin: '200px' });
    io.observe(observerNode);
    return () => io.disconnect();
  }, [observerNode]);

  const loadNewPosts = () => {
    setNewPostsAvailable(false);
    // Refresh feed
    const refreshed = mode ? posts.filter((p: any) => (p.mode === 'professional' ? 'professional' : 'social') === mode) : posts;
    setDisplayPosts([...refreshed]);
  };
    pollTimer = window.setInterval(async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

  const activeSkill = mode === 'professional' ? skillQuery.trim() : '';
  const [peopleForSkill, setPeopleForSkill] = useState<Array<{ id: string; name: string; avatar?: string; openToCollab?: boolean }>>([]);
  const [openToCollabUsers, setOpenToCollabUsers] = useState<Array<{ id: string; name: string; avatar?: string; openToCollab?: boolean }>>([]);
      if (error) {
        console.log('New post poll failed:', error.message);
        return;
      }

  // Load professionals for the active skill from backend discovery endpoint
  useEffect(() => {
    if (!activeSkill) {
      setPeopleForSkill([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get(`/api/users/discover?skill=${encodeURIComponent(activeSkill)}`);
        if (!cancelled) {
          const users = Array.isArray(data.users) ? data.users : [];
          setPeopleForSkill(
            users.map((u: any) => ({
              id: String(u.id),
              name: u.name,
              avatar: u.avatar,
              openToCollab: !!u.professional?.openToCollab,
            }))
          );
        }
      } catch {
        if (!cancelled) setPeopleForSkill([]);
      const newestId = data?.[0]?.id;
      const latestKnownPostId = latestKnownPostIdRef.current;

      if (!newestId) return;

      if (!latestKnownPostId) {
        latestKnownPostIdRef.current = newestId;
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSkill]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get('/api/users/collab');
        if (!cancelled) {
          const users = Array.isArray(data.users) ? data.users : [];
          setOpenToCollabUsers(
            users.map((u: any) => ({
              id: String(u.id),
              name: u.name,
              avatar: u.avatar,
              openToCollab: true,
            }))
          );
        }
      } catch {
        if (!cancelled) setOpenToCollabUsers([]);
      if (newestId !== latestKnownPostId) {
        setNewPostsAvailable(true);
      }
    })();
    }, 5000);

    return () => {
      cancelled = true;

      if (pollTimer) {
        window.clearInterval(pollTimer);
      }

      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefreshNewPosts = async () => {
    await loadPosts().catch((error) => {
      console.log('Refresh new posts failed:', error);
    });

    const latestPosts = usePostStore.getState().posts;

    setVisiblePostIds(new Set(latestPosts.map((post) => post.id)));
    visibleIdsReadyRef.current = true;

    const { data } = await supabase
      .from('posts')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data?.[0]?.id) {
      latestKnownPostIdRef.current = data[0].id;
    }

    setNewPostsAvailable(false);
  };

  const handlePost = async () => {
    if (!canPost || isPosting) return;

    setIsPosting(true);

    try {
      await addPost(
        cleanContent,
        cleanMediaUrl ? [cleanMediaUrl] : undefined,
        undefined,
        undefined,
        'social'
      );

      setContent('');
      setMediaUrl('');
      setShowMediaInput(false);

      // Do not reveal the new post immediately.
      // Keep it hidden until the user clicks the refresh banner.
      setNewPostsAvailable(true);
    } catch (error) {
      console.log('Create post failed:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const feedSectionTitle =
    feedFilter === 'ai'
      ? 'AI Curated'
      : feedFilter === 'recent'
        ? 'Recent'
        : 'Trending Now';

  const filteredPosts = useMemo(() => {
    const list = [...posts];

    if (feedFilter === 'recent') {
      return list.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    if (feedFilter === 'trending') {
      return list.sort((a, b) => {
        const scoreB = b.likes + b.comments.length + b.shares;
        const scoreA = a.likes + a.comments.length + a.shares;

        return scoreB - scoreA;
      });
    }

    return list.sort((a, b) => {
      const scoreA =
        a.likes * 2 +
        a.comments.length * 3 +
        a.shares * 4 +
        (a.hashtags?.length || 0) * 2;

      const scoreB =
        b.likes * 2 +
        b.comments.length * 3 +
        b.shares * 4 +
        (b.hashtags?.length || 0) * 2;

      return scoreB - scoreA;
    });
  }, [posts, feedFilter]);

  const visibleFilteredPosts = useMemo(() => {
    if (!visibleIdsReadyRef.current) return filteredPosts;

    return filteredPosts.filter((post) => visiblePostIds.has(post.id));
  }, [filteredPosts, visiblePostIds]);

  const sectionTags = useMemo(() => {
    const tagCount = new Map<string, number>();

    visibleFilteredPosts.forEach((post) => {
      const tagsFromPost = post.hashtags || [];

      const tagsFromContent =
        post.content?.match(/#[\w]+/g)?.map((tag) =>
          tag.replace('#', '').toLowerCase()
        ) || [];

      const allTags = [...tagsFromPost, ...tagsFromContent];

      allTags.forEach((tag) => {
        const cleanTag = String(tag).replace('#', '').trim().toLowerCase();

        if (!cleanTag) return;

        tagCount.set(cleanTag, (tagCount.get(cleanTag) || 0) + 1);
      });
    });

    return Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
  }, [visibleFilteredPosts]);

  const userDisplayName =
    user?.name?.trim() ||
    user?.email?.split('@')[0] ||
    'FaceMeX user';

  return (
    <div className="relative max-w-3xl mx-auto py-4 md:py-8 px-2 sm:px-4 lg:px-6 pb-24 space-y-4 md:space-y-6">
      {/* New Posts Banner */}
      <AnimatePresence>
        {newPostsAvailable && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mb-2"
          >
    <div className="mx-auto max-w-2xl px-3 sm:px-4 py-4 space-y-4">
      {newPostsAvailable && (
        <button
          type="button"
          onClick={handleRefreshNewPosts}
          className="w-full rounded-full bg-slate-950 px-4 py-4 text-sm font-semibold text-white shadow-lg"
        >
          New posts available. Refresh
        </button>
      )}

      <Card className="rounded-3xl border">
        <CardContent className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a post, ask for ideas, or plan your next move..."
            className="min-h-[72px] w-full resize-none rounded-2xl border-0 bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground"
            disabled={isPosting}
          />

          {showMediaInput && (
            <div className="mt-3">
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Paste image, video, or audio URL"
                className="rounded-2xl"
                disabled={isPosting}
              />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              onClick={loadNewPosts}
              className="w-full h-9 rounded-full text-xs font-medium"
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowMediaInput((current) => !current)}
              disabled={isPosting}
            >
              New posts available. Refresh
              <ImagePlus className="mr-2 h-4 w-4" />
              Media
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer (ChatGPT-like entry) */}
      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="w-full text-left rounded-2xl border bg-card px-4 py-4 md:px-5 md:py-5 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <div className="text-sm md:text-base text-muted-foreground">
          Write a post, ask for ideas, or plan your next move…
        </div>
      </button>

      {/* Business promotions strip */}
      <BusinessPromotionsStrip />

      {/* Filter Options + Professional Skill Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {filter === 'ai-curated' && 'AI Curated'}
                {filter === 'recent' && 'Recent'}
                {filter === 'trending' && 'Trending'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setFilter('ai-curated')}>
                <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                AI Curated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('recent')}>
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                Recent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('trending')}>
                <TrendingUp className="h-4 w-4 mr-2 text-orange-500" />
                Trending
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {filter === 'ai-curated' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Personalized for you
              </Badge>
            </motion.div>
          )}
        </div>

        {mode === 'professional' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder="Search by skill or #tag (e.g. react)"
              className="flex-1 sm:w-64 px-3 py-2 border rounded-md bg-background text-sm"
            />
          </div>
        )}
      </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-muted-foreground">
                Posting as {userDisplayName}
              </span>

      {/* Trending Hashtags + Skill Context */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 sm:p-4 rounded-2xl border bg-card space-y-3 sm:space-y-4"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          <span className="text-xs sm:text-sm font-semibold">Trending Now</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingHashtags.slice(0, 6).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set('skill', tag);
                navigate({ pathname: '/feed', search: params.toString() });
                setSkillQuery(tag);
                if (mode !== 'professional') {
                  setMode('professional');
                }
              }}
            >
              #{tag}
            </Badge>
          ))}
        </div>
              <Button
                type="button"
                onClick={handlePost}
                disabled={!canPost || isPosting}
                className="rounded-2xl"
              >
                {isPosting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}

        {openToCollabUsers.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Open to collaborate</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {openToCollabUsers.length} profile{openToCollabUsers.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {openToCollabUsers.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-full border px-2 py-1 text-xs cursor-pointer hover:bg-accent/40"
                  onClick={() => navigate('/profile')}
                >
                  <div className="h-6 w-6 rounded-full bg-muted overflow-hidden">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold">
                        {p.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <span className="max-w-[120px] truncate">{p.name}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    Open to collabs
                  </span>
                </div>
              ))}
                {isPosting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        )}
        </CardContent>
      </Card>

      <div className="relative flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilterMenu((current) => !current)}
          className="rounded-xl"
        >
          <Filter className="mr-2 h-4 w-4" />
          {feedSectionTitle}
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="rounded-xl"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Personalized for you
        </Button>

        {showFilterMenu && (
          <div className="absolute left-0 top-12 z-30 w-56 overflow-hidden rounded-2xl border bg-background shadow-xl">
            <button
              type="button"
              onClick={() => {
                setFeedFilter('ai');
                setShowFilterMenu(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
            >
              <Sparkles className="h-4 w-4" />
              AI Curated
            </button>

        {activeSkill && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Filtered by:</span>
              <Badge variant="outline">{activeSkill}</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-xs"
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.delete('skill');
                navigate({ pathname: '/feed', search: params.toString() });
                setSkillQuery('');
                setFeedFilter('recent');
                setShowFilterMenu(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
            >
              Clear
            </Button>
          </div>
        )}
              <Clock className="h-4 w-4" />
              Recent
            </button>

        {activeSkill && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] sm:text-xs bg-muted/40 rounded-md px-3 py-2">
            <span className="text-muted-foreground">
              Explore how creators are using <span className="font-semibold">#{activeSkill}</span> in social mode.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-[11px]"
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set('skill', activeSkill);
                navigate({ pathname: '/feed', search: params.toString() });
                setMode('social');
                setFeedFilter('trending');
                setShowFilterMenu(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
            >
              Browse creative posts
            </Button>
              <TrendingUp className="h-4 w-4" />
              Trending
            </button>
          </div>
        )}
      </div>

        {activeSkill && peopleForSkill.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                People with this skill
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {peopleForSkill.length} profile{peopleForSkill.length === 1 ? '' : 's'}
              </span>
      <Card className="rounded-3xl border">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            {feedFilter === 'ai' ? (
              <Sparkles className="h-4 w-4" />
            ) : feedFilter === 'recent' ? (
              <Clock className="h-4 w-4" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}

            {feedSectionTitle}
          </div>

          {sectionTags.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No hashtags yet.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {peopleForSkill.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-full border px-2 py-1 text-xs cursor-pointer hover:bg-accent/40"
                  onClick={() => navigate('/profile')}
              {sectionTags.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  className="rounded-full bg-muted px-3 py-1 text-sm font-medium"
                >
                  <div className="h-6 w-6 rounded-full bg-muted overflow-hidden">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold">
                        {p.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <span>{p.name}</span>
                  {p.openToCollab && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      Open to collabs
                    </span>
                  )}
                </div>
                  #{item.tag}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Posts Feed */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border bg-card animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="h-4 w-40 bg-muted rounded" />
              </div>
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-48 w-full bg-muted rounded" />
          )}
        </CardContent>
      </Card>

      {visibleFilteredPosts.length === 0 ? (
        <Card className="rounded-3xl border">
          <CardContent className="p-8 text-center">
            <div className="text-sm font-medium">No posts yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Be the first to post something on FaceMeX.
            </div>
          ))}
        </div>
      ) : displayPosts.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border bg-card">
          <div className="text-lg font-semibold mb-2">No posts yet</div>
          <div className="text-sm text-muted-foreground mb-4">Be the first to share something.</div>
          <Button onClick={() => setIsCreateModalOpen(true)}>Write your first post</Button>
        </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {displayPosts.slice(0, visibleCount).map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </AnimatePresence>
          {visibleCount < displayPosts.length && (
            <div className="flex flex-col items-center gap-3">
              <div ref={setObserverNode} className="h-1 w-full" />
              <Button variant="outline" onClick={() => setVisibleCount((c) => c + 5)}>
                Load more
              </Button>
            </div>
          )}
          {visibleFilteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

    {/* Create Post Modal */}
    <CreatePostModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
