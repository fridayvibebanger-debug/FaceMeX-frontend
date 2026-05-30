import { useEffect } from 'react';

import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import NewsFeed from '@/components/feed/NewsFeed';

import { supabase } from '@/lib/supabase';
import { usePostStore } from '@/store/postStore';

export default function FeedPage() {
  const { loadPosts } = usePostStore();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (!mounted) return;
        await loadPosts();
      } catch (error) {
        console.log('Initial feed load failed:', error);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [loadPosts]);

  useEffect(() => {
    let refreshTimer: number | null = null;

    const refreshPostsOnly = () => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(() => {
        loadPosts().catch((error) => {
          console.log('New post refresh failed:', error);
        });
      }, 1200);
    };

    const channel = supabase
      .channel('facemex-feed-posts-refresh')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        refreshPostsOnly
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        refreshPostsOnly
      )
      .subscribe();

    return () => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }

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
