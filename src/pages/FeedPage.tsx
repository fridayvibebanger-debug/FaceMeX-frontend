import { useEffect, useMemo, useRef, useState } from 'react';
import {
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

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type FeedFilter = 'ai' | 'recent' | 'trending';

export default function NewsFeed() {
  const { user } = useAuthStore();
  const { posts, loadPosts, addPost } = usePostStore();

  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const [feedFilter, setFeedFilter] = useState<FeedFilter>('ai');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);

  const latestKnownPostIdRef = useRef<string | null>(null);

  const cleanContent = content.trim();
  const cleanMediaUrl = mediaUrl.trim();
  const canPost = cleanContent.length > 0 || cleanMediaUrl.length > 0;

  useEffect(() => {
    if (!newPostsAvailable && posts[0]?.id) {
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

    pollTimer = window.setInterval(async () => {
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
        setNewPostsAvailable(true);
      }
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

      await loadPosts().catch(() => {});
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

  const sectionTags = useMemo(() => {
    const tagCount = new Map<string, number>();

    filteredPosts.forEach((post) => {
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
  }, [filteredPosts]);

  const userDisplayName =
    user?.name?.trim() ||
    user?.email?.split('@')[0] ||
    'FaceMeX user';

  return (
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
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowMediaInput((current) => !current)}
              disabled={isPosting}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Media
            </Button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-muted-foreground">
                Posting as {userDisplayName}
              </span>

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
                {isPosting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
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

            <button
              type="button"
              onClick={() => {
                setFeedFilter('recent');
                setShowFilterMenu(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
            >
              <Clock className="h-4 w-4" />
              Recent
            </button>

            <button
              type="button"
              onClick={() => {
                setFeedFilter('trending');
                setShowFilterMenu(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted"
            >
              <TrendingUp className="h-4 w-4" />
              Trending
            </button>
          </div>
        )}
      </div>

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
              {sectionTags.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  className="rounded-full bg-muted px-3 py-1 text-sm font-medium"
                >
                  #{item.tag}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {filteredPosts.length === 0 ? (
        <Card className="rounded-3xl border">
          <CardContent className="p-8 text-center">
            <div className="text-sm font-medium">No posts yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Be the first to post something on FaceMeX.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  const { loadPosts } = usePostStore();

  useEffect(() => {
    loadPosts().catch((error) => {
      console.log('Initial feed load failed:', error);
    });
  }, [loadPosts]);

  useEffect(() => {
    const refreshFeedActions = () => {
      loadPosts().catch((error) => {
        console.log('Live feed action refresh failed:', error);
      });
    };

    const channel = supabase
      .channel('facemex-feed-actions-refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments' },
        refreshFeedActions
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions' },
        refreshFeedActions
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_shares' },
        refreshFeedActions
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_saves' },
        refreshFeedActions
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex pt-14 md:pt-16 pb-16 md:pb-0">
        <LeftSidebar />

        <main className="flex-1 lg:ml-64 xl:mr-80">
          <NewsFeed />
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
