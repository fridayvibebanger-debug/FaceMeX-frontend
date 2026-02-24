import { create } from 'zustand';
import { api } from '@/lib/api';

export type CircleMemberRole = 'owner' | 'admin' | 'member';

export interface Circle {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  creatorId: string;
  creatorName: string;
  memberCount: number;
  isPrivate: boolean;
  category: 'tech' | 'art' | 'music' | 'gaming' | 'fitness' | 'other';
  isMember: boolean;
}

export interface CircleMember {
  id: string;
  name: string;
  avatar: string;
  role: CircleMemberRole;
  joinedAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  startTime: Date;
  endTime: Date;
  location: string;
  type: 'virtual' | 'in-person' | 'hybrid';
  attendeeCount: number;
  maxAttendees?: number;
  isAttending: boolean;
  isPaid: boolean;
  price?: number;
  tags: string[];
}

export interface CircleMessage {
  id: string;
  circleId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date;
  pinned?: boolean;
  reactions?: {
    like: number;
  };
}

interface SocialState {
  circles: Circle[];
  events: Event[];
  circleMessages: Record<string, CircleMessage[]>;
  circleMembers: Record<string, CircleMember[]>;
  loadEvents: () => Promise<void>;
  joinCircle: (circleId: string) => void;
  leaveCircle: (circleId: string) => void;
  createCircle: (circle: Omit<Circle, 'id' | 'memberCount' | 'isMember'>) => void;
  updateCircle: (circleId: string, changes: Partial<Pick<Circle, 'name' | 'description' | 'isPrivate' | 'coverImage' | 'category'>>) => void;
  postCircleMessage: (circleId: string, msg: { authorId: string; authorName: string; text: string }) => void;
  toggleReaction: (circleId: string, messageId: string, reaction: 'like', delta: 1 | -1) => void;
  togglePinCircleMessage: (circleId: string, messageId: string) => void;
  removeCircleMember: (circleId: string, memberId: string) => void;
  updateCircleMemberRole: (circleId: string, memberId: string, role: CircleMemberRole) => void;
  attendEvent: (eventId: string) => Promise<void>;
  unattendEvent: (eventId: string) => Promise<void>;
  createEvent: (event: Omit<Event, 'id' | 'attendeeCount' | 'isAttending'>) => Promise<void>;
}

function getCurrentUserIdentity() {
  try {
    const id =
      localStorage.getItem('faceme_user_id') ||
      localStorage.getItem('facemex_user_id') ||
      '';
    const name =
      localStorage.getItem('faceme_user_name') ||
      localStorage.getItem('facemex_user_name') ||
      '';
    return { id: String(id || '').trim(), name: String(name || '').trim() };
  } catch {
    return { id: '', name: '' };
  }
}

