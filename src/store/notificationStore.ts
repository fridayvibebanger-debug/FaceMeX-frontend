import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  type:
    | 'like'
    | 'comment'
    | 'follow'
    | 'message'
    | 'event'
    | 'circle'
    | 'endorsement'
    | 'connection_request';
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
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>
  ) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  initRealtime: (userId: string) => void;
  load: () => Promise<void>;
  read: (id: string) => Promise<void>;
  readAll: () => Promise<void>;
}

function mapNotification(n: any): Notification {
  return {
    id: String(n.id),
    type: (n.type || 'message') as Notification['type'],
    title: n.title || 'Notification',
    message: n.message || '',
    avatar: n.avatar || undefined,
    timestamp: new Date(n.created_at || n.timestamp || Date.now()),
    isRead: !!n.is_read,
    actionUrl: n.action_url || undefined,
  };
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      isRead: false,
    };

    set((state) => {
      const next = [newNotification, ...state.notifications];

      return {
        notifications: next,
        unreadCount: next.filter((n) => !n.isRead).length,
      };
    });
  },

  markAsRead: (notificationId) =>
    set((state) => {
      const next = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );

      return {
        notifications: next,
        unreadCount: next.filter((n) => !n.isRead).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
      })),
      unreadCount: 0,
    })),

  clearNotification: (notificationId) =>
    set((state) => {
      const next = state.notifications.filter((n) => n.id !== notificationId);

      return {
        notifications: next,
        unreadCount: next.filter((n) => !n.isRead).length,
      };
    }),

  initRealtime: (userId: string) => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          get().load().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  load: async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      set({ notifications: [], unreadCount: 0 });
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Load notifications error:', error.message);
      set({ notifications: [], unreadCount: 0 });
      return;
    }

    const list = (data || []).map(mapNotification);

    set({
      notifications: list,
      unreadCount: list.filter((n) => !n.isRead).length,
    });
  },

  read: async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.log('Read notification error:', error.message);
      return;
    }

    get().markAsRead(id);
  },

  readAll: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);

    if (error) {
      console.log('Read all notifications error:', error.message);
      return;
    }

    get().markAllAsRead();
  },
}));
