import Navbar from '@/components/layout/Navbar';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useMemo, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { createCheckoutSession } from '@/utils/billing';
import { uploadMedia } from '@/lib/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BusinessPromotion {
  id: string;
  businessName: string;
  headline: string;
  description: string;
  imageUrl?: string;
  contactEmail?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  tags: string[];
  startAt?: number;
  endAt?: number;
  monthlyPaidUntil?: number;
  billing?: 'monthly';
  paidAmountZar?: number;
  paidDays?: number;
}

const PROMO_DRAFT_KEY = 'faceme_business_promotion_draft_v1';

const STORAGE_KEY_PROMOTIONS = 'faceme_business_promotions_v1';

const MOCK_PROMOTIONS: BusinessPromotion[] = [
  {
    id: 'p1',
    businessName: 'Nova Coffee',
    headline: 'Fresh coffee, fast delivery',
    description: 'Order beans, cold brew, and snacks. Delivered in 30 minutes in Cape Town.',
    imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80',
    ctaLabel: 'Order now',
    ctaUrl: 'https://example.com',
    tags: ['coffee', 'delivery'],
  },
];

interface MediaItem {
  id: string;
  title: string;
  publisher: string;
  description: string;
  coverImage?: string;
  tags: string[];
  priceDigital: number;
  pricePrint: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

const MOCK_MEDIA: MediaItem[] = [
  {
    id: 'm1',
    title: 'Cape Town Daily',
    publisher: 'Cape Media Group',
    description: 'Local and global headlines, sport, and business every morning.',
    coverImage: 'https://images.unsplash.com/photo-1514996937319-344454492b37?w=600&q=80',
    tags: ['media', 'news', 'daily'],
    priceDigital: 39,
    pricePrint: 59,
    frequency: 'daily',
  },
  {
    id: 'm2',
    title: 'Creator Stories',
    publisher: 'FaceMeX Media',
    description: 'Deep dives with African creators, founders, and storytellers.',
    coverImage: 'https://images.unsplash.com/photo-1512428232641-78a589fd95fd?w=600&q=80',
    tags: ['media', 'creators', 'business'],
    priceDigital: 49,
    pricePrint: 89,
    frequency: 'monthly',
  },
  {
    id: 'm3',
    title: 'Tech Futures Weekly',
    publisher: 'Nova Tech Press',
    description: 'AI, startups, and web3 in plain language.',
    coverImage: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&q=80',
    tags: ['media', 'tech', 'weekly'],
    priceDigital: 29,
    pricePrint: 69,
    frequency: 'weekly',
  },
];

export default function MediaShopPage() {
  const [query, setQuery] = useState('');
  const [formatChoice, setFormatChoice] = useState<Record<string, 'digital' | 'print'>>({});
  const [items, setItems] = useState<MediaItem[]>(() => [...MOCK_MEDIA]);
  const { hasTier } = useUserStore();

  const [showBusinessForm, setShowBusinessForm] = useState(true);

  const [promotions, setPromotions] = useState<BusinessPromotion[]>(() => [...MOCK_PROMOTIONS]);
  const [promoBusinessName, setPromoBusinessName] = useState('');
  const [promoHeadline, setPromoHeadline] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoContactEmail, setPromoContactEmail] = useState('');
  const [promoImageUrl, setPromoImageUrl] = useState('');
  const [promoImageMode, setPromoImageMode] = useState<'upload' | 'url'>('url');
  const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
  const [promoCtaLabel, setPromoCtaLabel] = useState('Shop now');
  const [promoCtaPreset, setPromoCtaPreset] = useState<string>('Shop now');
  const [promoCtaCustom, setPromoCtaCustom] = useState('');
  const [promoCtaUrl, setPromoCtaUrl] = useState('');
  const [promoTags, setPromoTags] = useState('local, business');
  const [promoDays, setPromoDays] = useState<number>(1);
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  const promoTotalZar = useMemo(() => {
    return 350;
  }, []);