export const useSocialStore = create<SocialState>((set) => ({
  circles: [],
  events: [],
  circleMessages: {},
  circleMembers: {},
  
  loadEvents: async () => {
    const data = await api.get('/api/events');
    const mapped: Event[] = (data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      coverImage: e.coverImage,
      hostId: e.hostId || '',
      hostName: e.hostName || 'User',
      hostAvatar: e.hostAvatar || '',
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
      location: e.location,
      type: e.type,
      attendeeCount: e.attendeeCount || 0,
      maxAttendees: e.maxAttendees,
      isAttending: !!e.isAttending,
      isPaid: !!e.isPaid,
      price: e.price,
      tags: Array.isArray(e.tags) ? e.tags : [],
    }));
    set({ events: mapped });
  },

  joinCircle: (circleId) =>
    set((state) => {
      const circles = state.circles.map((circle) =>
        circle.id === circleId
          ? { ...circle, isMember: true, memberCount: circle.memberCount + 1 }
          : circle
      );

      const existingMembers = state.circleMembers[circleId] || [];
      const me = getCurrentUserIdentity();
      const alreadyMember = !!me.id && existingMembers.some((m) => m.id === me.id);
      const circleMembers = {
        ...state.circleMembers,
        [circleId]: alreadyMember
          ? existingMembers
          : [
              ...existingMembers,
              {
                id: me.id,
                name: me.name || 'User',
                avatar: '',
                role: 'member' as CircleMemberRole,
                joinedAt: new Date(),
              },
            ],
      };

      return { circles, circleMembers };
    }),

  leaveCircle: (circleId) =>
    set((state) => {
      const circles = state.circles.map((circle) =>
        circle.id === circleId
          ? { ...circle, isMember: false, memberCount: circle.memberCount - 1 }
          : circle
      );

      const existingMembers = state.circleMembers[circleId] || [];
      const me = getCurrentUserIdentity();
      const circleMembers = {
        ...state.circleMembers,
        [circleId]: me.id ? existingMembers.filter((m) => m.id !== me.id) : existingMembers,
      };

      return { circles, circleMembers };
    }),

  createCircle: (circle) => {
    const newCircle: Circle = {
      ...circle,
      id: Date.now().toString(),
      memberCount: 1,
      isMember: true,
    };
    set((state) => ({ circles: [newCircle, ...state.circles] }));
  },

  updateCircle: (circleId, changes) => {
    set((state) => ({
      circles: state.circles.map((c) => (c.id === circleId ? { ...c, ...changes } : c)),
    }));
  },

  postCircleMessage: (circleId, msg) => {
    set((state) => {
      const existing = state.circleMessages[circleId] || [];
      const newMsg: CircleMessage = {
        id: Date.now().toString(),
        circleId,
        authorId: msg.authorId,
        authorName: msg.authorName,
        text: msg.text,
        createdAt: new Date(),
        pinned: false,
        reactions: { like: 0 },
      };
      return {
        circleMessages: {
          ...state.circleMessages,
          [circleId]: [newMsg, ...existing].slice(0, 100),
        },
      };
    });
  },

  removeCircleMember: (circleId, memberId) => {
    set((state) => {
      const existing = state.circleMembers[circleId] || [];
      return {
        circleMembers: {
          ...state.circleMembers,
          [circleId]: existing.filter((m) => m.id !== memberId),
        },
      };
    });
  },

  updateCircleMemberRole: (circleId, memberId, role) => {
    set((state) => {
      const existing = state.circleMembers[circleId] || [];
      return {
        circleMembers: {
          ...state.circleMembers,
          [circleId]: existing.map((m) =>
            m.id === memberId
              ? {
                  ...m,
                  role,
                }
              : m
          ),
        },
      };
    });
  },

  toggleReaction: (circleId, messageId, reaction, delta) => {
    if (reaction !== 'like') return;
    set((state) => {
      const msgs = state.circleMessages[circleId] || [];
      return {
        circleMessages: {
          ...state.circleMessages,
          [circleId]: msgs.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  reactions: {
                    like: Math.max(0, (m.reactions?.like || 0) + delta),
                  },
                }
              : m
          ),
        },
      };
    });
  },

  togglePinCircleMessage: (circleId, messageId) => {
    set((state) => {
      const msgs = state.circleMessages[circleId] || [];
      return {
        circleMessages: {
          ...state.circleMessages,
          [circleId]: msgs.map((m) =>
            m.id === messageId ? { ...m, pinned: !m.pinned } : m
          ),
        },
      };
    });
  },

  attendEvent: async (eventId) => {
    const ev = await api.post(`/api/events/${eventId}/attend`);
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? { ...e, isAttending: !!ev.isAttending, attendeeCount: ev.attendeeCount ?? e.attendeeCount + 1 }
          : e
      ),
    }));
  },

  unattendEvent: async (eventId) => {
    const ev = await api.post(`/api/events/${eventId}/unattend`);
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId
          ? { ...e, isAttending: !!ev.isAttending, attendeeCount: ev.attendeeCount ?? Math.max(0, e.attendeeCount - 1) }
          : e
      ),
    }));
  },

  createEvent: async (event) => {
    const created = await api.post('/api/events', {
      ...event,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
    });
    const newEvent: Event = {
      id: created.id,
      title: created.title,
      description: created.description,
      coverImage: created.coverImage,
      hostId: created.hostId || '',
      hostName: created.hostName || 'User',
      hostAvatar: created.hostAvatar || '',
      startTime: new Date(created.startTime),
      endTime: new Date(created.endTime),
      location: created.location,
      type: created.type,
      attendeeCount: created.attendeeCount || 1,
      maxAttendees: created.maxAttendees,
      isAttending: !!created.isAttending,
      isPaid: !!created.isPaid,
      price: created.price,
      tags: Array.isArray(created.tags) ? created.tags : [],
    };
    set((state) => ({ events: [newEvent, ...state.events] }));
  },
}));
