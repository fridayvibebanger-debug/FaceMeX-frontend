import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { useParams } from 'react-router-dom';
import { usePostStore } from '@/store/postStore';
import { useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const { posts, loadPosts, likePost, sharePost, addComment } = usePostStore();

  // Ensure posts are loaded if empty so deep-linking to /watch/:id works
  useEffect(() => {
    if (!posts.length) {
      loadPosts().catch(() => {});
    }
  }, [posts.length, loadPosts]);

  const post = useMemo(() => posts.find((p) => p.id === (id || '')), [posts, id]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />
      <div className="flex pt-14 md:pt-16 pb-16 md:pb-0">
        <LeftSidebar />
        <main className="flex-1 lg:ml-64 xl:mr-80 px-3 sm:px-4 lg:px-8 py-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] gap-6">
            {/* Primary video area */}
            <section className="space-y-4">
              {/* Main video player */}
              <div className="rounded-2xl bg-black aspect-video shadow-lg shadow-slate-900/40 ring-1 ring-slate-900/30 overflow-hidden flex items-center justify-center text-slate-400 text-xs">
                {post ? (
                  (post.images && post.images.length > 0) || post.image ? (
                    <img
                      src={(post.images && post.images.length > 0) ? post.images[0] : post.image}
                      alt={post.content}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span>No media for this post</span>
                  )
                ) : (
                  <span>Loading video...</span>
                )}
              </div>

              {/* Title + meta + actions */}
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/95 dark:bg-slate-900/95 px-4 py-3 space-y-3">
                <div className="space-y-1">
                  <h1 className="text-base sm:text-lg font-semibold text-foreground line-clamp-2">
                    {post ? post.content : 'Loading video...'}
                  </h1>
                  {post && (
                    <p className="text-xs text-muted-foreground">
                      {post.likes} likes • {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    className="px-3 py-1.5 rounded-full bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900 font-medium"
                    disabled={!post}
                    onClick={() => {
                      if (!post) return;
                      likePost(post.id);
                    }}
                  >
                    Like
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                    disabled={!post}
                    onClick={() => {
                      if (!post) return;
                      // Add comment functionality
                    }}
                  >
                    Comment
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50"
                    disabled={!post}
                    onClick={() => {
                      if (!post) return;
                      sharePost(post.id);
                    }}
                  >
                    Share
                  </button>
                </div>
              </div>

              {/* Comments section: text + voice note */}
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/95 dark:bg-slate-900/95 px-4 py-3 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Comments</span>
                  <span className="text-[11px] text-muted-foreground">Powered by existing post comments</span>
                </div>

                {/* New comment input placeholder */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 h-9 rounded-full bg-slate-100 dark:bg-slate-800/80" />
                </div>

                <div className="space-y-3 text-xs">
                  {post && post.comments.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">No comments yet.</p>
                  )}

                  {post && post.comments.map((comment) => {
                    const isRealLife = comment.content.startsWith('[REAL_LIFE]');
                    if (isRealLife) {
                      const raw = comment.content.replace(/^\[REAL_LIFE\]\s*/, '');
                      const parts = raw.split('::');
                      const left = (parts[0] || '').trim();
                      const right = (parts[1] || '').trim();
                      const hasCaption = !!right && !!left;
                      const url = hasCaption ? right : raw.trim();
                      const caption = hasCaption ? left : '';
                      const lower = url.toLowerCase();
                      const isVideo = /\.(mp4|webm|ogg)$/i.test(lower);
                      const isAudio = /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(lower);

                      return (
                        <div key={comment.id} className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-semibold">
                            {comment.userName.charAt(0)}
                          </div>
                          <div className="flex-1 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 px-3 py-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-[12px]">{comment.userName}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                              </span>
                            </div>
                            {caption && (
                              <p className="text-[11px] text-muted-foreground">{caption}</p>
                            )}
                            <div className="mt-1">
                              {isVideo ? (
                                <video src={url} controls className="w-full max-h-64 rounded-2xl" />
                              ) : isAudio ? (
                                <div className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-900/80 px-3 py-2 flex items-center gap-3">
                                  <button className="h-8 w-8 rounded-full bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900 flex items-center justify-center text-[10px] font-semibold">
                                    ▶
                                  </button>
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                    <div className="w-1/3 h-full bg-slate-500 dark:bg-slate-300" />
                                  </div>
                                  <audio src={url} controls className="hidden" />
                                </div>
                              ) : (
                                <img src={url} alt="Real life comment" className="w-full max-h-64 rounded-2xl object-cover" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={comment.id} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-semibold">
                          {comment.userName.charAt(0)}
                        </div>
                        <div className="flex-1 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[12px]">{comment.userName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-[12px] text-foreground">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Suggested / Up next area */}
            <aside className="space-y-3">
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/95 dark:bg-slate-900/95 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Up next</span>
                  <span className="text-[11px] text-muted-foreground">Layout shell only</span>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 p-1.5 cursor-default"
                    >
                      <div className="h-16 w-28 rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-28 rounded bg-slate-200/80 dark:bg-slate-700/80" />
                        <div className="h-2.5 w-16 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
