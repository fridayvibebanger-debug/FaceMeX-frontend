import { create } from 'zustand';

export type SponsorTier = 'free' | 'bronze' | 'silver' | 'gold';

export interface BoothProduct { id: string; name: string; price: number; image?: string }
export interface Booth {
  id: string;
  name: string;
  brandAvatar: string;
  banner?: string;
  description?: string;
  location: { x: number; y: number; zone: string };
  sponsorTier: SponsorTier;
  products: BoothProduct[];
  links?: { website?: string; twitter?: string; instagram?: string };
}

export interface Stage {
  id: string;
  name: string;
  streamUrl?: string;
  isLive: boolean;
  hostName?: string;
  sponsor?: { name: string; tier: SponsorTier };
}

export type EventType = 'live-shopping' | 'concert' | 'expo' | 'showcase';
export interface WorldEvent {
  id: string;
  title: string;
  type: EventType;
  startAt: string;
  endAt?: string;
  stageId?: string;
  boothIds?: string[];
  sponsor?: { name: string; tier: SponsorTier };
  featured?: boolean;
  banner?: string;
}

interface WorldState {
  booths: Booth[];
  stages: Stage[];
  events: WorldEvent[];
  loadMock: () => void;
  getBooth: (id: string) => Booth | undefined;
  getStage: (id: string) => Stage | undefined;
  addBooth: (b: Omit<Booth, 'id'>) => Booth;
  updateBooth: (id: string, patch: Partial<Booth>) => void;
  removeBooth: (id: string) => void;
  addBoothProduct: (boothId: string, p: Omit<BoothProduct, 'id'>) => void;
  removeBoothProduct: (boothId: string, productId: string) => void;
  updateBoothProduct: (boothId: string, productId: string, patch: Partial<BoothProduct>) => void;
  addEvent: (e: Omit<WorldEvent, 'id'>) => WorldEvent;
  updateEvent: (id: string, patch: Partial<WorldEvent>) => void;
  removeEvent: (id: string) => void;
  toggleFeatured: (eventId: string) => void;
  quoteSponsorship: (tier: SponsorTier, days?: number) => { tier: SponsorTier; days: number; priceZAR: number };
}

const mockBooths: Booth[] = [
  { id: 'b1', name: 'Nova Wear', brandAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nova', description: 'Streetwear & accessories', location: { x: 1, y: 1, zone: 'A' }, sponsorTier: 'gold', products: [ { id: 'p1', name: 'Hoodie', price: 49 }, { id: 'p2', name: 'Cap', price: 19 } ] },
  { id: 'b2', name: 'Pixel Gadgets', brandAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pixel', description: 'Smart home devices', location: { x: 2, y: 1, zone: 'A' }, sponsorTier: 'silver', products: [ { id: 'p3', name: 'Smart Plug', price: 29 } ] },
  { id: 'b3', name: 'Eco Beauty', brandAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eco', description: 'Natural skincare', location: { x: 3, y: 2, zone: 'B' }, sponsorTier: 'bronze', products: [ { id: 'p4', name: 'Serum', price: 35 } ] },
];

const mockStages: Stage[] = [
  { id: 's1', name: 'Main Stage', isLive: false, sponsor: { name: 'Nova Wear', tier: 'gold' } },
];

const mockEvents: WorldEvent[] = [
  { id: 'e1', title: 'Live Shopping: Nova Wear', type: 'live-shopping', startAt: new Date(Date.now()+3600_000).toISOString(), stageId: 's1', boothIds: ['b1'], sponsor: { name: 'Nova Wear', tier: 'gold' }, featured: true },
  { id: 'e2', title: 'Creator Showcase', type: 'showcase', startAt: new Date(Date.now()+7200_000).toISOString(), stageId: 's1', featured: false },
];

export const useWorldStore = create<WorldState>((set, get) => ({
  booths: [],
  stages: [],
  events: [],
  loadMock: () => set({ booths: mockBooths, stages: mockStages, events: mockEvents }),
  getBooth: (id) => get().booths.find(b => b.id === id),
  getStage: (id) => get().stages.find(s => s.id === id),
  addBooth: (b) => {
    const booth: Booth = { ...b, id: `b${Date.now()}` };
    set({ booths: [booth, ...get().booths] });
    return booth;
  },
  updateBooth: (id, patch) => {
    set({ booths: get().booths.map(b => b.id === id ? { ...b, ...patch, id: b.id } : b) });
  },
  removeBooth: (id) => {
    set({ booths: get().booths.filter(b => b.id !== id) });
  },
  addBoothProduct: (boothId, p) => {
    set({ booths: get().booths.map(b => b.id === boothId ? { ...b, products: [{ id: `p${Date.now()}`, ...p }, ...b.products] } : b) });
  },
  removeBoothProduct: (boothId, productId) => {
    set({ booths: get().booths.map(b => b.id === boothId ? { ...b, products: b.products.filter(pp => pp.id !== productId) } : b) });
  },
  updateBoothProduct: (boothId, productId, patch) => {
    set({ booths: get().booths.map(b => b.id === boothId ? { ...b, products: b.products.map(pp => pp.id === productId ? { ...pp, ...patch, id: pp.id } : pp) } : b) });
  },
  addEvent: (e) => {
    const event: WorldEvent = { ...e, id: `e${Date.now()}` };
    set({ events: [event, ...get().events] });
    return event;
  },
  updateEvent: (id, patch) => {
    set({ events: get().events.map(ev => ev.id === id ? { ...ev, ...patch, id: ev.id } : ev) });
  },
  removeEvent: (id) => {
    set({ events: get().events.filter(ev => ev.id !== id) });
  },
  toggleFeatured: (eventId) => {
    set({ events: get().events.map(ev => ev.id === eventId ? { ...ev, featured: !ev.featured } : ev) });
  },
  quoteSponsorship: (tier, days = 30) => {
    const base: Record<SponsorTier, number> = { free: 0, bronze: 500, silver: 1500, gold: 4000 };
    const priceZAR = Math.round((base[tier] || 0) * (days / 30));
    return { tier, days, priceZAR };
  },
}));
