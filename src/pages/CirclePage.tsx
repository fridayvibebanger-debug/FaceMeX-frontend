import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Users,
  Globe,
  Lock,
  ArrowLeft,
  Send,
  Pin,
  PinOff,
  Shield,
  Crown,
  UserMinus,
  UserPlus,
  Sparkles,
  BarChart3,
  Eye,
  Settings2,
  FileText,
  Trash2,
  Plus,
  CheckCircle2,
  Heart,
  Share2,
  ClipboardList,
  UserCog,
  AlertTriangle,
  Upload,
  Download,
  XCircle,
} from 'lucide-react';

import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { useSocialStore } from '@/store/socialStore';
import { useUserStore } from '@/store/userStore';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type WhoCanPost = 'creator' | 'admins' | 'members' | 'everyone';

type CircleSettings = {
  whoCanPost: WhoCanPost;
  requireRulesAcceptance: boolean;
  rules: string[];
};

type CircleViewer = {
  id: string;
  name: string;
  avatar?: string;
  lastViewedAt: string;
  viewCount: number;
};

type CircleAnalytics = {
  totalViews: number;
  uniqueViewers: number;
  viewers: CircleViewer[];
};

type LocalCirclePost = {
  id: string;
  kind: 'standard' | 'document';
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  title?: string;
  createdAt: string;
  pinned?: boolean;
  reactions?: {
    like?: number;
  };
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileDataUrl?: string;
};

type DisplayPost = {
  id: string;
  source: 'store' | 'local';
  kind: 'standard' | 'document';
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  title?: string;
  createdAt: string;
  pinned?: boolean;
  reactions?: {
    like?: number;
  };
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileDataUrl?: string;
};

const DEFAULT_SETTINGS: CircleSettings = {
  whoCanPost: 'members',
  requireRulesAcceptance: true,
  rules: [
    'Respect every member. No harassment, insults, hate, threats, or bullying.',
    'Post useful content related to the purpose of this circle.',
    'No scams, fake jobs, spam, misleading promotions, or harmful content.',
  ],
};

function safeTimeAgo(value: string | number | Date) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

function getInitials(name?: string) {
  const clean = String(name || 'User').trim();
  return clean.charAt(0).toUpperCase();
}

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function getCircleSettingsKey(circleId: string) {
  return `facemex:circle:${circleId}:settings`;
}

function getCircleRulesAcceptedKey(circleId: string, userId: string) {
  return `facemex:circle:${circleId}:rules-accepted:${userId}`;
}

function getCircleRulesDeclinedKey(circleId: string, userId: string) {
  return `facemex:circle:${circleId}:rules-declined:${userId}`;
}

function getCircleAnalyticsKey(circleId: string) {
  return `facemex:circle:${circleId}:analytics`;
}

function getLocalPostsKey(circleId: string) {
  return `facemex:circle:${circleId}:local-posts`;
}

function getLikesKey(circleId: string) {
  return `facemex:circle:${circleId}:likes`;
}

function getHiddenCirclesKey() {
  return 'facemex:hidden-circles';
}

