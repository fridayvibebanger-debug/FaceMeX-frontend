import { create } from 'zustand';
import { api, API_URL } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  status: FriendRequestStatus;
  createdAt: number;
  respondedAt?: number;
}

export interface SuggestedUser {
  id: string;
  name: string;
  bio?: string;
}

interface FriendState {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  loading: boolean;
  initRealtime: (userId: string) => void;
  loadRequests: () => Promise<void>;
  sendRequest: (fromUser: { id: string; name: string }, toUser: { id: string; name: string }) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
}

let socket: Socket | null = null;
let socketInitializedFor: string | null = null;

function upsert(list: FriendRequest[], item: FriendRequest) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = [...list];
  next[idx] = item;
  return next;
}

function removeById(list: FriendRequest[], id: string) {
  return list.filter((x) => x.id !== id);
}

export const useFriendStore = create<FriendState>((set, get) => ({
  incoming: [],
  outgoing: [],
  loading: false,

  initRealtime: (userId: string) => {
    if (!import.meta.env.DEV) return;
    if (!userId) return;
    if (socket && socketInitializedFor === userId) return;

    if (!API_URL) return;

    // Reset any existing socket to avoid duplicated listeners.
    if (socket) {
      try {
        socket.off('friend:request');
        socket.off('friend:request:updated');
        socket.close();
      } catch {
        // ignore
      }
      socket = null;
      socketInitializedFor = null;
    }

    socket = io(API_URL, { withCredentials: true });
    socketInitializedFor = userId;

    socket.emit('user:join', { userId });

    const onRequest = (req: FriendRequest) => {
      if (!req || !req.id) return;
      set((state) => {
        // Only keep pending in the pending lists
        if (req.status !== 'pending') {
          return {
            incoming: req.toUserId === userId ? removeById(state.incoming, req.id) : state.incoming,
            outgoing: req.fromUserId === userId ? removeById(state.outgoing, req.id) : state.outgoing,
          };
        }

        return {
          incoming: req.toUserId === userId ? upsert(state.incoming, req) : state.incoming,
          outgoing: req.fromUserId === userId ? upsert(state.outgoing, req) : state.outgoing,
        };
      });
    };

    const onUpdated = (req: FriendRequest) => {
      onRequest(req);
    };

    socket.on('friend:request', onRequest);
    socket.on('friend:request:updated', onUpdated);
  },

  loadRequests: async () => {
    set({ loading: true });
    try {
      const data = (await api.get('/api/friends/requests')) as any;
      set({
        incoming: Array.isArray(data?.incoming) ? data.incoming : [],
        outgoing: Array.isArray(data?.outgoing) ? data.outgoing : [],
      });
    } finally {
      set({ loading: false });
    }
  },

  sendRequest: async (fromUser, toUser) => {
    const { request } = (await api.post('/api/friends/request', { fromUser, toUser })) as any;
    if (request && request.id) {
      set((state) => ({ outgoing: upsert(state.outgoing, request) }));
    }
  },

  acceptRequest: async (requestId: string) => {
    const { request } = (await api.post(`/api/friends/request/${requestId}/accept`, {})) as any;
    if (request && request.id) {
      set((state) => ({ incoming: removeById(state.incoming, request.id) }));
    }
  },

  declineRequest: async (requestId: string) => {
    const { request } = (await api.post(`/api/friends/request/${requestId}/decline`, {})) as any;
    if (request && request.id) {
      set((state) => ({ incoming: removeById(state.incoming, request.id) }));
    }
  },
}));
