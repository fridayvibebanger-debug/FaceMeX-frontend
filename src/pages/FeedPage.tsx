import { useCallback, useEffect, useRef } from 'react';

import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import NewsFeed from '@/components/feed/NewsFeed';

import { supabase } from '@/lib/supabase';
import { usePostStore } from '@/store/postStore';

export default function FeedPage() {
  const { loadPosts } = usePostStore();

  const isLoadingRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const safeLoadPosts = useCallback(
    async (label = 'Feed load') => {
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;

      try {
        await loadPosts();
      } catch (error) {
        console.log(`${label} failed:`, error);
      } finally {
        isLoadingRef.current = false;
      }
    },
    [loadPosts]
  );

  const scheduleFeedRefresh = useCallback(() => {
    if (typeof document !== 'undefined' && document.hidden) return;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      safeLoadPosts('Live feed refresh');
    }, 900);
  }, [safeLoadPosts]);

  useEffect(() => {
    mountedRef.current = true;

    safeLoadPosts('Initial feed load');

    return () => {
      mountedRef.current = false;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [safeLoadPosts]);

  useEffect(() => {
    const channel = supabase
      .channel('facemex-feed-actions-refresh-v2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments' },
        scheduleFeedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reactions' },
        scheduleFeedRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_shares' },
        scheduleFeedRefresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [scheduleFeedRefresh]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex pt-14 pb-16 md:pt-16 md:pb-0">
        <LeftSidebar />

        <main className="min-w-0 flex-1 lg:ml-64 xl:mr-80">
          <NewsFeed />
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
