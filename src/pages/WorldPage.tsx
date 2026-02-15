import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { useWorldStore } from '@/store/worldStore';
import { Card } from '@/components/ui/card';

const tierBg: Record<string, string> = {
  free: 'bg-card',
  bronze: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10',
  silver: 'bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900/20 dark:to-slate-800/10',
  gold: 'bg-gradient-to-br from-yellow-50 to-yellow-200 dark:from-yellow-900/20 dark:to-yellow-800/10',
};
const tierBorder: Record<string, string> = {
  free: 'border-muted',
  bronze: 'border-amber-300 dark:border-amber-600/60',
  silver: 'border-slate-300 dark:border-slate-600/60',
  gold: 'border-yellow-400 dark:border-yellow-600/60',
};
const tierIcon: Record<string, string> = {
  free: '•',
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

export default function WorldPage() {
  const nav = useNavigate();
  const { booths, stages, events, loadMock } = useWorldStore();
  const [mounted, setMounted] = useState(false);
  useEffect(()=> { loadMock(); setTimeout(()=> setMounted(true), 0); }, [loadMock]);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const isLoading = booths.length === 0 && stages.length === 0 && events.length === 0;

  const gridSize = 6;
  const map: Record<string, { type: 'booth'|'stage'; id: string; label: string; tier?: string; avatar?: string }> = {};
  booths.forEach(b => { map[`${b.location.x},${b.location.y}`] = { type: 'booth', id: b.id, label: b.name, tier: b.sponsorTier, avatar: b.brandAvatar }; });
  stages.forEach((s, idx) => { map[`${gridSize-1},${idx+1}`] = { type: 'stage', id: s.id, label: s.name, tier: s.sponsor?.tier }; });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 max-w-6xl mx-auto p-4 relative">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-tr from-pink-500/10 to-yellow-500/10 blur-3xl" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">World Hub</h1>
            <p className="text-sm text-muted-foreground">Explore booths, stages, and upcoming live events for live shopping and shows.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-sm text-muted-foreground">Click any Booth or Stage tile to enter. Businesses can rent a booth to sell live.</div>
            <button
              onClick={()=> nav('/world/manage')}
              className="h-9 px-3 rounded-md border bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90"
              title="Open manager to rent a booth"
            >
              Rent a Booth
            </button>
          </div>
        </div>
        {!isLoading && events.filter(e=> e.featured).length > 0 && (
          <div className="mb-6 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Featured Events</div>
              <button onClick={()=> nav('/world/events')} className="text-sm underline">View all</button>
            </div>
            <div
              ref={stripRef}
              tabIndex={0}
              aria-label="Featured events strip"
              onKeyDown={(e)=> {
                if (e.key === 'ArrowLeft') { e.preventDefault(); stripRef.current?.scrollBy({ left: -240, behavior: 'smooth' }); }
                if (e.key === 'ArrowRight') { e.preventDefault(); stripRef.current?.scrollBy({ left: 240, behavior: 'smooth' }); }
              }}
              className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide focus:outline-none focus:ring-2 focus:ring-ring rounded"
            >
              {events.filter(e=> e.featured).map(e => (
                <div key={e.id} className={`relative min-w-[260px] w-[260px] overflow-hidden rounded-lg cursor-pointer group transition duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} onClick={()=> nav(`/world/event/${e.id}`)}>
                  <div className="h-28 bg-card overflow-hidden rounded-lg border">
                    {e.banner ? (
                      <img src={e.banner} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No banner</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-1 left-2 right-2 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                      <div className="text-sm font-semibold truncate drop-shadow">{e.title}</div>
                      <div className="text-[11px] opacity-90 truncate drop-shadow">{new Date(e.startAt).toLocaleString()}</div>
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] px-2 py-0.5 rounded bg-yellow-500 text-black">Featured</div>
                    <div className="absolute top-1 right-1 text-[10px] px-2 py-0.5 rounded bg-white/90 text-black dark:bg-black/70 dark:text-white capitalize">{e.type.replace('-', ' ')}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              aria-label="Scroll left"
              className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background border shadow hidden md:flex items-center justify-center dark:bg-neutral-900"
              onClick={()=> stripRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
            >
              ‹
            </button>
            <button
              aria-label="Scroll right"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background border shadow hidden md:flex items-center justify-center dark:bg-neutral-900"
              onClick={()=> stripRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
            >
              ›
            </button>
          </div>
        )}
        {isLoading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Featured Events</div>
            </div>
            <div className="flex gap-3 overflow-x-hidden pb-2">
              {Array.from({ length: 3 }).map((_,i) => (
                <div key={i} className="min-w-[260px] w-[260px] rounded-lg border overflow-hidden">
                  <div className="h-28 bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-6 gap-3">
          {!isLoading && Array.from({ length: gridSize*gridSize }).map((_, i) => {
            const x = (i % gridSize) + 1;
            const y = Math.floor(i / gridSize) + 1;
            const key = `${x},${y}`;
            const tile = map[key];
            const isBooth = tile?.type === 'booth';
            const isStage = tile?.type === 'stage';
            return (
              <Card
                key={key}
                className={`relative aspect-square flex items-center justify-center cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg border ${tile ? 'border-solid' : 'border-dashed'} ${tile?.tier ? tierBg[tile.tier] : 'bg-card'} ${tile?.tier ? tierBorder[tile.tier] : 'border-muted'} ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                onClick={() => tile && (isBooth ? nav(`/world/booth/${tile.id}`) : nav(`/world/stage/${tile.id}`))}
                title={tile ? tile.label : 'Empty'}
                style={{ transitionDelay: mounted ? `${i * 30}ms` : undefined }}
              >
                <div className="text-xs text-center px-1">
                  {isBooth && <div className="opacity-70">Booth · Live shopping ready</div>}
                  {isStage && <div className="opacity-70">Stage · Live events</div>}
                  <div className="font-semibold truncate w-24 mx-auto">{tile?.label || ''}</div>
                </div>
                {isBooth && (() => {
                  const count = events.filter(e => Array.isArray(e.boothIds) && e.boothIds.includes(tile.id) && new Date(e.startAt).getTime() >= Date.now()).length;
                  if (count <= 0) return null;
                  return (
                    <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white shadow">
                      {count} event{count>1?'s':''}
                    </div>
                  );
                })()}
                {isBooth && tile.avatar && (
                  <img src={tile.avatar} className="absolute bottom-2 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full ring-2 ring-white shadow" />
                )}
                {tile?.tier && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-1 text-[11px] px-1.5 py-0.5 rounded bg-background/70 backdrop-blur border shadow-sm dark:bg-neutral-900/70">
                    <span className="mr-1">{tierIcon[tile.tier]}</span>
                    <span className="capitalize hidden lg:inline">{tile.tier}</span>
                  </div>
                )}
                {isStage && (() => {
                  const st = stages.find(s => s.id === tile.id);
                  return st?.isLive ? (
                    <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white shadow">LIVE</div>
                  ) : null;
                })()}
              </Card>
          );
          })}
          {isLoading && (
            <>
              {Array.from({ length: 6 }).map((_,i) => (
                <div key={`sk-sm-${i}`} className="aspect-square rounded border bg-muted animate-pulse md:hidden" />
              ))}
              {Array.from({ length: gridSize*gridSize }).map((_,i) => (
                <div key={`sk-${i}`} className="hidden md:block aspect-square rounded border bg-muted animate-pulse" />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
