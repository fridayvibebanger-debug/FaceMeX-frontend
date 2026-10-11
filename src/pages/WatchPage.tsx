import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { useNavigate, useParams } from 'react-router-dom';
import { usePostStore } from '@/store/postStore';
import { useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Heart, MessageCircle, Share2, Sparkles } from 'lucide-react';

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { posts, loadPosts, likePost, sharePost } = usePostStore();

  useEffect(() => {
    if (!posts.length) {
      loadPosts().catch(() => {});
    }
  }, [posts.length, loadPosts]);

  const post = useMemo(() => posts.find((p) => p.id === (id || '')), [posts, id]);

  const mediaUrl = post?.images?.[0] || post?.image || post?.audio || '';
  const mediaExtension = mediaUrl.split('?')[0].split('.').pop()?.toLowerCase();
  const isVideoMedia = ['mp4', 'webm', 'ogg', 'mov'].includes(mediaExtension || '');
  const isAudioMedia = ['mp3', 'wav', 'm4a', 'aac', 'flac'].includes(mediaExtension || '');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(241,245,249,0.92))] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Navbar />
      <div className="flex pt-14 pb-16 md:pt-16 md:pb-0">
        <LeftSidebar />
        <main className="flex-1 px-3 py-4 sm:px-4 md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row">
            <section className="flex-1 rounded-[28px] border border-slate-200/80 bg-white/90 p-3 shadow-[0_24px_80px_-35px_rgba(15,23,42,0.4)] backdrop-blur md:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  Watch
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] bg-slate-950">
                {post ? (
                  mediaUrl ? (
                    isVideoMedia ? (
                      <video src={mediaUrl} controls className="h-[320px] w-full object-cover sm:h-[420px]" />
                    ) : isAudioMedia ? (
                      <div className="flex h-[320px] w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 px-6 text-center text-slate-200 sm:h-[420px]">
                        <div className="mb-3 rounded-full bg-white/10 p-3">
                          <Sparkles className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-medium">Audio clip</p>
                        <p className="mt-1 text-sm text-slate-400">This post contains an audio story. Tap play below.</p>
                      </div>
                    ) : (
                      <img src={mediaUrl} alt={post.content} className="h-[320px] w-full object-cover sm:h-[420px]" />
                    )
                  ) : (
                    <div className="flex h-[320px] w-full items-center justify-center bg-slate-900 text-sm text-slate-400 sm:h-[420px]">
                      No media for this post yet.
                    </div>
                  )
                ) : (
                  <div className="flex h-[320px] w-full items-center justify-center bg-slate-900 text-sm text-slate-400 sm:h-[420px]">
                    Loading watch experience...
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      FaceMeX AI mobile-style watch
                    </div>
                    <h1 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                      {post ? post.content : 'Loading watch content...'}
                    </h1>
                    {post && (
                      <p className="mt-1 text-sm text-slate-500">
                        {post.likes} likes • {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
                    {post ? 'Live now' : 'Preparing'}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!post) return;
                      likePost(post.id);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <Heart className="h-4 w-4" />
                    Like
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Comment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!post) return;
                      sharePost(post.id);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>

                {post && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 text-sm text-slate-600">
                    {post.hashtags.length > 0 ? `Trending with #${post.hashtags.slice(0, 3).join(' #')}` : 'This watch view is now tuned for a cleaner mobile-style experience.'}
                  </div>
                )}
              </div>
            </section>

            <aside className="w-full lg:max-w-[340px]">
              <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Comments</h2>
                  <span className="text-[11px] text-slate-500">Live thread</span>
                </div>

                {post && post.comments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    No comments yet. This space is ready for the mobile watch thread.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {post?.comments.map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800">{comment.userName}</span>
                          <span className="text-[11px] text-slate-500">
                            {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
