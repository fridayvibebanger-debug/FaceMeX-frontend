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
  ShieldCheck,
  Briefcase,
  CalendarDays,
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

const AI_CV_ROUTE = '/ai-resume';
const CAREER_WORKSPACE_ROUTE = '/career-workspace';

function cleanString(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => cleanString(item)).filter(Boolean);
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

    if (typeof raw === 'string') {
      const cleanUrl = cleanString(raw);
      if (!cleanUrl) return;

      docs.push({
        id: `${post.id}-doc-${index}`,
        title: `Document ${index + 1}`,
        url: cleanUrl,
        pages: [],
        totalPages: 1,
        previewPages: 1,
      });

      return;
    }

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

    const totalPages = Math.max(
      1,
      Number.isFinite(rawTotalPages) ? rawTotalPages : 1
    );

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
      Math.min(
        Number.isFinite(rawPreviewPages) ? rawPreviewPages : 1,
        totalPages
      )
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
      } else {
        addDoc(parsed, 0);
      }
    } catch {
      addDoc(rawDocuments, 0);
    }
  }

  if (docs.length === 0) {
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
  }

  const unique = new Map<string, PostDocumentItem>();

  docs.forEach((doc, index) => {
    const url = cleanString(doc.url);
    const title = cleanString(doc.title) || `Document ${index + 1}`;
    const key = url || title.toLowerCase();

    if (!unique.has(key)) {
      unique.set(key, {
        ...doc,
        id: doc.id || `${post.id}-doc-${index}`,
        title,
        url,
        pages: Array.isArray(doc.pages) ? doc.pages : [],
        totalPages: Math.max(1, Number(doc.totalPages) || 1),
        previewPages: Math.max(
          1,
          Math.min(Number(doc.previewPages) || 1, Number(doc.totalPages) || 1)
        ),
      });
    }
  });

  return Array.from(unique.values()).slice(0, 1);
}

function playPaperFlipSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const duration = 0.16;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      const t = i / data.length;
      const fade = Math.pow(1 - t, 2);
      data[i] = (Math.random() * 2 - 1) * fade * 0.18;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;

    const gain = ctx.createGain();
    gain.gain.value = 0.25;

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
    }, 320);
  } catch {
    // browser may block audio until user interaction
  }
}

