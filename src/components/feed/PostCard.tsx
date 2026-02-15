import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, CheckCircle, Mic, Heart, Share2, Bookmark, MoreHorizontal, ThumbsUp, Laugh, Smile, Frown, Angry, PencilLine, Trash2, AudioLines } from 'lucide-react';
import { usePostStore, type Post } from '@/store/postStore';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const { addComment, likePost, sharePost, editPost, deletePost } = usePostStore();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingPost, setEditingPost] = useState(false);
  const [postDraft, setPostDraft] = useState(post.content);
  const [saved, setSaved] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const replyInputRef = useRef<HTMLInputElement | null>(null);
  const { addons, id: currentUserId, tier } = useUserStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const isOwner = String(post.userId || '') === String(currentUserId || user?.id || '');

  const getVoiceCommentDailyLimit = () => {
    const t = String((tier || user?.tier || '')).toLowerCase();
    if (t.startsWith('creator') || t.startsWith('business') || t.startsWith('exclusive')) return Infinity;
    if (t.startsWith('pro')) return 20;
    return 5;
  };

  const getVoiceCommentUsageKey = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `faceme:voice_comment_count:${yyyy}${mm}${dd}`;
  };

  const getVoiceCommentCountToday = () => {
    try {
      const raw = localStorage.getItem(getVoiceCommentUsageKey());
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  };

  const incrementVoiceCommentCountToday = () => {
    try {
      const key = getVoiceCommentUsageKey();
      const current = getVoiceCommentCountToday();
      localStorage.setItem(key, String(current + 1));
    } catch {
    }
  };

  useEffect(() => {
    setPostDraft(post.content);
  }, [post.content]);

  useEffect(() => {
    if (!carouselApi) return;
    const id = window.setInterval(() => {
      try {
        const total = carouselApi.scrollSnapList().length;
        if (total <= 1) return;
        const selected = carouselApi.selectedScrollSnap();
        const next = (selected + 1) % total;
        carouselApi.scrollTo(next);
      } catch {
      }
    }, 3500);
    return () => window.clearInterval(id);
  }, [carouselApi]);

  const openLightbox = (src: string) => {
    setLightboxSrc(src);
    setLightboxOpen(true);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('faceme_saved_posts_v1');
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(Array.isArray(ids) ? ids.includes(post.id) : false);
    } catch {
      setSaved(false);
    }
  }, [post.id]);

  const isAuthorVerified =
    (post as any)?.userVerified === true ||
    (!!addons?.verified && (post.userId === currentUserId || (currentUserId === '1' && post.userId === '1')));

  const getAudioLimitSeconds = (tier?: string | null) => {
    const t = (tier || '').toLowerCase();
    if (t.startsWith('creator')) return 5 * 60; // 5 minutes for Creator+
    return 30; // 30 seconds for free and other tiers
  };

  const stopVoiceRecording = async () => {
    if (!mediaRecorderRef.current || !audioStreamRef.current) return;
    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current;
      const stream = audioStreamRef.current;
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        const audioUrl = URL.createObjectURL(audioBlob);
        // Convert to base64 and add as voice comment
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          addComment(post.id, `[REAL_LIFE] ${base64Audio}`);
          incrementVoiceCommentCountToday();
          URL.revokeObjectURL(audioUrl);
        };
        reader.readAsDataURL(audioBlob);
        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
        mediaRecorderRef.current = null;
        clearRecordTimer();
        setIsRecording(false);
        resolve();
      };
      recorder.stop();
    });
  };

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      await stopVoiceRecording();
      return;
    }

    const limit = getVoiceCommentDailyLimit();
    const used = getVoiceCommentCountToday();
    if (Number.isFinite(limit) && used >= limit) {
      alert(`Daily limit reached. You can send ${limit} voice note comments per day on your plan.`);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setRecordSeconds(0);
      const limitSeconds = getAudioLimitSeconds(user?.tier as string | undefined);
      clearRecordTimer();
      recordIntervalRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => {
          const next = prev + 1;
          if (next >= limitSeconds) {
            stopVoiceRecording();
          }
          return next;
        });
      }, 1000);
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied or failed', err);
      alert('Unable to access microphone. Please allow mic permissions to record a voice note.');
    }
  };

  const clearRecordTimer = () => {
    if (recordIntervalRef.current !== null) {
      window.clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
  };

  const openCommentsAndFocus = () => {
    setShowComments(true);
    window.setTimeout(() => {
      replyInputRef.current?.focus();
    }, 0);
  };

  const toggleSaved = () => {
    setSaved((prev) => {
      const next = !prev;
      try {
        const raw = localStorage.getItem('faceme_saved_posts_v1');
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        const safe = Array.isArray(ids) ? ids : [];
        const updated = next ? Array.from(new Set([...safe, post.id])) : safe.filter((id) => id !== post.id);
        localStorage.setItem('faceme_saved_posts_v1', JSON.stringify(updated));
      } catch {}
      return next;
    });
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/post/${post.id}`;
      const navAny = (typeof navigator !== 'undefined' ? (navigator as any) : null) as any;
      if (navAny && typeof navAny.share === 'function') {
        await navAny.share({ title: 'FaceMeX', url });
      } else if (navAny?.clipboard?.writeText) {
        await navAny.clipboard.writeText(url);
      }
    } catch {}
    sharePost(post.id);
  };

  const startEditPost = () => {
    if (!isOwner) return;
    setPostDraft(post.content);
    setEditingPost(true);
  };

  const saveEditPost = async () => {
    const next = postDraft.trim();
    if (!next) return;
    if (!isOwner) return;
    await editPost(post.id, next);
    setEditingPost(false);
  };

  const handleDeletePost = async () => {
    if (!isOwner) return;
    const ok = window.confirm('Delete this post?');
    if (!ok) return;
    await deletePost(post.id);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await addComment(post.id, commentText.trim());
    setCommentText('');
  };

  const commentCount = post.comments?.length || 0;

  const reactionType = (post.isLiked ? (post.reaction || 'like') : undefined) as
    | 'love'
    | 'like'
    | 'haha'
    | 'wow'
    | 'sad'
    | 'angry'
    | undefined;

  const ReactionIcon = (() => {
    switch (reactionType) {
      case 'love':
        return Heart;
      case 'like':
        return ThumbsUp;
      case 'haha':
        return Laugh;
      case 'wow':
        return Smile;
      case 'sad':
        return Frown;
      case 'angry':
        return Angry;
      default:
        return Heart;
    }
  })();

  const reactionClass = (() => {
    if (!post.isLiked) return '';
    switch (reactionType) {
      case 'love':
        return 'text-destructive';
      case 'like':
        return 'text-primary';
      case 'haha':
        return 'text-primary';
      case 'wow':
        return 'text-primary';
      case 'sad':
        return 'text-muted-foreground';
      case 'angry':
        return 'text-destructive';
      default:
        return 'text-primary';
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mb-4 overflow-hidden rounded-2xl border bg-card">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 px-4 pt-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="flex items-center space-x-3 text-left"
              onClick={() => navigate(`/profile/${post.userId}`)}
            >
              <div className="relative">
                <Avatar>
                  <AvatarImage src={post.userAvatar} alt={post.userName} />
                  <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                {isAuthorVerified && (
                  <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                    <CheckCircle className="h-3 w-3 text-primary" />
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm md:text-base hover:underline">{post.userName}</p>
                  {isAuthorVerified && (
                    <span className="text-[11px] text-muted-foreground">Verified</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                </p>
              </div>
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner ? (
                <>
                  <DropdownMenuItem onClick={startEditPost}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDeletePost} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-3 px-4 pb-4">
          <div>
            {editingPost ? (
              <div className="space-y-2">
                <textarea
                  className="w-full min-h-[92px] rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-sm outline-none"
                  value={postDraft}
                  onChange={(e) => setPostDraft(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingPost(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEditPost}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {post.content.replace(/\[CREATOR_CONTENT\]/g, '')}
              </p>
            )}
            {post.hashtags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.hashtags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs text-primary hover:underline cursor-pointer"
                    onClick={() => navigate(`/hashtag/${tag.replace('#', '')}`)}
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {(() => {
            const imgs = (Array.isArray(post.images) && post.images.length > 0)
              ? post.images
              : (post.image ? [post.image] : []);

            if (imgs.length === 0) return null;

            if (imgs.length === 1) {
              return (
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={imgs[0]}
                    alt="Post image"
                    className="w-full h-auto object-cover cursor-pointer"
                    onClick={() => openLightbox(imgs[0])}
                  />
                </div>
              );
            }

            return (
              <div className="relative rounded-xl overflow-hidden border border-border/60">
                <Carousel opts={{ loop: false }} setApi={(api) => setCarouselApi(api)}>
                  <CarouselContent>
                    {imgs.slice(0, 5).map((src, idx) => (
                      <CarouselItem key={`${post.id}-img-${idx}`} className="basis-full">
                        <div className="relative w-full aspect-[4/5] bg-black">
                          <img
                            src={src}
                            alt={`Post image ${idx + 1}`}
                            className="absolute inset-0 h-full w-full object-cover cursor-pointer"
                            loading="lazy"
                            onClick={() => openLightbox(src)}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            );
          })()}

          <Dialog
            open={lightboxOpen}
            onOpenChange={(open) => {
              setLightboxOpen(open);
              if (!open) setLightboxSrc(null);
            }}
          >
            <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] p-0 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur border border-border/60">
              <div className="h-full w-full flex items-center justify-center">
                {lightboxSrc && (
                  <img
                    src={lightboxSrc}
                    alt="Full image"
                    className="max-h-[92vh] max-w-[96vw] object-contain"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>

          {post.audio && (
            <div className="rounded-2xl border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <AudioLines className="h-4 w-4" />
                </span>
                <div className="text-sm font-medium">Voice note</div>
              </div>
              <audio
                controls
                controlsList="nodownload noplaybackrate"
                className="w-full"
                src={post.audio}
                preload="metadata"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="React"
                    className={reactionClass}
                    onClick={() => likePost(post.id, (post.reaction || 'like') as any)}
                  >
                    <span className="text-sm">React</span>
                    <span className="ml-2 text-xs text-muted-foreground tabular-nums">{post.likes || 0}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="flex gap-1">
                  <DropdownMenuItem onClick={() => likePost(post.id, 'love')} className="px-2">
                    <Heart className="h-4 w-4 text-destructive" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => likePost(post.id, 'like')} className="px-2">
                    <ThumbsUp className="h-4 w-4 text-primary" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => likePost(post.id, 'haha')} className="px-2">
                    <Laugh className="h-4 w-4 text-primary" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => likePost(post.id, 'wow')} className="px-2">
                    <Smile className="h-4 w-4 text-primary" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => likePost(post.id, 'sad')} className="px-2">
                    <Frown className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => likePost(post.id, 'angry')} className="px-2">
                    <Angry className="h-4 w-4 text-destructive" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Replies"
                onClick={() => setShowComments((v) => !v)}
              >
                <span className="text-sm">Reply</span>
                <span className="ml-2 text-xs text-muted-foreground tabular-nums">{commentCount}</span>
              </Button>

              <Button type="button" variant="ghost" size="sm" aria-label="Share" onClick={handleShare}>
                <span className="text-sm">Share</span>
                <span className="ml-2 text-xs text-muted-foreground tabular-nums">{post.shares || 0}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Bookmark"
                onClick={toggleSaved}
                className={saved ? 'text-foreground' : ''}
              >
                <span className="text-sm">{saved ? 'Saved' : 'Save'}</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                size="sm"
                variant={isRecording ? 'default' : 'ghost'}
                onClick={toggleVoiceRecording}
                disabled={(() => {
                  const l = getVoiceCommentDailyLimit();
                  if (!Number.isFinite(l)) return false;
                  return getVoiceCommentCountToday() >= l;
                })()}
                className={isRecording ? '' : 'text-muted-foreground hover:text-foreground'}
              >
                <Mic className={`h-3.5 w-3.5 mr-1 ${isRecording ? 'animate-pulse' : ''}`} />
                {isRecording
                  ? `${recordSeconds}s`
                  : (() => {
                      const l = getVoiceCommentDailyLimit();
                      if (!Number.isFinite(l)) return 'Voice';
                      const used = getVoiceCommentCountToday();
                      const remaining = Math.max(0, l - used);
                      return `Voice (${remaining})`;
                    })()}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3">
            <Input
              ref={replyInputRef}
              placeholder="Reply…"
              value={commentText}
              onFocus={() => {
                if (!showComments) openCommentsAndFocus();
              }}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleComment();
              }}
              className="h-10 rounded-2xl bg-muted/30 border-border/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleComment}
              aria-label="Send reply"
              className="text-muted-foreground hover:text-foreground"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Comments Section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full space-y-4 pt-4 border-t border-border/60"
              >
                {post.comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                      <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 pl-3 border-l border-border/40">
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-medium text-foreground">{comment.userName}</p>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                        </span>
                      </div>

                      <div className="mt-1 text-sm leading-relaxed text-foreground">
                        {comment.content.startsWith('[REAL_LIFE]') && comment.content.includes('base64') ? (
                          <audio controls className="w-full">
                            <source src={comment.content.replace('[REAL_LIFE] ', '')} type="audio/webm" />
                            Your browser does not support the audio element.
                          </audio>
                        ) : (
                          <p>
                            {comment.content.replace(/\[(REAL_LIFE|PRO COLLAB|PRO COLLAB INVITE|CREATOR_CONTENT)\s*/g, '')}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
