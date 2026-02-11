import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { api } from '@/lib/api';
import { useUserStore } from '@/store/userStore';
import { Globe, Mail, Sparkles } from 'lucide-react';

type BusinessAsset = {
  type: 'image' | 'video';
  url: string;
};

type BusinessListing = {
  id: string;
  name: string;
  websiteUrl: string;
  description: string;
  tier: 'exclusive';
  isDemo?: boolean;
  assets: BusinessAsset[];
};

type AdMedia = {
  type: 'image' | 'video';
  url: string;
};

type MarketplaceAd = {
  id: string;
  title: string;
  description: string;
  websiteUrl: string | null;
  media: AdMedia[];
  createdAt?: string;
  creatorTier?: string;
  status?: 'active' | 'paused' | 'deleted' | string;
};

const DEMO: BusinessListing = {
  id: 'demo-novabuild',
  name: 'NovaBuild Solutions',
  websiteUrl: 'https://novabuild.example',
  description:
    'Premium modular construction for luxury residences and commercial spaces. Rapid delivery. Quiet elegance. Engineered durability.',
  tier: 'exclusive',
  isDemo: true,
  assets: [
    { type: 'video', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { type: 'image', url: 'https://images.unsplash.com/photo-1523413457903-3e5d6b2b31f0?auto=format&fit=crop&w=1600&q=80' },
    { type: 'image', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80' },
    { type: 'image', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80' },
  ],
};

function normalizeListing(raw: any): BusinessListing | null {
  if (!raw) return null;
  const id = String(raw.id || '').trim();
  const name = String(raw.name || '').trim();
  const websiteUrl = String(raw.websiteUrl || raw.website_url || '').trim();
  const description = String(raw.description || '').trim();
  if (!id || !name || !websiteUrl || !description) return null;
  const assets: BusinessAsset[] = Array.isArray(raw.assets)
    ? raw.assets
        .map((a: any) => ({
          type: a?.type === 'video' ? 'video' : 'image',
          url: String(a?.url || ''),
        }))
        .filter((a: any) => a.url)
    : [];

  return {
    id,
    name,
    websiteUrl,
    description,
    tier: 'exclusive',
    isDemo: !!raw.isDemo,
    assets,
  };
}

function bestAssets(listing: BusinessListing) {
  const videos = listing.assets.filter((a) => a.type === 'video');
  const images = listing.assets.filter((a) => a.type === 'image');
  return [...videos, ...images].slice(0, 6);
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

export default function PremiumMarketplacePage() {
  const { tier, hasTier } = useUserStore();
  const [featured, setFeatured] = useState<BusinessListing[]>([DEMO]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [heroApi, setHeroApi] = useState<CarouselApi | null>(null);

  const [ads, setAds] = useState<MarketplaceAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsApi, setAdsApi] = useState<CarouselApi | null>(null);

  const [myAds, setMyAds] = useState<MarketplaceAd[]>([]);
  const [myAdsLoading, setMyAdsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const TTL_MS = 30 * 60 * 1000;
      const featuredKey = 'facemex:marketplace:featured:v1';
      const adsKey = 'facemex:marketplace:ads:v1';

      const readCache = (key: string) => {
        if (typeof window === 'undefined') return null;
        try {
          const rawL = window.localStorage?.getItem(key);
          if (rawL) return JSON.parse(rawL);
        } catch {
        }
        try {
          const rawS = window.sessionStorage?.getItem(key);
          if (rawS) return JSON.parse(rawS);
        } catch {
        }
        return null;
      };

      const writeCache = (key: string, value: any) => {
        if (typeof window === 'undefined') return;
        const serialized = JSON.stringify(value);
        try {
          window.localStorage?.setItem(key, serialized);
        } catch {
        }
        try {
          window.sessionStorage?.setItem(key, serialized);
        } catch {
        }
      };

      try {
        let cachedFeatured: any = null;
        let cachedAds: any = null;
        cachedFeatured = readCache(featuredKey);
        cachedAds = readCache(adsKey);

        const now = Date.now();
        const hasFeaturedCache = Array.isArray(cachedFeatured?.data);
        const hasAdsCache = Array.isArray(cachedAds?.data);

        if (hasFeaturedCache) {
          const normalized = (cachedFeatured.data as any[]).map(normalizeListing).filter(Boolean) as BusinessListing[];
          const withDemoFirst = [DEMO, ...normalized.filter((x) => x.id !== DEMO.id)];
          setFeatured(withDemoFirst);
          setFeaturedLoading(false);
        }

        if (hasAdsCache) {
          const list = cachedAds.data as any[];
          const normalized = list
            .map((a: any) => {
              const id = String(a?.id || '').trim();
              const title = String(a?.title || '').trim();
              const description = String(a?.description || '').trim();
              if (!id || !title || !description) return null;
              const media: AdMedia[] = Array.isArray(a?.media)
                ? a.media
                    .map((m: any) => ({
                      type: m?.type === 'video' ? 'video' : 'image',
                      url: String(m?.url || '').trim(),
                    }))
                    .filter((m: any) => m.url)
                : [];
              return {
                id,
                title,
                description,
                websiteUrl: a?.websiteUrl ? String(a.websiteUrl) : null,
                media,
                createdAt: a?.createdAt,
                creatorTier: a?.creatorTier,
              } satisfies MarketplaceAd;
            })
            .filter(Boolean) as MarketplaceAd[];
          setAds(normalized);
          setAdsLoading(false);
        }

        const isFeaturedCacheFresh = cachedFeatured?.ts && now - cachedFeatured.ts < TTL_MS;
        const isAdsCacheFresh = cachedAds?.ts && now - cachedAds.ts < TTL_MS;
        if (isFeaturedCacheFresh && isAdsCacheFresh) return;

        const [featuredData, adsData] = await Promise.all([
          api.get('/api/marketplace/featured'),
          api.get('/api/marketplace/ads'),
        ]);
        if (cancelled) return;

        writeCache(featuredKey, { ts: Date.now(), data: featuredData });
        writeCache(adsKey, { ts: Date.now(), data: adsData });

        const listF = Array.isArray(featuredData) ? featuredData : [];
        const normalizedF = listF.map(normalizeListing).filter(Boolean) as BusinessListing[];
        const withDemoFirst = [DEMO, ...normalizedF.filter((x) => x.id !== DEMO.id)];
        setFeatured(withDemoFirst);

        const listA = Array.isArray(adsData) ? adsData : [];
        const normalizedA = listA
          .map((a: any) => {
            const id = String(a?.id || '').trim();
            const title = String(a?.title || '').trim();
            const description = String(a?.description || '').trim();
            if (!id || !title || !description) return null;
            const media: AdMedia[] = Array.isArray(a?.media)
              ? a.media
                  .map((m: any) => ({
                    type: m?.type === 'video' ? 'video' : 'image',
                    url: String(m?.url || '').trim(),
                  }))
                  .filter((m: any) => m.url)
              : [];
            return {
              id,
              title,
              description,
              websiteUrl: a?.websiteUrl ? String(a.websiteUrl) : null,
              media,
              createdAt: a?.createdAt,
              creatorTier: a?.creatorTier,
            } satisfies MarketplaceAd;
          })
          .filter(Boolean) as MarketplaceAd[];
        setAds(normalizedA);
      } catch {
        setFeatured([DEMO]);
        setAds([]);
      } finally {
        if (!cancelled) {
          setFeaturedLoading(false);
          setAdsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!heroApi) return;
    const id = window.setInterval(() => {
      try {
        if (heroApi.canScrollNext()) heroApi.scrollNext();
        else heroApi.scrollTo(0);
      } catch {
      }
    }, 5200);
    return () => window.clearInterval(id);
  }, [heroApi]);

  const loadMyAds = async () => {
    if (!hasTier('business')) return;
    setMyAdsLoading(true);
    try {
      const data = await api.get('/api/marketplace/ads/mine');
      const list = Array.isArray(data) ? data : [];
      const normalized = list
        .map((a: any) => {
          const id = String(a?.id || '').trim();
          const title = String(a?.title || '').trim();
          const description = String(a?.description || '').trim();
          if (!id || !title || !description) return null;
          const media: AdMedia[] = Array.isArray(a?.media)
            ? a.media
                .map((m: any) => ({
                  type: m?.type === 'video' ? 'video' : 'image',
                  url: String(m?.url || '').trim(),
                }))
                .filter((m: any) => m.url)
            : [];
          return {
            id,
            title,
            description,
            websiteUrl: a?.websiteUrl ? String(a.websiteUrl) : null,
            media,
            status: a?.status,
            createdAt: a?.createdAt,
            creatorTier: a?.creatorTier,
          } satisfies MarketplaceAd;
        })
        .filter(Boolean) as MarketplaceAd[];
      setMyAds(normalized);
    } catch {
      setMyAds([]);
    } finally {
      setMyAdsLoading(false);
    }
  };

  useEffect(() => {
    loadMyAds().catch(() => {});
  }, [tier]);

  useEffect(() => {
    if (!adsApi) return;
    const id = window.setInterval(() => {
      try {
        if (adsApi.canScrollNext()) adsApi.scrollNext();
        else adsApi.scrollTo(0);
      } catch {
      }
    }, 6500);
    return () => window.clearInterval(id);
  }, [adsApi]);

  const handleToggleMyAd = async (adId: string, nextStatus: 'active' | 'paused') => {
    await api.patch(`/api/marketplace/ads/${adId}`, { status: nextStatus });
    setMyAds((prev) => prev.map((a) => (a.id === adId ? { ...a, status: nextStatus } : a)));
    if (nextStatus === 'active') {
      loadMyAds().catch(() => {});
    }
  };

  const handleDeleteMyAd = async (adId: string) => {
    await api.delete(`/api/marketplace/ads/${adId}`);
    setMyAds((prev) => prev.filter((a) => a.id !== adId));
    setAds((prev) => prev.filter((a) => a.id !== adId));
  };

  const hero = featured[0] || DEMO;

  const heroSlides = useMemo(() => bestAssets(hero), [hero]);

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="mx-auto max-w-6xl p-3 sm:p-4 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Exclusive Business Tier Marketplace
            </div>
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight">
              Facemex Marketplace
            </h1>
            <p className="text-[13px] sm:text-sm text-muted-foreground max-w-2xl">
              A premium digital mall built for high-end businesses. Full-screen showcases, rich media, and conversion-first ad layouts.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">Luxury</Badge>
            <Badge variant="outline" className="px-3 py-1">Autoplay Showcase</Badge>
          </div>
        </div>

        <Card className="overflow-hidden border bg-gradient-to-b from-slate-950/5 via-background to-background dark:from-slate-950 dark:via-slate-950/70 dark:to-background">
          <CardContent className="p-0">
            <Carousel setApi={(api) => setHeroApi(api)} opts={{ loop: true }}>
              <CarouselContent>
                {heroSlides.map((asset, idx) => (
                  <CarouselItem key={`${hero.id}-${idx}`}>
                    <div className="relative aspect-[4/3] sm:aspect-[21/9] bg-black">
                      {asset.type === 'video' ? (
                        <video
                          className="h-full w-full object-cover"
                          src={asset.url}
                          muted
                          playsInline
                          autoPlay
                          loop
                        />
                      ) : (
                        <img
                          className="h-full w-full object-cover"
                          src={asset.url}
                          alt={hero.name}
                          loading={idx === 0 ? 'eager' : 'lazy'}
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

                      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6">
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.45 }}
                          className="max-w-2xl"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className="bg-white/10 text-white border-white/15">Exclusive</Badge>
                            {hero.isDemo && (
                              <Badge variant="secondary" className="bg-white/15 text-white border-white/15">Demo Showcase</Badge>
                            )}
                            <span className="text-xs text-white/80">{hostname(hero.websiteUrl)}</span>
                          </div>
                          <div className="text-white text-base sm:text-2xl font-semibold tracking-tight">
                            {hero.name}
                          </div>
                          <p className="mt-1.5 text-[13px] sm:text-sm text-white/85 leading-relaxed">
                            {hero.description}
                          </p>

                          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
                            <Button asChild className="bg-white text-slate-950 hover:bg-white/90 w-full sm:w-auto">
                              <a href={hero.websiteUrl} target="_blank" rel="noreferrer">
                                <Globe className="h-4 w-4 mr-2" />
                                Visit Website
                              </a>
                            </Button>
                            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full sm:w-auto" asChild>
                              <a href={`mailto:info@${hostname(hero.websiteUrl)}`}>
                                <Mail className="h-4 w-4 mr-2" />
                                Contact Business
                              </a>
                            </Button>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Featured Businesses</h2>
          <div className="text-xs text-muted-foreground">Rotating weekly · Exclusive tier</div>
        </div>

        {ads.length > 0 ? (
          <Card className="overflow-hidden border bg-card">
            <CardContent className="p-0">
              <Carousel setApi={(api) => setAdsApi(api)} opts={{ loop: true }}>
                <CarouselContent>
                  {ads.slice(0, 10).map((a) => {
                    const cover = a.media?.[0];
                    return (
                      <CarouselItem key={a.id} className="basis-[90%] sm:basis-1/2 lg:basis-1/3">
                        <div className="p-3">
                          <Card className="overflow-hidden border bg-card">
                            <div className="relative aspect-[16/10] bg-black">
                              {cover?.type === 'video' ? (
                                <video className="h-full w-full object-cover" src={cover.url} muted playsInline autoPlay loop />
                              ) : (
                                <img
                                  className="h-full w-full object-cover"
                                  src={cover?.url || DEMO.assets[1].url}
                                  alt={a.title}
                                  loading="lazy"
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                              <div className="absolute left-3 top-3 flex items-center gap-2">
                                <Badge className="bg-white/10 text-white border-white/15">Sponsored</Badge>
                                <Badge variant="secondary" className="bg-white/15 text-white border-white/15 capitalize">
                                  {a.creatorTier || tier}
                                </Badge>
                              </div>
                              <div className="absolute inset-x-0 bottom-0 p-3">
                                <div className="text-white font-semibold truncate">{a.title}</div>
                                {a.websiteUrl && (
                                  <div className="text-[11px] text-white/80 truncate">{hostname(a.websiteUrl)}</div>
                                )}
                              </div>
                            </div>
                            <CardContent className="p-3 space-y-2">
                              <div className="text-sm text-muted-foreground line-clamp-3">{a.description}</div>
                              <div className="flex items-center gap-2">
                                {a.websiteUrl ? (
                                  <Button size="sm" asChild>
                                    <a href={a.websiteUrl} target="_blank" rel="noreferrer">Learn More</a>
                                  </Button>
                                ) : (
                                  <Button size="sm" disabled>
                                    Learn More
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>
            </CardContent>
          </Card>
        ) : adsLoading ? (
          <Card className="border bg-card">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 w-44 rounded bg-muted animate-pulse" />
                <div className="h-4 w-64 rounded bg-muted animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border bg-card">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No sponsored ads yet.
            </CardContent>
          </Card>
        )}

        {hasTier('business') && (
          <Card className="border bg-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-tight">My Ads</h3>
                <Button size="sm" variant="outline" onClick={() => loadMyAds().catch(() => {})} disabled={myAdsLoading}>
                  Refresh
                </Button>
              </div>

              {myAds.length === 0 ? (
                <div className="text-sm text-muted-foreground">No ads yet.</div>
              ) : (
                <div className="space-y-2">
                  {myAds.map((a) => (
                    <div key={a.id} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{a.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{a.description}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize">{a.status || 'active'}</Badge>
                            {a.websiteUrl && (
                              <span className="text-[11px] text-muted-foreground truncate">{hostname(a.websiteUrl)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {a.status === 'paused' ? (
                            <Button size="sm" onClick={() => handleToggleMyAd(a.id, 'active').catch(() => {})}>
                              Resume
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleToggleMyAd(a.id, 'paused').catch(() => {})}>
                              Pause
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteMyAd(a.id).catch(() => {})}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {featured.slice(0, 6).map((b) => {
            const cover = bestAssets(b)[0];
            return (
              <Card key={b.id} className="overflow-hidden border bg-card">
                <div className="relative aspect-[16/10] bg-black">
                  {cover?.type === 'video' ? (
                    <video className="h-full w-full object-cover" src={cover.url} muted playsInline autoPlay loop />
                  ) : (
                    <img className="h-full w-full object-cover" src={cover?.url || DEMO.assets[1].url} alt={b.name} loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <Badge className="bg-white/10 text-white border-white/15">Exclusive</Badge>
                    {b.isDemo && (
                      <Badge variant="secondary" className="bg-white/15 text-white border-white/15">Example Business</Badge>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="text-white font-semibold truncate">{b.name}</div>
                    <div className="text-[11px] text-white/80 truncate">{hostname(b.websiteUrl)}</div>
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="text-sm text-muted-foreground line-clamp-3">{b.description}</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" asChild>
                      <a href={b.websiteUrl} target="_blank" rel="noreferrer">Visit Website</a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:info@${hostname(b.websiteUrl)}`}>Contact</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {featuredLoading && (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, idx) => (
              <Card key={`featured-skel-${idx}`} className="overflow-hidden border bg-card">
                <div className="relative aspect-[16/10] bg-muted animate-pulse" />
                <CardContent className="p-3 space-y-2">
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-56 rounded bg-muted animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