function DocumentMagazine({
  document,
  postId,
  canControl,
  onOpenGallery,
}: {
  document: PostDocumentItem;
  postId: string;
  canControl: boolean;
  onOpenGallery: (items: string[], startIndex?: number) => void;
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
  const visiblePageCount = Math.min(previewPages, document.pages.length || previewPages);
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
    <div className="overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-sm">
      {hasPageImages ? (
        <>
          <button
            type="button"
            onClick={() => onOpenGallery(document.pages, currentPage)}
            className="relative block h-[280px] w-full overflow-hidden bg-white sm:h-[420px]"
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`${document.id}-${currentPage}-${previewPages}`}
                custom={direction}
                initial={{
                  opacity: 0,
                  rotateY: direction > 0 ? -24 : 24,
                  x: direction > 0 ? 18 : -18,
                  scale: 0.99,
                }}
                animate={{ opacity: 1, rotateY: 0, x: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  rotateY: direction > 0 ? 24 : -24,
                  x: direction > 0 ? -18 : 18,
                  scale: 0.99,
                }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
              >
                <img
                  src={currentSrc}
                  alt={`${document.title} page ${currentPage + 1}`}
                  className="h-full w-full bg-white object-contain"
                  loading="lazy"
                />
              </motion.div>
            </AnimatePresence>

            <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {currentPage + 1}/{visiblePageCount}
            </div>
          </button>

          {visiblePageCount > 1 && (
            <>
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1, -1)}
                disabled={currentPage <= 0}
                className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur disabled:opacity-30 sm:inline-flex"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1, 1)}
                disabled={currentPage >= visiblePageCount - 1}
                className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur disabled:opacity-30 sm:inline-flex"
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onOpenGallery(document.pages, 0)}
            className="flex h-12 w-full items-center justify-center gap-2 bg-slate-950 text-sm font-bold text-white"
          >
            <FileText className="h-4 w-4" />
            View {document.pages.length || totalPages} document images
          </button>
        </>
      ) : (
        <div className="flex min-h-[170px] flex-col items-center justify-center gap-3 bg-muted/30 px-5 py-8 text-center">
          <FileText className="h-9 w-9 text-muted-foreground" />
          <div>
            <p className="font-semibold">{document.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Document uploaded. Add page images to enable preview.
            </p>
          </div>

          {document.url && (
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Open document
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="truncate">
          {lockedCount > 0 ? `${lockedCount} page${lockedCount === 1 ? '' : 's'} locked` : 'All pages available'}
        </span>

        {canControl && (
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => updatePreviewPages(previewPages - 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background disabled:opacity-30"
              disabled={previewPages <= 1}
              aria-label="Show fewer pages"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            <span className="min-w-[54px] text-center text-[11px]">
              {previewPages}/{totalPages}
            </span>

            <button
              type="button"
              onClick={() => updatePreviewPages(previewPages + 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background disabled:opacity-30"
              disabled={previewPages >= totalPages}
              aria-label="Show more pages"
            >
              <Plus className="h-3.5 w-3.5" />
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
  const [replyOpen, setReplyOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingPost, setEditingPost] = useState(false);
  const [postDraft, setPostDraft] = useState(post.content);
  const [saved, setSaved] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [mediaRotation, setMediaRotation] = useState(0);
  const [expandedPost, setExpandedPost] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const lightboxSrc = lightboxItems[lightboxIndex] || null;

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

  const cleanPostContent = useMemo(() => {
    return String(post.content || '')
      .replace(/\[CREATOR_CONTENT\]/g, '')
      .trim();
  }, [post.content]);

  const shouldCollapsePost =
    cleanPostContent.length > 280 || cleanPostContent.split('\n').length > 5;

  const previewPostContent =
    !expandedPost && shouldCollapsePost
      ? `${cleanPostContent.slice(0, 280).trim()}...`
      : cleanPostContent;

  const isOpportunityPost =
    /(job|jobs|vacancy|vacancies|learnership|internship|opportunity|apply|cv|closing date|assessment|hiring|career)/i.test(
      cleanPostContent
    ) || documentItems.length > 0;

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
    } catch {
      // ignore
    }
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

  const openLightbox = (items: string[] | string, startIndex = 0) => {
    const gallery = Array.isArray(items)
      ? items.filter(Boolean)
      : [items].filter(Boolean);

    if (!gallery.length) return;

    const safeIndex = Math.max(0, Math.min(startIndex, gallery.length - 1));

    setLightboxItems(gallery);
    setLightboxIndex(safeIndex);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxItems([]);
    setLightboxIndex(0);
  };

  const goPrevLightbox = () => {
    setLightboxIndex((prev) => (prev <= 0 ? lightboxItems.length - 1 : prev - 1));
  };

  const goNextLightbox = () => {
    setLightboxIndex((prev) => (prev >= lightboxItems.length - 1 ? 0 : prev + 1));
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
      } catch {
        // ignore
      }

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
    setReplyOpen(true);
    setShowComments(true);
    setCommentText(`@${commentUserName} `);

    window.setTimeout(() => {
      replyInputRef.current?.focus();
    }, 50);
  };

  const getRotatedMedia = () => {
    if (mediaItems.length <= 1) return mediaItems;

    return mediaItems.map((_, index) => {
      return mediaItems[(index + mediaRotation) % mediaItems.length];
    });
  };

  const getImageGallery = () => {
    return getRotatedMedia()
      .filter((media) => media.type === 'image')
      .map((media) => media.src);
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
        onClick={() => {
          const imageGallery = getImageGallery();
          const startIndex = Math.max(0, imageGallery.indexOf(item.src));
          openLightbox(imageGallery.length ? imageGallery : item.src, startIndex);
        }}
      />
    );
  };

  const renderTwitterMediaFrame = () => {
    const media = getRotatedMedia();

    if (media.length === 0) return null;

    if (media.length === 1) {
      const item = media[0];

      return (
        <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-black">
          {renderMediaItem(
            item,
            0,
            'w-full max-h-[520px] object-cover cursor-pointer rounded-[28px]'
          )}
        </div>
      );
    }

    if (media.length === 2) {
      return (
        <motion.div
          key={`media-2-${mediaRotation}`}
          initial={{ opacity: 0.92, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="relative grid h-[230px] grid-cols-2 gap-1 overflow-hidden rounded-[28px] border border-border/70 bg-black sm:h-[380px]"
        >
          {media.slice(0, 2).map((item, index) => (
            <button
              key={`${item.src}-${index}`}
              type="button"
              className="relative h-full w-full overflow-hidden bg-black"
              onClick={() => {
                if (item.type !== 'image') return;
                const imageGallery = getImageGallery();
                openLightbox(imageGallery, Math.max(0, imageGallery.indexOf(item.src)));
              }}
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
          initial={{ opacity: 0.92, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="relative grid h-[280px] grid-cols-2 gap-1 overflow-hidden rounded-[28px] border border-border/70 bg-black sm:h-[420px]"
        >
          <button
            type="button"
            className="relative h-full w-full overflow-hidden bg-black"
            onClick={() => {
              if (media[0].type !== 'image') return;
              const imageGallery = getImageGallery();
              openLightbox(imageGallery, Math.max(0, imageGallery.indexOf(media[0].src)));
            }}
          >
            {renderMediaItem(media[0], 0)}
          </button>

          <div className="grid h-full grid-rows-2 gap-1">
            {media.slice(1, 3).map((item, index) => (
              <button
                key={`${item.src}-${index + 1}`}
                type="button"
                className="relative h-full w-full overflow-hidden bg-black"
                onClick={() => {
                  if (item.type !== 'image') return;
                  const imageGallery = getImageGallery();
                  openLightbox(imageGallery, Math.max(0, imageGallery.indexOf(item.src)));
                }}
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
        initial={{ opacity: 0.92, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="relative grid h-[300px] grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-[28px] border border-border/70 bg-black sm:h-[430px]"
      >
        {media.slice(0, 4).map((item, index) => {
          const extraCount = mediaItems.length - 4;
          const showMore = index === 3 && extraCount > 0;

          return (
            <button
              key={`${item.src}-${index}`}
              type="button"
              className="relative h-full w-full overflow-hidden bg-black"
              onClick={() => {
                if (item.type !== 'image') return;
                const imageGallery = getImageGallery();
                openLightbox(imageGallery, Math.max(0, imageGallery.indexOf(item.src)));
              }}
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
    ? ((post.reaction || 'like') as 'love' | 'like' | 'haha' | 'wow' | 'sad' | 'angry')
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

  const actionButtonClass =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-semibold shadow-sm hover:bg-muted/50 active:scale-[0.98]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="mb-3 overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 pb-2 pt-4">
          <button
            type="button"
            className="flex min-w-0 items-center space-x-3 text-left"
            onClick={() => navigate(`/profile/${post.userId}`)}
          >
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback>{displayName ? displayName.charAt(0) : 'U'}</AvatarFallback>
              </Avatar>

              {isAuthorVerified && (
                <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                  <CheckCircle className="h-3 w-3 text-primary" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-bold hover:underline md:text-base">
                  {displayName}
                </p>

                {isAuthorVerified && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">Verified</span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(post.timestamp, { addSuffix: true })}
              </p>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
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
                className="min-h-[92px] w-full rounded-2xl border border-border/60 bg-muted/20 px-3 py-2 text-sm outline-none"
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
          ) : cleanPostContent ? (
            <div className="space-y-1">
              <p className="whitespace-pre-wrap text-[15px] leading-6 text-foreground">
                {previewPostContent}
              </p>

              {shouldCollapsePost && (
                <button
                  type="button"
                  onClick={() => setExpandedPost((v) => !v)}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  {expandedPost ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          ) : null}

          {post.hashtags && (
            <div className="mt-1 flex flex-wrap gap-1">
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

          {renderTwitterMediaFrame()}

          {documentItems.length > 0 && (
            <div className="space-y-3">
              {documentItems.map((doc) => (
                <div key={doc.id} className="relative">
                  <DocumentMagazine
                    document={doc}
                    postId={post.id}
                    canControl={isOwner}
                    onOpenGallery={openLightbox}
                  />
                </div>
              ))}
            </div>
          )}

          {isOpportunityPost && (
            <div className="flex gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => navigate(AI_CV_ROUTE)} className={actionButtonClass}>
                <FileText className="h-3.5 w-3.5" />
                Create CV
              </button>

              <button type="button" onClick={() => navigate(CAREER_WORKSPACE_ROUTE)} className={actionButtonClass}>
                <PencilLine className="h-3.5 w-3.5" />
                Apply message
              </button>

              <button type="button" onClick={() => navigate(CAREER_WORKSPACE_ROUTE)} className={actionButtonClass}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Check job
              </button>

              <button type="button" onClick={toggleSaved} className={actionButtonClass}>
                <CalendarDays className="h-3.5 w-3.5" />
                Save deadline
              </button>
            </div>
          )}

          {isOpportunityPost && (
            <div className="flex items-start gap-2 rounded-2xl bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Safety note: apply through official contacts only. Do not pay anyone for a job or learnership.</span>
            </div>
          )}

          <Dialog
            open={lightboxOpen}
            onOpenChange={(open) => {
              if (!open) closeLightbox();
              else setLightboxOpen(true);
            }}
          >
            <DialogContent className="h-[92vh] w-[96vw] max-w-[96vw] border border-white/10 bg-black/95 p-0">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
                {lightboxSrc && (
                  <img
                    src={lightboxSrc}
                    alt={`Image ${lightboxIndex + 1}`}
                    className="max-h-[92vh] max-w-[96vw] object-contain"
                  />
                )}

                {lightboxItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrevLightbox}
                      className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>

                    <button
                      type="button"
                      onClick={goNextLightbox}
                      className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                      {lightboxIndex + 1} / {lightboxItems.length}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {post.audio && (
            <div className="rounded-2xl border bg-background p-3">
              <div className="mb-2 flex items-center gap-2">
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

          <div className="border-t border-border/60 pt-2">
            <div className="flex items-center justify-between gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="React"
                    className={`h-9 rounded-full px-2 text-sm font-semibold ${reactionClass}`}
                    onClick={() => likePost(post.id, (post.reaction || 'like') as any)}
                  >
                    React
                    <span className="ml-1 text-xs text-muted-foreground tabular-nums">{post.likes || 0}</span>
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
                className="h-9 rounded-full px-2 text-sm font-semibold"
                onClick={() => {
                  setReplyOpen((v) => !v);
                  setShowComments(true);
                  window.setTimeout(() => replyInputRef.current?.focus(), 50);
                }}
              >
                Reply
                <span className="ml-1 text-xs text-muted-foreground tabular-nums">{commentCount}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-full px-2 text-sm font-semibold"
                onClick={handleShare}
              >
                Share
                <span className="ml-1 text-xs text-muted-foreground tabular-nums">{post.shares || 0}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSaved}
                className={`h-9 rounded-full px-2 text-sm font-semibold ${saved ? 'text-foreground' : ''}`}
              >
                <Bookmark className="mr-1 h-4 w-4" />
                {saved ? 'Saved' : 'Save'}
              </Button>

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
                className="hidden h-9 rounded-full border px-3 text-xs font-semibold text-muted-foreground sm:inline-flex"
              >
                <AudioLines className={`mr-1.5 h-3.5 w-3.5 ${isRecording ? 'animate-pulse text-red-500' : ''}`} />
                {isRecording ? `${recordSeconds}s` : 'Voice'}
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
              className="mt-2 h-9 w-full rounded-full border text-xs font-semibold text-muted-foreground sm:hidden"
            >
              <AudioLines className={`mr-1.5 h-3.5 w-3.5 ${isRecording ? 'animate-pulse text-red-500' : ''}`} />
              {isRecording ? `${recordSeconds}s` : 'Voice reply'}
            </Button>
          </div>

          {replyOpen && (
            <div className="flex items-center gap-2 pt-1">
              <Input
                ref={replyInputRef}
                placeholder="Post your reply"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleComment();
                  }
                }}
                className="h-10 rounded-full border-border/60 bg-muted/30 focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              <Button
                size="icon"
                variant="ghost"
                onClick={handleComment}
                aria-label="Send reply"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          <AnimatePresence>
            {showComments && commentCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full space-y-4 border-t border-border/60 pt-4"
              >
                {(post.comments || []).map((comment) => {
                  const isVoice = comment.type === 'voice' || !!comment.voiceUrl;
                  const canDeleteComment = String(comment.userId || '') === myId || isOwner;

                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3"
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                        <AvatarFallback>
                          {comment.userName ? comment.userName.charAt(0) : 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 border-l border-border/40 pl-3">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="text-sm font-medium text-foreground">{comment.userName}</p>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                          </span>
                        </div>

                        <div className="mt-1 text-sm leading-relaxed text-foreground">
                          {isVoice && comment.voiceUrl ? (
                            <div className="mt-2 flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 shadow-sm">
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
                            <p className="break-words">
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
