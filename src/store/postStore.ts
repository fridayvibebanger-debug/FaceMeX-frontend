import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import {
  validateProfessionalPost,
  type ProfessionalCategory,
} from '@/lib/professionalModeration';

type ReactionType = 'love' | 'like' | 'haha' | 'wow' | 'sad' | 'angry';
type PostMode = 'social' | 'professional';
type MediaType = 'image' | 'video' | 'audio' | 'document' | 'text' | 'none';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  voiceUrl?: string;
  type?: 'text' | 'voice';
  timestamp: Date;
  verified?: boolean;
  userVerified?: boolean;
  isVerified?: boolean;
}

export type PostDocument = {
  id: string;
  title: string;
  url: string;
  pages: string[];
  totalPages: number;
  previewPages: number;
};

export type CollaboratorProfile = {
  id: string;
  userId?: string;
  name: string;
  userName?: string;
  avatar?: string;
  userAvatar?: string;
  verified?: boolean;
  userVerified?: boolean;
  isVerified?: boolean;
  code?: string;
};

type ExtraPostMedia = {
  image?: string;
  images?: string[];
  video?: string;
  videos?: string[];
  mediaType?: string;
  media_type?: string;
  documents?: PostDocument[];
  documentUrl?: string;
  documentTitle?: string;
  documentPages?: string[];
  documentTotalPages?: number;
  documentPreviewPages?: number;
  document_url?: string;
  document_title?: string;
  document_pages?: string[];
  document_total_pages?: number;
  document_preview_pages?: number;
  downloadsLocked?: boolean;
  downloads_locked?: boolean;
};

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;

  verified?: boolean;
  userVerified?: boolean;
  authorVerified?: boolean;
  accountVerified?: boolean;
  isVerified?: boolean;
  is_verified?: boolean;

  image?: string;
  images?: string[];
  video?: string;
  videos?: string[];
  audio?: string;
  mediaType?: MediaType;

  documents?: PostDocument[];
  documentUrl?: string;
  documentTitle?: string;
  documentPages?: string[];
  documentTotalPages?: number;
  documentPreviewPages?: number;

  downloadsLocked?: boolean;
  downloads_locked?: boolean;
  imagesLocked?: boolean;
  images_locked?: boolean;
  mediaLocked?: boolean;
  media_locked?: boolean;

  hashtags: string[];
  likes: number;
  comments: Comment[];
  shares: number;
  timestamp: Date;
  createdAt?: string;
  isLiked: boolean;
  isSaved?: boolean;
  reaction?: ReactionType;
  mood?: string;
  aiScore?: number;
  mode?: PostMode;

  isRepost?: boolean;
  is_repost?: boolean;
  repostedBy?: string;
  reposted_by?: string;
  repostedById?: string;
  reposted_by_id?: string;
  repostedAt?: string;
  reposted_at?: string;
  sharedBy?: string;
  shared_by?: string;
  sharedById?: string;
  shared_by_id?: string;
  sharedAt?: string;
  shared_at?: string;
  sharedByUsers?: CollaboratorProfile[];
  repostedByUsers?: CollaboratorProfile[];

  collabInvites?: Array<string | CollaboratorProfile>;
  collaborators?: Array<string | CollaboratorProfile>;
  collaboratorProfiles?: CollaboratorProfile[];
  collaborationRequests?: CollaboratorProfile[];
}

interface PostState {
  posts: Post[];
  trendingHashtags: string[];
  aiSuggestions: string[];

  loadPosts: () => Promise<void>;

  addPost: (
    content: string,
    images?: string[],
    audio?: string,
    hashtags?: string[],
    mode?: PostMode,
    professionalCategoryOrExtra?: ProfessionalCategory | ExtraPostMedia,
    professionalAgreed?: boolean
  ) => Promise<void>;

