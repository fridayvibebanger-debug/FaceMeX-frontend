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
    return Array.isArray(parsed) ? parsed.filter((ad) => ad.active) : [];
  } catch {
    return [];
  }
}

export default function MarketplaceAdSlide() {
  const [ads, setAds] = useState<FeedAd[]>(() => readAds());

  useEffect(() => {
    const refresh = () => setAds(readAds());

    window.addEventListener('facemex-feed-ads-updated', refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener('facemex-feed-ads-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!ads.length) return null;

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-3">
        {ads.slice(0, 6).map((ad) => (
          <div
            key={ad.id}
            className="min-w-[260px] max-w-[260px] overflow-hidden rounded-3xl border bg-card shadow-sm"
          >
            {ad.image && (
              <div className="h-32 bg-muted">
                <img
                  src={ad.image}
                  alt={ad.shopName}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="space-y-2 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Sponsored</Badge>
                <span className="truncate text-[11px] text-muted-foreground">
                  Recommended nearby · {ad.location}
                </span>
              </div>

              <div className="truncate text-sm font-semibold">
                {ad.shopName}
              </div>

              <div className="h-9 overflow-hidden text-xs text-muted-foreground">
                {ad.tagline}
              </div>

              <Button size="sm" className="w-full rounded-full">
                View promotion
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
