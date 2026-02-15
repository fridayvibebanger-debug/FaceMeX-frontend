import { create } from 'zustand';
import { api } from '@/lib/api';

export interface VirtualWorld {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  creatorId: string;
  creatorName: string;
  participants: number;
  maxParticipants: number;
  isPublic: boolean;
  theme: 'space' | 'beach' | 'city' | 'forest' | 'custom';
  priceCents?: number; // optional paywall price
  mods?: string[]; // user IDs with moderator role
}

interface VirtualWorldState {
  worlds: VirtualWorld[];
  currentWorld: VirtualWorld | null;
  loadWorlds: () => Promise<void>;
  joinWorld: (worldId: string) => void;
  leaveWorld: () => void;
  createWorld: (world: Omit<VirtualWorld, 'id' | 'participants'>) => void;
  deleteWorld: (worldId: string) => void;
  updateWorld: (worldId: string, patch: Partial<VirtualWorld>) => void;
}

const mockWorlds: VirtualWorld[] = [
  {
    id: '1',
    name: 'Sunset Beach Hangout',
    description: 'Relax by the virtual beach with friends',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    creatorId: '2',
    creatorName: 'Sarah Johnson',
    participants: 12,
    maxParticipants: 50,
    isPublic: true,
    theme: 'beach',
  },
  {
    id: '2',
    name: 'Neon City Nights',
    description: 'Explore a futuristic cyberpunk city',
    thumbnail: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80',
    creatorId: '3',
    creatorName: 'Mike Chen',
    participants: 28,
    maxParticipants: 100,
    isPublic: true,
    theme: 'city',
  },
  {
    id: '3',
    name: 'Space Station Alpha',
    description: 'Float in zero gravity and explore the cosmos',
    thumbnail: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&q=80',
    creatorId: '4',
    creatorName: 'Emma Wilson',
    participants: 8,
    maxParticipants: 30,
    isPublic: true,
    theme: 'space',
  },
  {
    id: '4',
    name: 'Enchanted Forest',
    description: 'Magical woodland with mystical creatures',
    thumbnail: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80',
    creatorId: '2',
    creatorName: 'Sarah Johnson',
    participants: 15,
    maxParticipants: 40,
    isPublic: true,
    theme: 'forest',
  },
];

export const useVirtualWorldStore = create<VirtualWorldState>((set, get) => ({
  worlds: [],
  currentWorld: null,
  loadWorlds: async () => {
    try {
      const data: any = await api.get('/api/worlds');
      set({ worlds: Array.isArray(data.items) ? data.items : [] });
    } catch {
      // fallback to mock if API not ready
      set({ worlds: mockWorlds });
    }
  },
  joinWorld: (worldId: string) => {
    const world = get().worlds.find((w) => w.id === worldId);
    if (!world) return;
    // optimistic
    const optimistic = { ...world, participants: Math.min((world.participants || 0) + 1, world.maxParticipants) } as VirtualWorld;
    set({ currentWorld: optimistic, worlds: get().worlds.map(w => w.id === worldId ? optimistic : w) });
    // server confirm
    (async () => {
      try {
        const data: any = await api.post(`/api/worlds/${worldId}/join`, {});
        const updated = data.world as VirtualWorld;
        set({ currentWorld: updated, worlds: get().worlds.map(w => w.id === worldId ? updated : w) });
      } catch {
        // rollback
        set({ currentWorld: world, worlds: get().worlds.map(w => w.id === worldId ? world : w) });
      }
    })();
  },
  leaveWorld: () => {
    const cw = get().currentWorld;
    if (!cw) { set({ currentWorld: null }); return; }
    const updated = { ...cw, participants: Math.max((cw.participants || 0) - 1, 0) } as VirtualWorld;
    set({ currentWorld: null, worlds: get().worlds.map(w => w.id === cw.id ? updated : w) });
    (async () => {
      try { await api.post(`/api/worlds/${cw.id}/leave`, {}); } catch {}
    })();
  },
  createWorld: (world) => {
    // optimistic placeholder
    const tempId = `tmp-${Date.now()}`;
    const newWorld: VirtualWorld = { ...world, id: tempId, participants: 1, mods: [] } as any;
    set({ worlds: [newWorld, ...get().worlds], currentWorld: newWorld });
    (async () => {
      try {
        const payload: any = {
          name: world.name,
          description: world.description,
          thumbnail: world.thumbnail,
          maxParticipants: world.maxParticipants,
          isPublic: world.isPublic,
          theme: world.theme,
          priceCents: (world as any).priceCents || 0,
        };
        const data: any = await api.post('/api/worlds', payload);
        const saved = data.world as VirtualWorld;
        set({
          worlds: [saved, ...get().worlds.filter(w => w.id !== tempId)],
          currentWorld: saved,
        });
      } catch {
        // leave optimistic state; user can refresh
      }
    })();
  },
  deleteWorld: (worldId: string) => {
    const cw = get().currentWorld;
    set({ worlds: get().worlds.filter(w => w.id !== worldId), currentWorld: cw && cw.id === worldId ? null : cw });
    (async () => { try { await api.delete(`/api/worlds/${worldId}`); } catch {} })();
  },
  updateWorld: (worldId, patch) => {
    const cw = get().currentWorld;
    let updatedCW = cw;
    const updatedWorlds = get().worlds.map(w => {
      if (w.id === worldId) {
        const nw = { ...w, ...patch } as VirtualWorld;
        if (cw && cw.id === worldId) updatedCW = nw;
        return nw;
      }
      return w;
    });
    set({ worlds: updatedWorlds, currentWorld: updatedCW || null });
    (async () => {
      try {
        await api.patch(`/api/worlds/${worldId}`, patch);
      } catch {}
    })();
  },
}));