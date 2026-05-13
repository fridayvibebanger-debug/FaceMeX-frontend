import { useEffect, useMemo, useState } from 'react';
import { Loader2, ImagePlus, Send } from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import PostCard from '@/components/feed/PostCard';

import { supabase } from '@/lib/supabase';
import { usePostStore } from '@/store/postStore';
import { useAuthStore } from '@/store/authStore';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function FeedPage() {
  const { user } = useAuthStore();
  const { posts, loadPosts, addPost } = usePostStore();

  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const cleanContent = content.trim();
  const cleanImageUrl = imageUrl.trim();

  const canPost = cleanContent.length > 0 || cleanImageUrl.length > 0;

  const userDisplayName = useMemo(() => {
    return (
      user?.name?.trim() ||
      user?.email?.split('@')[0] ||
      'FaceMeX user'
    );
  }, [user?.name, user?.email]);

  useEffect(() => {
    let mounted = true;

    async function start() {
      setIsLoadingFeed(true);
      await loadPosts().catch((err) => {
        console.log('Load feed error:', err);
        setErrorText('Could not load feed.');
      });

      if (mounted) {
        setIsLoadingFeed(false);
      }
    }

    start();

    return () => {
      mounted = false;
    };
  }, [loadPosts]);

  useEffect(() => {
    const refreshFeed = () => {
      loadPosts().catch((err) => {
        console.log('Live feed refresh failed:', err);
      });
    };

    const channel = supabase
      .channel('facemex-feed-live-refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        refreshFeed
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments' },
        refreshFeed
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions' },
        refreshFeed
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_shares' },
        refreshFeed
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_saves' },
        refreshFeed
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPosts]);

  const handlePost = async () => {
    if (!canPost || isPosting) return;

    setIsPosting(true);
    setErrorText(null);

    try {
      const images = cleanImageUrl ? [cleanImageUrl] : undefined;

      await addPost(
        cleanContent,
        images,
        undefined,
        undefined,
        'social'
      );

      setContent('');
      setImageUrl('');
      setShowImageInput(false);

      await loadPosts().catch(() => {});
    } catch (err: any) {
      console.log('Create post failed:', err);
      setErrorText(err?.message || 'Post failed. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-2xl px-3 sm:px-4 pt-14 md:pt-20 pb-24">
        <div className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
          <p className="text-sm text-muted-foreground">
            Share updates, reply, react, save, and follow real activity.
          </p>
        </div>

        <Card className="mb-4 rounded-2xl border">
          <CardContent className="p-4">
            <div className="mb-3 text-sm text-muted-foreground">
              Posting as <span className="font-medium text-foreground">{userDisplayName}</span>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening on FaceMeX?"
              className="min-h-[110px] w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isPosting}
            />

            {showImageInput && (
              <div className="mt-3">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image / media URL"
                  className="rounded-2xl"
                  disabled={isPosting}
                />
              </div>
            )}

            {errorText && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
                {errorText}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowImageInput((v) => !v)}
                disabled={isPosting}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Media
              </Button>

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
          </CardContent>
        </Card>

        {isLoadingFeed ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading feed...
          </div>
        ) : posts.length === 0 ? (
          <Card className="rounded-2xl border">
            <CardContent className="p-8 text-center">
              <div className="text-sm font-medium">No posts yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Be the first to post something on FaceMeX.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
