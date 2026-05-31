import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
  Unlock,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UsersRound,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
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

type CollaboratorProfile = {
  id: string;
  name: string;
  avatar: string;
  verified?: boolean;
};

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
      // continue below
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

function getSafeDate(value: unknown) {
  const raw = value || new Date().toISOString();
  const date = raw instanceof Date ? raw : new Date(String(raw));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getPostDate(post: Post) {
  return getSafeDate((post as any).timestamp || (post as any).createdAt || (post as any).created_at);
}

function getCommentDate(comment: any) {
  return getSafeDate(comment?.timestamp || comment?.createdAt || comment?.created_at);
}

function getCommentText(comment: any) {
  return String(comment?.content || comment?.text || '')
    .replace(/\[(REAL_LIFE|PRO COLLAB|PRO COLLAB INVITE|CREATOR_CONTENT)\s*/g, '')
    .trim();
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
        pages: Array.isArray(doc.pages) ? doc.pages.filter(Boolean) : [],
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

function getCleanPostContent(content: string) {
  return String(content || '')
    .replace(/\[CREATOR_CONTENT\]/g, '')
    .trim();
}

function clampStyle(lines: number): CSSProperties {
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}

function getInitial(value: string) {
  return cleanString(value).charAt(0).toUpperCase() || 'U';
}

function normalizeProfile(raw: any, fallbackId: string, index: number): CollaboratorProfile {
  if (typeof raw === 'string') {
    return {
      id: raw,
      name: raw.length > 18 ? `Collaborator ${index + 1}` : raw,
      avatar: '',
      verified: false,
    };
  }

  const id =
    cleanString(raw?.id) ||
    cleanString(raw?._id) ||
    cleanString(raw?.userId) ||
    cleanString(raw?.externalId) ||
    fallbackId;

  const name =
    cleanString(raw?.name) ||
    cleanString(raw?.userName) ||
    cleanString(raw?.fullName) ||
    cleanString(raw?.username) ||
    `Collaborator ${index + 1}`;

  const avatar =
    cleanString(raw?.avatar) ||
    cleanString(raw?.userAvatar) ||
    cleanString(raw?.avatar_url) ||
    '';

  const verified =
    raw?.verified === true ||
    raw?.userVerified === true ||
    raw?.isVerified === true ||
    raw?.is_verified === true;

  return {
    id,
    name,
    avatar,
    verified,
  };
}

function normalizeCollaboratorProfiles(post: Post): CollaboratorProfile[] {
  const rawProfiles =
    (post as any).collaboratorProfiles ||
    (post as any).collaborator_profiles ||
    (post as any).collabProfiles ||
    (post as any).collab_profiles ||
    [];

  const rawCollaborators = (post as any).collaborators || [];

  const source =
    Array.isArray(rawProfiles) && rawProfiles.length
      ? rawProfiles
      : Array.isArray(rawCollaborators)
        ? rawCollaborators
        : [];

  const seen = new Set<string>();

  return source
    .map((item: any, index: number) => normalizeProfile(item, `${post.id}-collab-${index}`, index))
    .filter((profile: CollaboratorProfile) => {
      if (!profile.id) return false;
      if (seen.has(profile.id)) return false;
      seen.add(profile.id);
      return true;
    })
    .slice(0, 4);
}

function normalizePendingCollabRequests(post: Post): CollaboratorProfile[] {
  const raw =
    (post as any).collabInvites ||
    (post as any).collab_invites ||
    (post as any).collaborationRequests ||
    (post as any).collaboration_requests ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item: any, index: number) => normalizeProfile(item, `request-${index}`, index))
    .slice(0, 10);
}

function getMyIdentityCodes(user: any, userStoreId: string) {
  const ids = new Set<string>();

  const push = (value: unknown) => {
    const v = cleanString(value);
    if (v) ids.add(v);
  };

  push(userStoreId);
  push(user?.id);
  push(user?._id);
  push(user?.externalId);

  if (typeof window !== 'undefined') {
    push(window.localStorage.getItem('faceme_user_id'));
    push(window.localStorage.getItem('facemex_user_id'));
  }

  return Array.from(ids);
}

function idsMatch(a: unknown, b: unknown) {
  const aa = cleanString(a);
  const bb = cleanString(b);
  if (!aa || !bb) return false;
  return aa === bb;
}

function getMyCollabCode(name: string, id: string) {
  const cleanName = cleanString(name).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
  const shortName = cleanName || 'User';
  const last4 =
    cleanString(id).replace(/[^a-zA-Z0-9]/g, '').slice(-4) ||
    String(Math.floor(1000 + Math.random() * 9000));

  return `${shortName}${last4}`;
}

function CollaboratorCluster({ profiles }: { profiles: CollaboratorProfile[] }) {
  if (!profiles.length) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {profiles.slice(0, 4).map((profile) => (
          <div
            key={profile.id}
            className="relative h-5 w-5 overflow-hidden rounded-full border border-background bg-muted shadow-sm"
            title={profile.name}
          >
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-muted-foreground">
                {getInitial(profile.name)}
              </div>
            )}
          </div>
        ))}
      </div>

      <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
        <UsersRound className="h-3 w-3" />
        Collab
      </span>
    </div>
  );
}

