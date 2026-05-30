import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Clock, Filter } from 'lucide-react';
import PostCard from './PostCard';
import MarketplaceAdSlide from '@/components/feed/MarketplaceAdSlide';
import CreatePostModal from './CreatePostModal';
import { usePostStore } from '@/store/postStore';
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

function safePostTime(post: any) {
  const raw =
    post?.timestamp ||
    post?.createdAt ||
    post?.created_at ||
    Date.now();

  const date = raw instanceof Date ? raw : new Date(raw);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

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

      if (!cancelled) setLoadingPromos(false);
    }

    loadFeedPromotions();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayItems = useMemo(() => {
    const now = Date.now();

    return items.filter((promotion) => {
      const until =
        typeof promotion.monthlyPaidUntil === 'number'
          ? promotion.monthlyPaidUntil
          : promotion.endAt;

      if (!until) return true;
      if (promotion.startAt && now < promotion.startAt) return false;

      return now <= until;
    });
  }, [items]);

  if (loadingPromos || displayItems.length === 0) return null;

  return (
    <div className="mb-3 sm:mb-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold sm:text-sm">Sponsored</span>
        <span className="text-[10px] text-muted-foreground sm:text-[11px]">
          Feed promotions
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card px-2 py-2 shadow-sm sm:px-3">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="flex min-w-[220px] items-center gap-2 rounded-xl border border-border/70 bg-background px-2.5 py-2 shadow-sm sm:min-w-[260px] sm:gap-3 sm:px-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted sm:h-12 sm:w-12">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.businessName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-xs font-bold text-white">
                    {item.businessName.charAt(0)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold sm:text-sm">
                  {item.headline}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {item.businessName}
                </div>
              </div>

              {item.ctaLabel && item.ctaUrl && (
                <a
                  href={item.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary sm:text-[11px]"
                >
                  {item.ctaLabel}
                </a>
              )}
            </div>
          ))}
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
  const didInitialLoadRef = useRef(false);

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

  useEffect(() => {
    if (didInitialLoadRef.current) return;

    didInitialLoadRef.current = true;

    let cancelled = false;

    async function runInitialLoad() {
      if (posts.length === 0) setLoading(true);

      try {
        await loadPosts();
      } catch (error) {
        console.log('NewsFeed initial load failed:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    runInitialLoad();

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
      .channel('facemex-new-post-banner-stable-mobile')
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

      if (pollTimer) window.clearInterval(pollTimer);

      supabase.removeChannel(channel);
    };
  }, []);

  const displayPosts = useMemo(() => {
    let filtered = [...posts];

    if (mode) {
      filtered = filtered.filter(
        (post: any) =>
          (post.mode === 'professional' ? 'professional' : 'social') === mode
      );
    }

    if (activeSkill) {
      const cleanSkill = activeSkill.toLowerCase();

      filtered = filtered.filter((post: any) => {
        const content = String(post.content || '').toLowerCase();

        const tags = Array.isArray(post.hashtags)
          ? post.hashtags.map((tag: string) => tag.toLowerCase())
          : [];

        return (
          content.includes(cleanSkill) ||
          content.includes(`#${cleanSkill}`) ||
          tags.includes(cleanSkill)
        );
      });
    }

    filtered = filtered.filter((post) => !hiddenNewPostIds.has(post.id));

    switch (filter) {
      case 'ai-curated':
        filtered.sort((a, b) => {
          const bScore = b.aiScore || safePostTime(b);
          const aScore = a.aiScore || safePostTime(a);
          return bScore - aScore;
        });
        break;

      case 'recent':
        filtered.sort((a, b) => safePostTime(b) - safePostTime(a));
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

    const observer = new IntersectionObserver(onIntersect, {
      rootMargin: '300px',
      threshold: 0.01,
    });

    observer.observe(observerNode);

    return () => observer.disconnect();
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
            users.map((user: any) => ({
              id: String(user.id),
              name: user.name,
              avatar: user.avatar,
              openToCollab: !!user.professional?.openToCollab,
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
            users.map((user: any) => ({
              id: String(user.id),
              name: user.name,
              avatar: user.avatar,
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
    <div className="relative mx-auto w-full max-w-3xl space-y-3 px-2 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-5 md:space-y-6 md:px-6 md:py-8">
      {newPostsAvailable && (
        <div className="sticky top-16 z-20 px-1">
          <Button
            onClick={loadNewPosts}
            className="h-9 w-full rounded-full text-xs font-semibold shadow-sm"
          >
            New posts available. Refresh
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="w-full rounded-2xl border border-border/70 bg-card px-4 py-3 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:px-5 sm:py-4"
      >
        <div className="text-sm text-muted-foreground sm:text-base">
          Write a post, ask for ideas, or plan your next move…
        </div>
      </button>

      <MarketplaceAdSlide />

      <BusinessPromotionsStrip />

      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3">
        <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 shrink-0 rounded-full text-xs">
                <Filter className="mr-2 h-3.5 w-3.5" />
                {filter === 'ai-curated' && 'AI Curated'}
                {filter === 'recent' && 'Recent'}
                {filter === 'trending' && 'Trending'}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="rounded-2xl">
              <DropdownMenuItem onClick={() => setFilter('ai-curated')}>
                <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                AI Curated
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setFilter('recent')}>
                <Clock className="mr-2 h-4 w-4 text-blue-500" />
                Recent
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setFilter('trending')}>
                <TrendingUp className="mr-2 h-4 w-4 text-orange-500" />
                Trending
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {filter === 'ai-curated' && (
            <Badge variant="secondary" className="h-8 shrink-0 rounded-full px-3 text-[11px]">
              <Sparkles className="mr-1 h-3 w-3" />
              For you
            </Badge>
          )}
        </div>

        {mode === 'professional' && (
          <input
            value={skillQuery}
            onChange={(event) => setSkillQuery(event.target.value)}
            placeholder="Search skill or #tag"
            className="h-9 w-full rounded-full border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-60"
          />
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Trending Now</span>
          </div>

          {trendingHashtags.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {trendingHashtags.length} tags
            </span>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {trendingHashtags.slice(0, 8).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
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
          <div className="space-y-2 border-t border-border/70 pt-3">
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
              {openToCollabUsers.slice(0, 8).map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background px-2 py-1 text-xs hover:bg-accent/40"
                  onClick={() => navigate('/profile')}
                >
                  <div className="h-6 w-6 overflow-hidden rounded-full bg-muted">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt={person.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold">
                        {person.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>

                  <span className="max-w-[110px] truncate">{person.name}</span>

                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-medium text-emerald-700">
                    Open
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSkill && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Filtered by:</span>
              <Badge variant="outline" className="rounded-full">
                {activeSkill}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2 text-[11px] sm:text-xs">
            <span className="text-muted-foreground">
              Explore how creators are using{' '}
              <span className="font-semibold">#{activeSkill}</span>.
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full px-3 text-[11px]"
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
          <div className="space-y-2 border-t border-border/70 pt-3">
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
              {peopleForSkill.slice(0, 8).map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background px-2 py-1 text-xs hover:bg-accent/40"
                  onClick={() => navigate('/profile')}
                >
                  <div className="h-6 w-6 overflow-hidden rounded-full bg-muted">
                    {person.avatar ? (
                      <img
                        src={person.avatar}
                        alt={person.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold">
                        {person.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>

                  <span className="max-w-[120px] truncate">{person.name}</span>

                  {person.openToCollab && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-medium text-emerald-700">
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
        <div className="space-y-3 sm:space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              </div>

              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />
            </div>
          ))}
        </div>
      ) : displayPosts.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
          <div className="mb-2 text-lg font-semibold">No posts yet</div>

          <div className="mb-4 text-sm text-muted-foreground">
            Be the first to share something.
          </div>

          <Button onClick={() => setIsCreateModalOpen(true)}>
            Write your first post
          </Button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {displayPosts.slice(0, visibleCount).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {visibleCount < displayPosts.length && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div ref={setObserverNode} className="h-1 w-full" />

              <Button
                variant="outline"
                className="h-9 rounded-full px-5 text-xs font-semibold"
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