  likePost: (postId: string, reaction?: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  addVoiceComment: (postId: string, voiceUrl: string) => Promise<void>;
  editPost: (postId: string, content: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  editComment: (postId: string, commentId: string, content: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;

  inviteCollaborator: (
    postId: string,
    userId: string,
    extra?: {
      code?: string;
      name?: string;
      avatar?: string;
    }
  ) => Promise<void>;

  acceptCollabInvite: (postId: string, userId?: string) => Promise<void>;
  rejectCollabInvite: (postId: string, userId?: string) => Promise<void>;
  removeCollaborator: (postId: string, userId: string) => Promise<void>;
  toggleDownloadsLocked: (postId: string, locked?: boolean) => Promise<void>;

  extractHashtags: (content: string) => string[];
  getAISuggestions: (content: string) => string[];
}

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

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => normalizeStringArray(value))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function getSafeDate(value: unknown) {
  const raw = value || Date.now();
  const date = raw instanceof Date ? raw : new Date(String(raw));

  if (Number.isNaN(date.getTime())) return new Date();

  return date;
}

function isVerifiedValue(value: any) {
  return Boolean(
    value?.addons?.verified === true ||
      value?.verified === true ||
      value?.userVerified === true ||
      value?.user_verified === true ||
      value?.authorVerified === true ||
      value?.author_verified === true ||
      value?.accountVerified === true ||
      value?.account_verified === true ||
      value?.isVerified === true ||
      value?.is_verified === true ||
      value?.profileVerified === true ||
      value?.subscriptionVerified === true
  );
}

function getProfileName(profile: any, fallbackId?: string) {
  const emailName =
    typeof profile?.email === 'string' && profile.email.includes('@')
      ? profile.email.split('@')[0]
      : '';

  return (
    profile?.full_name?.trim?.() ||
    profile?.fullName?.trim?.() ||
    profile?.name?.trim?.() ||
    profile?.username?.trim?.() ||
    emailName ||
    `User ${String(fallbackId || '').slice(0, 6)}`
  );
}

function getProfileAvatar(profile: any) {
  return (
    profile?.avatar_url ||
    profile?.avatarUrl ||
    profile?.avatar ||
    profile?.profileImage ||
    profile?.profile_image ||
    ''
  );
}

function normalizeProfile(raw: any, fallbackId = ''): CollaboratorProfile {
  if (typeof raw === 'string') {
    return {
      id: raw,
      userId: raw,
      name: raw.length > 18 ? `User ${raw.slice(0, 6)}` : raw,
      userName: raw.length > 18 ? `User ${raw.slice(0, 6)}` : raw,
      avatar: '',
      userAvatar: '',
      verified: false,
      userVerified: false,
      isVerified: false,
      code: raw,
    };
  }

  const id =
    cleanString(raw?.id) ||
    cleanString(raw?._id) ||
    cleanString(raw?.userId) ||
    cleanString(raw?.user_id) ||
    cleanString(raw?.externalId) ||
    cleanString(raw?.supabaseId) ||
    cleanString(raw?.authId) ||
    fallbackId;

  const name =
    cleanString(raw?.name) ||
    cleanString(raw?.userName) ||
    cleanString(raw?.user_name) ||
    cleanString(raw?.fullName) ||
    cleanString(raw?.full_name) ||
    cleanString(raw?.username) ||
    `User ${id.slice(0, 6)}`;

  const avatar =
    cleanString(raw?.avatar) ||
    cleanString(raw?.userAvatar) ||
    cleanString(raw?.user_avatar) ||
    cleanString(raw?.avatarUrl) ||
    cleanString(raw?.avatar_url) ||
    '';

  const verified = isVerifiedValue(raw);

  return {
    id,
    userId: id,
    name,
    userName: name,
    avatar,
    userAvatar: avatar,
    verified,
    userVerified: verified,
    isVerified: verified,
    code: cleanString(raw?.code) || id,
  };
}

function normalizeProfiles(value: unknown): CollaboratorProfile[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((item, index) => normalizeProfile(item, `collab-${index}`))
    .filter((profile) => {
      if (!profile.id) return false;
      if (seen.has(profile.id)) return false;
      seen.add(profile.id);
      return true;
    })
    .slice(0, 50);
}

function createProfileFromUser(authUser: any): CollaboratorProfile {
  const userStore = useUserStore.getState() as any;
  const authStoreUser = useAuthStore.getState().user as any;

  const id = cleanString(authUser?.id || userStore?.id || authStoreUser?.id);

  const name =
    cleanString(authUser?.name) ||
    cleanString(userStore?.name) ||
    cleanString(authStoreUser?.name) ||
    cleanString(authUser?.email)?.split('@')?.[0] ||
    `User ${id.slice(0, 6)}`;

  const avatar =
    cleanString(authUser?.avatar) ||
    cleanString(userStore?.avatar) ||
    cleanString(authStoreUser?.avatar) ||
    '';

  const verified =
    isVerifiedValue(userStore) ||
    isVerifiedValue(authStoreUser) ||
    isVerifiedValue(authUser);

  return {
    id,
    userId: id,
    name,
    userName: name,
    avatar,
    userAvatar: avatar,
    verified,
    userVerified: verified,
    isVerified: verified,
    code: id,
  };
}

function addProfileOnce(
  profiles: CollaboratorProfile[] | undefined,
  profile: CollaboratorProfile
) {
  const list = Array.isArray(profiles) ? profiles : [];
  const exists = list.some((item) => item.id === profile.id || item.userId === profile.id);

  if (exists) return list;

  return [profile, ...list];
}

function dispatchPostEvents(type: 'created' | 'updated' | 'reposted' = 'updated') {
  try {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new Event('facemex:posts-updated'));
    window.dispatchEvent(new Event('facemex:feed-refresh'));

    if (type === 'created') {
      window.dispatchEvent(new Event('facemex:post-created'));
    }

    if (type === 'reposted') {
      window.dispatchEvent(new Event('facemex:post-reposted'));
    }
  } catch {
    // ignore
  }
}

function addShareToPost(post: Post, authUser: any) {
  const profile = createProfileFromUser(authUser);
  const now = new Date().toISOString();

  const sharedByUsers = addProfileOnce(post.sharedByUsers, profile);
  const repostedByUsers = addProfileOnce(post.repostedByUsers, profile);

  const wasAlreadyShared = (post.sharedByUsers || []).some(
    (item) => item.id === profile.id || item.userId === profile.id
  );

  return {
    ...post,
    shares: wasAlreadyShared ? post.shares : post.shares + 1,
    sharedBy: profile.name,
    shared_by: profile.name,
    sharedById: profile.id,
    shared_by_id: profile.id,
    sharedAt: now,
    shared_at: now,
    repostedBy: profile.name,
    reposted_by: profile.name,
    repostedById: profile.id,
    reposted_by_id: profile.id,
    repostedAt: now,
    reposted_at: now,
    isRepost: true,
    is_repost: true,
    sharedByUsers,
    repostedByUsers,
  };
}

function normalizeDocuments(value: unknown): PostDocument[] {
  const docs: PostDocument[] = [];

  const addDoc = (raw: any, index: number) => {
    if (!raw) return;

    if (typeof raw === 'string') {
      const url = cleanString(raw);
      if (!url) return;

      docs.push({
        id: `doc-${Date.now()}-${index}`,
        title: `Document ${index + 1}`,
        url,
        pages: [],
        totalPages: 1,
        previewPages: 1,
      });

      return;
    }

    const url = cleanString(
      raw.url ||
        raw.documentUrl ||
        raw.document_url ||
        raw.fileUrl ||
        raw.file_url ||
        raw.mediaUrl ||
        raw.media_url
    );

    const pages = normalizeStringArray(
      raw.pages ||
        raw.documentPages ||
        raw.document_pages ||
        raw.pageImages ||
        raw.page_images
    );

    if (!url && pages.length === 0) return;

    const title =
      cleanString(raw.title || raw.fileName || raw.file_name || raw.name) ||
      `Document ${index + 1}`;

    const totalPagesRaw = Number(
      raw.totalPages ||
        raw.total_pages ||
        raw.pageCount ||
        raw.page_count ||
        pages.length ||
        1
    );

    const totalPages = Math.max(
      1,
      Number.isFinite(totalPagesRaw) ? totalPagesRaw : 1
    );

    const previewPagesRaw = Number(
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
      Math.min(Number.isFinite(previewPagesRaw) ? previewPagesRaw : 1, totalPages)
    );

    docs.push({
      id: cleanString(raw.id) || `doc-${Date.now()}-${index}`,
      title,
      url,
      pages,
      totalPages,
      previewPages,
    });
  };

  if (Array.isArray(value)) {
    value.forEach((doc, index) => addDoc(doc, index));
    return docs;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        parsed.forEach((doc, index) => addDoc(doc, index));
      } else {
        addDoc(parsed, 0);
      }
    } catch {
      addDoc(value, 0);
    }
  }

  return docs;
}

function isExtraPostMedia(value: unknown): value is ExtraPostMedia {
  if (!value || typeof value !== 'object') return false;

  const raw = value as any;

  return (
    'image' in raw ||
    'images' in raw ||
    'video' in raw ||
    'videos' in raw ||
    'documents' in raw ||
    'documentUrl' in raw ||
    'document_url' in raw ||
    'mediaType' in raw ||
    'media_type' in raw ||
    'downloadsLocked' in raw ||
    'downloads_locked' in raw
  );
}

function normalizeMediaType(value: unknown): MediaType {
  const t = String(value || '').toLowerCase();

  if (t === 'image') return 'image';
  if (t === 'video') return 'video';
  if (t === 'audio') return 'audio';
  if (t === 'document') return 'document';
  if (t === 'text') return 'text';
  if (t === 'none') return 'none';

  return 'none';
}

