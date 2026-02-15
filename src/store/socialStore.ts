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

const mockCircles: Circle[] = [
  {
    id: '1',
    name: 'Tech Innovators',
    description: 'A community for tech enthusiasts and innovators',
    coverImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80',
    creatorId: '2',
    creatorName: 'Sarah Johnson',
    memberCount: 1247,
    isPrivate: false,
    category: 'tech',
    isMember: true,
  },
  {
    id: '2',
    name: 'Digital Artists Hub',
    description: 'Share and discover amazing digital art',
    coverImage: 'https://images.unsplash.com/photo-1561998338-13ad7883b20f?w=800&q=80',
    creatorId: '3',
    creatorName: 'Mike Chen',
    memberCount: 892,
    isPrivate: false,
    category: 'art',
    isMember: false,
  },
  {
    id: '3',
    name: 'Fitness Warriors',
    description: 'Get fit together, stay motivated',
    coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    creatorId: '4',
    creatorName: 'Emma Wilson',
    memberCount: 2341,
    isPrivate: false,
    category: 'fitness',
    isMember: true,
  },
];

const mockCircleMembers: Record<string, CircleMember[]> = {
  '1': [
    {
      id: '2',
      name: 'Sarah Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      role: 'owner',
      joinedAt: new Date(Date.now() - 86400000 * 120),
    },
    {
      id: '10',
      name: 'Alex Brown',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      role: 'admin',
      joinedAt: new Date(Date.now() - 86400000 * 60),
    },
    {
      id: '11',
      name: 'Jamie Lee',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jamie',
      role: 'member',
      joinedAt: new Date(Date.now() - 86400000 * 20),
    },
    {
      id: '12',
      name: 'Taylor Smith',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor',
      role: 'member',
      joinedAt: new Date(Date.now() - 86400000 * 5),
    },
  ],
  '2': [
    {
      id: '3',
      name: 'Mike Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
      role: 'owner',
      joinedAt: new Date(Date.now() - 86400000 * 90),
    },
    {
      id: '13',
      name: 'Lisa Ray',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
      role: 'admin',
      joinedAt: new Date(Date.now() - 86400000 * 40),
    },
    {
      id: '14',
      name: 'Dylan Cooper',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dylan',
      role: 'member',
      joinedAt: new Date(Date.now() - 86400000 * 10),
    },
  ],
  '3': [
    {
      id: '4',
      name: 'Emma Wilson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
      role: 'owner',
      joinedAt: new Date(Date.now() - 86400000 * 150),
    },
    {
      id: '15',
      name: 'Chris Walker',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chris',
      role: 'member',
      joinedAt: new Date(Date.now() - 86400000 * 45),
    },
    {
      id: '16',
      name: 'Riley Park',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riley',
      role: 'member',
      joinedAt: new Date(Date.now() - 86400000 * 7),
    },
  ],
};

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Virtual Concert: Neon Dreams',
    description: 'Experience an immersive virtual concert in our metaverse',
    coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    hostId: '2',
    hostName: 'Sarah Johnson',
    hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    startTime: new Date(Date.now() + 86400000 * 2),
    endTime: new Date(Date.now() + 86400000 * 2 + 7200000),
    location: 'Virtual World: Neon City',
    type: 'virtual',
    attendeeCount: 342,
    maxAttendees: 500,
    isAttending: true,
    isPaid: true,
    price: 299,
    tags: ['music', 'virtual', 'concert'],
  },
  {
    id: '2',
    title: 'Tech Meetup: AI & Future',
    description: 'Discuss the latest in AI technology',
    coverImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
    hostId: '3',
    hostName: 'Mike Chen',
    hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    startTime: new Date(Date.now() + 86400000 * 5),
    endTime: new Date(Date.now() + 86400000 * 5 + 10800000),
    location: 'Cape Town Convention Center',
    type: 'in-person',
    attendeeCount: 87,
    maxAttendees: 150,
    isAttending: false,
    isPaid: false,
    tags: ['tech', 'ai', 'networking'],
  },
  {
    id: '3',
    title: 'Yoga & Meditation Session',
    description: 'Join us for a relaxing yoga session',
    coverImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    hostId: '4',
    hostName: 'Emma Wilson',
    hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    startTime: new Date(Date.now() + 86400000),
    endTime: new Date(Date.now() + 86400000 + 3600000),
    location: 'Virtual & In-Person',
    type: 'hybrid',
    attendeeCount: 45,
    isAttending: true,
    isPaid: false,
    tags: ['fitness', 'wellness', 'yoga'],
  },
];

export const useSocialStore = create<SocialState>((set) => ({
  circles: mockCircles,
  events: mockEvents,
  circleMessages: {},
  circleMembers: mockCircleMembers,
  
  loadEvents: async () => {
    const data = await api.get('/api/events');
    const mapped: Event[] = (data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      coverImage: e.coverImage,
      hostId: e.hostId || '1',
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
      const alreadyMember = existingMembers.some((m) => m.id === '1');
      const circleMembers = {
        ...state.circleMembers,
        [circleId]: alreadyMember
          ? existingMembers
          : [
              ...existingMembers,
              {
                id: '1',
                name: 'Demo User',
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
      const circleMembers = {
        ...state.circleMembers,
        [circleId]: existingMembers.filter((m) => m.id !== '1'),
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
      hostId: created.hostId || '1',
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
