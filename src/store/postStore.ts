import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
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
}

export type PostDocument = {
  id: string;
  title: string;
  url: string;
  pages: string[];
  totalPages: number;
  previewPages: number;
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
};

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
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
  hashtags: string[];
  likes: number;
  comments: Comment[];
  shares: number;
  timestamp: Date;
  isLiked: boolean;
  isSaved?: boolean;
  reaction?: ReactionType;
  mood?: string;
  aiScore?: number;
  mode?: PostMode;
  collabInvites?: string[];
  collaborators?: string[];
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
  inviteCollaborator: (postId: string, userId: string) => Promise<void>;
  acceptCollabInvite: (postId: string) => Promise<void>;
  rejectCollabInvite: (postId: string) => Promise<void>;
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
    } catch {}

    if (value.includes(',')) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
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

function normalizeDocuments(value: unknown): PostDocument[] {
  const docs: PostDocument[] = [];

  const addDoc = (raw: any, index: number) => {
    if (!raw) return;

    const url = cleanString(
      raw.url || raw.documentUrl || raw.document_url || raw.fileUrl || raw.file_url || raw.mediaUrl || raw.media_url
    );

    const pages = normalizeStringArray(
      raw.pages || raw.documentPages || raw.document_pages || raw.pageImages || raw.page_images
    );

    if (!url && pages.length === 0) return;

    const title = cleanString(raw.title || raw.fileName || raw.file_name || raw.name) || `Document ${index + 1}`;

    const totalPagesRaw = Number(raw.totalPages || raw.total_pages || raw.pageCount || raw.page_count || pages.length || 1);
    const totalPages = Math.max(1, Number.isFinite(totalPagesRaw) ? totalPagesRaw : 1);

    const previewPagesRaw = Number(
      raw.previewPages || raw.preview_pages || raw.unlockedPages || raw.unlocked_pages || raw.visiblePages || raw.visible_pages || Math.min(1, totalPages)
    );
    const previewPages = Math.max(1, Math.min(Number.isFinite(previewPagesRaw) ? previewPagesRaw : 1, totalPages));

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
      if (Array.isArray(parsed)) parsed.forEach((doc, index) => addDoc(doc, index));
    } catch {}
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
    'media_type' in raw
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

function getProfileName(profile: any, fallbackId?: string) {
  return (
    profile?.full_name?.trim() ||
    profile?.name?.trim() ||
    profile?.username?.trim() ||
    profile?.email?.split('@')[0] ||
    `User ${String(fallbackId || '').slice(0, 6)}`
  );
}

function getProfileAvatar(profile: any) {
  return profile?.avatar_url || profile?.avatar || '';
}

async function getProfileById(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, name, username, avatar_url, avatar')
    .eq('id', userId)
    .maybeSingle();

  return data;
}

async function ensureProfile() {
  let authUser = useAuthStore.getState().user;

  if (!authUser?.id) {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      alert('No logged-in Supabase user found. Login again.');
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
    existingProfile?.full_name ||
    existingProfile?.name ||
    existingProfile?.username ||
    authUser.name?.trim() ||
    authUser.email?.split('@')[0] ||
    `User ${String(authUser.id).slice(0, 6)}`;

  const avatarUrl = existingProfile?.avatar_url || existingProfile?.avatar || authUser.avatar || '';

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
    alert(`Profile error: ${error.message}`);
    return null;
  }

  return {
    ...authUser,
    name: displayName,
    avatar: avatarUrl,
  };
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  trendingHashtags: [],
  aiSuggestions: [],

  loadPosts: async () => {
    const authUser = useAuthStore.getState().user;
    const currentUserId = authUser?.id;

    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) {
      alert(`Load posts error: ${postsError.message}`);
      return;
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
    const allUserIds = Array.from(new Set([...postAuthorIds, ...commentUserIds]));

    const { data: profiles, error: profilesError } = allUserIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, name, username, email, avatar_url, avatar')
          .in('id', allUserIds)
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

    const shareCountMap = new Map<string, number>();
    shares.forEach((s: any) => {
      shareCountMap.set(s.post_id, (shareCountMap.get(s.post_id) || 0) + 1);
    });

    const commentsByPost = new Map<string, Comment[]>();
    comments.forEach((c: any) => {
      const profile = profileMap.get(c.user_id);
      const nextComment: Comment = {
        id: c.id,
        userId: c.user_id,
        userName: getProfileName(profile, c.user_id),
        userAvatar: getProfileAvatar(profile),
        content: c.content || '',
        voiceUrl: c.voice_url || undefined,
        type: c.comment_type === 'voice' ? 'voice' : 'text',
        timestamp: new Date(c.created_at || Date.now()),
      };

      const list = commentsByPost.get(c.post_id) || [];
      list.push(nextComment);
      commentsByPost.set(c.post_id, list);
    });

    const mapped: Post[] = posts.map((p: any) => {
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

      return {
        id: p.id,
        userId: p.user_id,
        userName: getProfileName(profile, p.user_id),
        userAvatar: getProfileAvatar(profile),
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
        hashtags: get().extractHashtags(p.content || ''),
        likes: reactionCountMap.get(p.id) || 0,
        comments: commentsByPost.get(p.id) || [],
        shares: shareCountMap.get(p.id) || 0,
        timestamp: new Date(p.created_at || Date.now()),
        isLiked: !!myReaction,
        isSaved: savedPostIds.has(p.id),
        reaction: myReaction as ReactionType | undefined,
        mode: p.mode || 'social',
        collabInvites: [],
        collaborators: [],
      };
    });

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

  addPost: async (content, images, audio, hashtags, mode, professionalCategoryOrExtra, professionalAgreed = false) => {
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
        userStore?.hasTier?.('creator') || tier === 'creator' || tier === 'business' || tier === 'exclusive';

      if (!canPostProfessional) {
        alert('Professional Mode posting is for Creator tier and above.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('professional_banned_until, professional_ban_reason')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile?.professional_banned_until && new Date(profile.professional_banned_until).getTime() > Date.now()) {
        alert(profile.professional_ban_reason || 'You are temporarily restricted from posting in Professional Mode.');
        return;
      }

      if (professionalCategory || professionalAgreed) {
        const check = validateProfessionalPost({ content, category: professionalCategory, agreed: professionalAgreed });
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
        totalPages: Number(extraMedia.documentTotalPages || extraMedia.document_total_pages || documentPages.length || 1),
        previewPages: Number(extraMedia.documentPreviewPages || extraMedia.document_preview_pages || 1),
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

    const newPost: Post = {
      id: data.id,
      userId: authUser.id,
      userName: getProfileName(profile, authUser.id),
      userAvatar: getProfileAvatar(profile),
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
      hashtags: [...new Set([...get().extractHashtags(content), ...(hashtags || [])])],
      likes: 0,
      comments: [],
      shares: 0,
      timestamp: new Date(data.created_at || Date.now()),
      isLiked: false,
      isSaved: false,
      mode: mode || 'social',
      collabInvites: [],
      collaborators: [],
    };

    set({ posts: [newPost, ...get().posts] });
  },

  likePost: async (postId, reaction = 'like') => {
    const authUser = await ensureProfile();
    if (!authUser?.id) return;

    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.isLiked && post.reaction === reaction) {
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', authUser.id);

      if (error) return;

      set({
        posts: get().posts.map((p) =>
          p.id === postId ? { ...p, isLiked: false, reaction: undefined, likes: Math.max(0, p.likes - 1) } : p
        ),
      });

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
          ? { ...p, isLiked: true, reaction: reaction as ReactionType, likes: p.isLiked ? p.likes : p.likes + 1 }
          : p
      ),
    });
  },

  addComment: async (postId, content) => {
    const authUser = await ensureProfile();
    if (!authUser?.id || !content.trim()) return;

    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: authUser.id, content, comment_type: 'text' })
      .select()
      .single();

    if (error) return;

    const profile = { full_name: authUser.name, name: authUser.name, email: authUser.email, avatar_url: authUser.avatar, avatar: authUser.avatar };
    const newComment: Comment = {
      id: data.id,
      userId: authUser.id,
      userName: getProfileName(profile, authUser.id),
      userAvatar: getProfileAvatar(profile),
      content,
      type: 'text',
      timestamp: new Date(data.created_at || Date.now()),
    };

    set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p)) });
  },

  addVoiceComment: async (postId, voiceUrl) => {
    const authUser = await ensureProfile();
    if (!authUser?.id || !voiceUrl) return;

    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: authUser.id, content: '', voice_url: voiceUrl, comment_type: 'voice' })
      .select()
      .single();

    if (error) return;

    const profile = { full_name: authUser.name, name: authUser.name, email: authUser.email, avatar_url: authUser.avatar, avatar: authUser.avatar };
    const newComment: Comment = {
      id: data.id,
      userId: authUser.id,
      userName: getProfileName(profile, authUser.id),
      userAvatar: getProfileAvatar(profile),
      content: '',
      voiceUrl,
      type: 'voice',
      timestamp: new Date(data.created_at || Date.now()),
    };

    set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p)) });
  },

  editPost: async (postId, content) => {
    const { error } = await supabase.from('posts').update({ content }).eq('id', postId);
    if (error) return;
    set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, content } : p)) });
  },

  deletePost: async (postId) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) return;
    set({ posts: get().posts.filter((p) => p.id !== postId) });
  },

  editComment: async (postId, commentId, content) => {
    const { error } = await supabase.from('post_comments').update({ content }).eq('id', commentId);
    if (error) return;
    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, comments: p.comments.map((c) => (c.id === commentId ? { ...c, content } : c)) } : p
      ),
    });
  },

  deleteComment: async (postId, commentId) => {
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
    if (error) return;
    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p
      ),
    });
  },

  sharePost: async (postId) => {
    const authUser = await ensureProfile();
    if (!authUser?.id) return;

    const { error } = await supabase.from('post_shares').insert({ post_id: postId, user_id: authUser.id });
    if (error) return;

    set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, shares: p.shares + 1 } : p)) });
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

      if (error) return;

      set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, isSaved: false } : p)) });
      return;
    }

    const { error } = await supabase.from('post_saves').insert({ post_id: postId, user_id: authUser.id });
    if (error) return;

    set({ posts: get().posts.map((p) => (p.id === postId ? { ...p, isSaved: true } : p)) });
  },

  inviteCollaborator: async (_postId, _userId) => {},
  acceptCollabInvite: async (_postId) => {},
  rejectCollabInvite: async (_postId) => {},

  extractHashtags: (content) => {
    const matches = content.match(/#[\w]+/g);
    return matches ? matches.map((tag) => tag.slice(1).toLowerCase()) : [];
  },

  getAISuggestions: (content) => {
    const keywords = content.toLowerCase();
    const suggestions: string[] = [];

    if (keywords.includes('code') || keywords.includes('dev')) suggestions.push('#coding', '#webdev', '#programming');
    if (keywords.includes('business') || keywords.includes('work')) suggestions.push('#business', '#career', '#networking');
    if (keywords.includes('video') || keywords.includes('tiktok')) suggestions.push('#video', '#creator', '#trending');

    return suggestions.slice(0, 5);
  },
}));
