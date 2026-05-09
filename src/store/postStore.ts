import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

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
    mode?: PostMode
  ) => Promise<void>;

  likePost: (postId: string, reaction?: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  addVoiceComment: (postId: string, voiceUrl: string) => Promise<void>;

  editPost: (postId: string, content: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  editComment: (postId: string, commentId: string, content: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;

  sharePost: (postId: string) => void;

  inviteCollaborator: (postId: string, userId: string) => Promise<void>;
  acceptCollabInvite: (postId: string) => Promise<void>;
  rejectCollabInvite: (postId: string) => Promise<void>;

  extractHashtags: (content: string) => string[];
  getAISuggestions: (content: string) => string[];
}

const ensureProfile = async () => {
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
        'User',
      avatar: data.user.user_metadata?.avatar_url || '',
    } as any;
  }

  const { error } = await supabase.from('profiles').upsert({
    id: authUser.id,
    email: authUser.email || '',
    full_name: authUser.name || authUser.email?.split('@')[0] || 'User',
    username: authUser.email?.split('@')[0] || 'user',
    avatar_url: authUser.avatar || '',
    is_active: true,
  });

  if (error) {
    alert(`Profile error: ${error.message}`);
    return null;
  }

  return authUser;
};

const getMediaType = (url?: string): MediaType => {
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
};

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  trendingHashtags: [],
  aiSuggestions: [],

  loadPosts: async () => {
    const authUser = useAuthStore.getState().user;
    const currentUserId = authUser?.id;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        media_url,
        media_type,
        created_at,
        profiles (
          id,
          full_name,
          name,
          username,
          avatar_url,
          avatar
        ),
        post_reactions (
          id,
          user_id,
          reaction
        ),
        post_comments (
          id,
          user_id,
          content,
          voice_url,
          comment_type,
          created_at,
          profiles (
            full_name,
            name,
            username,
            avatar_url,
            avatar
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Load posts error:', error.message);
      set({ posts: [] });
      return;
    }

    const mapped: Post[] = (data || []).map((p: any) => {
      const profile = p.profiles;
      const reactions = p.post_reactions || [];
      const comments = p.post_comments || [];

      const myReaction = currentUserId
        ? reactions.find((r: any) => r.user_id === currentUserId)
        : null;

      const mediaUrl = p.media_url || '';
      const mediaType = p.media_type || getMediaType(mediaUrl);

      return {
        id: p.id,
        userId: p.user_id,
        userName:
          profile?.full_name ||
          profile?.name ||
          profile?.username ||
          'FaceMeX User',
        userAvatar: profile?.avatar_url || profile?.avatar || '',
        content: p.content || '',
        image: mediaType === 'image' ? mediaUrl : undefined,
        video: mediaType === 'video' ? mediaUrl : undefined,
        audio: mediaType === 'audio' ? mediaUrl : undefined,
        images: mediaType === 'image' && mediaUrl ? [mediaUrl] : [],
        mediaType,
        hashtags: get().extractHashtags(p.content || ''),
        likes: reactions.length,
        comments: comments.map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          userName:
            c.profiles?.full_name ||
            c.profiles?.name ||
            c.profiles?.username ||
            'User',
          userAvatar: c.profiles?.avatar_url || c.profiles?.avatar || '',
          content: c.content || '',
          voiceUrl: c.voice_url || undefined,
          type: c.comment_type || 'text',
          timestamp: new Date(c.created_at || Date.now()),
        })),
        shares: 0,
        timestamp: new Date(p.created_at || Date.now()),
        isLiked: !!myReaction,
        reaction: myReaction?.reaction || undefined,
        mode: 'social',
        collabInvites: [],
        collaborators: [],
      };
    });

    set({ posts: mapped });
  },

  addPost: async (content, images, audio, hashtags, mode) => {
    const authUser = await ensureProfile();

    if (!authUser?.id) {
      alert('No user found. Please login again.');
      return;
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
      })
      .select()
      .single();

    if (error) {
      alert(`Add post error: ${error.message}`);
      console.error('Add post error:', error);
      return;
    }
    
alert('Post saved successfully');
    
    const newPost: Post = {
      id: data.id,
      userId: authUser.id,
      userName: authUser.name || 'FaceMeX User',
      userAvatar: authUser.avatar || '',
      content,
      image: mediaType === 'image' ? mediaUrl : undefined,
      video: mediaType === 'video' ? mediaUrl : undefined,
      audio: mediaType === 'audio' ? mediaUrl : undefined,
      images: mediaType === 'image' && mediaUrl ? [mediaUrl] : [],
      mediaType,
      hashtags: [
        ...new Set([
          ...get().extractHashtags(content),
          ...(hashtags || []),
        ]),
      ],
      likes: 0,
      comments: [],
      shares: 0,
      timestamp: new Date(data.created_at || Date.now()),
      isLiked: false,
      mode: mode || 'social',
      collabInvites: [],
      collaborators: [],
    };

    set({ posts: [newPost, ...get().posts] });

    await get().loadPosts();
  },
  
  likePost: async (postId, reaction = 'like') => {
    const authUser = await ensureProfile();
if (!authUser?.id) return;
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.isLiked && post.reaction === reaction) {
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', authUser.id);

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

    await supabase.from('post_reactions').upsert(
      {
        post_id: postId,
        user_id: authUser.id,
        reaction,
      },
      {
        onConflict: 'post_id,user_id',
      }
    );

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

    if (error) {
      console.error('Add comment error:', error.message);
      return;
    }

    const newComment: Comment = {
      id: data.id,
      userId: authUser.id,
      userName: authUser.name || 'User',
      userAvatar: authUser.avatar || '',
      content,
      type: 'text',
      timestamp: new Date(data.created_at || Date.now()),
    };

    set({
      posts: get().posts.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, newComment] }
          : p
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

    if (error) {
      console.error('Add voice comment error:', error.message);
      return;
    }

    const newComment: Comment = {
      id: data.id,
      userId: authUser.id,
      userName: authUser.name || 'User',
      userAvatar: authUser.avatar || '',
      content: '',
      voiceUrl,
      type: 'voice',
      timestamp: new Date(data.created_at || Date.now()),
    };

    set({
      posts: get().posts.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, newComment] }
          : p
      ),
    });
  },

  editPost: async (postId, content) => {
    const { error } = await supabase
      .from('posts')
      .update({ content })
      .eq('id', postId);

    if (error) {
      console.error('Edit post error:', error.message);
      return;
    }

    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, content } : p
      ),
    });
  },

  deletePost: async (postId) => {
    await supabase.from('posts').delete().eq('id', postId);

    set({
      posts: get().posts.filter((p) => p.id !== postId),
    });
  },

  editComment: async (postId, commentId, content) => {
    const { error } = await supabase
      .from('post_comments')
      .update({ content })
      .eq('id', commentId);

    if (error) {
      console.error('Edit comment error:', error.message);
      return;
    }

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
    await supabase.from('post_comments').delete().eq('id', commentId);

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

  sharePost: (postId) => {
    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, shares: p.shares + 1 } : p
      ),
    });
  },

  inviteCollaborator: async () => {},
  acceptCollabInvite: async () => {},
  rejectCollabInvite: async () => {},

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
