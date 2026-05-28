import { useEffect, useMemo, useRef, useState } from 'react';
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
  FileText,
  Lock,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from 'lucide-react';
import { usePostStore, type Post } from '@/store/postStore';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
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

type PostMediaItem = {
  type: 'image' | 'video';
  src: string;
};

type PostDocumentItem = {
  id: string;
  title: string;
  url: string;
  pages: string[];
  totalPages: number;
  previewPages: number;
};

function cleanString(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanString(item))
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => cleanString(item))
          .filter(Boolean);
      }
    } catch {
      // fall back below
    }

    if (value.includes(',')) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [value.trim()];
  }

  return [];
}

function normalizePostMedia(post: Post): PostMediaItem[] {
  const media: PostMediaItem[] = [];
  const seen = new Set<string>();

  const add = (type: 'image' | 'video', value: unknown) => {
    const src = cleanString(value);
    if (!src) return;

    const key = `${type}:${src}`;
    if (seen.has(key)) return;

    seen.add(key);
    media.push({ type, src });
  };

  const addMany = (type: 'image' | 'video', value: unknown) => {
    normalizeStringArray(value).forEach((src) => add(type, src));
  };

  addMany('image', (post as any).images);
  addMany('image', (post as any).image);

  addMany('video', (post as any).videos);
  addMany('video', (post as any).video);
  addMany('video', (post as any).videoUrl);

  if ((post as any).mediaType === 'video' || (post as any).media_type === 'video') {
    add('video', (post as any).mediaUrl || (post as any).media_url);
  }

  return media;
}

function normalizePostDocuments(post: Post): PostDocumentItem[] {
  const docs: PostDocumentItem[] = [];

  const addDoc = (raw: any, index: number) => {
    if (!raw) return;

    const pages = normalizeStringArray(
      raw.pages ||
        raw.documentPages ||
        raw.document_pages ||
        raw.pageImages ||
        raw.page_images
    );

    const url = cleanString(
      raw.url ||
        raw.documentUrl ||
        raw.document_url ||
        raw.fileUrl ||
        raw.file_url ||
        raw.mediaUrl ||
        raw.media_url
    );

    const title =
      cleanString(raw.title || raw.fileName || raw.file_name || raw.name) ||
      `Document ${index + 1}`;

    if (!url && pages.length === 0) return;

    const rawTotalPages = Number(
      raw.totalPages ||
        raw.total_pages ||
        raw.pageCount ||
        raw.page_count ||
        pages.length ||
        1
    );

    const totalPages = Math.max(1, Number.isFinite(rawTotalPages) ? rawTotalPages : 1);

    const rawPreviewPages = Number(
      raw.previewPages ||
        raw.preview_pages ||
        raw.unlockedPages ||
        raw.unlocked_pages ||
        raw.visiblePages ||
        raw.visible_pages ||
        Math.min(1, totalPages)
    );

    const previewPages = Math.max(
      1,
      Math.min(Number.isFinite(rawPreviewPages) ? rawPreviewPages : 1, totalPages)
    );

    docs.push({
      id: cleanString(raw.id) || `${post.id}-doc-${index}`,
      title,
      url,
      pages,
      totalPages,
      previewPages,
    });
  };

  const rawDocuments = (post as any).documents;

  if (Array.isArray(rawDocuments)) {
    rawDocuments.forEach((doc, index) => addDoc(doc, index));
  } else if (typeof rawDocuments === 'string' && rawDocuments.trim()) {
    try {
      const parsed = JSON.parse(rawDocuments);
      if (Array.isArray(parsed)) {
        parsed.forEach((doc, index) => addDoc(doc, index));
      }
    } catch {
      // ignore invalid document json
    }
  }

  const directDocumentUrl =
    (post as any).documentUrl ||
    (post as any).document_url ||
    (post as any).document ||
    (post as any).fileUrl ||
    (post as any).file_url;

  const directPages = normalizeStringArray(
    (post as any).documentPages ||
      (post as any).document_pages ||
      (post as any).pageImages ||
      (post as any).page_images
  );

  if (directDocumentUrl || directPages.length) {
    addDoc(
      {
        url: directDocumentUrl,
        title:
          (post as any).documentTitle ||
          (post as any).document_title ||
          (post as any).fileName ||
          (post as any).file_name ||
          'Document',
        pages: directPages,
        totalPages:
          (post as any).documentTotalPages ||
          (post as any).document_total_pages ||
          directPages.length ||
          1,
        previewPages:
          (post as any).documentPreviewPages ||
          (post as any).document_preview_pages ||
          (post as any).previewPages ||
          (post as any).preview_pages ||
          Math.min(1, directPages.length || 1),
      },
      docs.length
    );
  }

  return docs;
}

function playPaperFlipSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const duration = 0.18;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      const t = i / data.length;
      const fade = Math.pow(1 - t, 2);
      data[i] = (Math.random() * 2 - 1) * fade * 0.22;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;

    const gain = ctx.createGain();
    gain.gain.value = 0.35;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + duration);

    window.setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    }, 350);
  } catch {
    // browser may block audio until user interaction
  }
}

function DocumentMagazine({
  document,
  postId,
  canControl,
}: {
  document: PostDocumentItem;
  postId: string;
  canControl: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [localPreviewPages, setLocalPreviewPages] = useState(() => {
    try {
      const raw = localStorage.getItem(`facemex:doc_preview:${postId}:${document.id}`);
      const stored = raw ? Number(raw) : 0;
      if (stored > 0) return stored;
    } catch {
      // ignore
    }

    return document.previewPages;
  });

  const totalPages = Math.max(1, document.totalPages || document.pages.length || 1);

  const previewPages = Math.max(1, Math.min(localPreviewPages || 1, totalPages));

  const visiblePageCount = Math.min(
    previewPages,
    document.pages.length || previewPages
  );

  const lockedCount = Math.max(0, totalPages - previewPages);
  const hasPageImages = document.pages.length > 0;
  const currentSrc = hasPageImages ? document.pages[currentPage] : '';

  const goToPage = (nextPage: number, nextDirection: number) => {
    if (!hasPageImages) return;

    const safeNext = Math.max(0, Math.min(nextPage, visiblePageCount - 1));

    if (safeNext === currentPage) return;

    setDirection(nextDirection);
    setCurrentPage(safeNext);
    playPaperFlipSound();
  };

  const updatePreviewPages = (next: number) => {
    const safe = Math.max(1, Math.min(next, totalPages));
    setLocalPreviewPages(safe);

    try {
      localStorage.setItem(`facemex:doc_preview:${postId}:${document.id}`, String(safe));
    } catch {
      // ignore
    }

    if (currentPage >= safe) {
      setCurrentPage(Math.max(0, safe - 1));
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <FileText className="h-4 w-4" />
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{document.title}</p>
            <p className="text-xs text-white/50">
              Preview {previewPages} of {totalPages} page
              {totalPages === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {lockedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70">
            <Lock className="h-3 w-3" />
            {lockedCount} locked
          </span>
        )}
      </div>

      {hasPageImages ? (
        <div className="relative h-[360px] overflow-hidden bg-[#111827] sm:h-[520px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`${document.id}-${currentPage}-${previewPages}`}
              custom={direction}
              initial={{
                opacity: 0,
                rotateY: direction > 0 ? -42 : 42,
                x: direction > 0 ? 42 : -42,
                scale: 0.985,
              }}
              animate={{
                opacity: 1,
                rotateY: 0,
                x: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                rotateY: direction > 0 ? 42 : -42,
                x: direction > 0 ? -42 : 42,
                scale: 0.985,
              }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
            >
              <img
                src={currentSrc}
                alt={`${document.title} page ${currentPage + 1}`}
                className="h-full w-full object-contain"
                loading="lazy"
              />

              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-black/20 shadow-[0_0_30px_rgba(0,0,0,0.45)]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
            </motion.div>
          </AnimatePresence>

          <button
            type="button"
            onClick={() => goToPage(currentPage - 1, -1)}
            disabled={currentPage <= 0}
            className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1, 1)}
            disabled={currentPage >= visiblePageCount - 1}
            className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur">
            Page {currentPage + 1} / {visiblePageCount}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 bg-slate-900 px-5 py-10 text-center">
          <FileText className="h-10 w-10 text-white/50" />
          <div>
            <p className="font-semibold">{document.title}</p>
            <p className="mt-1 text-sm text-white/50">
              Document uploaded. Add page images to enable magazine flip preview.
            </p>
          </div>

          {document.url && (
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Open document
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-white/55">
          {lockedCount > 0
            ? 'The author locked the remaining pages.'
            : 'All pages are available.'}
        </div>

        {canControl && (
          <div className="flex items-center justify-between gap-2 rounded-full bg-white/10 p-1">
            <button
              type="button"
              onClick={() => updatePreviewPages(previewPages - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white disabled:opacity-30"
              disabled={previewPages <= 1}
              aria-label="Show fewer pages"
            >
              <Minus className="h-4 w-4" />
            </button>

            <span className="min-w-[120px] text-center text-xs text-white/80">
              Show {previewPages} page{previewPages === 1 ? '' : 's'}
            </span>

            <button
              type="button"
              onClick={() => updatePreviewPages(previewPages + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white disabled:opacity-30"
              disabled={previewPages >= totalPages}
              aria-label="Show more pages"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
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
  const [mediaRotation, setMediaRotation] = useState(0);
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

  const mediaItems = useMemo(() => normalizePostMedia(post), [post]);
  const documentItems = useMemo(() => normalizePostDocuments(post), [post]);

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
    (post as any)?.verified === true ||
    (post as any)?.userVerified === true ||
    (!!addons?.verified && post.userId === currentUserId);

  useEffect(() => {
    setPostDraft(post.content);
  }, [post.content]);

  useEffect(() => {
    if (mediaItems.length <= 1) return;

    const id = window.setInterval(() => {
      setMediaRotation((prev) => (prev + 1) % mediaItems.length);
    }, 5000);

    return () => window.clearInterval(id);
  }, [mediaItems.length]);

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

    if (
      t.startsWith('creator') ||
      t.startsWith('business') ||
      t.startsWith('exclusive')
    ) {
      return Infinity;
    }

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
    } catch {}
  };

  const getAudioLimitSeconds = (tierValue?: string | null) => {
    const t = (tierValue || '').toLowerCase();
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

      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        resolve(base64Audio);
      };

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
          const audioBlob = new Blob(audioChunksRef.current, {
            type: 'audio/webm',
          });

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
        const updated = next
          ? Array.from(new Set([...safe, post.id]))
          : safe.filter((id) => id !== post.id);

        localStorage.setItem('faceme_saved_posts_v1', JSON.stringify(updated));
      } catch {}

      return next;
    });
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/post/${post.id}`;
      const navAny =
        typeof navigator !== 'undefined' ? (navigator as any) : null;

      if (navAny && typeof navAny.share === 'function') {
        await navAny.share({
          title: 'FaceMeX',
          url,
        });
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

  const getRotatedMedia = () => {
    if (mediaItems.length <= 1) return mediaItems;

    return mediaItems.map((_, index) => {
      return mediaItems[(index + mediaRotation) % mediaItems.length];
    });
  };

  const renderMediaItem = (
    item: PostMediaItem,
    index: number,
    className = 'h-full w-full object-cover'
  ) => {
    if (item.type === 'video') {
      return (
        <video
          src={item.src}
          controls
          playsInline
          preload="metadata"
          className={className}
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
        />
      );
    }

    return (
      <img
        src={item.src}
        alt={`Post media ${index + 1}`}
        className={className}
        loading="lazy"
        onClick={() => openLightbox(item.src)}
      />
    );
  };

  const renderTwitterMediaFrame = () => {
    const media = getRotatedMedia();

    if (media.length === 0) return null;

    if (media.length === 1) {
      const item = media[0];

      return (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black">
          {renderMediaItem(
            item,
            0,
            'w-full max-h-[650px] object-cover cursor-pointer rounded-3xl'
          )}
        </div>
      );
    }

    if (media.length === 2) {
      return (
        <motion.div
          key={`media-2-${mediaRotation}`}
          initial={{ opacity: 0.92, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="relative grid h-[260px] sm:h-[420px] grid-cols-2 gap-1 overflow-hidden rounded-3xl border border-white/10 bg-black"
        >
          {media.slice(0, 2).map((item, index) => (
            <button
              key={`${item.src}-${index}`}
              type="button"
              className="relative h-full w-full overflow-hidden bg-black"
              onClick={() => item.type === 'image' && openLightbox(item.src)}
            >
              {renderMediaItem(item, index)}
            </button>
          ))}
        </motion.div>
      );
    }

    if (media.length === 3) {
      return (
        <motion.div
          key={`media-3-${mediaRotation}`}
          initial={{ opacity: 0.92, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="relative grid h-[320px] sm:h-[460px] grid-cols-2 gap-1 overflow-hidden rounded-3xl border border-white/10 bg-black"
        >
          <button
            type="button"
            className="relative h-full w-full overflow-hidden bg-black"
            onClick={() => media[0].type === 'image' && openLightbox(media[0].src)}
          >
            {renderMediaItem(media[0], 0)}
          </button>

          <div className="grid h-full grid-rows-2 gap-1">
            {media.slice(1, 3).map((item, index) => (
              <button
                key={`${item.src}-${index + 1}`}
                type="button"
                className="relative h-full w-full overflow-hidden bg-black"
                onClick={() => item.type === 'image' && openLightbox(item.src)}
              >
                {renderMediaItem(item, index + 1)}
              </button>
            ))}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={`media-4-${mediaRotation}`}
        initial={{ opacity: 0.92, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="relative grid h-[340px] sm:h-[480px] grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-3xl border border-white/10 bg-black"
      >
        {media.slice(0, 4).map((item, index) => {
          const extraCount = mediaItems.length - 4;
          const showMore = index === 3 && extraCount > 0;

          return (
            <button
              key={`${item.src}-${index}`}
              type="button"
              className="relative h-full w-full overflow-hidden bg-black"
              onClick={() => item.type === 'image' && openLightbox(item.src)}
            >
              {renderMediaItem(item, index)}

              {showMore && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-3xl font-bold text-white">
                  +{extraCount}
                </div>
              )}
            </button>
          );
        })}
      </motion.div>
    );
  };

  const commentCount = post.comments?.length || 0;

  const reactionType = post.isLiked
    ? ((post.reaction || 'like') as
        | 'love'
        | 'like'
        | 'haha'
        | 'wow'
        | 'sad'
        | 'angry')
    : undefined;

  const reactionClass = (() => {
    if (!post.isLiked) return '';

    switch (reactionType) {
      case 'love':
        return 'text-destructive';
      case 'like':
      case 'haha':
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
          <button
            type="button"
            className="flex items-center space-x-3 text-left"
            onClick={() => navigate(`/profile/${post.userId}`)}
          >
            <div className="relative">
              <Avatar>
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback>{displayName ? displayName.charAt(0) : 'U'}</AvatarFallback>
              </Avatar>

              {isAuthorVerified && (
                <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                  <CheckCircle className="h-3 w-3 text-primary" />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm md:text-base hover:underline">
                  {displayName}
                </p>

                {isAuthorVerified && (
                  <span className="text-[11px] text-muted-foreground">
                    Verified
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(post.timestamp, { addSuffix: true })}
              </p>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
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
                  <DropdownMenuItem onClick={() => acceptCollabInvite(post.id)}>
                    Accept invite
                  </DropdownMenuItem>
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
                  <DropdownMenuItem onClick={handleInviteCollaborator}>
                    Invite collaborator
                  </DropdownMenuItem>
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

          {renderTwitterMediaFrame()}

          {documentItems.length > 0 && (
            <div className="space-y-3">
              {documentItems.map((doc) => (
                <DocumentMagazine
                  key={doc.id}
                  document={doc}
                  postId={post.id}
                  canControl={isOwner}
                />
              ))}
            </div>
          )}

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
                    <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                      {post.likes || 0}
                    </span>
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

              <Button type="button" variant="ghost" size="sm" onClick={() => setShowComments((v) => !v)}>
                <span className="text-sm">Reply</span>
                <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                  {commentCount}
                </span>
              </Button>

              <Button type="button" variant="ghost" size="sm" onClick={handleShare}>
                <span className="text-sm">Share</span>
                <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                  {post.shares || 0}
                </span>
              </Button>

              <Button type="button" variant="ghost" size="sm" onClick={toggleSaved} className={saved ? 'text-foreground' : ''}>
                <Bookmark className="h-4 w-4 mr-1" />
                <span className="text-sm">{saved ? 'Saved' : 'Save'}</span>
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
              className="w-full rounded-full border border-fuchsia-400/30 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-cyan-400/10 shadow-[0_0_35px_rgba(168,85,247,0.35)] hover:shadow-[0_0_45px_rgba(34,211,238,0.45)] transition-all"
            >
              <span className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <AudioLines className={`h-3.5 w-3.5 text-purple-500 ${isRecording ? 'animate-pulse' : ''}`} />
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
              placeholder="Reply…"
              value={commentText}
              onFocus={() => undefined}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleComment();
                }
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

          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full space-y-4 pt-4 border-t border-border/60"
              >
                {(post.comments || []).map((comment) => {
                  const isVoice = comment.type === 'voice' || !!comment.voiceUrl;
                  const canDeleteComment = String(comment.userId || '') === myId || isOwner;

                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                        <AvatarFallback>
                          {comment.userName ? comment.userName.charAt(0) : 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 pl-3 border-l border-border/40">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {comment.userName}
                          </p>

                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                          </span>
                        </div>

                        <div className="mt-1 text-sm leading-relaxed text-foreground">
                          {isVoice && comment.voiceUrl ? (
                            <div className="mt-2 flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center shadow-sm">
                                <AudioLines className="h-4 w-4 text-purple-500" />
                              </div>

                              <audio
                                controls
                                controlsList="nodownload noplaybackrate"
                                preload="metadata"
                                className="h-8 w-full"
                                onContextMenu={(e) => e.preventDefault()}
                              >
                                <source src={comment.voiceUrl} type="audio/webm" />
                              </audio>
                            </div>
                          ) : (
                            <p>
                              {comment.content.replace(
                                /\[(REAL_LIFE|PRO COLLAB|PRO COLLAB INVITE|CREATOR_CONTENT)\s*/g,
                                ''
                              )}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleReplyToComment(comment.userName)}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <MessageCircle className="h-3 w-3" />
                            Reply
                          </button>

                          {canDeleteComment && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