function fileSizeLabel(size?: number) {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function whoCanPostLabel(value: WhoCanPost) {
  if (value === 'creator') return 'Creator only';
  if (value === 'admins') return 'Creator + admins';
  if (value === 'members') return 'Members / followers';
  return 'Everyone';
}

function isImageFile(type?: string) {
  return String(type || '').startsWith('image/');
}

function isPdfFile(type?: string) {
  return String(type || '').includes('pdf');
}

export default function CirclePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const socialStore: any = useSocialStore();
  const userStore: any = useUserStore();

  const circles: any[] = Array.isArray(socialStore.circles)
    ? socialStore.circles
    : [];

  const circleMessages = socialStore.circleMessages || {};
  const circleMembers = socialStore.circleMembers || {};

  const joinCircle = socialStore.joinCircle || (() => {});
  const leaveCircle = socialStore.leaveCircle || (() => {});
  const updateCircle = socialStore.updateCircle || (() => {});
  const postCircleMessage = socialStore.postCircleMessage || (() => {});
  const toggleReaction = socialStore.toggleReaction || (() => {});
  const togglePinCircleMessage =
    socialStore.togglePinCircleMessage || (() => {});
  const removeCircleMember = socialStore.removeCircleMember || (() => {});
  const updateCircleMemberRole =
    socialStore.updateCircleMemberRole || (() => {});
  const deleteCircle = socialStore.deleteCircle;

  const userId = String(
    userStore.id ||
      userStore.user?.id ||
      userStore.profile?.id ||
      userStore.profile?.user_id ||
      'local-user'
  );

  const userName =
    userStore.name ||
    userStore.user?.name ||
    userStore.profile?.name ||
    userStore.profile?.full_name ||
    'You';

  const avatar =
    userStore.avatar ||
    userStore.user?.avatar ||
    userStore.profile?.avatar ||
    userStore.profile?.avatar_url ||
    '';

  const [newMessage, setNewMessage] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);

  const [newRule, setNewRule] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminFeedback, setAdminFeedback] = useState('');

  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const circle = useMemo(
    () => circles.find((item) => item.id === (id || '')),
    [circles, id]
  );

  const hiddenCircles = useMemo(
    () => readJson<string[]>(getHiddenCirclesKey(), []),
    []
  );

  const isHidden = Boolean(id && hiddenCircles.includes(id));

  const messages: any[] = useMemo(
    () => (id && circleMessages[id] ? circleMessages[id] : []),
    [circleMessages, id]
  );

  const members: any[] = useMemo(
    () => (id && circleMembers[id] ? circleMembers[id] : []),
    [circleMembers, id]
  );

  const [circleSettings, setCircleSettings] = useState<CircleSettings>(() =>
    id
      ? readJson<CircleSettings>(getCircleSettingsKey(id), DEFAULT_SETTINGS)
      : DEFAULT_SETTINGS
  );

  const [localPosts, setLocalPosts] = useState<LocalCirclePost[]>(() =>
    id ? readJson<LocalCirclePost[]>(getLocalPostsKey(id), []) : []
  );

  const [likedByMap, setLikedByMap] = useState<Record<string, string[]>>(() =>
    id ? readJson<Record<string, string[]>>(getLikesKey(id), {}) : {}
  );

  const [analytics, setAnalytics] = useState<CircleAnalytics>(() =>
    id
      ? readJson<CircleAnalytics>(getCircleAnalyticsKey(id), {
          totalViews: 0,
          uniqueViewers: 0,
          viewers: [],
        })
      : {
          totalViews: 0,
          uniqueViewers: 0,
          viewers: [],
        }
  );

  const [rulesAccepted, setRulesAccepted] = useState(() => {
    if (!id || !userId) return false;
    return readJson<boolean>(getCircleRulesAcceptedKey(id, userId), false);
  });

  const [rulesDeclined, setRulesDeclined] = useState(() => {
    if (!id || !userId) return false;
    return readJson<boolean>(getCircleRulesDeclinedKey(id, userId), false);
  });

  const ownerMember = members.find((member) => member.role === 'owner');

  const isCreator =
    String(circle?.creatorId || '') === userId ||
    String(circle?.authorId || '') === userId ||
    String(circle?.ownerId || '') === userId ||
    String(ownerMember?.id || '') === userId ||
    String(circle?.creatorName || '').toLowerCase().trim() ===
      String(userName || '').toLowerCase().trim();

  const currentMember = members.find((member) => String(member.id) === userId);
  const isAdmin = currentMember?.role === 'admin';
  const isMember = Boolean(circle?.isMember || currentMember || isCreator);
  const canManageMembers = isCreator || isAdmin;
  const memberCount = Math.max(circle?.memberCount || 0, members.length || 0);

  useEffect(() => {
    if (circle?.description) {
      setDescriptionDraft(circle.description);
    }
  }, [circle?.id, circle?.description]);

  useEffect(() => {
    if (!id) return;

    const nextSettings = readJson<CircleSettings>(
      getCircleSettingsKey(id),
      DEFAULT_SETTINGS
    );

    setCircleSettings(nextSettings);
    setLocalPosts(readJson<LocalCirclePost[]>(getLocalPostsKey(id), []));
    setLikedByMap(readJson<Record<string, string[]>>(getLikesKey(id), {}));

    setRulesAccepted(
      readJson<boolean>(getCircleRulesAcceptedKey(id, userId), false)
    );

    setRulesDeclined(
      readJson<boolean>(getCircleRulesDeclinedKey(id, userId), false)
    );
  }, [id, userId]);

  useEffect(() => {
    if (!id || !circle) return;

    const existing = readJson<CircleAnalytics>(getCircleAnalyticsKey(id), {
      totalViews: 0,
      uniqueViewers: 0,
      viewers: [],
    });

    const viewerId = String(userId || 'guest');
    const now = new Date().toISOString();

    const oldViewer = existing.viewers.find((viewer) => viewer.id === viewerId);

    const nextViewer: CircleViewer = {
      id: viewerId,
      name: userName || 'Viewer',
      avatar,
      lastViewedAt: now,
      viewCount: (oldViewer?.viewCount || 0) + 1,
    };

    const nextViewers = [
      nextViewer,
      ...existing.viewers.filter((viewer) => viewer.id !== viewerId),
    ].slice(0, 50);

    const nextAnalytics: CircleAnalytics = {
      totalViews: existing.totalViews + 1,
      uniqueViewers: nextViewers.length,
      viewers: nextViewers,
    };

    setAnalytics(nextAnalytics);
    writeJson(getCircleAnalyticsKey(id), nextAnalytics);
  }, [id, circle?.id, userId, userName, avatar]);

  const storePosts: DisplayPost[] = useMemo(
    () =>
      messages.map((message) => ({
        id: message.id,
        source: 'store',
        kind: 'standard',
        authorId: message.authorId,
        authorName: message.authorName,
        authorAvatar: message.authorAvatar,
        text: message.text,
        createdAt: message.createdAt,
        pinned: message.pinned,
        reactions: message.reactions,
      })),
    [messages]
  );

  const localDisplayPosts: DisplayPost[] = useMemo(
    () =>
      localPosts.map((post) => ({
        ...post,
        source: 'local',
      })),
    [localPosts]
  );

  const posts = useMemo(() => {
    return [...localDisplayPosts, ...storePosts].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [localDisplayPosts, storePosts]);

  const pinned = useMemo(() => posts.filter((post) => post.pinned), [posts]);

  if (!circle || isHidden) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="flex pt-16">
          <LeftSidebar />

          <main className="flex-1 lg:ml-64">
            <div className="mx-auto max-w-4xl px-4 py-10">
              <Button
                variant="ghost"
                onClick={() => navigate('/communities')}
                className="mb-4 rounded-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Communities
              </Button>

              <Card className="rounded-3xl border bg-card shadow-sm">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Circle not found.
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const rulesRequired =
    circleSettings.requireRulesAcceptance && !isCreator && !isAdmin;

  const hasRulesAccess = !rulesRequired || rulesAccepted;

  const canPostBySetting = (() => {
    if (isCreator) return true;
    if (circleSettings.whoCanPost === 'creator') return false;
    if (circleSettings.whoCanPost === 'admins') return isAdmin;
    if (circleSettings.whoCanPost === 'members') return isMember;
    return true;
  })();

  const canPost = canPostBySetting && hasRulesAccess && !rulesDeclined;

  const postBlockedReason = rulesDeclined
    ? 'You declined the circle rules. Accept the rules to participate.'
    : !hasRulesAccess
      ? 'Accept the circle rules before posting.'
      : circleSettings.whoCanPost === 'creator'
        ? 'Only the creator can post in this circle.'
        : circleSettings.whoCanPost === 'admins'
          ? 'Only the creator and admins can post in this circle.'
          : !isMember && circleSettings.whoCanPost === 'members'
            ? 'Join this circle to post.'
            : 'You cannot post right now.';

  const coverImage =
    circle.coverImage ||
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80';

  const saveSettings = (next: CircleSettings) => {
    setCircleSettings(next);
    writeJson(getCircleSettingsKey(circle.id), next);
  };

  const saveLocalPosts = (next: LocalCirclePost[]) => {
    setLocalPosts(next);
    writeJson(getLocalPostsKey(circle.id), next);
  };

  const saveLikes = (next: Record<string, string[]>) => {
    setLikedByMap(next);
    writeJson(getLikesKey(circle.id), next);
  };

  const userLikedPost = (postId: string) => {
    return Boolean(likedByMap[postId]?.includes(userId));
  };

  const handleJoin = () => {
    joinCircle(circle.id);
  };

  const handleLeave = () => {
    leaveCircle(circle.id);
  };

  const handleAcceptRules = () => {
    writeJson(getCircleRulesAcceptedKey(circle.id, userId), true);
    writeJson(getCircleRulesDeclinedKey(circle.id, userId), false);
    setRulesAccepted(true);
    setRulesDeclined(false);
  };

  const handleDeclineRules = () => {
    writeJson(getCircleRulesDeclinedKey(circle.id, userId), true);
    writeJson(getCircleRulesAcceptedKey(circle.id, userId), false);
    setRulesDeclined(true);
    setRulesAccepted(false);
  };

  const handleReviewRulesAgain = () => {
    writeJson(getCircleRulesDeclinedKey(circle.id, userId), false);
    setRulesDeclined(false);
  };

  const handlePost = () => {
    const text = newMessage.trim();

    if (!text || !canPost) return;

    postCircleMessage(circle.id, {
      authorId: userId,
      authorName: userName || 'You',
      text,
    });

    setNewMessage('');
  };

  const handleFileUpload = (file: File | null) => {
    setFileError('');
    setSelectedFile(null);
    setFileDataUrl('');

    if (!file) return;

    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      setFileError('File is too large. Please upload a document under 8MB.');
      return;
    }

    setUploadingFile(true);

    const reader = new FileReader();

    reader.onload = () => {
      setSelectedFile(file);
      setFileDataUrl(String(reader.result || ''));
      setUploadingFile(false);
    };

    reader.onerror = () => {
      setFileError('Could not read this file. Please try another document.');
      setUploadingFile(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDocumentPost = () => {
    const title = documentTitle.trim();
    const description = documentDescription.trim();

    if (!canPost || !title || !selectedFile || !fileDataUrl) return;

    const newPost: LocalCirclePost = {
      id: `circle-document-${Date.now()}`,
      kind: 'document',
      authorId: userId,
      authorName: userName || 'You',
      authorAvatar: avatar,
      title,
      text: description || 'Document shared with the circle.',
      fileName: selectedFile.name,
      fileType: selectedFile.type || 'application/octet-stream',
      fileSize: selectedFile.size,
      fileDataUrl,
      createdAt: new Date().toISOString(),
      pinned: false,
      reactions: {
        like: 0,
      },
    };

    saveLocalPosts([newPost, ...localPosts]);

    setDocumentTitle('');
    setDocumentDescription('');
    setSelectedFile(null);
    setFileDataUrl('');
    setFileError('');
    setDocumentOpen(false);
  };

  const handleSaveDescription = async () => {
    const nextDescription = descriptionDraft.trim();

    if (!nextDescription || nextDescription === circle.description) return;

    setSavingDescription(true);

    try {
      updateCircle(circle.id, {
        description: nextDescription,
      });
    } finally {
      setSavingDescription(false);
    }
  };

  const handleToggleVisibility = (isPrivate: boolean) => {
    updateCircle(circle.id, { isPrivate });
  };

  const handleReaction = (post: DisplayPost) => {
    if (userLikedPost(post.id)) return;

    const nextLikes = {
      ...likedByMap,
      [post.id]: [...(likedByMap[post.id] || []), userId],
    };

    saveLikes(nextLikes);

    if (post.source === 'store') {
      toggleReaction(circle.id, post.id, 'like', 1);
      return;
    }

    const nextLocalPosts = localPosts.map((item) =>
      item.id === post.id
        ? {
            ...item,
            reactions: {
              ...item.reactions,
              like: (item.reactions?.like || 0) + 1,
            },
          }
        : item
    );

    saveLocalPosts(nextLocalPosts);
  };

  const handlePin = (post: DisplayPost) => {
    if (!canManageMembers) return;

    if (post.source === 'store') {
      togglePinCircleMessage(circle.id, post.id);
      return;
    }

    const next = localPosts.map((item) =>
      item.id === post.id
        ? {
            ...item,
            pinned: !item.pinned,
          }
        : item
    );

    saveLocalPosts(next);
  };

  const handleDeletePost = (post: DisplayPost) => {
    if (!canManageMembers && post.authorId !== userId) return;

    if (post.source === 'store' && socialStore.deleteCircleMessage) {
      socialStore.deleteCircleMessage(circle.id, post.id);
      return;
    }

    if (post.source === 'local') {
      saveLocalPosts(localPosts.filter((item) => item.id !== post.id));
    }
  };

  const handleAddRule = () => {
    const rule = newRule.trim();

    if (!rule) return;

    saveSettings({
      ...circleSettings,
      rules: [...circleSettings.rules, rule],
    });

    setNewRule('');
  };

  const handleRemoveRule = (index: number) => {
    saveSettings({
      ...circleSettings,
      rules: circleSettings.rules.filter((_, idx) => idx !== index),
    });
  };

  const handleQuickAddAdmin = () => {
    const query = adminSearch.trim().toLowerCase();

    if (!query) {
      setAdminFeedback('Enter a member name or ID.');
      return;
    }

    const member = members.find(
      (item) =>
        String(item.id).toLowerCase() === query ||
        String(item.name).toLowerCase().includes(query)
    );

    if (!member) {
      setAdminFeedback('Member not found. They must join the circle first.');
      return;
    }

    if (member.role === 'owner') {
      setAdminFeedback('The owner already has full authority.');
      return;
    }

    updateCircleMemberRole(circle.id, member.id, 'admin');
    setAdminSearch('');
    setAdminFeedback(`${member.name} is now an admin.`);
  };

  const handleDeleteCircle = () => {
    if (!isCreator) return;

    if (typeof deleteCircle === 'function') {
      deleteCircle(circle.id);
    } else {
      const hidden = readJson<string[]>(getHiddenCirclesKey(), []);
      writeJson(getHiddenCirclesKey(), [...new Set([...hidden, circle.id])]);
    }

    setDeleteOpen(false);
    navigate('/communities');
  };

  const totalReactions = posts.reduce(
    (sum, post) => sum + (post.reactions?.like || 0),
    0
  );

  const renderAuthorAvatar = (post: DisplayPost) => {
    const src = post.authorAvatar || avatar;

    if (src) {
      return (
        <img
          src={src}
          alt={post.authorName}
          className="h-10 w-10 rounded-full object-cover"
        />
      );
    }

    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
        {getInitials(post.authorName)}
      </div>
    );
  };

  const renderDocumentPreview = (post: DisplayPost) => {
    return (
      <div className="mt-3 overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-300" />
                <span className="text-xs font-medium uppercase tracking-wide text-blue-200">
                  FaceMeX Document Post
                </span>
              </div>

              <h3 className="mt-2 truncate text-lg font-semibold">
                {post.title || 'Untitled document'}
              </h3>

              <p className="mt-1 max-h-10 overflow-hidden text-xs text-slate-300">
                {post.text}
              </p>
            </div>

            <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">
              {fileSizeLabel(post.fileSize)}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-xl">
            {isImageFile(post.fileType) && post.fileDataUrl ? (
              <img
                src={post.fileDataUrl}
                alt={post.fileName || 'Document'}
                className="max-h-[320px] w-full object-contain bg-white"
              />
            ) : isPdfFile(post.fileType) && post.fileDataUrl ? (
              <iframe
                src={post.fileDataUrl}
                title={post.fileName || 'PDF document'}
                className="h-[320px] w-full bg-white"
              />
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 bg-white p-6 text-center text-slate-950">
                <FileText className="h-12 w-12 text-slate-400" />

                <div>
                  <div className="font-semibold">
                    {post.fileName || 'Uploaded document'}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {post.fileType || 'Document'} · {fileSizeLabel(post.fileSize)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {post.fileDataUrl && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                onClick={() =>
                  window.open(post.fileDataUrl, '_blank', 'noopener,noreferrer')
                }
              >
                Open document
              </Button>

              <a
                href={post.fileDataUrl}
                download={post.fileName || 'FaceMeX-document'}
                className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPostCard = (post: DisplayPost) => {
    const liked = userLikedPost(post.id);

    return (
      <div
        key={`${post.source}-${post.id}`}
        className="rounded-3xl border bg-card p-4 shadow-sm"
      >
        <div className="flex items-start gap-3">
          {renderAuthorAvatar(post)}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {post.authorName}
                  </span>

                  {post.authorId === userId && (
                    <Badge variant="secondary" className="rounded-full">
                      You
                    </Badge>
                  )}

                  {post.pinned && (
                    <Badge variant="secondary" className="rounded-full">
                      <Pin className="mr-1 h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  {safeTimeAgo(post.createdAt)} · {circle.name}
                </div>
              </div>

              {canManageMembers && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-2"
                  onClick={() => handlePin(post)}
                >
                  {post.pinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {post.kind === 'document' ? (
              renderDocumentPreview(post)
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {post.text}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
              <Button
                type="button"
                variant={liked ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-full"
                disabled={liked}
                onClick={() => handleReaction(post)}
              >
                <Heart className="mr-2 h-4 w-4" />
                {liked ? 'Liked' : 'Like'} {post.reactions?.like || 0}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>

              {(canManageMembers || post.authorId === userId) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto rounded-full text-red-500 hover:text-red-600"
                  onClick={() => handleDeletePost(post)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex pt-16">
        <LeftSidebar />

        <main className="flex-1 lg:ml-64">
          <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/communities')}
              className="mb-2 rounded-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Communities
            </Button>

            <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              <div className="relative h-44 w-full">
                <img
                  src={coverImage}
                  alt={circle.name}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-white/90 text-slate-900 hover:bg-white/90">
                        <Sparkles className="mr-1 h-3 w-3" />
                        Circle
                      </Badge>

                      <Badge
                        variant="secondary"
                        className="rounded-full bg-white/90 text-slate-900"
                      >
                        {circle.category}
                      </Badge>

                      <Badge
                        variant="secondary"
                        className="rounded-full bg-white/90 text-slate-900"
                      >
                        {whoCanPostLabel(circleSettings.whoCanPost)}
                      </Badge>
                    </div>

                    <h1 className="truncate text-2xl font-semibold text-white">
                      {circle.name}
                    </h1>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-100/90">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {memberCount.toLocaleString()} members
                      </span>

                      <span className="inline-flex items-center gap-1">
                        {circle.isPrivate ? (
                          <>
                            <Lock className="h-3 w-3" />
                            Private
                          </>
                        ) : (
                          <>
                            <Globe className="h-3 w-3" />
                            Public
                          </>
                        )}
                      </span>

                      {isCreator && (
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Author
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isMember ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-white/95 text-slate-900 hover:bg-white"
                        onClick={handleLeave}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                        onClick={handleJoin}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
              <div className="space-y-4">
                <Card className="rounded-3xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">About this circle</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm">
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {circle.description}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Created by{' '}
                      <span className="font-medium text-foreground">
                        {circle.creatorName || userName}
                      </span>
                    </p>
                  </CardContent>
                </Card>

                {circleSettings.rules.length > 0 && (
                  <Card className="rounded-3xl border bg-card shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardList className="h-4 w-4" />
                        Circle rules
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm">
                      <div className="space-y-2">
                        {circleSettings.rules.map((rule, index) => (
                          <div
                            key={`${rule}-${index}`}
                            className="flex items-start gap-2 rounded-2xl border bg-background/60 p-3"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />

                            <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                              {rule}
                            </div>

                            {isCreator && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-full px-2 text-red-500"
                                onClick={() => handleRemoveRule(index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {rulesRequired && !rulesAccepted && !rulesDeclined && (
                        <div className="rounded-2xl border bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                          <div className="mb-2 flex items-center gap-2 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            Rules acceptance required
                          </div>

                          <p>
                            You must accept the circle rules before posting or
                            participating.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="rounded-full"
                              onClick={handleAcceptRules}
                            >
                              I agree
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={handleDeclineRules}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      )}

                      {rulesDeclined && (
                        <div className="rounded-2xl border bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-200">
                          <div className="mb-2 flex items-center gap-2 font-semibold">
                            <XCircle className="h-4 w-4" />
                            Rules declined
                          </div>

                          <p>
                            You declined the circle rules. You cannot post until
                            you accept them.
                          </p>

                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 rounded-full"
                            onClick={handleReviewRulesAgain}
                          >
                            Review rules again
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card className="rounded-3xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span>Channel</span>

                      {isMember ? (
                        <Badge variant="secondary" className="rounded-full">
                          Member access
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full">
                          Join to participate
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4 text-sm">
                    <div className="space-y-2 rounded-3xl border bg-background/60 p-3">
                      <Textarea
                        placeholder={
                          canPost
                            ? 'Share an update, opportunity, document, idea or question with this circle...'
                            : postBlockedReason
                        }
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        rows={3}
                        disabled={!canPost}
                        className="resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {canPost
                            ? 'Circle posts are shown in a feed-style format.'
                            : postBlockedReason}
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            disabled={!canPost}
                            onClick={() => setDocumentOpen(true)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Document
                          </Button>

                          <Button
                            size="sm"
                            className="rounded-full"
                            disabled={!newMessage.trim() || !canPost}
                            onClick={handlePost}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Post
                          </Button>
                        </div>
                      </div>
                    </div>

                    {pinned.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                          <Pin className="h-3 w-3" />
                          Pinned updates
                        </div>

                        {pinned.map(renderPostCard)}
                      </div>
                    )}

                    <div className="space-y-3">
                      {posts.length === 0 ? (
                        <div className="rounded-2xl border bg-background/60 p-4 text-xs text-muted-foreground">
                          No channel posts yet.{' '}
                          {canPost
                            ? 'Start the first conversation.'
                            : 'Join or follow the rules to participate.'}
                        </div>
                      ) : (
                        posts.map(renderPostCard)
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {canManageMembers && (
                  <Card className="rounded-3xl border bg-card shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-4 w-4" />
                        Author dashboard
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border bg-background/60 p-3">
                          <div className="text-xl font-bold">
                            {analytics.totalViews.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Circle views
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-background/60 p-3">
                          <div className="text-xl font-bold">
                            {analytics.uniqueViewers.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Unique viewers
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-background/60 p-3">
                          <div className="text-xl font-bold">
                            {posts.length.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Posts
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-background/60 p-3">
                          <div className="text-xl font-bold">
                            {totalReactions.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Reactions
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-background/60 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                          <Eye className="h-4 w-4" />
                          Recent viewers
                        </div>

                        {analytics.viewers.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No viewers tracked yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {analytics.viewers.slice(0, 6).map((viewer) => (
                              <div
                                key={viewer.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  {viewer.avatar ? (
                                    <img
                                      src={viewer.avatar}
                                      alt={viewer.name}
                                      className="h-7 w-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                                      {getInitials(viewer.name)}
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <div className="truncate font-medium">
                                      {viewer.name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {safeTimeAgo(viewer.lastViewedAt)}
                                    </div>
                                  </div>
                                </div>

                                <Badge variant="outline" className="rounded-full">
                                  {viewer.viewCount} view
                                  {viewer.viewCount === 1 ? '' : 's'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="rounded-3xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="h-4 w-4" />
                      Circle controls
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm">
                    {isCreator ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          You are the author of this circle. You control rules,
                          admins, visibility, posting permissions and deletion.
                        </p>

                        <div className="space-y-2">
                          <label className="text-xs font-medium">
                            Description
                          </label>

                          <Textarea
                            value={descriptionDraft}
                            rows={4}
                            onChange={(event) =>
                              setDescriptionDraft(event.target.value)
                            }
                          />

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-muted-foreground">
                              Use this to set the tone and purpose of the circle.
                            </p>

                            <Button
                              size="sm"
                              className="rounded-full"
                              disabled={
                                savingDescription ||
                                !descriptionDraft.trim() ||
                                descriptionDraft.trim() === circle.description
                              }
                              onClick={handleSaveDescription}
                            >
                              {savingDescription ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium">
                            Visibility
                          </label>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Button
                              type="button"
                              variant={circle.isPrivate ? 'outline' : 'default'}
                              size="sm"
                              className="rounded-full"
                              onClick={() => handleToggleVisibility(false)}
                            >
                              <Globe className="mr-1 h-3 w-3" />
                              Public
                            </Button>

                            <Button
                              type="button"
                              variant={circle.isPrivate ? 'default' : 'outline'}
                              size="sm"
                              className="rounded-full"
                              onClick={() => handleToggleVisibility(true)}
                            >
                              <Lock className="mr-1 h-3 w-3" />
                              Private
                            </Button>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-full"
                          onClick={() => setSettingsOpen(true)}
                        >
                          <Settings2 className="mr-2 h-4 w-4" />
                          Advanced settings
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          className="w-full rounded-full"
                          onClick={() => setDeleteOpen(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete circle
                        </Button>
                      </>
                    ) : isAdmin ? (
                      <p className="text-xs text-muted-foreground">
                        You are an admin. You can help manage posts and members,
                        but the author still controls the circle.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Only the author can manage this circle. Members can
                        participate based on circle settings and rules.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span>Members</span>
                      <Badge variant="secondary" className="rounded-full">
                        {memberCount.toLocaleString()}
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    {members.length === 0 ? (
                      <p className="rounded-2xl border bg-background/60 p-3 text-muted-foreground">
                        No members loaded yet. This panel is local-only for now.
                      </p>
                    ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {members.map((member) => {
                          const isOwner = member.role === 'owner';
                          const isSelf = String(member.id) === userId;
                          const canActOn =
                            canManageMembers && !isOwner && !isSelf;

                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between gap-2 rounded-2xl border bg-background/60 px-2 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                {member.avatar || avatar ? (
                                  <img
                                    src={member.avatar || avatar}
                                    alt={member.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                    {getInitials(member.name)}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="truncate text-[11px] font-medium">
                                      {member.name}
                                    </span>

                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                      {member.role}
                                    </span>
                                  </div>

                                  <p className="text-[10px] text-muted-foreground">
                                    Joined {safeTimeAgo(member.joinedAt)}
                                  </p>
                                </div>
                              </div>

                              {canActOn && (
                                <div className="flex shrink-0 items-center gap-1">
                                  {member.role === 'member' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 rounded-full px-2 text-[10px]"
                                      onClick={() =>
                                        updateCircleMemberRole(
                                          circle.id,
                                          member.id,
                                          'admin'
                                        )
                                      }
                                    >
                                      Promote
                                    </Button>
                                  )}

                                  {member.role === 'admin' && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 rounded-full px-2 text-[10px]"
                                      onClick={() =>
                                        updateCircleMemberRole(
                                          circle.id,
                                          member.id,
                                          'member'
                                        )
                                      }
                                    >
                                      Demote
                                    </Button>
                                  )}

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 rounded-full px-2 text-[10px] text-red-500 hover:text-red-600"
                                    onClick={() =>
                                      removeCircleMember(circle.id, member.id)
                                    }
                                  >
                                    <UserMinus className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!canManageMembers && members.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Only the circle author and admins can manage members.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Advanced circle settings</DialogTitle>
            <DialogDescription>
              Control who can post, rules, compliance and admins.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Who can post?</label>

              <select
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                value={circleSettings.whoCanPost}
                onChange={(event) =>
                  saveSettings({
                    ...circleSettings,
                    whoCanPost: event.target.value as WhoCanPost,
                  })
                }
              >
                <option value="creator">Author only</option>
                <option value="admins">Author + admins</option>
                <option value="members">Members / followers</option>
                <option value="everyone">Everyone</option>
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-2xl border bg-background/60 p-3 text-sm">
              <input
                type="checkbox"
                checked={circleSettings.requireRulesAcceptance}
                onChange={(event) =>
                  saveSettings({
                    ...circleSettings,
                    requireRulesAcceptance: event.target.checked,
                  })
                }
              />
              Users must accept circle rules before posting
            </label>

            <div className="space-y-2">
              <label className="text-sm font-medium">Add circle rule</label>

              <div className="flex gap-2">
                <Input
                  placeholder="Example: No fake job posts or scams"
                  value={newRule}
                  onChange={(event) => setNewRule(event.target.value)}
                />

                <Button className="rounded-full" onClick={handleAddRule}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Add admin</label>

              <div className="flex gap-2">
                <Input
                  placeholder="Search member name or paste member ID"
                  value={adminSearch}
                  onChange={(event) => setAdminSearch(event.target.value)}
                />

                <Button className="rounded-full" onClick={handleQuickAddAdmin}>
                  <UserCog className="h-4 w-4" />
                </Button>
              </div>

              {adminFeedback && (
                <p className="text-xs text-muted-foreground">{adminFeedback}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create document post</DialogTitle>
            <DialogDescription>
              Upload a document from your device and share it as a premium
              FaceMeX circle post.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Document title"
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
            />

            <Textarea
              placeholder="Short description"
              value={documentDescription}
              onChange={(event) => setDocumentDescription(event.target.value)}
              rows={2}
            />

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed bg-background/60 p-6 text-center hover:bg-muted/50">
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />

              <div className="text-sm font-medium">
                {selectedFile ? selectedFile.name : 'Upload document from device'}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                PDF, image, Word, text or presentation. Max 8MB.
              </div>

              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.ppt,.pptx,application/pdf,image/*"
                onChange={(event) =>
                  handleFileUpload(event.target.files?.[0] || null)
                }
              />
            </label>

            {uploadingFile && (
              <p className="text-xs text-muted-foreground">
                Reading file from device...
              </p>
            )}

            {fileError && (
              <p className="text-xs text-red-500">
                {fileError}
              </p>
            )}

            {selectedFile && (
              <div className="rounded-2xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">
                  {selectedFile.name}
                </div>
                <div>
                  {selectedFile.type || 'Document'} ·{' '}
                  {fileSizeLabel(selectedFile.size)}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDocumentOpen(false);
                setSelectedFile(null);
                setFileDataUrl('');
                setFileError('');
              }}
            >
              Cancel
            </Button>

            <Button
              onClick={handleDocumentPost}
              disabled={
                !documentTitle.trim() ||
                !selectedFile ||
                !fileDataUrl ||
                !canPost ||
                uploadingFile
              }
            >
              Publish document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete circle?</DialogTitle>
            <DialogDescription>
              This will remove the circle from your communities view. Only the
              author can delete the circle.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-200">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Dangerous action
            </div>
            Members may lose access to posts and rules connected to this circle.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>

            <Button variant="destructive" onClick={handleDeleteCircle}>
              Delete circle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
