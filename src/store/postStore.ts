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
type MediaType = 'image' | 'video' | 'audio' | 'none';

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

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  image?: string;
  video?: string;
  audio?: string;
  images?: string[];
  mediaType?: MediaType;
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
    professionalCategory?: ProfessionalCategory,
    professionalAgreed?: boolean
  ) => Promise<void>;

  likePost: (postId: string, reaction?: string) => Promise<void>;

  addComment: (postId: string, content: string) => Promise<void>;

  addVoiceComment: (postId: string, voiceUrl: string) => Promise<void>;

  editPost: (postId: string, content: string) => Promise<void>;

  deletePost: (postId: string) => Promise<void>;

  editComment: (
    postId: string,
    commentId: string,
    content: string
  ) => Promise<void>;

  deleteComment: (postId: string, commentId: string) => Promise<void>;

  sharePost: (postId: string) => Promise<void>;

  savePost: (postId: string) => Promise<void>;

  inviteCollaborator: (postId: string, userId: string) => Promise<void>;

  acceptCollabInvite: (postId: string) => Promise<void>;

  rejectCollabInvite: (postId: string) => Promise<void>;

  extractHashtags: (content: string) => string[];

  getAISuggestions: (content: string) => string[];
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

  const avatarUrl =
    existingProfile?.avatar_url ||
    existingProfile?.avatar ||
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
    alert(`Profile error: ${error.message}`);
    return null;
  }

  return {
    ...authUser,
    name: displayName,
    avatar: avatarUrl,
  };
}

function getMediaType(url?: string): MediaType {
  if (!url) return 'none';

  const lower = url.toLowerCase();

  if (
    lower.includes('.mp4') ||
    lower.includes('.mov') ||
    lower.includes('.webm')
  ) {
    return 'video';
  }

  if (
    lower.includes('.mp3') ||
    lower.includes('.wav') ||
    lower.includes('.ogg') ||
    lower.includes('.m4a')
  ) {
    return 'audio';
  }

  return 'image';
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

    const [commentsResult, reactionsResult, sharesResult, savesResult] =
      await Promise.all([
        postIds.length
          ? supabase
              .from('post_comments')
              .select('*')
              .in('post_id', postIds)
              .order('created_at', { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),

        postIds.length
          ? supabase.from('post_reactions').select('*').in('post_id', postIds)
          : Promise.resolve({ data: [], error: null } as any),

        postIds.length
          ? supabase.from('post_shares').select('*').in('post_id', postIds)
          : Promise.resolve({ data: [], error: null } as any),

        postIds.length && currentUserId
          ? supabase
              .from('post_saves')
              .select('*')
              .in('post_id', postIds)
              .eq('user_id', currentUserId)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

    const comments = commentsResult.data || [];
    const reactions = reactionsResult.data || [];
    const shares = sharesResult.data || [];
    const saves = savesResult.data || [];

    const savedPostIds = new Set(saves.map((s: any) => s.post_id));
    const commentUserIds = comments.map((c: any) => c.user_id).filter(Boolean);

    const allUserIds = Array.from(
      new Set([...postAuthorIds, ...commentUserIds])
    );

    const { data: profiles, error: profilesError } = allUserIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, name, username, email, avatar_url, avatar')
          .in('id', allUserIds)
      : ({ data: [], error: null } as any);

    if (profilesError) {
      console.log('Profiles load error:', profilesError.message);
    }

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const reactionCountMap = new Map<string, number>();
    const myReactionMap = new Map<string, string>();

    reactions.forEach((r: any) => {
      reactionCountMap.set(
        r.post_id,
        (reactionCountMap.get(r.post_id) || 0) + 1
      );

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

      return {
        id: p.id,
        userId: p.user_id,
        userName: getProfileName(profile, p.user_id),
        userAvatar: getProfileAvatar(profile),
        content: p.content || '',
        image: p.media_type === 'image' ? p.media_url : undefined,
        video: p.media_type === 'video' ? p.media_url : undefined,
        audio: p.media_type === 'audio' ? p.media_url : undefined,
        images: p.media_type === 'image' && p.media_url ? [p.media_url] : [],
        mediaType: p.media_type || 'none',
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
      post.hashtags.forEach((tag) => {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      });
    });

    const trendingHashtags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    set({
      posts: mapped,
      trendingHashtags,
    });
  },

  addPost: async (
    content,
    images,
    audio,
    hashtags,
    mode,
    professionalCategory,
    professionalAgreed = false
  ) => {
  const authUser = await ensureProfile();

  if (!authUser?.id) {
    alert('No user found. Please login again.');
    return;
  }

  if (mode === 'professional') {
    const userStore = useUserStore.getState() as any;
    const authStoreUser = useAuthStore.getState().user as any;

    const tier = String(
      userStore?.tier || authStoreUser?.tier || 'free'
    ).toLowerCase();

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

  const mediaUrl = images?.[0] || audio || '';
  const mediaType = getMediaType(mediaUrl);

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: authUser.id,
      content,
      media_url: mediaUrl || null,
      media_type: mediaType,
      mode: mode || 'social',
      professional_category:
        mode === 'professional' ? professionalCategory || null : null,
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
    image: mediaType === 'image' ? mediaUrl : undefined,
    video: mediaType === 'video' ? mediaUrl : undefined,
    audio: mediaType === 'audio' ? mediaUrl : undefined,
    images: mediaType === 'image' && mediaUrl ? [mediaUrl] : [],
    mediaType,
    hashtags: [
      ...new Set([...get().extractHashtags(content), ...(hashtags || [])]),
    ],
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

      return;
    }

    const { error } = await supabase.from('post_reactions').upsert(
      {
        post_id: postId,
        user_id: authUser.id,
        reaction,
      },
      {
        onConflict: 'post_id,user_id',
      }
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
  },

  addComment: async (postId, content) => {
    const authUser = await ensureProfile();

    if (!authUser?.id || !content.trim()) return;

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

    const newComment: Comment = {
      id: data.id,
      userId: authUser.id,
      userName: getProfileName(profile, authUser.id),
      userAvatar: getProfileAvatar(profile),
      content,
      type: 'text',
      timestamp: new Date(data.created_at || Date.now()),
    };

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
      ),
    });
  },

  addVoiceComment: async (postId, voiceUrl) => {
    const authUser = await ensureProfile();

    if (!authUser?.id || !voiceUrl) return;

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

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
      ),
    });
  },

  editPost: async (postId, content) => {
    const { error } = await supabase
      .from('posts')
      .update({ content })
      .eq('id', postId);

    if (error) return;

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, content } : p
      ),
    });
  },

  deletePost: async (postId) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) return;

    set({
      posts: get().posts.filter((p) => p.id !== postId),
    });
  },

  editComment: async (postId, commentId, content) => {
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
  },

  deleteComment: async (postId, commentId) => {
    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (error) return;

    set({
      posts: get().posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: p.comments.filter((c) => c.id !== commentId),
            }
          : p
      ),
    });
  },

  sharePost: async (postId) => {
    const authUser = await ensureProfile();

    if (!authUser?.id) return;

    const { error } = await supabase.from('post_shares').insert({
      post_id: postId,
      user_id: authUser.id,
    });

    if (error) return;

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, shares: p.shares + 1 } : p
      ),
    });
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

      set({
        posts: get().posts.map((p) =>
          p.id === postId ? { ...p, isSaved: false } : p
        ),
      });

      return;
    }

    const { error } = await supabase.from('post_saves').insert({
      post_id: postId,
      user_id: authUser.id,
    });

    if (error) return;

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, isSaved: true } : p
      ),
    });
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