  const getPromoPriceIdForDays = (days: number) => {
    const key = `VITE_STRIPE_PROMO_PRICE_ID_${days}D`;
    return ((import.meta as any).env?.[key] as string | undefined) || undefined;
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const promoPaid = params.get('promoPaid');
      if (promoPaid !== '1') return;

      const raw = localStorage.getItem(PROMO_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as BusinessPromotion;
        if (draft?.businessName && draft?.headline) {
          setPromotions((prev) => [draft, ...prev]);
        }
      }
      localStorage.removeItem(PROMO_DRAFT_KEY);
      params.delete('promoPaid');
      const next = params.toString();
      window.history.replaceState({}, '', next ? `${window.location.pathname}?${next}` : window.location.pathname);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROMOTIONS);
      if (raw) {
        const parsed = JSON.parse(raw) as BusinessPromotion[];
        setPromotions(parsed.length ? parsed : MOCK_PROMOTIONS);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROMOTIONS, JSON.stringify(promotions));
    } catch {}
  }, [promotions]);

  const handleAddPromotion = async () => {
    if (!promoBusinessName.trim() || !promoHeadline.trim()) return;
    setPromoSubmitting(true);
    try {
      const finalCtaLabel = promoCtaPreset === '__custom__'
        ? (promoCtaCustom.trim() || 'Learn more')
        : promoCtaPreset;

      let resolvedImageUrl = promoImageMode === 'url' ? promoImageUrl.trim() : '';
      if (promoImageMode === 'upload') {
        if (!promoImageFile) {
          throw new Error('Please upload an image (or switch to Image URL mode).');
        }
        resolvedImageUrl = await uploadMedia(promoImageFile, 'business-promotions');
      }

      const tags = promoTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const days = Math.max(1, Math.floor(Number.isFinite(promoDays) ? promoDays : 1));
      const startAt = Date.now();
      const endAt = startAt + days * 24 * 60 * 60 * 1000;

      const draft: BusinessPromotion = {
        id: `p${Date.now()}`,
        businessName: promoBusinessName.trim(),
        headline: promoHeadline.trim(),
        description: promoDescription.trim() || 'Sponsored promotion on FaceMe feed.',
        contactEmail: promoContactEmail.trim() || undefined,
        imageUrl: resolvedImageUrl || undefined,
        ctaLabel: finalCtaLabel || undefined,
        ctaUrl: promoCtaUrl.trim() || undefined,
        tags: tags.length ? tags : ['business'],
        startAt,
        endAt,
        paidDays: days,
        paidAmountZar: promoTotalZar,
      };

      const href = typeof window !== 'undefined' ? window.location.href : '/media-shop';
      const base = href.split('?')[0];
      const successUrl = `${base}?promoPaid=1`;
      const cancelUrl = `${base}?promoCancel=1`;
      localStorage.setItem(PROMO_DRAFT_KEY, JSON.stringify(draft));

      // Primary: Yoco Payment Link (manual confirmation)
      const yocoLink = (((import.meta as any).env?.VITE_YOCO_PAYMENT_LINK as string | undefined) || 'https://pay.yoco.com/r/4jn6xK').trim();
      if (yocoLink) {
        try {
          const w = window.open(yocoLink, '_blank', 'noopener,noreferrer');
          if (!w) window.location.assign(yocoLink);
        } catch {
          window.location.assign(yocoLink);
        }

        const paid = window.confirm('After you complete payment in Yoco, click OK to activate your promotion.');
        if (paid) {
          setPromotions((prev) => [draft, ...prev]);
          setPromoBusinessName('');
          setPromoHeadline('');
          setPromoDescription('');
          setPromoContactEmail('');
          setPromoImageUrl('');
          setPromoImageFile(null);
          setPromoCtaPreset('Shop now');
          setPromoCtaCustom('');
          setPromoCtaLabel('Shop now');
          setPromoCtaUrl('');
          setPromoTags('local, business');
          setPromoDays(1);
          localStorage.removeItem(PROMO_DRAFT_KEY);
          return;
        }
      }

      const priceId = getPromoPriceIdForDays(days);
      if (priceId) {
        const session = await createCheckoutSession({
          priceId,
          mode: 'payment',
          quantity: 1,
          successUrl,
          cancelUrl,
          metadata: {
            feature: 'business-promotion',
            businessName: draft.businessName,
            headline: draft.headline,
            days: String(days),
            amountZar: String(promoTotalZar),
          },
        });
        if (session?.url) {
          window.location.assign(session.url);
          return;
        }
      }

      const ok = typeof window !== 'undefined'
        ? window.confirm(`Confirm payment of R${promoTotalZar} for ${days} day(s) promotion?`)
        : true;
      if (!ok) return;

      setPromotions((prev) => [draft, ...prev]);
      setPromoBusinessName('');
      setPromoHeadline('');
      setPromoDescription('');
      setPromoContactEmail('');
      setPromoImageUrl('');
      setPromoImageFile(null);
      setPromoCtaPreset('Shop now');
      setPromoCtaCustom('');
      setPromoCtaLabel('Shop now');
      setPromoCtaUrl('');
      setPromoTags('local, business');
      setPromoDays(1);
    } finally {
      setPromoSubmitting(false);
    }
  };

  // Simple local form state for business listings
  const [newTitle, setNewTitle] = useState('');
  const [newPublisher, setNewPublisher] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCover, setNewCover] = useState('');
  const [newTags, setNewTags] = useState('local, business');
  const [newFreq, setNewFreq] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [newDigitalPrice, setNewDigitalPrice] = useState<number>(29);
  const [newPrintPrice, setNewPrintPrice] = useState<number>(59);
  const [submitting, setSubmitting] = useState(false);

  // Hard copy -> digital conversion (business/exclusive only, local drafts)
  const [convSource, setConvSource] = useState('');
  const [convRaw, setConvRaw] = useState('');
  const [convTitle, setConvTitle] = useState('');
  const [convPublisher, setConvPublisher] = useState('');
  const [convDesc, setConvDesc] = useState('');
  const [convTags, setConvTags] = useState('digital edition, converted');
  const [convCover, setConvCover] = useState('');
  const [convFreq, setConvFreq] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [convDigitalPrice, setConvDigitalPrice] = useState<number>(39);
  const [convSubmitting, setConvSubmitting] = useState(false);

  const [groupDigitalOnly, setGroupDigitalOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.publisher.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [items, query]);

  const handleCreateListing = () => {
    if (!newTitle.trim() || !newPublisher.trim()) return;
    if (!newDigitalPrice && !newPrintPrice) return;
    setSubmitting(true);
    try {
      const tags = newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const item: MediaItem = {
        id: `m${Date.now()}`,
        title: newTitle.trim(),
        publisher: newPublisher.trim(),
        description: newDesc.trim() || 'Media title listed by a business on FaceMeX.',
        coverImage: newCover.trim() || undefined,
        tags: tags.length ? tags : ['media'],
        priceDigital: Math.max(0, Number.isFinite(newDigitalPrice) ? newDigitalPrice : 0),
        pricePrint: Math.max(0, Number.isFinite(newPrintPrice) ? newPrintPrice : 0),
        frequency: newFreq,
      };
      setItems((prev) => [item, ...prev]);
      setNewTitle('');
      setNewPublisher('');
      setNewDesc('');
      setNewCover('');
      setNewTags('local, business');
      setNewFreq('weekly');
      setNewDigitalPrice(29);
      setNewPrintPrice(59);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCleanConvRaw = () => {
    if (!convRaw.trim()) return;
    // Basic cleanup: collapse whitespace and trim
    const cleaned = convRaw.replace(/\s+/g, ' ').trim();
    setConvRaw(cleaned);
    if (!convDesc.trim()) {
      setConvDesc(cleaned.slice(0, 260));
    }
  };

  const handleAutoConvTitle = () => {
    if (convTitle.trim()) return;
    if (convSource.trim()) {
      setConvTitle(convSource.trim().slice(0, 80));
      return;
    }
    if (convRaw.trim()) {
      setConvTitle(convRaw.trim().slice(0, 80));
    }
  };

  const handleUseConvAsListing = () => {
    if (!convDesc.trim() && convRaw.trim()) {
      setConvDesc(convRaw.trim().slice(0, 260));
    }
    if (!convTags.trim()) {
      setConvTags('digital edition, converted');
    }
  };

  const handleCreateDigitalFromHardCopy = () => {
    if (!convTitle.trim() || !convPublisher.trim()) return;
    if (!convDigitalPrice) return;
    setConvSubmitting(true);
    try {
      const tags = convTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const item: MediaItem = {
        id: `d${Date.now()}`,
        title: convTitle.trim(),
        publisher: convPublisher.trim(),
        description:
          convDesc.trim() ||
          (convRaw.trim()
            ? convRaw.trim().slice(0, 260)
            : 'Digital edition created from a hard copy source.'),
        coverImage: convCover.trim() || undefined,
        tags: tags.length ? tags : ['digital', 'converted'],
        priceDigital: Math.max(
          0,
          Number.isFinite(convDigitalPrice) ? convDigitalPrice : 0
        ),
        // For converted editions we focus on digital; print can remain 0
        pricePrint: 0,
        frequency: convFreq,
      };
      setItems((prev) => [item, ...prev]);
      setConvSource('');
      setConvRaw('');
      setConvTitle('');
      setConvPublisher('');
      setConvDesc('');
      setConvTags('digital edition, converted');
      setConvCover('');
      setConvFreq('weekly');
      setConvDigitalPrice(39);
    } finally {
      setConvSubmitting(false);
    }
  };

  const handleBuy = async (item: MediaItem) => {
    const choice = formatChoice[item.id] || 'digital';
    const price = choice === 'digital' ? item.priceDigital : item.pricePrint;

    // If no Stripe price is configured, keep safe mock behavior.
    const digitalPriceId = (import.meta as any).env?.VITE_STRIPE_MEDIA_DIGITAL_PRICE as
      | string
      | undefined;
    const printPriceId = (import.meta as any).env?.VITE_STRIPE_MEDIA_PRINT_PRICE as
      | string
      | undefined;
    const priceId = choice === 'digital' ? digitalPriceId : printPriceId;

    if (!priceId) {
      alert(
        `Mock purchase: ${item.title} as ${
          choice === 'digital' ? 'Digital copy' : 'Hard copy (print)'
        } for R${price}. (Configure VITE_STRIPE_MEDIA_DIGITAL_PRICE / VITE_STRIPE_MEDIA_PRINT_PRICE to enable real checkout.)`
      );
      return;
    }

    try {
      const href =
        typeof window !== 'undefined'
          ? window.location.href
          : '/media-shop';
      const session = await createCheckoutSession({
        priceId,
        mode: 'payment',
        quantity: 1,
        successUrl: href,
        cancelUrl: href,
        metadata: {
          feature: 'media-shop',
          mediaId: item.id,
          mediaTitle: item.title,
          format: choice,
        },
      });
      if (session?.url) {
        window.location.assign(session.url);
        return;
      }
    } catch {
      // Fall back to mock if checkout fails
    }

    alert(
      `Mock purchase: ${item.title} as ${
        choice === 'digital' ? 'Digital copy' : 'Hard copy (print)'
      } for R${price}.`
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-14 md:pt-16">
        <LeftSidebar />
        <main className="flex-1 lg:ml-64">
          <div className="max-w-5xl mx-auto py-6 md:py-8 px-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <div>
                <h1 className="text-2xl font-bold">Business Promotions</h1>
                <p className="text-base leading-relaxed text-muted-foreground">
                  A simple way to place your business on the Sponsored slide in the feed.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowBusinessForm((v) => !v)}>
                  {showBusinessForm ? 'Hide details' : 'Show details'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-base leading-relaxed text-muted-foreground">
                One subscription to publish your promotion for the month.
              </p>
              <ul className="space-y-1 text-base leading-relaxed text-muted-foreground">
                <li>• Show up in the Sponsored slide in the feed</li>
                <li>• Include a headline, image, and call to action</li>
                <li>• Update and renew month to month</li>
              </ul>
            </div>
            {showBusinessForm && (
              <Card className="rounded-3xl border bg-card">
                <CardHeader>
                  <CardTitle className="text-sm">Promote on Feed Slide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm md:text-base">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-base font-semibold">Subscription</div>
                      <div className="text-sm text-muted-foreground">
                        R350/month · Appears on the feed Sponsored slide.
                      </div>
                    </div>
                    <div className="text-base font-semibold whitespace-nowrap">R350/mo</div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-2">
                    <Input
                      placeholder="Business name"
                      value={promoBusinessName}
                      onChange={(e) => setPromoBusinessName(e.target.value)}
                      className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Input
                      placeholder="Headline (shown on the ad slide)"
                      value={promoHeadline}
                      onChange={(e) => setPromoHeadline(e.target.value)}
                      className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <Textarea
                    placeholder="Short description"
                    value={promoDescription}
                    onChange={(e) => setPromoDescription(e.target.value)}
                    rows={2}
                    className="rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Input
                    placeholder="Contact email (optional)"
                    value={promoContactEmail}
                    onChange={(e) => setPromoContactEmail(e.target.value)}
                    className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="grid md:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Select
                        value={promoImageMode}
                        onValueChange={(v) => {
                          const mode = (v === 'upload' ? 'upload' : 'url') as 'upload' | 'url';
                          setPromoImageMode(mode);
                          if (mode === 'upload') setPromoImageUrl('');
                          if (mode === 'url') setPromoImageFile(null);
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base">
                          <SelectValue placeholder="Select image method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="url">Image URL</SelectItem>
                          <SelectItem value="upload">Upload image</SelectItem>
                        </SelectContent>
                      </Select>

                      {promoImageMode === 'url' ? (
                        <Input
                          placeholder="Image URL (optional)"
                          value={promoImageUrl}
                          onChange={(e) => setPromoImageUrl(e.target.value)}
                          className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      ) : (
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setPromoImageFile(f);
                          }}
                          className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      )}
                    </div>
                    <Input
                      placeholder="Tags (comma separated)"
                      value={promoTags}
                      onChange={(e) => setPromoTags(e.target.value)}
                      className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Select
                        value={promoCtaPreset}
                        onValueChange={(v) => {
                          setPromoCtaPreset(v);
                          if (v !== '__custom__') {
                            setPromoCtaLabel(v);
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base">
                          <SelectValue placeholder="Choose CTA" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Buy now">Buy now</SelectItem>
                          <SelectItem value="Order now">Order now</SelectItem>
                          <SelectItem value="Read more">Read more</SelectItem>
                          <SelectItem value="Learn more">Learn more</SelectItem>
                          <SelectItem value="Book now">Book now</SelectItem>
                          <SelectItem value="Contact us">Contact us</SelectItem>
                          <SelectItem value="Shop now">Shop now</SelectItem>
                          <SelectItem value="__custom__">Custom…</SelectItem>
                        </SelectContent>
                      </Select>
                      {promoCtaPreset === '__custom__' && (
                        <Input
                          placeholder="Custom CTA label"
                          value={promoCtaCustom}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPromoCtaCustom(v);
                            setPromoCtaLabel(v);
                          }}
                          className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      )}
                    </div>
                    <Input
                      placeholder="CTA URL (https://...)"
                      value={promoCtaUrl}
                      onChange={(e) => setPromoCtaUrl(e.target.value)}
                      className="h-10 rounded-2xl bg-muted/20 border-border/60 text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={promoSubmitting || !promoBusinessName.trim() || !promoHeadline.trim()}
                      onClick={handleAddPromotion}
                    >
                      {promoSubmitting ? 'Processing…' : 'Continue to payment'}
                    </Button>
                  </div>

                  {promotions.length > 0 && (
                    <div className="pt-4 border-t border-border/60 space-y-2">
                      {promotions
                        .slice(0, 20)
                        .map((p) => {
                          const nowTs = Date.now();
                          const until = typeof p.monthlyPaidUntil === 'number' ? p.monthlyPaidUntil : p.endAt;
                          const isExpired = typeof until === 'number' ? nowTs > until : false;
                          const endLabel = until
                            ? new Date(until).toLocaleString()
                            : 'Not set';
                          return (
                            <div key={p.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-muted/10 px-3 py-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-semibold truncate">{p.headline}</div>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                      isExpired
                                        ? 'border-destructive/20 bg-destructive/10 text-destructive'
                                        : 'border-primary/20 bg-primary/10 text-primary'
                                    }`}
                                  >
                                    {isExpired ? 'Expired' : 'Active'}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{p.businessName}</div>
                                <div className="text-[11px] text-muted-foreground mt-1">
                                  {typeof p.paidAmountZar === 'number' ? `Paid: R${p.paidAmountZar}` : 'Paid: —'}
                                  {' • '}
                                  Renews/Ends: {endLabel}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs"
                                onClick={() => setPromotions((prev) => prev.filter((x) => x.id !== p.id))}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Active promotions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {promotions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No promotions yet.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {promotions.slice(0, 6).map((p) => (
                      <div key={p.id} className="overflow-hidden rounded-2xl border bg-background">
                        {p.imageUrl && (
                          <div className="h-36 w-full bg-muted">
                            <img src={p.imageUrl} alt={p.headline} className="h-full w-full object-cover" loading="lazy" />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="text-sm font-semibold">{p.headline}</div>
                          <div className="text-xs text-muted-foreground mt-1">{p.businessName}</div>
                          {p.description && (
                            <div className="text-xs text-muted-foreground mt-2 line-clamp-3">{p.description}</div>
                          )}
                          {p.ctaUrl && (
                            <div className="mt-3">
                              <Button asChild size="sm" className="w-full">
                                <a href={p.ctaUrl} target="_blank" rel="noreferrer">
                                  {p.ctaLabel || 'Learn more'}
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
