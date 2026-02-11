import { create } from 'zustand';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  image?: string;
  images?: string[];
  audio?: string;
  hashtags: string[];
  likes: number;
  comments: Comment[];
  shares: number;
  timestamp: Date;
  isLiked: boolean;
  reaction?: 'love' | 'like' | 'haha' | 'wow' | 'sad' | 'angry';
  mood?: string;
  aiScore?: number;
  mode?: 'social' | 'professional';
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
}

interface PostState {
  posts: Post[];
  trendingHashtags: string[];
  aiSuggestions: string[];
  loadPosts: (skill?: string) => Promise<void>;
  addPost: (content: string, images?: string[], audio?: string, hashtags?: string[], mode?: 'social' | 'professional') => Promise<void>;
  likePost: (postId: string, reaction?: string) => Promise<void>;
  editPost: (postId: string, content: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  editComment: (postId: string, commentId: string, content: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => void;
  extractHashtags: (content: string) => string[];
  getAISuggestions: (content: string) => string[];
}

// Mock initial posts
const mockPosts: Post[] = [
  {
    id: '1',
    userId: '2',
    userName: 'Sarah Johnson',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    content: 'Just launched my new project! So excited to share this with everyone. What do you think? 🚀 #coding #webdev #launch',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80'],
    hashtags: ['coding', 'webdev', 'launch'],
    likes: 42,
    comments: [
      {
        id: 'c1',
        userId: '3',
        userName: 'Mike Chen',
        userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
        content: 'This looks amazing! Congrats! 🎉',
        timestamp: new Date(Date.now() - 3600000),
      },
    ],
    shares: 5,
    timestamp: new Date(Date.now() - 7200000),
    isLiked: false,
    mood: 'excited',
    aiScore: 0.92,
  },
  {
    id: '2',
    userId: '3',
    userName: 'Mike Chen',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
    content: 'Beautiful sunset today! Nature never fails to amaze me. 🌅 #nature #sunset #photography',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'],
    hashtags: ['nature', 'sunset', 'photography'],
    likes: 128,
    comments: [],
    shares: 12,
    timestamp: new Date(Date.now() - 14400000),
    isLiked: false,
    mood: 'peaceful',
    aiScore: 0.88,
  },
  {
    id: '3',
    userId: '4',
    userName: 'Emma Wilson',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma',
    content: 'Coffee and code - the perfect combination for a productive morning! ☕💻 #developer #productivity #coffee',
    hashtags: ['developer', 'productivity', 'coffee'],
    likes: 89,
    comments: [],
    shares: 3,
    timestamp: new Date(Date.now() - 21600000),
    isLiked: false,
    mood: 'focused',
    aiScore: 0.85,
  },
];

const trendingHashtags = [
  'coding', 'webdev', 'AI', 'design', 'productivity', 
  'nature', 'photography', 'travel', 'fitness', 'food'
];

export const usePostStore = create<PostState>((set, get) => ({
  posts: mockPosts,
  trendingHashtags,
  aiSuggestions: [],
  
  loadPosts: async (skill?: string) => {
    const authUser = useAuthStore.getState().user;
    const currentUserId = authUser?.id;
    let m: 'social' | 'professional' | null = null;
    try {
      const v = localStorage.getItem('faceme_mode') as any;
      if (v === 'social' || v === 'professional') m = v;
    } catch {}
    const params: string[] = [];
    if (m) params.push(`mode=${encodeURIComponent(m)}`);
    if (skill) params.push(`skill=${encodeURIComponent(skill.toLowerCase())}`);
    const q = params.length ? `?${params.join('&')}` : '';
    const data = await api.get(`/api/posts${q}`);
    const mapped: Post[] = (data || []).map((p: any) => ({
      id: p.id,
      userId: p.userId || currentUserId || '1',
      userName: p.userName || authUser?.name || 'User',
      userAvatar: p.avatar || '',
      content: p.content || '',
      image: p.image || undefined,
      images: Array.isArray(p.images)
        ? p.images.filter(Boolean)
        : (p.image ? [p.image].filter(Boolean) : undefined),
      audio: p.audio || undefined,
      hashtags: get().extractHashtags(p.content || ''),
      likes: p.likes || (Array.isArray(p.likedBy) ? p.likedBy.length : 0),
      comments: (p.comments || []).map((c: any) => ({
        id: c.id,
        userId: c.userId || currentUserId || '1',
        userName: c.userName || authUser?.name || 'User',
        userAvatar: '',
        content: c.text || c.content || '',
        timestamp: new Date(c.createdAt || Date.now()),
      })),
      shares: 0,
      timestamp: new Date(p.createdAt || Date.now()),
      isLiked: Array.isArray(p.likedBy) && currentUserId ? p.likedBy.includes(currentUserId) : false,
      aiScore: p.aiScore,
      mode: p.mode === 'professional' ? 'professional' : 'social',
    }));
    set({ posts: mapped });
  },
  
  extractHashtags: (content: string) => {
    const hashtagRegex = /#[\w]+/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
  },
  
  getAISuggestions: (content: string) => {
    const keywords = content.toLowerCase();
    const suggestions: string[] = [];
    
    if (keywords.includes('code') || keywords.includes('dev')) {
      suggestions.push('#coding', '#webdev', '#programming');
    }
    if (keywords.includes('photo') || keywords.includes('picture')) {
      suggestions.push('#photography', '#art', '#creative');
    }
    if (keywords.includes('travel') || keywords.includes('trip')) {
      suggestions.push('#travel', '#adventure', '#explore');
    }
    if (keywords.includes('food') || keywords.includes('cook')) {
      suggestions.push('#food', '#cooking', '#foodie');
    }
    if (keywords.includes('fit') || keywords.includes('workout')) {
      suggestions.push('#fitness', '#health', '#wellness');
    }
    
    return suggestions.slice(0, 5);
  },
  
  addPost: async (content: string, images?: string[], audio?: string, hashtags?: string[], mode?: 'social' | 'professional') => {
    const authUser = useAuthStore.getState().user;
    const currentUserId = authUser?.id;
    let m = mode;
    if (!m) {
      try {
        const v = localStorage.getItem('faceme_mode') as any;
        if (v === 'professional' || v === 'social') m = v;
      } catch {}
    }

    try {
      const payloadImages = Array.isArray(images) ? images.slice(0, 5) : undefined;
      const created = await api.post('/api/posts', { content, images: payloadImages, audio, mode: m });
      const newPost: Post = {
        id: created.id,
        userId: created.userId || currentUserId || '1',
        userName: created.userName || authUser?.name || 'User',
        userAvatar: created.avatar || authUser?.avatar || '',
        content: created.content || content,
        image: created.image || (payloadImages && payloadImages[0]) || undefined,
        images: Array.isArray(created.images)
          ? created.images.filter(Boolean)
          : (created.image ? [created.image].filter(Boolean) : payloadImages),
        audio: created.audio || audio,
        hashtags: [...new Set([...get().extractHashtags(created.content || content), ...(hashtags || [])])],
        likes: created.likes || 0,
        comments: [],
        shares: 0,
        timestamp: new Date(created.createdAt || Date.now()),
        isLiked: false,
        mode: created.mode === 'professional' ? 'professional' : (m || 'social'),
      };
      set({ posts: [newPost, ...get().posts] });
    } catch (e) {
      console.error('addPost fallback: API failed, creating local post only', e);
      const now = new Date();
      const localPost: Post = {
        id: `local-${now.getTime()}`,
        userId: currentUserId || 'local',
        userName: authUser?.name || 'You',
        userAvatar: authUser?.avatar || '',
        content,
        image: (images && images[0]) || undefined,
        images: Array.isArray(images) ? images.slice(0, 5) : undefined,
        audio,
        hashtags: [...new Set([...get().extractHashtags(content), ...(hashtags || [])])],
        likes: 0,
        comments: [],
        shares: 0,
        timestamp: now,
        isLiked: false,
        mode: m || 'social',
      };
      set({ posts: [localPost, ...get().posts] });
    }
  },
  
  editPost: async (postId: string, content: string) => {
    try {
      const updated = await api.patch(`/api/posts/${postId}`, { content });
      set({
        posts: get().posts.map((post) =>
          post.id === postId
            ? { ...post, content: updated.content || content }
            : post
        ),
      });
    } catch (e) {
      console.error('Failed to edit post', e);
    }
  },
  
  likePost: async (postId: string, reaction?: string) => {
    // optimistic update
    const prev = get().posts;
    const prevPost = prev.find((p) => p.id === postId);
    const optimistic = prev.map((post) =>
      post.id === postId
        ? {
            ...post,
            likes: (() => {
              if (!reaction) return post.isLiked ? Math.max(0, post.likes - 1) : post.likes + 1;
              if (!post.isLiked) return post.likes + 1;
              if ((post.reaction || 'like') === reaction) return Math.max(0, post.likes - 1);
              return post.likes;
            })(),
            isLiked: (() => {
              if (!reaction) return !post.isLiked;
              if (!post.isLiked) return true;
              if ((post.reaction || 'like') === reaction) return false;
              return true;
            })(),
            reaction: (() => {
              if (!reaction) return post.isLiked ? undefined : ('like' as any);
              if (!post.isLiked) return reaction as any;
              if ((post.reaction || 'like') === reaction) return undefined;
              return reaction as any;
            })(),
          }
        : post
    );
    set({ posts: optimistic });

    const isReactionSwitch =
      !!reaction &&
      !!prevPost?.isLiked &&
      (prevPost.reaction || 'like') !== reaction;

    // Backend currently toggles like/unlike only.
    // If we're just switching reaction type, keep it client-side without calling the API.
    if (isReactionSwitch) return;
    try {
      await api.post(`/api/posts/${postId}/like`, reaction ? { reaction } : undefined);
    } catch (e) {
      // rollback on error
      set({ posts: prev });
      console.error('Failed to react to post', e);
    }
  },
  
  addComment: async (postId: string, content: string) => {
    const c = await api.post(`/api/posts/${postId}/comment`, { text: content });
    const newComment: Comment = {
      id: c.id,
      userId: c.userId || '1',
      userName: c.userName || 'User',
      userAvatar: '',
      content: c.text || content,
      timestamp: new Date(c.createdAt || Date.now()),
    };
    set({
      posts: get().posts.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, newComment] }
          : post
      ),
    });
  },
  
  deletePost: async (postId: string) => {
    try {
      await api.delete(`/api/posts/${postId}`);
    } finally {
      set({
        posts: get().posts.filter((post) => post.id !== postId),
      });
    }
  },

  editComment: async (postId: string, commentId: string, content: string) => {
    const c = await api.patch(`/api/posts/${postId}/comment/${commentId}`, { text: content });
    set({
      posts: get().posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: post.comments.map((cm) =>
                cm.id === commentId ? { ...cm, content: c.text || content } : cm
              ),
            }
          : post
      ),
    });
  },

  deleteComment: async (postId: string, commentId: string) => {
    // Call backend delete and then update local state
    await api.delete(`/api/posts/${postId}/comment/${commentId}`);
    set({
      posts: get().posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: post.comments.filter((cm) => cm.id !== commentId),
            }
          : post
      ),
    });
  },
  
  sharePost: (postId: string) => {
    set({
      posts: get().posts.map((post) =>
        post.id === postId ? { ...post, shares: post.shares + 1 } : post
      ),
    });
  },
}));