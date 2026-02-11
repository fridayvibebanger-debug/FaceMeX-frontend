import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import NewsFeed from '@/components/feed/NewsFeed';

export default function FeedPage() {
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