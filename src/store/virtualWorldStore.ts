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

export const useVirtualWorldStore = create<VirtualWorldState>((set, get) => ({
  worlds: [],
  currentWorld: null,
  loadWorlds: async () => {
    try {
      const data: any = await api.get('/api/worlds');
      set({ worlds: Array.isArray(data.items) ? data.items : [] });
    } catch {
      set({ worlds: [] });
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