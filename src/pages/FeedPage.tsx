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
