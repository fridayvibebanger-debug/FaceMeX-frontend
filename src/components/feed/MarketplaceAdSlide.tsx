import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type FeedAd = {
  id: string;
  title: string;
  shopName: string;
  category: string;
  location: string;
  image: string;
  tagline: string;
  active: boolean;
};

function readAds(): FeedAd[] {
  try {
    const raw = localStorage.getItem('facemex_feed_slide_ads');
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.filter((ad) => ad && ad.active)
      : [];
  } catch {
    return [];
  }
}

export default function MarketplaceAdSlide() {
  const [ads, setAds] = useState<FeedAd[]>(() => readAds());

  useEffect(() => {
    let frame = 0;

    const refresh = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        setAds(readAds());
      });
    };

    window.addEventListener('facemex-feed-ads-updated', refresh);
    window.addEventListener('storage', refresh);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener('facemex-feed-ads-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const visibleAds = ads.slice(0, 6);

  if (!visibleAds.length) return null;

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
        <div className="flex w-max gap-3 pr-2">
          {visibleAds.map((ad) => (
            <div
              key={ad.id}
              className="w-[260px] min-w-[260px] max-w-[260px] shrink-0 overflow-hidden rounded-3xl border bg-card shadow-sm"
            >
              <div className="h-32 w-full overflow-hidden bg-muted">
                {ad.image ? (
                  <img
                    src={ad.image}
                    alt={ad.shopName || 'Promotion'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-xs font-semibold text-muted-foreground">
                    Sponsored
                  </div>
                )}
              </div>

              <div className="space-y-2 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="secondary" className="shrink-0">
                    Sponsored
                  </Badge>

                  <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                    Recommended nearby · {ad.location || 'South Africa'}
                  </span>
                </div>

                <div className="truncate text-sm font-semibold">
                  {ad.shopName || ad.title || 'Promotion'}
                </div>

                <div className="h-9 overflow-hidden text-xs leading-relaxed text-muted-foreground">
                  {ad.tagline || 'Discover this promotion on FaceMeX.'}
                </div>

                <Button size="sm" className="w-full rounded-full">
                  View promotion
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