function DocumentPreview({
  document,
  downloadsLocked,
  canControl,
  onToggleLock,
  onOpenPages,
}: {
  document: PostDocumentItem;
  downloadsLocked: boolean;
  canControl: boolean;
  onToggleLock: () => void;
  onOpenPages: (pages: string[], startIndex: number) => void;
}) {
  const firstPage = document.pages[0] || '';
  const imageCount = document.pages.filter(Boolean).length;

  return (
    <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background shadow-sm">
      {firstPage ? (
        <button
          type="button"
          onClick={() => onOpenPages(document.pages, 0)}
          className="relative block w-full bg-white"
          onContextMenu={(e) => {
            if (downloadsLocked) e.preventDefault();
          }}
        >
          <img
            src={firstPage}
            alt={`${document.title} preview`}
            className="h-[250px] w-full object-contain sm:h-[340px]"
            loading="lazy"
            draggable={!downloadsLocked}
          />

          {imageCount > 1 && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {imageCount} images
            </span>
          )}

          {downloadsLocked && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <Lock className="h-3 w-3" />
              Downloads locked
            </span>
          )}
        </button>
      ) : (
        <div className="flex h-[170px] flex-col items-center justify-center gap-2 bg-muted/40 px-4 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold">{document.title}</p>
          <p className="text-xs text-muted-foreground">Document uploaded</p>
        </div>
      )}

      {canControl && (
        <button
          type="button"
          onClick={onToggleLock}
          className="flex h-9 w-full items-center justify-center gap-2 border-t border-border/70 text-[12px] font-semibold text-muted-foreground hover:text-foreground"
        >
          {downloadsLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {downloadsLocked ? 'Unlock image downloads' : 'Lock image downloads'}
        </button>
      )}
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
  const [expandedPost, setExpandedPost] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const [downloadsLocked, setDownloadsLocked] = useState(false);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const replyInputRef = useRef<HTMLInputElement | null>(null);

  const { addons, id: currentUserId, tier } = useUserStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const myIds = useMemo(() => getMyIdentityCodes(user, currentUserId || ''), [user, currentUserId]);

  const ownerIds = useMemo(
    () => [
      cleanString(post.userId),
      cleanString((post as any).authorId),
      cleanString((post as any).ownerId),
      cleanString((post as any).user?._id),
      cleanString((post as any).user?.id),
      cleanString((post as any).externalId),
    ].filter(Boolean),
    [post]
  );

  const isOwner = useMemo(() => {
    return ownerIds.some((ownerId) => myIds.some((myId) => idsMatch(ownerId, myId)));
  }, [ownerIds, myIds]);

  const mediaItems = useMemo(() => normalizePostMedia(post), [post]);
  const documentItems = useMemo(() => normalizePostDocuments(post), [post]);
  const collaboratorProfiles = useMemo(() => normalizeCollaboratorProfiles(post), [post]);
  const pendingCollabRequests = useMemo(() => normalizePendingCollabRequests(post), [post]);

  const cleanPostContent = useMemo(() => getCleanPostContent(post.content), [post.content]);

  const hasMediaOrDocs = mediaItems.length > 0 || documentItems.length > 0;
  const collapseLines = hasMediaOrDocs ? 2 : 10;

  const shouldCollapsePost = hasMediaOrDocs
    ? cleanPostContent.length > 95 || cleanPostContent.split('\n').length > 2
    : cleanPostContent.length > 650 || cleanPostContent.split('\n').length > 10;

  const lightboxSrc = lightboxItems[lightboxIndex] || null;

  const collaborators = Array.isArray((post as any).collaborators)
    ? ((post as any).collaborators as any[]).map((x) =>
        typeof x === 'string' ? x : cleanString(x?.id || x?._id || x?.userId)
      )
    : [];

  const isCollaborator = myIds.some((myId) => collaborators.some((id) => idsMatch(id, myId)));

  const collabInvites = Array.isArray((post as any).collabInvites)
    ? ((post as any).collabInvites as any[]).map((x) =>
        typeof x === 'string' ? x : cleanString(x?.id || x?._id || x?.userId)
      )
    : [];

  const hasInvite = myIds.some((myId) => collabInvites.some((id) => idsMatch(id, myId)));

  const canEdit = isOwner || isCollaborator;

  const displayName = post.userName || (post as any).name || 'FaceMeX Member';
  const displayAvatar = post.userAvatar || (post as any).avatar || (post as any).userAvatar || '';

  const isAuthorVerified =
    (post as any)?.verified === true ||
    (post as any)?.userVerified === true ||
    (post as any)?.authorVerified === true ||
    (post as any)?.accountVerified === true ||
    (post as any)?.isVerified === true ||
    (post as any)?.is_verified === true ||
    (post as any)?.user?.verified === true ||
    (post as any)?.user?.userVerified === true ||
    (isOwner && (addons?.verified === true || (user as any)?.isVerified === true || (user as any)?.verified === true));

  useEffect(() => {
    setPostDraft(post.content);
  }, [post.content]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('faceme_saved_posts_v1');
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(Array.isArray(ids) ? ids.includes(post.id) : false);
    } catch {
      setSaved(false);
    }
  }, [post.id]);

  useEffect(() => {
    try {
      const serverLocked =
        (post as any).downloadsLocked === true ||
        (post as any).downloads_locked === true ||
        (post as any).imagesLocked === true ||
        (post as any).images_locked === true ||
        (post as any).mediaLocked === true ||
        (post as any).media_locked === true;

      const raw = localStorage.getItem(`facemex:post_downloads_locked:${post.id}`);
      const localLocked = raw === 'true';

      setDownloadsLocked(serverLocked || localLocked);
    } catch {
      setDownloadsLocked(false);
    }
  }, [post.id, post]);

  const toggleDownloadsLocked = () => {
    if (!isOwner) return;

    setDownloadsLocked((prev) => {
      const next = !prev;

      try {
        localStorage.setItem(`facemex:post_downloads_locked:${post.id}`, String(next));
      } catch {}

      return next;
    });
  };

  const requestCollaboration = async () => {
    const myId = myIds[0] || '';
    const myName = user?.name || 'FaceMeX user';
    const myCode = getMyCollabCode(myName, myId);

    if (!myId) {
      alert('Please log in before requesting collaboration.');
      return;
    }

    try {
      await (inviteCollaborator as any)(post.id, myId, {
        code: myCode,
        name: myName,
        avatar: user?.avatar || '',
      });

      alert(`Collaboration request sent. Your code: ${myCode}`);
    } catch (err) {
      console.error(err);
      alert('Could not send collaboration request. Check backend route /api/posts/:id/collab/invite.');
    }
  };

  const inviteCollaboratorByCode = async () => {
    if (!isOwner) return;

    const invitee = window.prompt('Enter collaborator user ID or unique code, example: Thabo4040');
    const value = cleanString(invitee);

    if (!value) return;

    try {
      await (inviteCollaborator as any)(post.id, value);
    } catch (err) {
      console.error(err);
      alert('Could not invite collaborator. Check backend/store collaborator route.');
    }
  };

  const acceptCollaborationRequest = async (profile: CollaboratorProfile) => {
    if (!isOwner) return;

    try {
      await (acceptCollabInvite as any)(post.id, profile.id);
    } catch (err) {
      console.error(err);
      alert('Could not accept collaborator. Backend/store may need author-accept support.');
    }
  };

  const rejectCollaborationRequest = async (profile: CollaboratorProfile) => {
    if (!isOwner) return;

    try {
      await (rejectCollabInvite as any)(post.id, profile.id);
    } catch (err) {
      console.error(err);
      alert('Could not decline collaborator request.');
    }
  };

  const openLightbox = (items: string[] | string, startIndex = 0) => {
    const gallery = Array.isArray(items) ? items.filter(Boolean) : [items].filter(Boolean);

    if (!gallery.length) return;

    const safeIndex = Math.max(0, Math.min(startIndex, gallery.length - 1));

    setLightboxItems(gallery);
    setLightboxIndex(safeIndex);
    setLightboxZoom(1);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxItems([]);
    setLightboxIndex(0);
    setLightboxZoom(1);
  };

  const goPrevLightbox = () => {
    if (!lightboxItems.length) return;
    setLightboxZoom(1);
    setLightboxIndex((prev) => (prev <= 0 ? lightboxItems.length - 1 : prev - 1));
  };

  const goNextLightbox = () => {
    if (!lightboxItems.length) return;
    setLightboxZoom(1);
    setLightboxIndex((prev) => (prev >= lightboxItems.length - 1 ? 0 : prev + 1));
  };

  const zoomIn = () => {
    setLightboxZoom((prev) => Math.min(prev + 0.4, 4));
  };

  const zoomOut = () => {
    setLightboxZoom((prev) => Math.max(prev - 0.4, 1));
  };

  const resetZoom = () => {
    setLightboxZoom(1);
  };

  const openMediaLightbox = (src: string) => {
    const imageGallery = mediaItems
      .filter((item) => item.type === 'image')
      .map((item) => item.src);

    const startIndex = Math.max(0, imageGallery.indexOf(src));

    openLightbox(imageGallery.length ? imageGallery : src, startIndex);
  };

  const getVoiceCommentDailyLimit = () => {
    const t = String((tier || user?.tier || '')).toLowerCase();

    if (t.startsWith('creator') || t.startsWith('business') || t.startsWith('exclusive')) {
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
      const navAny = typeof navigator !== 'undefined' ? (navigator as any) : null;

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

    try {
      await editPost(post.id, next);
      setEditingPost(false);
    } catch (err) {
      console.error(err);
      alert('Could not edit post.');
    }
  };

  const handleDeletePost = async () => {
    if (!isOwner) return;

    const ok = window.confirm('Delete this post?');

    if (!ok) return;

    try {
      await deletePost(post.id);
    } catch (err) {
      console.error(err);
      alert('Could not delete post.');
    }
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

    try {
      await deleteComment(post.id, commentId);
    } catch (err) {
      console.error(err);
      alert('Could not delete comment.');
    }
  };

  const handleReplyToComment = (commentUserName: string) => {
    setShowComments(true);
    setCommentText(`@${commentUserName} `);

    window.setTimeout(() => {
      replyInputRef.current?.focus();
    }, 0);
  };

  const AuthorDownloadLockButton = () => {
    if (!isOwner || !hasMediaOrDocs) return null;

    return (
      <button
        type="button"
        onClick={toggleDownloadsLocked}
        className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-full border border-border/70 bg-background text-[12px] font-semibold text-muted-foreground shadow-sm hover:bg-muted/40 hover:text-foreground"
      >
        {downloadsLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        {downloadsLocked ? 'Unlock image downloads' : 'Lock image downloads'}
      </button>
    );
  };

  const DownloadLockChip = () => {
    if (!downloadsLocked) return null;

    return (
      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
        <Lock className="h-3 w-3" />
        Downloads locked
      </span>
    );
  };

  const renderMediaItem = (item: PostMediaItem, index: number) => {
    if (item.type === 'video') {
      return (
        <video
          src={item.src}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-contain bg-black"
          controlsList={downloadsLocked ? 'nodownload' : undefined}
          onContextMenu={(e) => {
            if (downloadsLocked) e.preventDefault();
          }}
        />
      );
    }

    return (
      <img
        src={item.src}
        alt={`Post media ${index + 1}`}
        className="h-full w-full object-contain bg-white"
        loading="lazy"
        draggable={!downloadsLocked}
        onContextMenu={(e) => {
          if (downloadsLocked) e.preventDefault();
        }}
      />
    );
  };

  const renderMediaFrame = () => {
    if (mediaItems.length === 0) return null;

    const imageItems = mediaItems.filter((item) => item.type === 'image');

    if (mediaItems.length === 1) {
      const item = mediaItems[0];

      if (item.type === 'video') {
        return (
          <div className="overflow-hidden rounded-[22px] border border-border/70 bg-black shadow-sm">
            <div className="relative h-[250px] sm:h-[340px]">
              {renderMediaItem(item, 0)}
              <DownloadLockChip />
            </div>
          </div>
        );
      }

      return (
        <div className="overflow-hidden rounded-[22px] border border-border/70 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => openMediaLightbox(item.src)}
            className="relative block w-full"
            onContextMenu={(e) => {
              if (downloadsLocked) e.preventDefault();
            }}
          >
            <img
              src={item.src}
              alt="Post media"
              className="h-[250px] w-full object-contain sm:h-[340px]"
              loading="lazy"
              draggable={!downloadsLocked}
            />
            <DownloadLockChip />
          </button>
        </div>
      );
    }

    if (imageItems.length === mediaItems.length) {
      const firstImage = imageItems[0];
      const imageCount = imageItems.length;

      return (
        <div className="overflow-hidden rounded-[22px] border border-border/70 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => openMediaLightbox(firstImage.src)}
            className="relative block w-full"
            onContextMenu={(e) => {
              if (downloadsLocked) e.preventDefault();
            }}
          >
            <img
              src={firstImage.src}
              alt="Post media preview"
              className="h-[250px] w-full object-contain sm:h-[340px]"
              loading="lazy"
              draggable={!downloadsLocked}
            />

            {imageCount > 1 && (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {imageCount} images
              </span>
            )}

            <DownloadLockChip />
          </button>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-[22px] border border-border/70 bg-black shadow-sm">
        <div className="grid h-[250px] grid-cols-2 gap-1 bg-black sm:h-[340px]">
          {mediaItems.slice(0, 4).map((item, index) => {
            const extraCount = mediaItems.length - 4;
            const showMore = index === 3 && extraCount > 0;

            return (
              <button
                key={`${item.src}-${index}`}
                type="button"
                className="relative h-full w-full overflow-hidden bg-black"
                onClick={() => item.type === 'image' && openMediaLightbox(item.src)}
                onContextMenu={(e) => {
                  if (downloadsLocked) e.preventDefault();
                }}
              >
                {renderMediaItem(item, index)}

                {showMore && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-white">
                    +{extraCount}
                  </div>
                )}

                <DownloadLockChip />
              </button>
            );
          })}
        </div>
      </div>
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
        return 'text-rose-500';
      case 'like':
      case 'haha':
      case 'wow':
        return 'text-primary';
      case 'sad':
        return 'text-muted-foreground';
      case 'angry':
        return 'text-red-500';
      default:
        return 'text-primary';
    }
  })();

  const topActionButton =
    'h-8 rounded-full px-1.5 text-[13px] font-semibold text-foreground hover:bg-muted/40 hover:text-foreground';

  const topActionCount =
    'ml-1.5 text-[11px] font-semibold text-muted-foreground tabular-nums';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="mb-3 overflow-hidden rounded-[24px] border bg-card shadow-[0_8px_26px_rgba(15,23,42,0.06)]">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 px-3 pb-2 pt-3">
          <button
            type="button"
            className="flex min-w-0 items-center space-x-2 text-left"
            onClick={() => navigate(`/profile/${post.userId}`)}
          >
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={displayAvatar} alt={displayName} />
                <AvatarFallback>{getInitial(displayName)}</AvatarFallback>
              </Avatar>

              {isAuthorVerified && (
                <span className="absolute -bottom-1 -right-1 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-slate-950 ring-2 ring-background">
                  <CheckCircle className="h-3.5 w-3.5 text-white" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold hover:underline md:text-[15px]">
                {displayName}
              </p>

              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(getPostDate(post), { addSuffix: true })}
                </p>

                {collaboratorProfiles.length > 0 && (
                  <>
                    <span className="text-[11px] text-muted-foreground">•</span>
                    <CollaboratorCluster profiles={collaboratorProfiles} />
                  </>
                )}
              </div>
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 rounded-2xl">
              {canEdit && (
                <DropdownMenuItem onClick={startEditPost}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Edit post
                </DropdownMenuItem>
              )}

              {isOwner && (
                <DropdownMenuItem onClick={inviteCollaboratorByCode}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite collaborator
                </DropdownMenuItem>
              )}

              {!isOwner && !isCollaborator && !hasInvite && (
                <DropdownMenuItem onClick={requestCollaboration}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Request collaboration
                </DropdownMenuItem>
              )}

              {isOwner && hasMediaOrDocs && (
                <DropdownMenuItem onClick={toggleDownloadsLocked}>
                  {downloadsLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                  {downloadsLocked ? 'Unlock downloads' : 'Lock downloads'}
                </DropdownMenuItem>
              )}

              {isOwner && pendingCollabRequests.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Collaboration requests
                  </div>

                  {pendingCollabRequests.slice(0, 4).map((profile) => (
                    <div key={profile.id} className="px-2 py-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile.avatar} alt={profile.name} />
                          <AvatarFallback>{getInitial(profile.name)}</AvatarFallback>
                        </Avatar>

                        <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                          {profile.name}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => acceptCollaborationRequest(profile)}
                          className="rounded-full bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white"
                        >
                          Accept
                        </button>

                        <button
                          type="button"
                          onClick={() => rejectCollaborationRequest(profile)}
                          className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeletePost}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-3 px-3 pb-3">
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
          ) : (
            cleanPostContent && (
              <div className="space-y-1">
                <p
                  className="whitespace-pre-wrap text-[15px] leading-6 text-foreground"
                  style={!expandedPost && shouldCollapsePost ? clampStyle(collapseLines) : undefined}
                >
                  {cleanPostContent}
                </p>

                {shouldCollapsePost && (
                  <button
                    type="button"
                    onClick={() => setExpandedPost((v) => !v)}
                    className="text-[13px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    {expandedPost ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )
          )}

          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="cursor-pointer rounded-full bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                  onClick={() => navigate(`/hashtag/${tag.replace('#', '')}`)}
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}

          {renderMediaFrame()}

          {documentItems.length > 0 && (
            <div className="space-y-2">
              {documentItems.map((doc) => (
                <DocumentPreview
                  key={doc.id}
                  document={doc}
                  downloadsLocked={downloadsLocked}
                  canControl={isOwner}
                  onToggleLock={toggleDownloadsLocked}
                  onOpenPages={(pages, startIndex) => openLightbox(pages, startIndex)}
                />
              ))}
            </div>
          )}

          <AuthorDownloadLockButton />

          {post.audio && (
            <div className="rounded-2xl border bg-background p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <AudioLines className="h-3.5 w-3.5" />
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

          <Dialog
            open={lightboxOpen}
            onOpenChange={(open) => {
              if (!open) closeLightbox();
              else setLightboxOpen(true);
            }}
          >
            <DialogContent className="h-[92vh] w-[96vw] max-w-[96vw] overflow-hidden border border-white/10 bg-black/95 p-0">
              <div className="relative flex h-full w-full flex-col overflow-hidden">
                <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/85 to-transparent px-3 py-3">
                  <div className="w-10" />

                  <div className="rounded-full bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                    {lightboxItems.length > 0 ? `${lightboxIndex + 1} / ${lightboxItems.length}` : 'Image'}
                  </div>

                  <button
                    type="button"
                    onClick={closeLightbox}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative h-full w-full overflow-auto px-2 py-16 touch-pan-x touch-pan-y">
                  <div className="flex min-h-full min-w-full items-center justify-center">
                    {lightboxSrc && (
                      <img
                        src={lightboxSrc}
                        alt={`Image ${lightboxIndex + 1}`}
                        className="object-contain transition-all duration-200"
                        style={
                          lightboxZoom <= 1
                            ? {
                                maxWidth: '100%',
                                maxHeight: '100%',
                              }
                            : {
                                width: `${100 * lightboxZoom}%`,
                                maxWidth: 'none',
                                maxHeight: 'none',
                              }
                        }
                        draggable={!downloadsLocked}
                        onContextMenu={(e) => {
                          if (downloadsLocked) e.preventDefault();
                        }}
                      />
                    )}
                  </div>

                  {lightboxItems.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goPrevLightbox}
                        className="fixed left-4 top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      <button
                        type="button"
                        onClick={goNextLightbox}
                        className="fixed right-4 top-1/2 z-30 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-3 py-4">
                  <button
                    type="button"
                    onClick={zoomOut}
                    disabled={lightboxZoom <= 1}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 disabled:opacity-40"
                  >
                    <ZoomOut className="h-4 w-4" />
                    Out
                  </button>

                  <button
                    type="button"
                    onClick={zoomIn}
                    disabled={lightboxZoom >= 4}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 disabled:opacity-40"
                  >
                    <ZoomIn className="h-4 w-4" />
                    Zoom
                  </button>

                  <button
                    type="button"
                    onClick={resetZoom}
                    disabled={lightboxZoom <= 1}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black shadow-lg hover:bg-white/90 disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-2 pt-1.5">
            <div className="flex items-center justify-between gap-1 px-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="React"
                    className={`${topActionButton} ${reactionClass}`}
                    onClick={() => likePost(post.id, (post.reaction || 'like') as any)}
                  >
                    <span>React</span>
                    <span className={topActionCount}>{post.likes || 0}</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="flex gap-1 rounded-full px-2 py-2">
                  <DropdownMenuItem onClick={() => likePost(post.id, 'love')} className="rounded-full px-2">
                    <Heart className="h-4 w-4 text-rose-500" />
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => likePost(post.id, 'like')} className="rounded-full px-2">
                    <ThumbsUp className="h-4 w-4 text-primary" />
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => likePost(post.id, 'haha')} className="rounded-full px-2">
                    <Laugh className="h-4 w-4 text-primary" />
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => likePost(post.id, 'wow')} className="rounded-full px-2">
                    <Smile className="h-4 w-4 text-primary" />
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => likePost(post.id, 'sad')} className="rounded-full px-2">
                    <Frown className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => likePost(post.id, 'angry')} className="rounded-full px-2">
                    <Angry className="h-4 w-4 text-red-500" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={topActionButton}
                onClick={() => {
                  setShowComments((v) => !v);
                  window.setTimeout(() => replyInputRef.current?.focus(), 50);
                }}
              >
                <span>Reply</span>
                <span className={topActionCount}>{commentCount}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={topActionButton}
                onClick={handleShare}
              >
                <span>Share</span>
                <span className={topActionCount}>{post.shares || 0}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${topActionButton} ${saved ? 'text-foreground' : ''}`}
                onClick={toggleSaved}
              >
                <Bookmark className="mr-1 h-4 w-4" />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={toggleVoiceRecording}
              disabled={(() => {
                const limit = getVoiceCommentDailyLimit();
                if (!Number.isFinite(limit)) return false;
                return getVoiceCommentCountToday() >= limit;
              })()}
              className={`h-8 w-full rounded-full border border-fuchsia-300/30 bg-gradient-to-r from-fuchsia-500/10 via-purple-500/10 to-cyan-400/10 text-[13px] font-semibold text-foreground shadow-[0_0_24px_rgba(168,85,247,0.16)] transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.22)] ${
                isRecording ? 'border-red-400/40 bg-red-500/10 text-red-500' : ''
              }`}
            >
              <span className="mr-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20">
                <AudioLines className={`h-3.5 w-3.5 text-purple-600 ${isRecording ? 'animate-pulse text-red-500' : ''}`} />
              </span>
              {isRecording ? `${recordSeconds}s` : 'Voice'}
            </Button>

            <div className="flex items-center gap-2">
              <Input
                ref={replyInputRef}
                placeholder="Reply..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleComment();
                  }
                }}
                className="h-10 rounded-2xl border-border/60 bg-muted/20 px-4 text-[14px] shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              <Button
                size="icon"
                variant="ghost"
                onClick={handleComment}
                aria-label="Send reply"
                className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isRecording && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]">
                    <AudioLines className="h-4 w-4 animate-pulse" />
                  </span>

                  <div>
                    <p className="text-sm font-semibold">Recording voice reply</p>
                    <p className="text-xs opacity-80">Tap stop when you are done.</p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={toggleVoiceRecording}
                  className="rounded-full bg-red-500 text-white hover:bg-red-600"
                >
                  Stop {recordSeconds}s
                </Button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {showComments && commentCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full space-y-3 border-t border-border/60 pt-3"
              >
                {(post.comments || []).map((comment: any) => {
                  const isVoice = comment.type === 'voice' || !!comment.voiceUrl;
                  const commentUserId = cleanString(comment.userId);
                  const canDeleteComment =
                    isOwner || myIds.some((myId) => idsMatch(myId, commentUserId));

                  const commentTextSafe = getCommentText(comment);
                  const commentName = comment.userName || comment.name || 'User';
                  const commentAvatar = comment.userAvatar || comment.avatar || '';

                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={commentAvatar} alt={commentName} />
                        <AvatarFallback>{getInitial(commentName)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 rounded-2xl bg-muted/35 px-3 py-2">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {commentName}
                          </p>

                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(getCommentDate(comment), { addSuffix: true })}
                          </span>
                        </div>

                        <div className="mt-1 text-sm leading-relaxed text-foreground">
                          {isVoice && comment.voiceUrl ? (
                            <div className="mt-2 flex items-center gap-2 rounded-2xl border bg-background px-3 py-2 shadow-sm">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-950 to-slate-700 text-white shadow-sm">
                                <AudioLines className="h-4 w-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                                  Voice reply
                                </p>

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
                            </div>
                          ) : (
                            <p className="break-words">{commentTextSafe}</p>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleReplyToComment(commentName)}
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
