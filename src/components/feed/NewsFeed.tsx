import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Clock, Filter } from 'lucide-react';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import { usePostStore } from '@/store/postStore';
import { motion, AnimatePresence } from 'framer-motion';
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

const MOCK_PROMOTIONS: BusinessPromotion[] = [
  {
    id: 'p1',
    businessName: 'Nova Coffee',
    headline: 'Fresh coffee, fast delivery',
    description: 'Order beans, cold brew, and snacks. Delivered in 30 minutes in Cape Town.',
    imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80',
    ctaLabel: 'Order now',
    ctaUrl: 'https://example.com',
    tags: ['coffee', 'delivery'],
  },
  {
    id: 'p2',
    businessName: 'Skyline Studio',
    headline: 'Brand design for startups',
    description: 'Logos, social templates, and product mockups — ready in 72 hours.',
    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80',
    ctaLabel: 'Get a quote',
    ctaUrl: 'https://example.com',
    tags: ['design', 'business'],
  },
];

function BusinessPromotionsStrip() {
  const [items, setItems] = useState<BusinessPromotion[]>(() => [...MOCK_PROMOTIONS]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROMOTIONS);
      if (raw) {
        const parsed = JSON.parse(raw) as BusinessPromotion[];
        setItems(parsed);
      }
    } catch {}
  }, []);

  const displayItems = useMemo(() => {
    const now = Date.now();
    const raw = localStorage.getItem(STORAGE_KEY_PROMOTIONS);
    if (!raw) return MOCK_PROMOTIONS;

    try {
      const parsed = JSON.parse(raw) as BusinessPromotion[];
      const active = parsed.filter((p) => {
        const until = typeof p.monthlyPaidUntil === 'number' ? p.monthlyPaidUntil : p.endAt;
        if (!until) return true;
        if (p.startAt && now < p.startAt) return false;
        return now <= until;
      });
      return active.length ? active : MOCK_PROMOTIONS;
    } catch {
      return MOCK_PROMOTIONS;
    }
  }, [items]);

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

    return () => clearInterval(interval);
  }, []);

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
    }
  }, [location.search, mode, setMode]);

  // Initial load from API and reload on mode / skill change
  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadPosts(skillQuery || undefined).catch(() => {}),
      new Promise((r) => setTimeout(r, 400)),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, skillQuery]);

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
        }
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

  const activeSkill = mode === 'professional' ? skillQuery.trim() : '';
  const [peopleForSkill, setPeopleForSkill] = useState<Array<{ id: string; name: string; avatar?: string; openToCollab?: boolean }>>([]);
  const [openToCollabUsers, setOpenToCollabUsers] = useState<Array<{ id: string; name: string; avatar?: string; openToCollab?: boolean }>>([]);

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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
            <Button
              onClick={loadNewPosts}
              className="w-full h-9 rounded-full text-xs font-medium"
            >
              New posts available. Refresh
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
            </div>
          </div>
        )}

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
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.delete('skill');
                navigate({ pathname: '/feed', search: params.toString() });
                setSkillQuery('');
              }}
            >
              Clear
            </Button>
          </div>
        )}

        {activeSkill && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] sm:text-xs bg-muted/40 rounded-md px-3 py-2">
            <span className="text-muted-foreground">
              Explore how creators are using <span className="font-semibold">#{activeSkill}</span> in social mode.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-[11px]"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set('skill', activeSkill);
                navigate({ pathname: '/feed', search: params.toString() });
                setMode('social');
              }}
            >
              Browse creative posts
            </Button>
          </div>
        )}

        {activeSkill && peopleForSkill.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                People with this skill
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {peopleForSkill.length} profile{peopleForSkill.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {peopleForSkill.slice(0, 6).map((p) => (
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
                  <span>{p.name}</span>
                  {p.openToCollab && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      Open to collabs
                    </span>
                  )}
                </div>
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
            </div>
          ))}
        </div>
      ) : displayPosts.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border bg-card">
          <div className="text-lg font-semibold mb-2">No posts yet</div>
          <div className="text-sm text-muted-foreground mb-4">Be the first to share something.</div>
          <Button onClick={() => setIsCreateModalOpen(true)}>Write your first post</Button>
        </div>
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