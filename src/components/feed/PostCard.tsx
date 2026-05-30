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
  ShieldCheck,
  Wand2,
  Download,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  X,
  Users,
  Copy,
  UserPlus,
  Clock,
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
  avatar?: string;
  verified?: boolean;
  inviteCode?: string;
};

type InviteItem = {
  id: string;
  code?: string;
  name?: string;
  createdAt?: string;
};

const CV_BUILDER_ROUTE = '/ai-resume';
const CAREER_WORKSPACE_ROUTE = '/career-ai';

function cleanString(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function safeLower(value: unknown) {
  return cleanString(value).toLowerCase();
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
      // continue
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

function getAnyUserId(user: any) {
  return cleanString(
    user?._id ||
      user?.id ||
      user?.externalId ||
      user?.userId ||
      user?.sub ||
      ''
  );
}

function getPossibleCurrentUserIds(input: {
  currentUserId?: string;
  authUser?: any;
}) {
  const ids = [
    input.currentUserId,
    input.authUser?._id,
    input.authUser?.id,
    input.authUser?.externalId,
    input.authUser?.userId,
    input.authUser?.sub,
  ]
    .map((x) => cleanString(x))
    .filter(Boolean);

  try {
    const localIds = [
      localStorage.getItem('faceme_user_id'),
      localStorage.getItem('facemex_user_id'),
      localStorage.getItem('userId'),
      localStorage.getItem('uid'),
    ]
      .map((x) => cleanString(x))
      .filter(Boolean);

    ids.push(...localIds);
  } catch {
    // ignore
  }

  return Array.from(new Set(ids));
}

function isSameUserId(a: unknown, possibleIds: string[]) {
  const x = cleanString(a);
  if (!x) return false;

  return possibleIds.some((id) => cleanString(id) === x);
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

function normalizeCollaborators(post: Post): CollaboratorProfile[] {
  const output: CollaboratorProfile[] = [];
  const seen = new Set<string>();

  const add = (raw: any, index: number) => {
    if (!raw) return;

    if (typeof raw === 'string') {
      const id = cleanString(raw);
      if (!id || seen.has(id)) return;

      seen.add(id);
      output.push({
        id,
        name: id.length > 18 ? `Collaborator ${index + 1}` : id,
      });

      return;
    }

    const id = cleanString(raw.id || raw.userId || raw._id || raw.externalId || raw.code);
    const name =
      cleanString(raw.name || raw.userName || raw.fullName || raw.username || raw.displayName) ||
      (id ? id : `Collaborator ${index + 1}`);

    const key = id || name.toLowerCase();
    if (!key || seen.has(key)) return;

    seen.add(key);

    output.push({
      id: id || key,
      name,
      avatar: cleanString(raw.avatar || raw.userAvatar || raw.avatarUrl || raw.avatar_url),
      verified:
        raw.verified === true ||
        raw.userVerified === true ||
        raw.isVerified === true ||
        raw.is_verified === true,
      inviteCode: cleanString(raw.inviteCode || raw.code),
    });
  };

  const possibleSources = [
    (post as any).collaboratorProfiles,
    (post as any).collaboratorsProfiles,
    (post as any).collabProfiles,
    (post as any).collaborators,
  ];

  possibleSources.forEach((source) => {
    if (Array.isArray(source)) {
      source.forEach((item, index) => add(item, index));
    } else if (typeof source === 'string' && source.trim()) {
      try {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed)) parsed.forEach((item, index) => add(item, index));
        else add(parsed, 0);
      } catch {
        add(source, 0);
      }
    }
  });

  return output.slice(0, 4);
}

function normalizeInviteItems(post: Post): InviteItem[] {
  const raw = (post as any).collabInvites || (post as any).collaborationInvites || [];
  const list = Array.isArray(raw) ? raw : normalizeStringArray(raw);

  return list
    .map((item: any, index) => {
      if (typeof item === 'string') {
        return {
          id: item,
          code: item,
        };
      }

      return {
        id: cleanString(item.userId || item.id || item.inviteeId || item.code || `invite-${index}`),
        code: cleanString(item.code || item.inviteCode),
        name: cleanString(item.name || item.userName || item.displayName),
        createdAt: cleanString(item.createdAt),
      };
    })
    .filter((item) => item.id || item.code);
}

function getCleanPostContent(content: string) {
  return String(content || '')
    .replace(/\[CREATOR_CONTENT\]/g, '')
    .trim();
}

function isOpportunityContent(content: string) {
  return /(job|jobs|vacancy|vacancies|learnership|internship|opportunity|apply|cv|closing date|assessment|hiring|bursary|programme|programmes|requirements|salary)/i.test(
    content
  );
}

function clampStyle(lines: number): CSSProperties {
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}

function safeFileName(name: string) {
  return String(name || 'facemex-image')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function createInviteCode(inputName: string) {
  const cleanName =
    String(inputName || 'Collab')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12) || 'Collab';

  const number = Math.floor(1000 + Math.random() * 9000);

  return `${cleanName}${number}`;
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function VerifiedMiniBadge() {
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
      <CheckCircle className="h-2.5 w-2.5" />
    </span>
  );
}

function CollaboratorStack({
  ownerName,
  ownerAvatar,
  ownerVerified,
  collaborators,
  onProfileClick,
}: {
  ownerName: string;
  ownerAvatar: string;
  ownerVerified: boolean;
  collaborators: CollaboratorProfile[];
  onProfileClick: (id: string) => void;
}) {
  if (collaborators.length === 0) return null;

  const visible = collaborators.slice(0, 4);
  const first = visible[0];

  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/25 px-2.5 py-2">
      <div className="flex shrink-0 items-center -space-x-2">
        <div className="relative">
          <Avatar className="h-7 w-7 border-2 border-background">
            <AvatarImage src={ownerAvatar} alt={ownerName} />
            <AvatarFallback>{ownerName ? ownerName.charAt(0) : 'U'}</AvatarFallback>
          </Avatar>
          {ownerVerified && (
            <span className="absolute -bottom-1 -right-1">
              <VerifiedMiniBadge />
            </span>
          )}
        </div>

        {visible.map((collab) => (
          <button
            key={collab.id}
            type="button"
            className="relative"
            onClick={() => onProfileClick(collab.id)}
          >
            <Avatar className="h-7 w-7 border-2 border-background">
              <AvatarImage src={collab.avatar} alt={collab.name} />
              <AvatarFallback>{collab.name ? collab.name.charAt(0) : 'C'}</AvatarFallback>
            </Avatar>

            {collab.verified && (
              <span className="absolute -bottom-1 -right-1">
                <VerifiedMiniBadge />
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold text-foreground">
          Collaboration
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {ownerName} with {first?.name}
          {visible.length > 1 ? ` +${visible.length - 1}` : ''}
        </p>
      </div>

      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
        <Users className="h-3 w-3" />
        Collab
      </span>
    </div>
  );
}

function DocumentPreview({
  document,
  locked,
  canControl,
  onToggleLock,
  onOpenPages,
}: {
  document: PostDocumentItem;
  locked: boolean;
  canControl: boolean;
  onToggleLock: () => void;
  onOpenPages: (pages: string[], startIndex: number) => void;
}) {
  const firstPage = document.pages[0] || '';

  return (
    <div className="overflow-hidden rounded-[22px] border border-border/70 bg-background shadow-sm">
      {firstPage ? (
        <button
          type="button"
          onClick={() => {
            if (!locked || canControl) onOpenPages(document.pages, 0);
          }}
          className="relative block w-full bg-white"
        >
          <img
            src={firstPage}
            alt={`${document.title} preview`}
            className="h-[250px] w-full select-none object-contain sm:h-[340px]"
            loading="lazy"
            draggable={false}
            onContextMenu={(e) => {
              if (locked && !canControl) e.preventDefault();
            }}
          />

          {document.pages.length > 1 && (!locked || canControl) && (
            <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {document.pages.length} images
            </span>
          )}

          {locked && !canControl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 px-5 text-center text-white">
              <Lock className="mb-2 h-7 w-7 drop-shadow" />
              <p className="text-sm font-semibold drop-shadow">Images locked</p>
              <p className="mt-1 text-xs text-white/85 drop-shadow">Download disabled by author.</p>
            </div>
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
          {locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {locked ? 'Unlock images' : 'Lock images'}
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
  const [replyOpen, setReplyOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingPost, setEditingPost] = useState(false);
  const [postDraft, setPostDraft] = useState(post.content);
  const [saved, setSaved] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [expandedPost, setExpandedPost] = useState(false);
  const [lastInviteCode, setLastInviteCode] = useState('');

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const [imagesLocked, setImagesLocked] = useState(false);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordIntervalRef = useRef<number | null>(null);
  const replyInputRef = useRef<HTMLInputElement | null>(null);

  const { addons, id: currentUserId, tier } = useUserStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const possibleUserIds = useMemo(
    () => getPossibleCurrentUserIds({ currentUserId, authUser: user }),
    [currentUserId, user]
  );

  const mediaItems = useMemo(() => normalizePostMedia(post), [post]);
  const documentItems = useMemo(() => normalizePostDocuments(post), [post]);
  const collaborators = useMemo(() => normalizeCollaborators(post), [post]);
  const inviteItems = useMemo(() => normalizeInviteItems(post), [post]);

  const cleanPostContent = useMemo(() => getCleanPostContent(post.content), [post.content]);

  const hasMediaOrDocs = mediaItems.length > 0 || documentItems.length > 0;
  const collapseLines = hasMediaOrDocs ? 2 : 10;

  const shouldCollapsePost = hasMediaOrDocs
    ? cleanPostContent.length > 95 || cleanPostContent.split('\n').length > 2
    : cleanPostContent.length > 650 || cleanPostContent.split('\n').length > 10;

  const isOpportunityPost =
    isOpportunityContent(cleanPostContent) || documentItems.length > 0;

  const lightboxSrc = lightboxItems[lightboxIndex] || null;

  const myId = possibleUserIds[0] || '';

  const postOwnerId = cleanString((post as any).userId || (post as any).authorId || '');
  const isOwner = isSameUserId(postOwnerId, possibleUserIds);

  const collaboratorIds = collaborators.map((x) => x.id);
  const isCollaborator = collaboratorIds.some((id) => isSameUserId(id, possibleUserIds));

  const hasInvite = inviteItems.some((invite) => {
    if (isSameUserId(invite.id, possibleUserIds)) return true;
    if (isSameUserId(invite.code, possibleUserIds)) return true;

    try {
      const myInviteCode = localStorage.getItem('facemex_my_collab_code');
      return !!myInviteCode && myInviteCode === invite.code;
    } catch {
      return false;
    }
  });

  const canEdit = isOwner || isCollaborator;

  const displayName = (post as any).userName || 'FaceMeX Member';
  const displayAvatar = (post as any).userAvatar || (post as any).avatar || '';

  const isAuthorVerified =
    (post as any)?.verified === true ||
    (post as any)?.userVerified === true ||
    (post as any)?.isVerified === true ||
    (post as any)?.is_verified === true ||
    (!!addons?.verified && isOwner);

  const postTime = useMemo(() => {
    const raw = (post as any).createdAt || (post as any).timestamp || (post as any).date || null;
    const d = raw ? new Date(raw) : new Date();
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [post]);

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
        (post as any).imagesLocked === true ||
        (post as any).images_locked === true ||
        (post as any).mediaLocked === true ||
        (post as any).media_locked === true;

      const raw = localStorage.getItem(`facemex:post_images_locked:${post.id}`);
      const localLocked = raw === 'true';

      setImagesLocked(serverLocked || localLocked);
    } catch {
      setImagesLocked(false);
    }
  }, [post.id, post]);

  const toggleImagesLocked = () => {
    if (!isOwner) return;

    setImagesLocked((prev) => {
      const next = !prev;

      try {
        localStorage.setItem(`facemex:post_images_locked:${post.id}`, String(next));
      } catch {}

      return next;
    });
  };

  const saveImageToDevice = async (src: string, name = 'facemex-image') => {
    if (!src) return;
    if (imagesLocked && !isOwner) {
      alert('This author locked image downloads.');
      return;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${safeFileName(name)}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
      alert('Image opened. Long press the image and choose “Download image” or “Save image”.');
    }
  };

  const saveCurrentLightboxImage = () => {
    if (!lightboxSrc) return;
    saveImageToDevice(lightboxSrc, `facemex-post-${post.id}-${lightboxIndex + 1}`);
  };

  const storePostActionContext = (type: string, prompt: string) => {
    try {
      const payload = JSON.stringify({
        type,
        postId: post.id,
        content: cleanPostContent,
        prompt,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem('facemex:post_action_context', payload);
      localStorage.setItem('facemex:career_workspace_prompt', payload);
      sessionStorage.setItem('facemex:post_action_context', payload);
      sessionStorage.setItem('facemex:career_workspace_prompt', payload);
    } catch {
      // ignore
    }
  };

  const goCreateCv = () => {
    const prompt = `Create a CV for this opportunity:\n\n${cleanPostContent}`;

    storePostActionContext('create-cv', prompt);

    navigate(CV_BUILDER_ROUTE, {
      state: {
        fromPost: post.id,
        mode: 'create-cv',
        content: cleanPostContent,
        prompt,
      },
    });
  };

  const goApplyMessage = () => {
    const prompt = `Write a professional email and WhatsApp message to apply for this opportunity:\n\n${cleanPostContent}`;

    storePostActionContext('apply-message', prompt);

    navigate(CAREER_WORKSPACE_ROUTE, {
      state: {
        fromPost: post.id,
        mode: 'apply-message',
        content: cleanPostContent,
        prompt,
      },
    });
  };

  const goCheckJob = () => {
    const prompt = `Check if this job or opportunity looks safe or suspicious. Give a simple safety checklist and what the applicant must verify before applying:\n\n${cleanPostContent}`;

    storePostActionContext('check-job', prompt);

    navigate(CAREER_WORKSPACE_ROUTE, {
      state: {
        fromPost: post.id,
        mode: 'check-job',
        content: cleanPostContent,
        prompt,
      },
    });
  };

  const openLightbox = (items: string[] | string, startIndex = 0) => {
    if (imagesLocked && !isOwner) return;

    const gallery = Array.isArray(items)
      ? items.filter(Boolean)
      : [items].filter(Boolean);

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
    setLightboxZoom(1);
    setLightboxIndex((prev) => (prev <= 0 ? lightboxItems.length - 1 : prev - 1));
  };

  const goNextLightbox = () => {
    setLightboxZoom(1);
    setLightboxIndex((prev) => (prev >= lightboxItems.length - 1 ? 0 : prev + 1));
  };

  const zoomIn = () => {
    setLightboxZoom((prev) => Math.min(prev + 0.35, 3));
  };

  const zoomOut = () => {
    setLightboxZoom((prev) => Math.max(prev - 0.35, 1));
  };

  const openMediaLightbox = (src: string) => {
    if (imagesLocked && !isOwner) return;

    const imageGallery = mediaItems
      .filter((item) => item.type === 'image')
      .map((item) => item.src);

    const startIndex = Math.max(0, imageGallery.indexOf(src));

    openLightbox(imageGallery.length ? imageGallery : src, startIndex);
  };

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
    if (!canEdit) {
      alert('Only the author or accepted collaborators can edit this post.');
      return;
    }

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
    if (!isOwner) {
      alert('Only the author can delete this post.');
      return;
    }

    const ok = window.confirm('Delete this post?');

    if (!ok) return;

    await deletePost(post.id);
  };

  const handleInviteCollaborator = async () => {
    if (!isOwner) {
      alert('Only the author can invite collaborators.');
      return;
    }

    if (collaborators.length >= 4) {
      alert('You can collaborate with up to 4 profiles on one post.');
      return;
    }

    const collaboratorName = window.prompt(
      'Enter collaborator name or FaceMeX username. Example: Thabo'
    );

    const name = cleanString(collaboratorName);

    if (!name) return;

    const inviteCode = createInviteCode(name);
    setLastInviteCode(inviteCode);

    try {
      localStorage.setItem(`facemex:collab_invite:${post.id}`, inviteCode);
    } catch {
      // ignore
    }

    try {
      await inviteCollaborator(post.id, inviteCode);
    } catch (error) {
      console.error('Invite collaborator failed:', error);
      alert(
        'Invite code was generated, but backend invite failed. Update postStore.ts and backend routes/posts.js to support code invites.'
      );
    }

    const copied = await copyText(inviteCode);

    alert(
      copied
        ? `Invite code generated and copied:\n${inviteCode}\n\nSend this code to ${name}.`
        : `Invite code generated:\n${inviteCode}\n\nSend this code to ${name}.`
    );
  };

  const handleCopyInviteCode = async () => {
    const code = lastInviteCode || cleanString(inviteItems[0]?.code || inviteItems[0]?.id);

    if (!code) {
      alert('No invite code available yet.');
      return;
    }

    const copied = await copyText(code);

    alert(copied ? `Invite code copied: ${code}` : `Invite code: ${code}`);
  };

  const handleAcceptInvite = async () => {
    const ok = window.confirm('Accept collaboration invite?');

    if (!ok) return;

    await acceptCollabInvite(post.id);
  };

  const handleRejectInvite = async () => {
    const ok = window.confirm('Decline collaboration invite?');

    if (!ok) return;

    await rejectCollabInvite(post.id);
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
    }, 0);
  };

  const MediaLockOverlay = () => {
    if (!imagesLocked || isOwner) return null;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 px-5 text-center text-white">
        <Lock className="mb-2 h-7 w-7 drop-shadow" />
        <p className="text-sm font-semibold drop-shadow">Images locked</p>
        <p className="mt-1 text-xs text-white/85 drop-shadow">Download disabled by author.</p>
      </div>
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
          className="h-full w-full bg-black object-contain"
          controlsList={imagesLocked && !isOwner ? 'nodownload noplaybackrate' : 'noplaybackrate'}
          onContextMenu={(e) => {
            if (imagesLocked && !isOwner) e.preventDefault();
          }}
        />
      );
    }

    return (
      <img
        src={item.src}
        alt={`Post media ${index + 1}`}
        className="h-full w-full select-none bg-white object-contain"
        loading="lazy"
        draggable={false}
        onContextMenu={(e) => {
          if (imagesLocked && !isOwner) e.preventDefault();
        }}
      />
    );
  };

  const AuthorLockButton = () => {
    if (!isOwner || !hasMediaOrDocs) return null;

    return (
      <button
        type="button"
        onClick={toggleImagesLocked}
        className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-full border border-border/70 bg-background text-[12px] font-semibold text-muted-foreground shadow-sm hover:bg-muted/40 hover:text-foreground"
      >
        {imagesLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
        {imagesLocked ? 'Unlock image downloads' : 'Lock image downloads'}
      </button>
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
            <div className="h-[250px] sm:h-[340px]">{renderMediaItem(item, 0)}</div>
          </div>
        );
      }

      return (
        <div className="overflow-hidden rounded-[22px] border border-border/70 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => openMediaLightbox(item.src)}
            className="relative block w-full"
          >
            <img
              src={item.src}
              alt="Post media"
              className="h-[250px] w-full select-none object-contain sm:h-[340px]"
              loading="lazy"
              draggable={false}
              onContextMenu={(e) => {
                if (imagesLocked && !isOwner) e.preventDefault();
              }}
            />
            <MediaLockOverlay />
          </button>
        </div>
      );
    }

    if (imageItems.length === mediaItems.length) {
      const firstImage = imageItems[0];

      return (
        <div className="overflow-hidden rounded-[22px] border border-border/70 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => openMediaLightbox(firstImage.src)}
            className="relative block w-full"
          >
            <img
              src={firstImage.src}
              alt="Post media preview"
              className="h-[250px] w-full select-none object-contain sm:h-[340px]"
              loading="lazy"
              draggable={false}
              onContextMenu={(e) => {
                if (imagesLocked && !isOwner) e.preventDefault();
              }}
            />

            {!imagesLocked || isOwner ? (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {imageItems.length} images
              </span>
            ) : null}

            <MediaLockOverlay />
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
              >
                {renderMediaItem(item, index)}

                {showMore && (!imagesLocked || isOwner) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-white">
                    +{extraCount}
                  </div>
                )}

                <MediaLockOverlay />
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

  const premiumActionButton =
    'h-9 min-w-0 flex-1 rounded-full px-2 text-[12px] font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground';

  const pillButton =
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-[11px] font-semibold shadow-sm hover:bg-muted/50';

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
                <AvatarFallback>{displayName ? displayName.charAt(0) : 'U'}</AvatarFallback>
              </Avatar>

              {isAuthorVerified && (
                <span className="absolute -bottom-1 -right-1">
                  <VerifiedMiniBadge />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold hover:underline md:text-[15px]">
                  {displayName}
                </p>

                {isAuthorVerified && (
                  <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}

                {collaborators.length > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    <Users className="h-2.5 w-2.5" />
                    Collab
                  </span>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(postTime, { addSuffix: true })}
              </p>
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

            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={startEditPost}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Edit post
                </DropdownMenuItem>
              )}

              {isOwner && (
                <DropdownMenuItem onClick={handleInviteCollaborator}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite collaborator
                </DropdownMenuItem>
              )}

              {isOwner && lastInviteCode && (
                <DropdownMenuItem onClick={handleCopyInviteCode}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy invite code
                </DropdownMenuItem>
              )}

              {isOwner && hasMediaOrDocs && (
                <DropdownMenuItem onClick={toggleImagesLocked}>
                  {imagesLocked ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                  {imagesLocked ? 'Unlock downloads' : 'Lock downloads'}
                </DropdownMenuItem>
              )}

              {hasInvite && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleAcceptInvite}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept collaboration
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleRejectInvite}
                    className="text-destructive focus:text-destructive"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Decline collaboration
                  </DropdownMenuItem>
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

        <CardContent className="space-y-2.5 px-3 pb-3">
          <CollaboratorStack
            ownerName={displayName}
            ownerAvatar={displayAvatar}
            ownerVerified={isAuthorVerified}
            collaborators={collaborators}
            onProfileClick={(id) => navigate(`/profile/${id}`)}
          />

          {lastInviteCode && isOwner && (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-primary">Invite code ready</p>
                <p className="truncate text-xs text-muted-foreground">{lastInviteCode}</p>
              </div>

              <button
                type="button"
                onClick={handleCopyInviteCode}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary px-3 text-[11px] font-bold text-primary-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
          )}

          {hasInvite && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Users className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">Collaboration invite</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    You were invited to collaborate on this post.
                  </p>

                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="h-8 rounded-full text-xs" onClick={handleAcceptInvite}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={handleRejectInvite}>
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                  locked={imagesLocked}
                  canControl={isOwner}
                  onToggleLock={toggleImagesLocked}
                  onOpenPages={(pages, startIndex) => openLightbox(pages, startIndex)}
                />
              ))}
            </div>
          )}

          <AuthorLockButton />

          {isOpportunityPost && (
            <div className="flex gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={goCreateCv} className={pillButton}>
                <FileText className="h-3.5 w-3.5" />
                Create CV
              </button>

              <button type="button" onClick={goApplyMessage} className={pillButton}>
                <Wand2 className="h-3.5 w-3.5" />
                Apply msg
              </button>

              <button type="button" onClick={goCheckJob} className={pillButton}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Check job
              </button>
            </div>
          )}

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
                  <button
                    type="button"
                    onClick={closeLightbox}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/25"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>

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

                <div className="relative flex h-full w-full items-center justify-center overflow-auto px-2 py-16">
                  {lightboxSrc && (
                    <img
                      src={lightboxSrc}
                      alt={`Image ${lightboxIndex + 1}`}
                      className="max-h-full max-w-full select-none object-contain transition-transform duration-200"
                      draggable={false}
                      onContextMenu={(e) => {
                        if (imagesLocked && !isOwner) e.preventDefault();
                      }}
                      style={{
                        transform: `scale(${lightboxZoom})`,
                        transformOrigin: 'center center',
                      }}
                    />
                  )}

                  {lightboxItems.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goPrevLightbox}
                        className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      <button
                        type="button"
                        onClick={goNextLightbox}
                        className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
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
                    disabled={lightboxZoom >= 3}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 disabled:opacity-40"
                  >
                    <ZoomIn className="h-4 w-4" />
                    Zoom
                  </button>

                  {(!imagesLocked || isOwner) && (
                    <button
                      type="button"
                      onClick={saveCurrentLightboxImage}
                      disabled={!lightboxSrc}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black shadow-lg hover:bg-white/90 disabled:opacity-40"
                    >
                      <Download className="h-4 w-4" />
                      Save
                    </button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="rounded-2xl border border-border/70 bg-muted/20 px-1.5 py-1.5 shadow-inner">
            <div className="flex items-center justify-between gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="React"
                    className={`${premiumActionButton} ${reactionClass}`}
                    onClick={() => likePost(post.id, (post.reaction || 'like') as any)}
                  >
                    <Heart className="mr-1 h-3.5 w-3.5" />
                    {post.likes || 0}
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
                className={premiumActionButton}
                onClick={() => {
                  setReplyOpen((v) => !v);
                  setShowComments(true);
                  window.setTimeout(() => replyInputRef.current?.focus(), 50);
                }}
              >
                <MessageCircle className="mr-1 h-3.5 w-3.5" />
                {commentCount}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={premiumActionButton}
                onClick={handleShare}
              >
                Share
                <span className="ml-1 text-[11px] text-muted-foreground tabular-nums">
                  {(post as any).shares || 0}
                </span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${premiumActionButton} ${saved ? 'text-foreground' : ''}`}
                onClick={toggleSaved}
              >
                <Bookmark className="mr-1 h-3.5 w-3.5" />
                {saved ? 'Saved' : 'Save'}
              </Button>

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
                className={`h-9 min-w-[74px] shrink-0 rounded-full px-2 text-[12px] font-semibold transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.35)] hover:bg-red-600'
                    : 'bg-gradient-to-r from-slate-950 to-slate-800 text-white shadow-sm hover:from-slate-900 hover:to-slate-700'
                }`}
              >
                <AudioLines className={`mr-1 h-3.5 w-3.5 ${isRecording ? 'animate-pulse' : ''}`} />
                {isRecording ? `${recordSeconds}s` : 'Voice'}
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
                className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
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
                className="w-full space-y-3 border-t border-border/60 pt-3"
              >
                {(post.comments || []).map((comment: any) => {
                  const isVoice = comment.type === 'voice' || !!comment.voiceUrl;
                  const commentUserId = cleanString(comment.userId || comment.authorId || '');
                  const commentId = cleanString(comment.id || comment._id || '');
                  const commentUserName = cleanString(comment.userName || comment.name || 'User');
                  const commentAvatar = cleanString(comment.userAvatar || comment.avatar || '');
                  const commentTextValue = cleanString(comment.content || comment.text || '');
                  const canDeleteComment = isSameUserId(commentUserId, possibleUserIds) || isOwner;

                  const rawCommentTime = comment.createdAt || comment.timestamp || comment.date || null;
                  const commentTime = rawCommentTime ? new Date(rawCommentTime) : new Date();
                  const safeCommentTime = Number.isNaN(commentTime.getTime()) ? new Date() : commentTime;

                  return (
                    <motion.div
                      key={commentId || `${commentUserId}-${commentTextValue}`}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={commentAvatar} alt={commentUserName} />
                        <AvatarFallback>
                          {commentUserName ? commentUserName.charAt(0) : 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 rounded-2xl bg-muted/35 px-3 py-2">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {commentUserName}
                          </p>

                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(safeCommentTime, { addSuffix: true })}
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
                            <p className="break-words">
                              {commentTextValue.replace(
                                /\[(REAL_LIFE|PRO COLLAB|PRO COLLAB INVITE|CREATOR_CONTENT)\s*/g,
                                ''
                              )}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleReplyToComment(commentUserName)}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <MessageCircle className="h-3 w-3" />
                            Reply
                          </button>

                          {canDeleteComment && commentId && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(commentId)}
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

          {isOwner && inviteItems.length > 0 && (
            <div className="flex items-center gap-2 rounded-2xl bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {inviteItems.length} pending collaboration invite{inviteItems.length === 1 ? '' : 's'}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