function inferPrimaryMediaType(params: {
  explicit?: unknown;
  imageUrls: string[];
  videoUrls: string[];
  audioUrl?: string;
  documents: PostDocument[];
}) {
  const explicit = normalizeMediaType(params.explicit);

  if (explicit !== 'none') return explicit;
  if (params.videoUrls.length > 0) return 'video';
  if (params.imageUrls.length > 0) return 'image';
  if (params.audioUrl) return 'audio';
  if (params.documents.length > 0) return 'document';

  return 'none';
}

async function getProfileById(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return data;
}

async function ensureProfile() {
  let authUser = useAuthStore.getState().user;

  if (!authUser?.id) {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      alert('No logged-in user found. Login again.');
      return null;
    }

    authUser = {
      id: data.user.id,
      email: data.user.email || '',
      name:
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.email?.split('@')[0] ||
        `User ${String(data.user.id).slice(0, 6)}`,
      avatar: data.user.user_metadata?.avatar_url || '',
    } as any;
  }

  const existingProfile = await getProfileById(authUser.id);

  const displayName =
    getProfileName(existingProfile, authUser.id) ||
    authUser.name?.trim() ||
    authUser.email?.split('@')[0] ||
    `User ${String(authUser.id).slice(0, 6)}`;

  const avatarUrl =
    getProfileAvatar(existingProfile) ||
    authUser.avatar ||
    '';

  const { error } = await supabase.from('profiles').upsert({
    id: authUser.id,
    email: authUser.email || existingProfile?.email || '',
    full_name: displayName,
    name: displayName,
    username: existingProfile?.username || displayName,
    avatar_url: avatarUrl,
    avatar: avatarUrl,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.log('Profile sync error:', error.message);
  }

  try {
    localStorage.setItem('faceme_user_id', String(authUser.id));
    localStorage.setItem('faceme_user_name', String(displayName));
    localStorage.setItem('faceme_user_avatar', String(avatarUrl));
  } catch {
    // ignore
  }

  return {
    ...authUser,
    name: displayName,
    avatar: avatarUrl,
  };
}

function mapComment(raw: any): Comment {
  const verified = isVerifiedValue(raw);

  return {
    id: cleanString(raw?.id) || `c-${Date.now()}`,
    userId: cleanString(raw?.userId || raw?.user_id),
    userName:
      cleanString(raw?.userName || raw?.user_name || raw?.name) ||
      'FaceMeX Member',
    userAvatar:
      cleanString(raw?.userAvatar || raw?.user_avatar || raw?.avatar) || '',
    content: cleanString(raw?.content || raw?.text),
    voiceUrl: cleanString(raw?.voiceUrl || raw?.voice_url) || undefined,
    type: raw?.type === 'voice' || raw?.comment_type === 'voice' || raw?.voiceUrl || raw?.voice_url ? 'voice' : 'text',
    timestamp: getSafeDate(raw?.timestamp || raw?.createdAt || raw?.created_at),
    verified,
    userVerified: verified,
    isVerified: verified,
  };
}

