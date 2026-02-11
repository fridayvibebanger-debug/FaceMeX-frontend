import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bookmark } from 'lucide-react';
import { usePostStore } from '@/store/postStore';
import PostCard from '@/components/feed/PostCard';

export default function SavedPostsPage() {
  const { posts, loadPosts } = usePostStore();
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    loadPosts().catch(() => {});
  }, [loadPosts]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('faceme_saved_posts_v1');
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setSavedIds(Array.isArray(ids) ? ids : []);
    } catch {
      setSavedIds([]);
    }
  }, []);

  const savedPosts = useMemo(() => {
    if (!savedIds.length) return [];
    const set = new Set(savedIds);
    return posts.filter((p) => set.has(p.id));
  }, [posts, savedIds]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-14 md:pt-16 pb-20">
        <Card className="border-slate-200/70 dark:border-slate-800/70">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-background/80 flex items-center justify-center shadow-sm border border-slate-200/70 dark:border-slate-800/70">
                <Bookmark className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">Saved Posts</CardTitle>
                <p className="text-xs text-muted-foreground">Posts you bookmarked will appear here.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {savedIds.length === 0 ? (
              <div className="text-sm text-muted-foreground">You have no saved posts yet.</div>
            ) : savedPosts.length === 0 ? (
              <div className="text-sm text-muted-foreground">Loading saved posts…</div>
            ) : (
              <div className="space-y-3">
                {savedPosts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
