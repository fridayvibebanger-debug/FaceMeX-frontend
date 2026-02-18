import { create } from 'zustand';
import { api, API_URL } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'event' | 'circle' | 'endorsement';
  title: string;
  message: string;
  avatar?: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  initRealtime: (userId: string) => void;
  load: () => Promise<void>;
  read: (id: string) => Promise<void>;
  readAll: () => Promise<void>;
}

let socket: Socket | null = null;
let socketInitializedFor: string | null = null;

function upsert(list: Notification[], item: Notification) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = [...list];
  next[idx] = item;
  return next;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'like',
    title: 'New Reaction',
    message: 'Sarah Johnson reacted ❤️ to your post',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    timestamp: new Date(Date.now() - 300000),
    isRead: false,
    actionUrl: '/feed',
  },
  {
    id: '2',
    type: 'comment',
    title: 'New Comment',
    message: 'Mike Chen commented on your post: "This is amazing!"',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    timestamp: new Date(Date.now() - 600000),
    isRead: false,
    actionUrl: '/feed',
  },
  {
    id: '3',
    type: 'follow',
    title: 'New Follower',
    message: 'Emma Wilson started following you',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    timestamp: new Date(Date.now() - 1800000),
    isRead: true,
    actionUrl: '/profile',
  },
  {
    id: '4',
    type: 'event',
    title: 'Event Reminder',
    message: 'Virtual Concert: Neon Dreams starts in 2 days',
    timestamp: new Date(Date.now() - 3600000),
    isRead: false,
    actionUrl: '/communities',
  },
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: mockNotifications,
  unreadCount: mockNotifications.filter((n) => !n.isRead).length,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      isRead: false,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  clearNotification: (notificationId) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId);
      return {
        notifications: state.notifications.filter((n) => n.id !== notificationId),
        unreadCount: notification && !notification.isRead 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount,
      };
    }),

  initRealtime: (userId: string) => {
    if (!import.meta.env.DEV) return;
    if (!userId) return;
    if (!API_URL) return;
    if (socket && socketInitializedFor === userId) return;

    if (socket) {
      try {
        socket.off('notify');
        socket.close();
      } catch {
      }
      socket = null;
      socketInitializedFor = null;
    }

    socket = io(API_URL, { withCredentials: true });
    socketInitializedFor = userId;
    socket.emit('user:join', { userId });

    socket.on('notify', (n: any) => {
      if (!n) return;
      const item: Notification = {
        id: String(n.id || n._id || Date.now()),
        type: (n.type || 'message') as Notification['type'],
        title: String(n.title || 'Notification'),
        message: String(n.message || ''),
        avatar: typeof n.avatar === 'string' ? n.avatar : undefined,
        timestamp: new Date(typeof n.timestamp === 'number' ? n.timestamp : Date.now()),
        isRead: !!n.isRead,
        actionUrl: typeof n.actionUrl === 'string' ? n.actionUrl : undefined,
      };
      set((state) => {
        const next = upsert(state.notifications, item);
        return { notifications: next, unreadCount: next.filter((x) => !x.isRead).length };
      });
    });
  },

  load: async () => {
    const data = await api.get('/api/notifications');
    const list: Notification[] = (data.notifications || []).map((n: any) => ({
      id: String(n.id),
      type: n.type || 'message',
      title: n.title || 'Notification',
      message: n.message || '',
      avatar: n.avatar || undefined,
      timestamp: new Date(n.timestamp || Date.now()),
      isRead: !!n.isRead,
      actionUrl: n.actionUrl || undefined,
    }));
    set({ notifications: list, unreadCount: list.filter(n => !n.isRead).length })
  },
  read: async (id: string) => {
    await api.post(`/api/notifications/${id}/read`)
    get().markAsRead(id)
  },
  readAll: async () => {
    await api.post('/api/notifications/read-all')
    get().markAllAsRead()
  }
}));