function mapBackendPost(raw: any, currentUserId?: string): Post {
  const imageUrls = uniqueStrings([raw?.images, raw?.image]);
  const videoUrls = uniqueStrings([raw?.videos, raw?.video, raw?.videoUrl]);

  const documents = normalizeDocuments(raw?.documents);

  if (documents.length === 0 && (raw?.documentUrl || raw?.document_url || raw?.documentPages || raw?.document_pages)) {
    const documentPages = normalizeStringArray(raw?.documentPages || raw?.document_pages);

    documents.push({
      id: `${raw?.id || Date.now()}-document`,
      title: raw?.documentTitle || raw?.document_title || 'Document',
      url: raw?.documentUrl || raw?.document_url || '',
      pages: documentPages,
      totalPages: Number(raw?.documentTotalPages || raw?.document_total_pages || documentPages.length || 1),
      previewPages: Number(raw?.documentPreviewPages || raw?.document_preview_pages || 1),
    });
  }

  const likedBy = normalizeStringArray(raw?.likedBy);
  const myReaction = raw?.reaction;
  const isLiked =
    Boolean(raw?.isLiked) ||
    (!!currentUserId && likedBy.some((id) => id === currentUserId));

  const verified = isVerifiedValue(raw);

  const collaborators =
    normalizeProfiles(raw?.collaboratorProfiles).length > 0
      ? normalizeProfiles(raw?.collaboratorProfiles)
      : normalizeProfiles(raw?.collaborators);

  const collabInvites =
    normalizeProfiles(raw?.collaborationRequests).length > 0
      ? normalizeProfiles(raw?.collaborationRequests)
      : normalizeProfiles(raw?.collabInvites);

  const sharedByUsers = normalizeProfiles(
    raw?.sharedByUsers ||
      raw?.shared_by_users ||
      raw?.shareProfiles ||
      raw?.share_profiles ||
      raw?.sharesByUsers ||
      raw?.shares_by_users ||
      []
  );

  const repostedByUsers = normalizeProfiles(
    raw?.repostedByUsers ||
      raw?.reposted_by_users ||
      raw?.repostProfiles ||
      raw?.repost_profiles ||
      sharedByUsers
  );

  const mediaType = inferPrimaryMediaType({
    explicit: raw?.mediaType || raw?.media_type,
    imageUrls,
    videoUrls,
    audioUrl: raw?.audio || '',
    documents,
  });

  const createdAt = raw?.createdAt || raw?.created_at || raw?.timestamp;
  const repostedAt =
    raw?.repostedAt ||
    raw?.reposted_at ||
    raw?.sharedAt ||
    raw?.shared_at ||
    raw?.share_created_at ||
    '';

  return {
    id: cleanString(raw?.id || raw?._id),
    userId: cleanString(raw?.userId || raw?.user_id),
    userName:
      cleanString(raw?.userName || raw?.user_name || raw?.name) ||
      'FaceMeX Member',
    userAvatar:
      cleanString(raw?.userAvatar || raw?.user_avatar || raw?.avatar) || '',

    verified,
    userVerified: verified,
    authorVerified: verified,
    accountVerified: verified,
    isVerified: verified,
    is_verified: verified,

    content: cleanString(raw?.content),
    image: imageUrls[0] || undefined,
    images: imageUrls,
    video: videoUrls[0] || undefined,
    videos: videoUrls,
    audio: cleanString(raw?.audio) || undefined,
    mediaType,

    documents,
    documentUrl: documents[0]?.url || raw?.documentUrl || raw?.document_url || '',
    documentTitle: documents[0]?.title || raw?.documentTitle || raw?.document_title || '',
    documentPages: documents[0]?.pages || normalizeStringArray(raw?.documentPages || raw?.document_pages),
    documentTotalPages: documents[0]?.totalPages || Number(raw?.documentTotalPages || raw?.document_total_pages || 0),
    documentPreviewPages: documents[0]?.previewPages || Number(raw?.documentPreviewPages || raw?.document_preview_pages || 1),

    downloadsLocked:
      raw?.downloadsLocked === true ||
      raw?.downloads_locked === true ||
      raw?.imagesLocked === true ||
      raw?.images_locked === true ||
      raw?.mediaLocked === true ||
      raw?.media_locked === true,

    hashtags: Array.isArray(raw?.hashtags)
      ? raw.hashtags.map((tag: string) => cleanString(tag).replace(/^#/, '').toLowerCase()).filter(Boolean)
      : extractHashtagsStatic(raw?.content || ''),

    likes: Number(raw?.likes || likedBy.length || 0),
    comments: Array.isArray(raw?.comments) ? raw.comments.map(mapComment) : [],
    shares: Number(raw?.shares || sharedByUsers.length || 0),
    timestamp: getSafeDate(repostedAt || createdAt),
    createdAt,
    isLiked,
    isSaved: Boolean(raw?.isSaved),
    reaction: myReaction as ReactionType | undefined,
    mode: raw?.mode === 'professional' ? 'professional' : 'social',

    isRepost:
      raw?.isRepost === true ||
      raw?.is_repost === true ||
      Boolean(raw?.repostedBy || raw?.reposted_by || raw?.sharedBy || raw?.shared_by),
    is_repost:
      raw?.isRepost === true ||
      raw?.is_repost === true ||
      Boolean(raw?.repostedBy || raw?.reposted_by || raw?.sharedBy || raw?.shared_by),
    repostedBy: cleanString(raw?.repostedBy || raw?.reposted_by || raw?.sharedBy || raw?.shared_by),
    reposted_by: cleanString(raw?.reposted_by || raw?.repostedBy || raw?.shared_by || raw?.sharedBy),
    repostedById: cleanString(raw?.repostedById || raw?.reposted_by_id || raw?.sharedById || raw?.shared_by_id),
    reposted_by_id: cleanString(raw?.reposted_by_id || raw?.repostedById || raw?.shared_by_id || raw?.sharedById),
    repostedAt,
    reposted_at: repostedAt,
    sharedBy: cleanString(raw?.sharedBy || raw?.shared_by || raw?.repostedBy || raw?.reposted_by),
    shared_by: cleanString(raw?.shared_by || raw?.sharedBy || raw?.reposted_by || raw?.repostedBy),
    sharedById: cleanString(raw?.sharedById || raw?.shared_by_id || raw?.repostedById || raw?.reposted_by_id),
    shared_by_id: cleanString(raw?.shared_by_id || raw?.sharedById || raw?.reposted_by_id || raw?.repostedById),
    sharedAt: repostedAt,
    shared_at: repostedAt,
    sharedByUsers,
    repostedByUsers,

    collabInvites,
    collaborators,
    collaboratorProfiles: collaborators,
    collaborationRequests: collabInvites,
  };
}

function extractHashtagsStatic(content: string) {
  const matches = String(content || '').match(/#[\w]+/g);
  return matches ? matches.map((tag) => tag.slice(1).toLowerCase()) : [];
}

function sortPosts(posts: Post[]) {
  return [...posts].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

function mergePosts(primary: Post[], secondary: Post[]) {
  const map = new Map<string, Post>();

  [...secondary, ...primary].forEach((post) => {
    if (!post.id) return;

    const existing = map.get(post.id);

    if (!existing) {
      map.set(post.id, post);
      return;
    }

    map.set(post.id, {
      ...existing,
      ...post,
      sharedByUsers: normalizeProfiles([
        ...(existing.sharedByUsers || []),
        ...(post.sharedByUsers || []),
      ]),
      repostedByUsers: normalizeProfiles([
        ...(existing.repostedByUsers || []),
        ...(post.repostedByUsers || []),
      ]),
      shares: Math.max(existing.shares || 0, post.shares || 0),
    });
  });

  return sortPosts(Array.from(map.values()));
}

async function loadSupabasePosts(currentUserId?: string): Promise<Post[]> {
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (postsError) {
    console.log('Supabase load posts error:', postsError.message);
    return [];
  }

  const posts = postsData || [];
  const postIds = posts.map((p: any) => p.id).filter(Boolean);
  const postAuthorIds = posts.map((p: any) => p.user_id).filter(Boolean);

  const [commentsResult, reactionsResult, sharesResult, savesResult] = await Promise.all([
    postIds.length
      ? supabase.from('post_comments').select('*').in('post_id', postIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null } as any),
    postIds.length
      ? supabase.from('post_reactions').select('*').in('post_id', postIds)
      : Promise.resolve({ data: [], error: null } as any),
    postIds.length
      ? supabase.from('post_shares').select('*').in('post_id', postIds)
      : Promise.resolve({ data: [], error: null } as any),
    postIds.length && currentUserId
      ? supabase.from('post_saves').select('*').in('post_id', postIds).eq('user_id', currentUserId)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const comments = commentsResult.data || [];
  const reactions = reactionsResult.data || [];
  const shares = sharesResult.data || [];
  const saves = savesResult.data || [];

  const savedPostIds = new Set(saves.map((s: any) => s.post_id));
  const commentUserIds = comments.map((c: any) => c.user_id).filter(Boolean);
  const shareUserIds = shares.map((s: any) => s.user_id).filter(Boolean);
  const allUserIds = Array.from(new Set([...postAuthorIds, ...commentUserIds, ...shareUserIds]));

  const { data: profiles, error: profilesError } = allUserIds.length
    ? await supabase.from('profiles').select('*').in('id', allUserIds)
    : ({ data: [], error: null } as any);

  if (profilesError) console.log('Profiles load error:', profilesError.message);

  const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

  const reactionCountMap = new Map<string, number>();
  const myReactionMap = new Map<string, string>();

  reactions.forEach((r: any) => {
    reactionCountMap.set(r.post_id, (reactionCountMap.get(r.post_id) || 0) + 1);

    if (currentUserId && r.user_id === currentUserId) {
      myReactionMap.set(r.post_id, r.reaction || 'like');
    }
  });

  const shareRowsByPost = new Map<string, any[]>();

  shares.forEach((s: any) => {
    const list = shareRowsByPost.get(s.post_id) || [];
    list.push(s);
    shareRowsByPost.set(s.post_id, list);
  });

  const commentsByPost = new Map<string, Comment[]>();

  comments.forEach((c: any) => {
    const profile = profileMap.get(c.user_id);
    const verified = isVerifiedValue(profile);

    const nextComment: Comment = {
      id: c.id,
      userId: c.user_id,
      userName: getProfileName(profile, c.user_id),
      userAvatar: getProfileAvatar(profile),
      content: c.content || '',
      voiceUrl: c.voice_url || undefined,
      type: c.comment_type === 'voice' ? 'voice' : 'text',
      timestamp: getSafeDate(c.created_at),
      verified,
      userVerified: verified,
      isVerified: verified,
    };

    const list = commentsByPost.get(c.post_id) || [];
    list.push(nextComment);
    commentsByPost.set(c.post_id, list);
  });

  return posts.map((p: any) => {
    const profile = profileMap.get(p.user_id);
    const myReaction = myReactionMap.get(p.id);

    const imageUrls = uniqueStrings([p.images, p.image, p.media_type === 'image' ? p.media_url : '']);
    const videoUrls = uniqueStrings([p.videos, p.video, p.media_type === 'video' ? p.media_url : '']);

    const documents = normalizeDocuments(p.documents);

    if (documents.length === 0 && (p.document_url || p.document_pages)) {
      const documentPages = normalizeStringArray(p.document_pages);

      documents.push({
        id: `${p.id}-document`,
        title: p.document_title || 'Document',
        url: p.document_url || '',
        pages: documentPages,
        totalPages: Number(p.document_total_pages || documentPages.length || 1),
        previewPages: Number(p.document_preview_pages || 1),
      });
    }

    const audioUrl = p.media_type === 'audio' ? p.media_url || '' : p.audio || '';

    const mediaType = inferPrimaryMediaType({
      explicit: p.media_type,
      imageUrls,
      videoUrls,
      audioUrl,
      documents,
    });

    const verified = isVerifiedValue(profile) || isVerifiedValue(p);

    const shareRows = shareRowsByPost.get(p.id) || [];
    const sharedByUsers = shareRows
      .map((share: any) => {
        const shareProfile = profileMap.get(share.user_id);

        return normalizeProfile(
          {
            ...(shareProfile || {}),
            id: share.user_id,
            userId: share.user_id,
            verified: isVerifiedValue(shareProfile),
            userVerified: isVerifiedValue(shareProfile),
            isVerified: isVerifiedValue(shareProfile),
          },
          share.user_id
        );
      })
      .filter((item: CollaboratorProfile) => item.id);

    const myShare = currentUserId
      ? shareRows.find((share: any) => share.user_id === currentUserId)
      : null;

    const latestShare = shareRows
      .slice()
      .sort((a: any, b: any) => {
        return getSafeDate(b.created_at).getTime() - getSafeDate(a.created_at).getTime();
      })[0];

    const latestShareProfile = latestShare?.user_id
      ? normalizeProfile(
          {
            ...(profileMap.get(latestShare.user_id) || {}),
            id: latestShare.user_id,
            userId: latestShare.user_id,
          },
          latestShare.user_id
        )
      : null;

    const shareCreatedAt = latestShare?.created_at || '';
    const myShareCreatedAt = myShare?.created_at || '';

    return {
      id: p.id,
      userId: p.user_id,
      userName: getProfileName(profile, p.user_id),
      userAvatar: getProfileAvatar(profile),

      verified,
      userVerified: verified,
      authorVerified: verified,
      accountVerified: verified,
      isVerified: verified,
      is_verified: verified,

      content: p.content || '',
      image: imageUrls[0] || undefined,
      images: imageUrls,
      video: videoUrls[0] || undefined,
      videos: videoUrls,
      audio: audioUrl || undefined,
      mediaType,

      documents,
      documentUrl: documents[0]?.url || p.document_url || '',
      documentTitle: documents[0]?.title || p.document_title || '',
      documentPages: documents[0]?.pages || normalizeStringArray(p.document_pages),
      documentTotalPages: documents[0]?.totalPages || Number(p.document_total_pages || 0),
      documentPreviewPages: documents[0]?.previewPages || Number(p.document_preview_pages || 1),

      downloadsLocked:
        p.downloads_locked === true ||
        p.downloadsLocked === true ||
        p.images_locked === true ||
        p.imagesLocked === true,

      hashtags: extractHashtagsStatic(p.content || ''),
      likes: reactionCountMap.get(p.id) || 0,
      comments: commentsByPost.get(p.id) || [],
      shares: shareRows.length,
      timestamp: getSafeDate(myShareCreatedAt || p.created_at),
      createdAt: p.created_at,
      isLiked: !!myReaction,
      isSaved: savedPostIds.has(p.id),
      reaction: myReaction as ReactionType | undefined,
      mode: p.mode || 'social',

      isRepost: Boolean(myShare),
      is_repost: Boolean(myShare),
      sharedBy: latestShareProfile?.name || '',
      shared_by: latestShareProfile?.name || '',
      sharedById: latestShareProfile?.id || '',
      shared_by_id: latestShareProfile?.id || '',
      sharedAt: shareCreatedAt,
      shared_at: shareCreatedAt,
      repostedBy: latestShareProfile?.name || '',
      reposted_by: latestShareProfile?.name || '',
      repostedById: latestShareProfile?.id || '',
      reposted_by_id: latestShareProfile?.id || '',
      repostedAt: shareCreatedAt,
      reposted_at: shareCreatedAt,
      sharedByUsers,
      repostedByUsers: sharedByUsers,

      collabInvites: [],
      collaborators: [],
      collaboratorProfiles: [],
      collaborationRequests: [],
    } as Post;
  });
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  trendingHashtags: [],
  aiSuggestions: [],

  loadPosts: async () => {
    const authUser = useAuthStore.getState().user;
    const currentUserId = authUser?.id || useUserStore.getState().id || '';

    let backendPosts: Post[] = [];
    let supabasePosts: Post[] = [];

    try {
      const data = await api.get('/api/posts');

      if (Array.isArray(data)) {
        backendPosts = data.map((post) => mapBackendPost(post, currentUserId));
      }
    } catch (error) {
      console.log('Backend posts unavailable, using Supabase fallback.');
    }

    try {
      supabasePosts = await loadSupabasePosts(currentUserId);
    } catch (error) {
      console.log('Supabase posts unavailable.');
    }

    const mapped = mergePosts(backendPosts, supabasePosts);

    const tagCount = new Map<string, number>();

    mapped.forEach((post) => {
      post.hashtags.forEach((tag) => tagCount.set(tag, (tagCount.get(tag) || 0) + 1));
    });

    const trendingHashtags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    set({ posts: mapped, trendingHashtags });
  },

  addPost: async (
    content,
    images,
    audio,
    hashtags,
    mode,
    professionalCategoryOrExtra,
    professionalAgreed = false
  ) => {
    const authUser = await ensureProfile();

    if (!authUser?.id) {
      alert('No user found. Please login again.');
      return;
    }

    let professionalCategory: ProfessionalCategory | undefined;
    let extraMedia: ExtraPostMedia = {};

    if (isExtraPostMedia(professionalCategoryOrExtra)) {
      extraMedia = professionalCategoryOrExtra;
    } else {
      professionalCategory = professionalCategoryOrExtra;
    }

    if (mode === 'professional') {
      const userStore = useUserStore.getState() as any;
      const authStoreUser = useAuthStore.getState().user as any;
      const tier = String(userStore?.tier || authStoreUser?.tier || 'free').toLowerCase();

      const canPostProfessional =
        userStore?.hasTier?.('creator') ||
        tier === 'creator' ||
        tier === 'business' ||
        tier === 'exclusive';

      if (!canPostProfessional) {
        alert('Professional Mode posting is for Creator tier and above.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('professional_banned_until, professional_ban_reason')
        .eq('id', authUser.id)
        .maybeSingle();

      if (
        profile?.professional_banned_until &&
        new Date(profile.professional_banned_until).getTime() > Date.now()
      ) {
        alert(
          profile.professional_ban_reason ||
            'You are temporarily restricted from posting in Professional Mode.'
        );
        return;
      }

      if (professionalCategory || professionalAgreed) {
        const check = validateProfessionalPost({
          content,
          category: professionalCategory,
          agreed: professionalAgreed,
        });

        if (!check.allowed) {
          alert(check.reason);
          return;
        }
      }
    }

    const imageUrls = uniqueStrings([images || [], extraMedia.images || [], extraMedia.image || '']);
    const videoUrls = uniqueStrings([extraMedia.videos || [], extraMedia.video || '']);
    const documents = normalizeDocuments(extraMedia.documents || []);

    if (documents.length === 0 && (extraMedia.documentUrl || extraMedia.document_url)) {
      const documentPages = normalizeStringArray(extraMedia.documentPages || extraMedia.document_pages);

      documents.push({
        id: `doc-${Date.now()}`,
        title: extraMedia.documentTitle || extraMedia.document_title || 'Document',
        url: extraMedia.documentUrl || extraMedia.document_url || '',
        pages: documentPages,
        totalPages: Number(
          extraMedia.documentTotalPages ||
            extraMedia.document_total_pages ||
            documentPages.length ||
            1
        ),
        previewPages: Number(
          extraMedia.documentPreviewPages ||
            extraMedia.document_preview_pages ||
            1
        ),
      });
    }

    const explicitMediaType = extraMedia.mediaType || extraMedia.media_type || undefined;

    const primaryMediaType = inferPrimaryMediaType({
      explicit: explicitMediaType,
      imageUrls,
      videoUrls,
      audioUrl: audio || '',
      documents,
    });

    const mediaUrl =
      primaryMediaType === 'video'
        ? videoUrls[0] || ''
        : primaryMediaType === 'image'
          ? imageUrls[0] || ''
          : primaryMediaType === 'audio'
            ? audio || ''
            : primaryMediaType === 'document'
              ? documents[0]?.url || ''
              : '';

    try {
      const created = await api.post('/api/posts', {
        content,
        image: imageUrls[0] || '',
        images: imageUrls,
        audio: audio || '',
        video: videoUrls[0] || '',
        videos: videoUrls,
        mediaType: primaryMediaType,
        media_type: primaryMediaType,
        documents,
        documentUrl: documents[0]?.url || '',
        documentTitle: documents[0]?.title || '',
        documentPages: documents[0]?.pages || [],
        documentTotalPages: documents[0]?.totalPages || 0,
        documentPreviewPages: documents[0]?.previewPages || 1,
        mode: mode || 'social',
        hashtags: [...new Set([...extractHashtagsStatic(content), ...(hashtags || [])])],
        downloadsLocked: extraMedia.downloadsLocked || extraMedia.downloads_locked || false,
        professionalCategory: mode === 'professional' ? professionalCategory || null : null,
        professionalAgreed: mode === 'professional' ? professionalAgreed : false,
      });

      const newPost = mapBackendPost(created, authUser.id);

      set({ posts: sortPosts([newPost, ...get().posts]) });
      dispatchPostEvents('created');
      return;
    } catch (error) {
      console.log('Backend add post failed, trying Supabase fallback.');
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: authUser.id,
        content,
        media_url: mediaUrl || null,
        media_type: primaryMediaType,
        mode: mode || 'social',
        images: imageUrls,
        video: videoUrls[0] || '',
        videos: videoUrls,
        documents,
        document_url: documents[0]?.url || '',
        document_title: documents[0]?.title || '',
        document_pages: documents[0]?.pages || [],
        document_total_pages: documents[0]?.totalPages || 0,
        document_preview_pages: documents[0]?.previewPages || 1,
        professional_category: mode === 'professional' ? professionalCategory || null : null,
        professional_agreed: mode === 'professional' ? professionalAgreed : false,
        moderation_status: 'approved',
      })
      .select()
      .single();

    if (error) {
      alert(`Add post error: ${error.message}`);
      return;
    }

    const profile = {
      full_name: authUser.name,
      name: authUser.name,
      email: authUser.email,
      avatar_url: authUser.avatar,
      avatar: authUser.avatar,
    };

    const verified =
      isVerifiedValue(useUserStore.getState()) ||
      isVerifiedValue(useAuthStore.getState().user);

    const newPost: Post = {
      id: data.id,
      userId: authUser.id,
      userName: getProfileName(profile, authUser.id),
      userAvatar: getProfileAvatar(profile),

      verified,
      userVerified: verified,
      authorVerified: verified,
      accountVerified: verified,
      isVerified: verified,
      is_verified: verified,

      content,
      image: imageUrls[0] || undefined,
      images: imageUrls,
      video: videoUrls[0] || undefined,
      videos: videoUrls,
      audio: audio || undefined,
      mediaType: primaryMediaType,
      documents,
      documentUrl: documents[0]?.url || '',
      documentTitle: documents[0]?.title || '',
      documentPages: documents[0]?.pages || [],
      documentTotalPages: documents[0]?.totalPages || 0,
      documentPreviewPages: documents[0]?.previewPages || 1,
      hashtags: [...new Set([...extractHashtagsStatic(content), ...(hashtags || [])])],
      likes: 0,
      comments: [],
      shares: 0,
      timestamp: getSafeDate(data.created_at),
      createdAt: data.created_at,
      isLiked: false,
      isSaved: false,
      mode: mode || 'social',
      sharedByUsers: [],
      repostedByUsers: [],
      collabInvites: [],
      collaborators: [],
      collaboratorProfiles: [],
      collaborationRequests: [],
    };

    set({ posts: sortPosts([newPost, ...get().posts]) });
    dispatchPostEvents('created');
  },

  likePost: async (postId, reaction = 'like') => {
    const authUser = await ensureProfile();
    if (!authUser?.id) return;

    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      const updated = await api.post(`/api/posts/${postId}/like`, { reaction });
      const mapped = mapBackendPost(updated, authUser.id);

      set({
        posts: get().posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                ...mapped,
                isLiked: !post.isLiked || post.reaction !== reaction,
                reaction: (!post.isLiked || post.reaction !== reaction) ? reaction as ReactionType : undefined,
              }
            : p
        ),
      });

      dispatchPostEvents('updated');
      return;
    } catch {
      // fallback below
    }

    if (post.isLiked && post.reaction === reaction) {
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', authUser.id);

      if (error) return;

      set({
        posts: get().posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: false,
                reaction: undefined,
                likes: Math.max(0, p.likes - 1),
              }
            : p
        ),
      });

      dispatchPostEvents('updated');
      return;
    }

    const { error } = await supabase.from('post_reactions').upsert(
      { post_id: postId, user_id: authUser.id, reaction },
      { onConflict: 'post_id,user_id' }
    );

    if (error) return;

    set({
      posts: get().posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: true,
              reaction: reaction as ReactionType,
              likes: p.isLiked ? p.likes : p.likes + 1,
            }
          : p
      ),
    });

    dispatchPostEvents('updated');
  },

  addComment: async (postId, content) => {
    const authUser = await ensureProfile();
    if (!authUser?.id || !content.trim()) return;

    try {
      const data = await api.post(`/api/posts/${postId}/comment`, { text: content, content });
      const newComment = mapComment(data);

      set({
        posts: get().posts.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
        ),
      });

      dispatchPostEvents('updated');
      return;
    } catch {
      // fallback below
    }

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: authUser.id,
        content,
        comment_type: 'text',
      })
      .select()
      .single();

    if (error) return;

    const profile = {
      full_name: authUser.name,
      name: authUser.name,
      email: authUser.email,
      avatar_url: authUser.avatar,
      avatar: authUser.avatar,
    };

    const verified =
      isVerifiedValue(useUserStore.getState()) ||
      isVerifiedValue(useAuthStore.getState().user);

    const newComment: Comment = {
      id: data.id,
      userId: authUser.id,
      userName: getProfileName(profile, authUser.id),
      userAvatar: getProfileAvatar(profile),
      content,
      type: 'text',
      timestamp: getSafeDate(data.created_at),
      verified,
      userVerified: verified,
      isVerified: verified,
    };

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
      ),
    });

    dispatchPostEvents('updated');
  },

  addVoiceComment: async (postId, voiceUrl) => {
    const authUser = await ensureProfile();
    if (!authUser?.id || !voiceUrl) return;

    try {
      const data = await api.post(`/api/posts/${postId}/voice-comment`, { voiceUrl });
      const newComment = mapComment(data);

      set({
        posts: get().posts.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
        ),
      });

      dispatchPostEvents('updated');
      return;
    } catch {
      // fallback below
    }

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: authUser.id,
        content: '',
        voice_url: voiceUrl,
        comment_type: 'voice',
      })
      .select()
      .single();

    if (error) return;

    const profile = {
      full_name: authUser.name,
      name: authUser.name,
      email: authUser.email,
      avatar_url: authUser.avatar,
      avatar: authUser.avatar,
    };

    const verified =
      isVerifiedValue(useUserStore.getState()) ||
      isVerifiedValue(useAuthStore.getState().user);

    const newComment: Comment = {
      id: data.id,
      userId: authUser.id,
      userName: getProfileName(profile, authUser.id),
      userAvatar: getProfileAvatar(profile),
      content: '',
      voiceUrl,
      type: 'voice',
      timestamp: getSafeDate(data.created_at),
      verified,
      userVerified: verified,
      isVerified: verified,
    };

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
      ),
    });

    dispatchPostEvents('updated');
  },

  editPost: async (postId, content) => {
    try {
      const data = await api.patch(`/api/posts/${postId}`, { content });
      const currentUserId = useAuthStore.getState().user?.id || useUserStore.getState().id || '';
      const updated = mapBackendPost(data, currentUserId);

      set({
        posts: get().posts.map((p) => (p.id === postId ? { ...p, ...updated } : p)),
      });

      dispatchPostEvents('updated');
      return;
    } catch {
      // fallback below
    }

    const { error } = await supabase.from('posts').update({ content }).eq('id', postId);
    if (error) {
      alert(`Edit post failed: ${error.message}`);
      return;
    }

    set({
      posts: get().posts.map((p) =>
        p.id === postId
          ? { ...p, content, hashtags: extractHashtagsStatic(content) }
          : p
      ),
    });

    dispatchPostEvents('updated');
  },

  deletePost: async (postId) => {
    try {
      await api.delete(`/api/posts/${postId}`);

      set({ posts: get().posts.filter((p) => p.id !== postId) });
      dispatchPostEvents('updated');
      return;
    } catch {
      // fallback below
    }

    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      alert(`Delete post failed: ${error.message}`);
      return;
    }

    set({ posts: get().posts.filter((p) => p.id !== postId) });
    dispatchPostEvents('updated');
  },

  editComment: async (postId, commentId, content) => {
    try {
      const data = await api.patch(`/api/posts/${postId}/comment/${commentId}`, {
        text: content,
        content,
      });

      const updatedComment = mapComment(data);

      set({
        posts: get().posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c.id === commentId ? { ...c, ...updatedComment } : c
                ),
              }
            : p
        ),
      });

      dispatchPostEvents('updated');
      return;
    } catch {
      // fallback below
    }

    const { error } = await supabase
      .from('post_comments')
      .update({ content })
      .eq('id', commentId);

    if (error) return;

    set({
      posts: get().posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments.map((c) =>
                c.id === commentId ? { ...c, content } : c
              ),
            }
          : p
      ),
    });

    dispatchPostEvents('updated');
  },

  deleteComment: async (postId, commentId) => {
    try {
      await api.delete(`/api/posts/${postId}/comment/${commentId}`);

      set({
        posts: get().posts.map((p) =>
          p.id === postId
            ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
            : p
        ),
      });

      dispatchPostEvents('updated');
      return;
    } catch {
      // fallback below
    }

    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);

    if (error) {
      alert(`Delete comment failed: ${error.message}`);
      return;
    }

    set({
      posts: get().posts.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p
      ),
    });

    dispatchPostEvents('updated');
  },

  sharePost: async (postId) => {
    const authUser = await ensureProfile();
    if (!authUser?.id) return;

    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      const data = await api.post(`/api/posts/${postId}/share`, {});
      const updated = mapBackendPost(data, authUser.id);
      const shared = addShareToPost({ ...post, ...updated }, authUser);

      set({
        posts: get().posts.map((p) =>
          p.id === postId ? shared : p
        ),
      });

      dispatchPostEvents('reposted');
      return;
    } catch {
      // fallback below
    }

    const { error } = await supabase
      .from('post_shares')
      .insert({ post_id: postId, user_id: authUser.id });

    if (error) {
      console.log('Share insert warning:', error.message);
    }

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? addShareToPost(p, authUser) : p
      ),
    });

    dispatchPostEvents('reposted');
  },

  savePost: async (postId) => {
    const authUser = await ensureProfile();
    if (!authUser?.id) return;

    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.isSaved) {
      const { error } = await supabase
        .from('post_saves')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', authUser.id);

      if (error) {
        try {
          const raw = localStorage.getItem('faceme_saved_posts_v1');
          const ids = raw ? (JSON.parse(raw) as string[]) : [];
          const updated = ids.filter((id) => id !== postId);
          localStorage.setItem('faceme_saved_posts_v1', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }

      set({
        posts: get().posts.map((p) =>
          p.id === postId ? { ...p, isSaved: false } : p
        ),
      });

      dispatchPostEvents('updated');
      return;
    }

    const { error } = await supabase
      .from('post_saves')
      .insert({ post_id: postId, user_id: authUser.id });

    if (error) {
      try {
        const raw = localStorage.getItem('faceme_saved_posts_v1');
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        const updated = Array.from(new Set([...ids, postId]));
        localStorage.setItem('faceme_saved_posts_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, isSaved: true } : p
      ),
    });

    dispatchPostEvents('updated');
  },

  inviteCollaborator: async (postId, userId, extra) => {
    const authUser = await ensureProfile();
    if (!authUser?.id) return;

    try {
      const data = await api.post(`/api/posts/${postId}/collab/invite`, {
        userId,
        code: extra?.code,
        name: extra?.name,
        avatar: extra?.avatar,
      });

      const rawPost = data?.post || data;
      const updated = rawPost?.id ? mapBackendPost(rawPost, authUser.id) : null;

      if (updated) {
        set({
          posts: get().posts.map((p) =>
            p.id === postId ? { ...p, ...updated } : p
          ),
        });

        dispatchPostEvents('updated');
      }

      return;
    } catch (error) {
      console.error('Invite collaborator failed:', error);
      alert('Could not send collaboration request. Check backend route /api/posts/:id/collab/invite.');
    }
  },

  acceptCollabInvite: async (postId, userId) => {
    const authUser = await ensureProfile();
    if (!authUser?.id) return;

    try {
      const data = await api.post(`/api/posts/${postId}/collab/accept`, {
        userId,
        collaboratorId: userId,
      });

      const rawPost = data?.post || data;
      const updated = rawPost?.id ? mapBackendPost(rawPost, authUser.id) : null;

      if (updated) {
        set({
          posts: get().posts.map((p) =>
            p.id === postId ? { ...p, ...updated } : p
          ),
        });

        dispatchPostEvents('updated');
      }

      return;
    } catch (error) {
      console.error('Accept collaborator failed:', error);
      alert('Could not accept collaborator.');
    }
  },

  rejectCollabInvite: async (postId, userId) => {
    const authUser = await ensureProfile();
    if (!authUser?.id) return;

    try {
      const data = await api.post(`/api/posts/${postId}/collab/reject`, {
        userId,
        collaboratorId: userId,
      });

      const rawPost = data?.post || data;
      const updated = rawPost?.id ? mapBackendPost(rawPost, authUser.id) : null;

      if (updated) {
        set({
          posts: get().posts.map((p) =>
            p.id === postId ? { ...p, ...updated } : p
          ),
        });

        dispatchPostEvents('updated');
      }

      return;
    } catch (error) {
      console.error('Reject collaborator failed:', error);
      alert('Could not decline collaborator.');
    }
  },

  removeCollaborator: async (postId, userId) => {
    const authUser = await ensureProfile();
    if (!authUser?.id) return;

    try {
      const data = await api.delete(`/api/posts/${postId}/collab/${encodeURIComponent(userId)}`);
      const rawPost = data?.post || data;
      const updated = rawPost?.id ? mapBackendPost(rawPost, authUser.id) : null;

      if (updated) {
        set({
          posts: get().posts.map((p) =>
            p.id === postId ? { ...p, ...updated } : p
          ),
        });

        dispatchPostEvents('updated');
      }
    } catch (error) {
      console.error('Remove collaborator failed:', error);
      alert('Could not remove collaborator.');
    }
  },

  toggleDownloadsLocked: async (postId, locked) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    const nextLocked =
      typeof locked === 'boolean'
        ? locked
        : !Boolean(post.downloadsLocked || post.downloads_locked || post.imagesLocked || post.images_locked);

    try {
      const data = await api.patch(`/api/posts/${postId}/downloads-lock`, {
        locked: nextLocked,
        downloadsLocked: nextLocked,
      });

      const currentUserId = useAuthStore.getState().user?.id || useUserStore.getState().id || '';
      const updated = data?.id ? mapBackendPost(data, currentUserId) : null;

      if (updated) {
        set({
          posts: get().posts.map((p) =>
            p.id === postId ? { ...p, ...updated } : p
          ),
        });
      } else {
        set({
          posts: get().posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  downloadsLocked: nextLocked,
                  downloads_locked: nextLocked,
                  imagesLocked: nextLocked,
                  images_locked: nextLocked,
                  mediaLocked: nextLocked,
                  media_locked: nextLocked,
                }
              : p
          ),
        });
      }

      dispatchPostEvents('updated');
      return;
    } catch {
      // local fallback
    }

    try {
      localStorage.setItem(`facemex:post_downloads_locked:${postId}`, String(nextLocked));
    } catch {
      // ignore
    }

    set({
      posts: get().posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              downloadsLocked: nextLocked,
              downloads_locked: nextLocked,
              imagesLocked: nextLocked,
              images_locked: nextLocked,
              mediaLocked: nextLocked,
              media_locked: nextLocked,
            }
          : p
      ),
    });

    dispatchPostEvents('updated');
  },

  extractHashtags: (content) => extractHashtagsStatic(content),

  getAISuggestions: (content) => {
    const keywords = content.toLowerCase();
    const suggestions: string[] = [];

    if (keywords.includes('code') || keywords.includes('dev')) {
      suggestions.push('#coding', '#webdev', '#programming');
    }

    if (keywords.includes('business') || keywords.includes('work')) {
      suggestions.push('#business', '#career', '#networking');
    }

    if (keywords.includes('video') || keywords.includes('tiktok')) {
      suggestions.push('#video', '#creator', '#trending');
    }

    return suggestions.slice(0, 5);
  },
}));
