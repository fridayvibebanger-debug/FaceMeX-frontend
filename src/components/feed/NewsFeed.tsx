import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Clock, Filter } from 'lucide-react';
import PostCard from './PostCard';
import MarketplaceAdSlide from '@/components/feed/MarketplaceAdSlide';
import CreatePostModal from './CreatePostModal';
import { usePostStore } from '@/store/postStore';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

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

function getPostTime(post: any) {
  const raw = post?.timestamp || post?.createdAt || post?.created_at || Date.now();
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

/*
  ORIGINAL SLIDE FEED KEPT.
  I did not change this to horizontal manual scroll.
*/
function BusinessPromotionsStrip() {
  const [items, setItems] = useState<BusinessPromotion[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFeedPromotions() {
      setLoadingPromos(true);

      const { data, error } = await supabase
        .from('business_promotions')
        .select(
          'id, business_name, headline, description, image_url, cta_label, cta_url, tags, start_at, end_at, paid_amount_zar, paid_days'
        )
        .eq('placement', 'feed')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(12);

      if (!cancelled && !error && data) {
        const mapped: BusinessPromotion[] = data.map((item: any) => ({
          id: String(item.id),
          businessName: item.business_name || 'Business',
          headline: item.headline || 'Sponsored promotion',
          description: item.description || '',
          imageUrl: item.image_url || '',
          ctaLabel: item.cta_label || '',
          ctaUrl: item.cta_url || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          startAt: item.start_at ? new Date(item.start_at).getTime() : undefined,
          endAt: item.end_at ? new Date(item.end_at).getTime() : undefined,
          paidAmountZar:
            typeof item.paid_amount_zar === 'number'
              ? item.paid_amount_zar
              : item.paid_amount_zar
                ? Number(item.paid_amount_zar)
                : undefined,
          paidDays:
            typeof item.paid_days === 'number'
              ? item.paid_days
              : item.paid_days
                ? Number(item.paid_days)
                : undefined,
        }));

        setItems(mapped);
        setLoadingPromos(false);
        return;
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY_PROMOTIONS);

        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as BusinessPromotion[];
          setItems(parsed);
        }
      } catch {
        if (!cancelled) setItems([]);
      }

      if (!cancelled) {
        setLoadingPromos(false);
      }
    }

    loadFeedPromotions();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayItems = useMemo(() => {
    const now = Date.now();

    return items.filter((p) => {
      const until =
        typeof p.monthlyPaidUntil === 'number' ? p.monthlyPaidUntil : p.endAt;

      if (!until) return true;
      if (p.startAt && now < p.startAt) return false;

      return now <= until;
    });
  }, [items]);

  if (loadingPromos || displayItems.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
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
            transition={{
              duration: Math.max(30, displayItems.length * 8),
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {[...displayItems, ...displayItems].map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/90 px-3 py-2 min-w-[240px] shadow-sm"
              >
                <div className="h-12 w-12 rounded-lg bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.businessName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-700 via-slate-900 to-slate-800 flex items-center justify-center text-white text-xs font-bold">
                      {item.businessName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {item.headline}
                  </div>
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

  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const [observerNode, setObserverNode] = useState<HTMLDivElement | null>(null);

  const { mode, setMode } = useUserStore();
  const [skillQuery, setSkillQuery] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  const latestKnownPostIdRef = useRef<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const [hiddenNewPostIds, setHiddenNewPostIds] = useState<Set<string>>(
    () => new Set()
  );

  const activeSkill = mode === 'professional' ? skillQuery.trim() : '';

  const [peopleForSkill, setPeopleForSkill] = useState<
    Array<{ id: string; name: string; avatar?: string; openToCollab?: boolean }>
  >([]);

  const [openToCollabUsers, setOpenToCollabUsers] = useState<
    Array<{ id: string; name: string; avatar?: string; openToCollab?: boolean }>
  >([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const skill = params.get('skill') || '';

    if (skill) {
      setSkillQuery(skill);

      if (mode !== 'professional') {
        setMode('professional');
      }
    } else {
      setSkillQuery('');
    }
  }, [location.search, mode, setMode]);

  /*
    Stable first load only.
    This prevents the feed from blinking when scrolling.
  */
  useEffect(() => {
    if (hasLoadedOnceRef.current) return;

    hasLoadedOnceRef.current = true;

    let cancelled = false;

    async function runLoad() {
      if (posts.length === 0) setLoading(true);

      try {
        await loadPosts();
      } catch (error) {
        console.log('Initial feed load failed:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    runLoad();

    return () => {
      cancelled = true;
    };
  }, [loadPosts, posts.length]);

  useEffect(() => {
    if (posts.length > 0) setLoading(false);
  }, [posts.length]);

  useEffect(() => {
    if (posts[0]?.id && !newPostsAvailable) {
      latestKnownPostIdRef.current = posts[0].id;
    }
  }, [posts, newPostsAvailable]);

  /*
    New post banner only.
    It does NOT reload the list automatically.
    This avoids blinking while scrolling.
  */
  useEffect(() => {
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

    setInitialLatestPost();

    const channel = supabase
      .channel('facemex-new-post-banner-phone-fit')
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
            setHiddenNewPostIds((prev) => {
              const next = new Set(prev);
              next.add(newPostId);
              return next;
            });

            setNewPostsAvailable(true);
          }
        }
      )
      .subscribe();

    pollTimer = window.setInterval(async () => {
      if (document.hidden) return;

      const { data, error } = await supabase
        .from('posts')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.log('New post poll failed:', error.message);
        return;
      }

      const newestId = data?.[0]?.id;
      const latestKnownPostId = latestKnownPostIdRef.current;

      if (!newestId) return;

      if (!latestKnownPostId) {
        latestKnownPostIdRef.current = newestId;
        return;
      }

      if (newestId !== latestKnownPostId) {
        setHiddenNewPostIds((prev) => {
          const next = new Set(prev);
          next.add(newestId);
          return next;
        });

        setNewPostsAvailable(true);
      }
    }, 15000);

    return () => {
      cancelled = true;

      if (pollTimer) {
        window.clearInterval(pollTimer);
      }

      supabase.removeChannel(channel);
    };
  }, []);

  const displayPosts = useMemo(() => {
    let filtered = [...posts];

    if (mode) {
      filtered = filtered.filter(
        (p: any) =>
          (p.mode === 'professional' ? 'professional' : 'social') === mode
      );
    }

    if (activeSkill) {
      const cleanSkill = activeSkill.toLowerCase();

      filtered = filtered.filter((p: any) => {
        const content = String(p.content || '').toLowerCase();

        const tags = Array.isArray(p.hashtags)
          ? p.hashtags.map((tag: string) => tag.toLowerCase())
          : [];

        return (
          content.includes(cleanSkill) ||
          content.includes(`#${cleanSkill}`) ||
          tags.includes(cleanSkill)
        );
      });
    }

    filtered = filtered.filter((p) => !hiddenNewPostIds.has(p.id));

    switch (filter) {
      case 'ai-curated':
        filtered.sort((a, b) => {
          const bScore = b.aiScore || getPostTime(b);
          const aScore = a.aiScore || getPostTime(a);
          return bScore - aScore;
        });
        break;

      case 'recent':
        filtered.sort((a, b) => getPostTime(b) - getPostTime(a));
        break;

      case 'trending':
        filtered.sort(
          (a, b) => b.likes + b.shares * 2 - (a.likes + a.shares * 2)
        );
        break;

      default:
        break;
    }

    return filtered;
  }, [posts, filter, mode, activeSkill, hiddenNewPostIds]);

  useEffect(() => {
    setVisibleCount(5);
  }, [filter, mode, activeSkill]);

  useEffect(() => {
    if (!observerNode) return;

    const onIntersect: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => {
            const next = Math.min(count + 5, displayPosts.length);
            return next === count ? count : next;
          });
        }
      });
    };

    const io = new IntersectionObserver(onIntersect, {
      rootMargin: '280px',
      threshold: 0.01,
    });

    io.observe(observerNode);

    return () => io.disconnect();
  }, [observerNode, displayPosts.length]);

  const loadNewPosts = async () => {
    setLoading(true);

    try {
      await loadPosts();

      const { data } = await supabase
        .from('posts')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data?.[0]?.id) {
        latestKnownPostIdRef.current = data[0].id;
      }

      setHiddenNewPostIds(new Set());
      setNewPostsAvailable(false);
    } catch (error) {
      console.log('Load new posts failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeSkill) {
      setPeopleForSkill([]);
      return;
    }

    let cancelled = false;

    async function loadPeopleForSkill() {
      try {
        const data = await api.get(
          `/api/users/discover?skill=${encodeURIComponent(activeSkill)}`
        );

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
    }

    loadPeopleForSkill();

    return () => {
      cancelled = true;
    };
  }, [activeSkill]);

  useEffect(() => {
    let cancelled = false;

    async function loadOpenToCollabUsers() {
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
    }

    loadOpenToCollabUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[430px] space-y-4 px-2 py-3 pb-24">
      {newPostsAvailable && (
        <div className="sticky top-14 z-20">
          <Button
            onClick={loadNewPosts}
            className="h-9 w-full rounded-full text-xs font-medium"
          >
            New posts available. Refresh
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="w-full text-left rounded-2xl border bg-card px-4 py-4 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <div className="text-sm text-muted-foreground">
          Write a post, ask for ideas, or plan your next move…
        </div>
      </button>

      <MarketplaceAdSlide />

      <BusinessPromotionsStrip />

      <div className="flex flex-col gap-2 rounded-2xl border bg-card p-2.5">
        <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 shrink-0 rounded-full text-xs">
                <Filter className="h-3.5 w-3.5 mr-2" />
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
            <Badge variant="secondary" className="h-8 shrink-0 rounded-full text-[11px]">
              <Sparkles className="h-3 w-3 mr-1" />
              For you
            </Badge>
          )}
        </div>

        {mode === 'professional' && (
          <input
            value={skillQuery}
            onChange={(event) => setSkillQuery(event.target.value)}
            placeholder="Search skill or #tag"
            className="h-9 w-full rounded-full border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>

      <div className="p-3 rounded-2xl border bg-card space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Trending Now</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {trendingHashtags.slice(0, 8).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="shrink-0 cursor-pointer rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set('skill', tag);

                navigate({
                  pathname: '/feed',
                  search: `?${params.toString()}`,
                });

                setSkillQuery(tag);

                if (mode !== 'professional') {
                  setMode('professional');
                }
              }}
            >
              #{tag}
            </Badge>
          ))}

          {trendingHashtags.length === 0 && (
            <span className="text-sm text-muted-foreground">
              No hashtags yet.
            </span>
          )}
        </div>

        {openToCollabUsers.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Open to collaborate
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {openToCollabUsers.length} profile
                {openToCollabUsers.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {openToCollabUsers.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-full border px-2 py-1 text-xs cursor-pointer hover:bg-accent/40"
                  onClick={() => navigate('/profile')}
                >
                  <div className="h-6 w-6 rounded-full bg-muted overflow-hidden">
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold">
                        {p.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>

                  <span className="max-w-[110px] truncate">{p.name}</span>

                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                    Open
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSkill && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">Filtered by:</span>
              <Badge variant="outline" className="rounded-full">
                {activeSkill}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs rounded-full"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.delete('skill');

                navigate({
                  pathname: '/feed',
                  search: params.toString() ? `?${params.toString()}` : '',
                });

                setSkillQuery('');
              }}
            >
              Clear
            </Button>
          </div>
        )}

        {activeSkill && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] bg-muted/40 rounded-2xl px-3 py-2">
            <span className="text-muted-foreground">
              Explore how creators are using{' '}
              <span className="font-semibold">#{activeSkill}</span> in social mode.
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-[11px] rounded-full"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set('skill', activeSkill);

                navigate({
                  pathname: '/feed',
                  search: `?${params.toString()}`,
                });

                setMode('social');
                setFilter('trending');
              }}
            >
              Browse creative posts
            </Button>
          </div>
        )}

        {activeSkill && peopleForSkill.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                People with this skill
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {peopleForSkill.length} profile
                {peopleForSkill.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {peopleForSkill.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-full border px-2 py-1 text-xs cursor-pointer hover:bg-accent/40"
                  onClick={() => navigate('/profile')}
                >
                  <div className="h-6 w-6 rounded-full bg-muted overflow-hidden">
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold">
                        {p.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>

                  <span className="max-w-[110px] truncate">{p.name}</span>

                  {p.openToCollab && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      Open
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="p-4 rounded-2xl border bg-card animate-pulse space-y-3"
            >
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
          <div className="text-sm text-muted-foreground mb-4">
            Be the first to share something.
          </div>

          <Button onClick={() => setIsCreateModalOpen(true)}>
            Write your first post
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayPosts.slice(0, visibleCount).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {visibleCount < displayPosts.length && (
            <div className="flex flex-col items-center gap-3">
              <div ref={setObserverNode} className="h-1 w-full" />

              <Button
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + 5, displayPosts.length)
                  )
                }
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <CreatePostModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
