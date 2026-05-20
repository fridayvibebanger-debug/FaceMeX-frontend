import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Send,
  CheckCircle,
  Heart,
  Bookmark,
  MoreHorizontal,
  ThumbsUp,
  Laugh,
  Smile,
  Frown,
  Angry,
  PencilLine,
  Trash2,
  AudioLines,
  MessageCircle,
} from 'lucide-react';
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
  const {
    addComment,
    addVoiceComment,
    deleteComment,
    likePost,
    sharePost,
    editPost,
    deletePost,
    inviteCollaborator,
    acceptCollabInvite,
    rejectCollabInvite,
  } = usePostStore();

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

  const { addons, id: currentUserId, tier, name: currentUserName, avatar: currentUserAvatar } = useUserStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const myId = String(currentUserId || user?.id || '').trim();
  const isOwner = String(post.userId || '') === myId;

  const collaborators = Array.isArray((post as any).collaborators)
    ? ((post as any).collaborators as any[]).map(String)
    : [];

  const collabInvites = Array.isArray((post as any).collabInvites)
    ? ((post as any).collabInvites as any[]).map(String)
    : [];

  const isCollaborator = !!myId && collaborators.includes(myId);
  const hasInvite = !!myId && collabInvites.includes(myId);
  const canEdit = isOwner || isCollaborator;

  const displayName = post.userName || 'FaceMeX Member';
  const displayAvatar = post.userAvatar || '';

  const isAuthorVerified =
    (post as any)?.userVerified === true ||
    (!!addons?.verified && post.userId === currentUserId);

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
        carouselApi.scrollTo((selected + 1) % total);
      } catch {}
    }, 3500);

    return () => window.clearInterval(id);
  }, [carouselApi]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('faceme_saved_posts_v1');
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(Array.isArray(ids) ? ids.includes(post.id) : false);
    } catch {
      setSaved(false);
    }
  }, [post.id]);

  const getVoiceCommentDailyLimit = () => {
    const t = String((tier || user?.tier || '')).toLowerCase();

    if (t.startsWith('creator') || t.startsWith('business') || t.startsWith('exclusive')) return Infinity;
    if (t.startsWith('pro')) return 20;

    return 5;
  };

  const getVoiceCommentUsageKey = () => {
    const d = new Date();
    return `faceme:voice_comment_count:${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate()
    ).padStart(2, '0')}`;
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
      localStorage.setItem(key, String(getVoiceCommentCountToday() + 1));
    } catch {}
  };

  const getAudioLimitSeconds = (tier?: string | null) => {
    const t = (tier || '').toLowerCase();
    if (t.startsWith('creator')) return 5 * 60;
    return 30;
  };

  const clearRecordTimer = () => {
    if (recordIntervalRef.current !== null) {
      window.clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
  };

  const uploadVoiceComment = async (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Voice upload failed'));
      reader.readAsDataURL(blob);
    });
  };

  const stopVoiceRecording = async () => {
    if (!mediaRecorderRef.current || !audioStreamRef.current) return;

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current;
      const stream = audioStreamRef.current;

      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];

          const voiceUrl = await uploadVoiceComment(audioBlob);
          await addVoiceComment(post.id, voiceUrl);

          incrementVoiceCommentCountToday();
          setShowComments(true);
        } catch (error) {
          console.error('Voice comment failed:', error);
          alert('Voice comment failed. Please try again.');
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
          mediaRecorderRef.current = null;
          clearRecordTimer();
          setIsRecording(false);
          setRecordSeconds(0);
          resolve();
        }
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
          if (next >= limitSeconds) stopVoiceRecording();
          return next;
        });
      }, 1000);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied or failed', err);
      alert('Allow microphone access to record a voice note.');
    }
  };

  const openLightbox = (src: string) => {
    setLightboxSrc(src);
    setLightboxOpen(true);
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
      const navAny = typeof navigator !== 'undefined' ? (navigator as any) : null;

      if (navAny && typeof navAny.share === 'function') {
        await navAny.share({ title: 'FaceMeX', url });
      } else if (navAny?.clipboard?.writeText) {
        await navAny.clipboard.writeText(url);
      }
    } catch (error) {
      console.log(error);
    }

    sharePost(post.id);
  };

  const startEditPost = () => {
    if (!canEdit) return;
    setPostDraft(post.content);
    setEditingPost(true);
  };

  const saveEditPost = async () => {
    const next = postDraft.trim();
    if (!next || !canEdit) return;

    await editPost(post.id, next);
    setEditingPost(false);
  };

  const handleDeletePost = async () => {
    if (!isOwner) return;

    const ok = window.confirm('Delete this post?');
    if (!ok) return;

    await deletePost(post.id);
  };

  const handleInviteCollaborator = async () => {
    if (!isOwner) return;

    const inviteeId = window.prompt('Enter the user id to invite as collaborator');
    const next = String(inviteeId || '').trim();

    if (!next) return;

    await inviteCollaborator(post.id, next);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

    await addComment(post.id, commentText.trim());

    setCommentText('');
    setShowComments(true);
  };

  const handleDeleteComment = async (commentId: string) => {
    const ok = window.confirm('Delete this comment?');
    if (!ok) return;

    await deleteComment(post.id, commentId);
  };

  const handleReplyToComment = (commentUserName: string) => {
    setShowComments(true);
    setCommentText(`@${commentUserName} `);

    window.setTimeout(() => {
      replyInputRef.current?.focus();
    }, 0);
  };

  const commentCount = post.comments?.length || 0;

  const reactionType = post.isLiked
    ? ((post.reaction || 'like') as 'love' | 'like' | 'haha' | 'wow' | 'sad' | 'angry')
    : undefined;

  const reactionClass = (() => {
    if (!post.isLiked) return '';
    switch (reactionType) {
      case 'love':
      case 'angry':
        return 'text-destructive';
      case 'like':
      case 'haha':
      case 'wow':
        return 'text-primary';
      case 'sad':
        return 'text-muted-foreground';
      default:
        return 'text-primary';
    }
  })();

  const imgs =
    Array.isArray(post.images) && post.images.length > 0 ? post.images : post.image ? [post.image] : [];

  return (
    <motion.div
      className="mx-auto w-full max-w-[760px] px-0 sm:px-2 lg:px-0"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="mb-6 w-full overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.08)]">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pb-3 pt-5 sm:px-7 sm:pt-7">
          <button
            type="button"
            className="flex items-center gap-4 text-left"
            onClick={() => navigate(`/profile/${post.userId}`)}
          >
            <div className="relative">
              <Avatar className="h-16 w-16 bg-slate-100 text-xl sm:h-20 sm:w-20">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback className="bg-slate-100 text-slate-900">
                  {displayName ? displayName.charAt(0) : 'U'}
                </AvatarFallback>
              </Avatar>

              {isAuthorVerified && (
                <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                  <CheckCircle className="h-3 w-3 text-primary" />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="text-[20px] font-bold leading-tight text-slate-950 sm:text-[22px] hover:underline">
                  {displayName}
                </p>

                {isAuthorVerified && <span className="text-[11px] text-slate-500">Verified</span>}
              </div>

              <p className="mt-1 text-[15px] text-slate-500 sm:text-base">
                {formatDistanceToNow(post.timestamp, { addSuffix: true })}
              </p>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-500 hover:text-slate-900">
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={startEditPost}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {hasInvite && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => acceptCollabInvite(post.id)}>Accept invite</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => rejectCollabInvite(post.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    Reject invite
                  </DropdownMenuItem>
                </>
              )}

              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleInviteCollaborator}>Invite collaborator</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDeletePost} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-3 px-4 pb-4">
          {editingPost ? (
            <div className="space-y-2">
              <textarea
                className="w-full min-h-[92px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
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
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-950">
              {post.content.replace(/\[CREATOR_CONTENT\]/g, '')}
            </p>
          )}
        
          {post.hashtags && (
            <div className="mt-2 flex flex-wrap gap-1">
              {post.hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="cursor-pointer text-xs text-primary hover:underline"
                  onClick={() => navigate(`/hashtag/${tag.replace('#', '')}`)}
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}
        
          {imgs.length === 1 && (
            <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-black">
              <img
                src={imgs[0]}
                alt="Post image"
                className="max-h-[620px] w-full cursor-pointer rounded-3xl object-cover"
                onClick={() => openLightbox(imgs[0])}
              />
            </div>
          )}
        
          {imgs.length > 1 && (
            <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-black/20">
              <Carousel opts={{ loop: false }} setApi={(api) => setCarouselApi(api)}>
                <CarouselContent>
                  {imgs.slice(0, 5).map((src, idx) => (
                    <CarouselItem key={`${post.id}-img-${idx}`} className="basis-full">
                      <div className="relative aspect-[4/5] w-full bg-black">
                        <img
                          src={src}
                          alt={`Post image ${idx + 1}`}
                          className="absolute inset-0 h-full w-full cursor-pointer object-cover"
                          loading="lazy"
                          onClick={() => openLightbox(src)}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          )}
        
          <Dialog
            open={lightboxOpen}
            onOpenChange={(open) => {
              setLightboxOpen(open);
        
              if (!open) setLightboxSrc(null);
            }}
          >
            <DialogContent className="h-[92vh] w-[96vw] max-w-[96vw] border border-border/60 bg-background/95 p-0">
              <div className="flex h-full w-full items-center justify-center">
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500">
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
        
          <div className="pt-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="React"
                    className={`h-9 rounded-full px-2 text-sm font-semibold text-slate-950 hover:bg-slate-50 ${reactionClass}`}
                    onClick={() => likePost(post.id, (post.reaction || 'like') as any)}
                  >
                    React
        
                    <span className="ml-1 text-xs font-medium tabular-nums text-slate-500">
                      {post.likes || 0}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
        
                <DropdownMenuContent align="start" className="flex gap-1 rounded-2xl">
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
                onClick={() => setShowComments((v) => !v)}
                className="h-9 rounded-full px-2 text-sm font-semibold text-slate-950 hover:bg-slate-50"
              >
                Reply
        
                <span className="ml-1 text-xs font-medium tabular-nums text-slate-500">
                  {commentCount}
                </span>
              </Button>
        
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-9 rounded-full px-2 text-sm font-semibold text-slate-950 hover:bg-slate-50"
              >
                Share
        
                <span className="ml-1 text-xs font-medium tabular-nums text-slate-500">
                  {post.shares || 0}
                </span>
              </Button>
        
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSaved}
                className={`h-9 rounded-full px-2 text-sm font-semibold text-slate-950 hover:bg-slate-50 ${
                  saved ? 'text-slate-950' : ''
                }`}
              >
                <Bookmark className="mr-1 h-4 w-4" />
        
                {saved ? 'Saved' : 'Save'}
              </Button>
            </div>
        
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={toggleVoiceRecording}
              disabled={(() => {
                const l = getVoiceCommentDailyLimit();
        
                if (!Number.isFinite(l)) return false;
        
                return getVoiceCommentCountToday() >= l;
              })()}
              className="mt-3 h-11 w-full rounded-full border border-fuchsia-300/40 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-cyan-400/10 text-sm font-semibold text-slate-950"
            >
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-200/70">
                <AudioLines
                  className={`h-4 w-4 text-purple-600 ${isRecording ? 'animate-pulse' : ''}`}
                />
              </span>
        
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
        
          <div className="flex items-center gap-2 pt-3">
            <Input
              ref={replyInputRef}
              placeholder="Reply..."
              value={commentText}
              onFocus={() => undefined}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleComment();
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
        
            <Button
              size="icon"
              variant="ghost"
              onClick={handleComment}
              aria-label="Send reply"
              className="h-10 w-10 rounded-full text-slate-500 hover:text-slate-950"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
