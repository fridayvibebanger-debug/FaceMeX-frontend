import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

type SellerCta = 'contact' | 'website' | 'whatsapp' | 'call' | 'message';

interface ShopItem {
  id: string;
  title: string;
  description: string;
  image: string;
  showPrice: boolean;
  price?: number;
  currency: 'ZAR';
}

interface Shop {
  id: string;
  shopName: string;
  category: string;
  tagline: string;
  description: string;
  coverImage: string;
  sellerName: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  location?: string;
  cta: SellerCta;
  items: ShopItem[];
  featured?: boolean;
}

const exampleShops: Shop[] = [
  {
    id: 'shop-food-001',
    shopName: 'Nkowankowa Kota House',
    category: 'Food',
    tagline: 'Fresh kota, chips, burgers and lunch combos.',
    description:
      'Local fast-food shop serving kota, chips, burgers and daily lunch specials. Perfect for students, workers and family orders.',
    coverImage:
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1200&q=80',
    sellerName: 'Kota House Team',
    whatsapp: '+27760000000',
    phone: '+27760000000',
    website: '',
    location: 'Nkowankowa / Tzaneen',
    cta: 'whatsapp',
    featured: true,
    items: [
      {
        id: 'item-kota-1',
        title: 'Classic Kota',
        description: 'Bread, chips, cheese, polony and sauce.',
        image:
          'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=900&q=80',
        showPrice: true,
        price: 35,
        currency: 'ZAR',
      },
      {
        id: 'item-kota-2',
        title: 'Family Chips Combo',
        description: 'Large chips with sauces for sharing.',
        image:
          'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80',
        showPrice: true,
        price: 65,
        currency: 'ZAR',
      },
    ],
  },
  {
    id: 'shop-fashion-001',
    shopName: 'Limpopo Streetwear Hub',
    category: 'Fashion',
    tagline: 'Premium sneakers, caps, T-shirts and weekend outfits.',
    description:
      'A youth fashion seller offering clean streetwear looks, casual wear and selected sneaker drops.',
    coverImage:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80',
    sellerName: 'Streetwear Seller',
    whatsapp: '+27710000000',
    phone: '+27710000000',
    website: 'https://example.com',
    location: 'Tzaneen',
    cta: 'website',
    featured: true,
    items: [
      {
        id: 'item-fashion-1',
        title: 'Premium T-Shirt',
        description: 'Clean everyday T-shirt for casual wear.',
        image:
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
        showPrice: true,
        price: 180,
        currency: 'ZAR',
      },
      {
        id: 'item-fashion-2',
        title: 'Sneaker Drop',
        description: 'Limited sneaker stock. Contact seller for sizes.',
        image:
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
        showPrice: false,
        currency: 'ZAR',
      },
    ],
  },
  {
    id: 'shop-services-001',
    shopName: 'Creator Media Studio',
    category: 'Services',
    tagline: 'Posters, ads, videos, logo design and content packages.',
    description:
      'Creative shop for small businesses that need posters, ad creatives, product videos and social media content.',
    coverImage:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    sellerName: 'Creative Team',
    whatsapp: '+27690000000',
    phone: '+27690000000',
    website: '',
    location: 'Remote / South Africa',
    cta: 'contact',
    featured: false,
    items: [
      {
        id: 'item-service-1',
        title: 'Business Poster Design',
        description: 'Clean advert poster for WhatsApp, Facebook and Instagram.',
        image:
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
        showPrice: true,
        price: 150,
        currency: 'ZAR',
      },
      {
        id: 'item-service-2',
        title: 'Short Promo Video',
        description: 'Short video advert for product or business launch.',
        image:
          'https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=900&q=80',
        showPrice: true,
        price: 350,
        currency: 'ZAR',
      },
    ],
  },
];

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card'>('card');

  const [creditsOpen, setCreditsOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [creditsRand, setCreditsRand] = useState<number>(200);
  const [campaignName, setCampaignName] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('Awareness');
  const [campaignBudget, setCampaignBudget] = useState('500');

  const [shops, setShops] = useState<Shop[]>(exampleShops);
  const [loadingShops, setLoadingShops] = useState(true);

  const [shopOpen, setShopOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  const [shopName, setShopName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [shopCategory, setShopCategory] = useState('Food');
  const [shopTagline, setShopTagline] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [shopCoverImage, setShopCoverImage] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopWhatsapp, setShopWhatsapp] = useState('');
  const [shopWebsite, setShopWebsite] = useState('');
  const [shopLocation, setShopLocation] = useState('');
  const [shopCta, setShopCta] = useState<SellerCta>('contact');

  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemShowPrice, setItemShowPrice] = useState(true);
  const [draftItems, setDraftItems] = useState<ShopItem[]>([]);

  const saveLS = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  };

  const readLS = (key: string) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const [creditsBalance, setCreditsBalance] = useState<number>(
    () => readLS('ads:credits') || 0
  );

  const [drafts, setDrafts] = useState<
    Array<{ name: string; objective: string; budget: string; ts: string; lastRun?: string }>
  >(() =>
    Array.isArray(readLS('ads:campaigns')) ? readLS('ads:campaigns') : []
  );

  const [usage, setUsage] = useState<Array<any>>(() =>
    Array.isArray(readLS('ads:usage')) ? readLS('ads:usage') : []
  );

  const [showAllDrafts, setShowAllDrafts] = useState(false);

  const impressionsFor = (rands: number) => Math.max(0, (rands || 0) * 10);

  useEffect(() => {
    let mounted = true;

    async function loadMarketplaceShops() {
      setLoadingShops(true);

      const { data: dbShops, error: shopsError } = await supabase
        .from('marketplace_shops')
        .select('*')
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (shopsError) {
        console.log('Marketplace shops load failed:', shopsError.message);

        if (mounted) {
          setShops(exampleShops);
          setLoadingShops(false);
        }

        return;
      }

      if (!dbShops || dbShops.length === 0) {
        if (mounted) {
          setShops(exampleShops);
          setLoadingShops(false);
        }

        return;
      }

      const shopIds = dbShops.map((shop: any) => shop.id);

      const { data: dbItems, error: itemsError } = await supabase
        .from('marketplace_items')
        .select('*')
        .in('shop_id', shopIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.log('Marketplace items load failed:', itemsError.message);
      }

      const itemsByShop = new Map<string, ShopItem[]>();

      (dbItems || []).forEach((item: any) => {
        const list = itemsByShop.get(item.shop_id) || [];

        list.push({
          id: item.id,
          title: item.title || 'Untitled item',
          description: item.description || 'Contact seller for details.',
          image:
            item.image ||
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
          showPrice: item.show_price !== false,
          price: item.price ? Number(item.price) : undefined,
          currency: 'ZAR',
        });

        itemsByShop.set(item.shop_id, list);
      });

      const mapped: Shop[] = dbShops.map((shop: any) => ({
        id: shop.id,
        shopName: shop.shop_name || 'Untitled shop',
        category: shop.category || 'General',
        tagline: shop.tagline || 'Premium shop on FaceMeX Marketplace.',
        description:
          shop.description ||
          'This seller has listed products or services on FaceMeX Marketplace.',
        coverImage:
          shop.cover_image ||
          'https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&w=1200&q=80',
        sellerName: shop.seller_name || 'Seller',
        phone: shop.phone || '',
        whatsapp: shop.whatsapp || '',
        website: shop.website || '',
        location: shop.location || '',
        cta: (shop.cta || 'contact') as SellerCta,
        featured: !!shop.featured,
        items: itemsByShop.get(shop.id) || [],
      }));

      if (mounted) {
        setShops(mapped.length > 0 ? mapped : exampleShops);
        setLoadingShops(false);
      }
    }

    loadMarketplaceShops();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();

    return shops.filter((shop) => {
      if (!q) return true;

      return (
        shop.shopName.toLowerCase().includes(q) ||
        shop.category.toLowerCase().includes(q) ||
        shop.tagline.toLowerCase().includes(q) ||
        shop.description.toLowerCase().includes(q) ||
        shop.items.some(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
        )
      );
    });
  }, [shops, query]);

  const saveShopsToLocal = (next: Shop[]) => {
    setShops(next);
    saveLS('mall:shops', next);
  };

  const openShopItems = (shop: Shop) => {
    setSelectedShop(shop);
    setItemsOpen(true);
  };

  const contactSeller = (shop: Shop) => {
    const text = encodeURIComponent(
      `Hi ${shop.sellerName}, I saw your shop "${shop.shopName}" on FaceMeX Marketplace. I am interested in your items.`
    );

    if (shop.cta === 'website' && shop.website) {
      window.open(shop.website, '_blank', 'noopener,noreferrer');
      return;
    }

    if ((shop.cta === 'whatsapp' || shop.cta === 'contact') && shop.whatsapp) {
      const cleanPhone = shop.whatsapp.replace(/\D/g, '');
      window.open(
        `https://wa.me/${cleanPhone}?text=${text}`,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    if (shop.cta === 'call' && shop.phone) {
      window.location.href = `tel:${shop.phone}`;
      return;
    }

    if (shop.cta === 'message') {
      window.location.href = '/messages';
      return;
    }

    toast({
      title: 'Seller contact',
      description:
        shop.phone || shop.website || 'Seller has not added contact details yet.',
    });
  };

  const secondaryShopAction = (shop: Shop) => {
    if (shop.cta === 'website' && shop.website) {
      window.open(shop.website, '_blank', 'noopener,noreferrer');
      return;
    }

    openShopItems(shop);
  };

  const buildDraftItem = (): ShopItem | null => {
    if (!itemTitle.trim()) {
      toast({
        title: 'Item name required',
        description: 'Add the item or product name before adding it to your shop.',
      });
      return null;
    }

    return {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: itemTitle,
      description: itemDescription || 'Contact seller for more details.',
      image:
        itemImage ||
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
      showPrice: itemShowPrice,
      price: itemShowPrice ? Number(itemPrice || 0) : undefined,
      currency: 'ZAR',
    };
  };

  const addDraftItem = () => {
    const item = buildDraftItem();

    if (!item) return;

    setDraftItems((current) => [item, ...current]);
    setItemTitle('');
    setItemDescription('');
    setItemImage('');
    setItemPrice('');
    setItemShowPrice(true);

    toast({
      title: 'Item added',
      description: `${item.title} added to your shop display.`,
    });
  };

  const addShop = () => {
    if (!shopName.trim()) {
      toast({
        title: 'Shop name required',
        description: 'Add your shop name before publishing.',
      });
      return;
    }

    if (!sellerName.trim()) {
      toast({
        title: 'Seller name required',
        description: 'Add seller or business owner name.',
      });
      return;
    }

    let finalItems = [...draftItems];

    if (itemTitle.trim()) {
      const item = buildDraftItem();
      if (item) finalItems = [item, ...finalItems];
    }

    if (finalItems.length === 0) {
      toast({
        title: 'Add at least one item',
        description: 'Your shop must display what you sell before customers enter.',
      });
      return;
    }

    const newShop: Shop = {
      id: `shop-${Date.now()}`,
      shopName,
      category: shopCategory,
      tagline: shopTagline || 'Premium local shop on FaceMeX Marketplace.',
      description:
        shopDescription ||
        'This shop sells products and services through FaceMeX Marketplace.',
      coverImage:
        shopCoverImage ||
        'https://images.unsplash.com/photo-1481437156560-3205f6a55735?auto=format&fit=crop&w=1200&q=80',
      sellerName,
      phone: shopPhone,
      whatsapp: shopWhatsapp,
      website: shopWebsite,
      location: shopLocation,
      cta: shopCta,
      featured: false,
      items: finalItems,
    };

    saveShopsToLocal([newShop, ...shops]);

    setShopOpen(false);
    setShopName('');
    setSellerName('');
    setShopTagline('');
    setShopDescription('');
    setShopCoverImage('');
    setShopPhone('');
    setShopWhatsapp('');
    setShopWebsite('');
    setShopLocation('');
    setItemTitle('');
    setItemDescription('');
    setItemImage('');
    setItemPrice('');
    setItemShowPrice(true);
    setDraftItems([]);

    toast({
      title: 'Shop published',
      description: `${newShop.shopName} is now displayed in the marketplace mall.`,
    });
  };

  const saveDrafts = (next: typeof drafts) => {
    setDrafts(next);
    saveLS('ads:campaigns', next);
  };

  const pushUsage = (event: any) => {
    const next = [{ ts: new Date().toISOString(), ...event }, ...usage].slice(
      0,
      50
    );
    setUsage(next);
    saveLS('ads:usage', next);
  };

  const runDraft = (index: number) => {
    const draft = drafts[index];
    const needed = impressionsFor(parseInt(draft.budget || '0', 10));

    if (!needed || needed <= 0) {
      toast({
        title: 'Invalid budget',
        description: 'Set a positive budget to run this draft.',
      });
      return;
    }

    if (creditsBalance < needed) {
      toast({
        title: 'Not enough credits',
        description: `Need ${needed.toLocaleString()} impressions, you have ${creditsBalance.toLocaleString()}. Buy more credits.`,
      });
      return;
    }

    const newBalance = creditsBalance - needed;
    setCreditsBalance(newBalance);
    saveLS('ads:credits', newBalance);

    const updated = drafts.slice();
    updated[index] = { ...draft, lastRun: new Date().toISOString() };
    saveDrafts(updated);

    pushUsage({
      type: 'run_campaign',
      name: draft.name,
      spentImpressions: needed,
      balance: newBalance,
    });

    toast({
      title: 'Campaign running',
      description: `${draft.name} launched · Spent ${needed.toLocaleString()} impressions · Remaining ${newBalance.toLocaleString()}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 pt-3 md:pt-4 pb-10 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search shops, products, services..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="flex items-center gap-2 text-sm">
            <span>Pay with Card (ZAR):</span>
            <Button variant="default" onClick={() => setPaymentMethod('card')}>
              Card
            </Button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {creditsBalance > 0 && (
              <Badge variant="secondary">
                Ad Credits: {creditsBalance.toLocaleString()} impressions
              </Badge>
            )}

            <Button variant="secondary" onClick={() => setCreditsOpen(true)}>
              Buy Ad Credits
            </Button>

            <Button variant="outline" onClick={() => setShopOpen(true)}>
              Open Shop
            </Button>

            <Button onClick={() => setCampaignOpen(true)}>
              Create Campaign
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loadingShops ? (
                <div className="text-sm text-muted-foreground">
                  Loading marketplace shops...
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No shops found. Try another search or open your own shop.
                </div>
              ) : (
                filtered.map((shop) => (
                  <Card
                    key={shop.id}
                    className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
                  >
                    <div className="relative aspect-video bg-black/5">
                      <img
                        src={shop.coverImage}
                        alt={shop.shopName}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute left-3 top-3 flex gap-2">
                        {shop.featured && (
                          <Badge className="bg-black/80 text-white hover:bg-black/80">
                            Premium display
                          </Badge>
                        )}

                        <Badge variant="secondary">{shop.category}</Badge>
                      </div>
                    </div>

                    <CardHeader className="space-y-1">
                      <CardTitle className="truncate text-base">
                        {shop.shopName}
                      </CardTitle>

                      <div className="h-9 overflow-hidden text-xs text-muted-foreground">
                        {shop.tagline}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="h-16 overflow-hidden text-sm text-muted-foreground">
                        {shop.description}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {shop.items.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="overflow-hidden rounded-xl border bg-muted/20"
                          >
                            <div className="aspect-square bg-black/5">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            <div className="space-y-1 p-2">
                              <div className="truncate text-xs font-semibold">
                                {item.title}
                              </div>

                              <div className="h-8 overflow-hidden text-[11px] text-muted-foreground">
                                {item.description}
                              </div>

                              <div className="text-xs font-semibold">
                                {item.showPrice && item.price
                                  ? `R${Number(item.price).toFixed(2)}`
                                  : 'Ask seller'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="truncate text-xs text-muted-foreground">
                        Seller: {shop.sellerName}
                        {shop.location ? ` · ${shop.location}` : ''}
                      </div>
                    </CardContent>

                    <CardFooter className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => contactSeller(shop)}
                      >
                        Contact seller
                      </Button>

                      <Button size="sm" onClick={() => secondaryShopAction(shop)}>
                        {shop.website && shop.cta === 'website'
                          ? 'Visit website'
                          : 'View items'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="md:sticky md:top-28 space-y-3">
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">Draft Campaigns</div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCreditsOpen(true)}
                    >
                      Top up
                    </Button>

                    <div className="text-xs text-muted-foreground">
                      Stored locally
                    </div>
                  </div>
                </div>

                {drafts.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No drafts yet. Create a campaign to save a draft.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drafts.slice(0, showAllDrafts ? 10 : 5).map((draft, index) => (
                      <div
                        key={`${draft.ts}-${index}`}
                        className="flex items-center justify-between gap-2 rounded border p-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {draft.name}
                          </div>

                          <div className="truncate text-xs text-muted-foreground">
                            {draft.objective} · Budget R{draft.budget} · Est{' '}
                            {impressionsFor(
                              parseInt(draft.budget || '0', 10)
                            ).toLocaleString()}{' '}
                            impressions
                          </div>

                          {draft.lastRun && (
                            <div className="text-[11px] text-muted-foreground">
                              Last run: {new Date(draft.lastRun).toLocaleString()}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => runDraft(index)}
                        >
                          Run
                        </Button>
                      </div>
                    ))}

                    {drafts.length > 5 && (
                      <div className="flex justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAllDrafts(!showAllDrafts)}
                        >
                          {showAllDrafts ? 'Collapse' : 'View all'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">Ad Usage</div>
                  <div className="text-xs text-muted-foreground">Recent</div>
                </div>

                {usage.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No usage yet.</div>
                ) : (
                  <div className="space-y-1">
                    {usage.slice(0, 5).map((event, index) => (
                      <div
                        key={`${event.ts}-${index}`}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span>
                          {event.type === 'buy_credits' &&
                            `Bought ${event.impressions?.toLocaleString?.() || event.impressions}`}
                          {event.type === 'run_campaign' &&
                            `Ran ${event.name} · Spent ${event.spentImpressions?.toLocaleString?.() || event.spentImpressions}`}
                        </span>

                        <span>{new Date(event.ts).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Creator Gigs</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Offer services</div>
                <Button size="sm">New Gig</Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Gigs can be connected to creator profiles next. For now, use Open Shop to display products or services.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Projects</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Hire creators</div>
                <Button size="sm">New Project</Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Businesses can post creator jobs and campaign projects here.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escrow</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Secure in-app payments</div>
                <Button size="sm">New Escrow</Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Secure payments can be connected after marketplace orders are live.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={itemsOpen} onOpenChange={setItemsOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedShop?.shopName || 'Shop items'}</DialogTitle>
            <DialogDescription>
              {selectedShop?.tagline || 'View what this seller offers.'}
            </DialogDescription>
          </DialogHeader>

          {selectedShop && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                {selectedShop.description}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {selectedShop.items.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-2xl border bg-card"
                  >
                    <div className="aspect-square bg-black/5">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="space-y-2 p-3">
                      <div className="truncate text-sm font-semibold">
                        {item.title}
                      </div>

                      <div className="h-12 overflow-hidden text-xs text-muted-foreground">
                        {item.description}
                      </div>

                      <div className="text-sm font-bold">
                        {item.showPrice && item.price
                          ? `R${Number(item.price).toFixed(2)}`
                          : 'Price on request'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemsOpen(false)}>
              Close
            </Button>

            {selectedShop && (
              <Button onClick={() => contactSeller(selectedShop)}>
                Contact seller
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Open your shop</DialogTitle>
            <DialogDescription>
              Create a premium shop display with items, prices, seller contact and call-to-action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Shop name"
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
              />

              <Input
                placeholder="Seller / business owner"
                value={sellerName}
                onChange={(event) => setSellerName(event.target.value)}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Category"
                value={shopCategory}
                onChange={(event) => setShopCategory(event.target.value)}
              />

              <Input
                placeholder="Location"
                value={shopLocation}
                onChange={(event) => setShopLocation(event.target.value)}
              />

              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={shopCta}
                onChange={(event) => setShopCta(event.target.value as SellerCta)}
              >
                <option value="contact">Contact seller</option>
                <option value="whatsapp">WhatsApp seller</option>
                <option value="call">Call seller</option>
                <option value="website">Visit website</option>
                <option value="message">Message seller</option>
              </select>
            </div>

            <Input
              placeholder="Shop tagline"
              value={shopTagline}
              onChange={(event) => setShopTagline(event.target.value)}
            />

            <Textarea
              placeholder="Shop description"
              value={shopDescription}
              onChange={(event) => setShopDescription(event.target.value)}
            />

            <Input
              placeholder="Cover image URL"
              value={shopCoverImage}
              onChange={(event) => setShopCoverImage(event.target.value)}
            />

            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Phone"
                value={shopPhone}
                onChange={(event) => setShopPhone(event.target.value)}
              />

              <Input
                placeholder="WhatsApp number"
                value={shopWhatsapp}
                onChange={(event) => setShopWhatsapp(event.target.value)}
              />

              <Input
                placeholder="Website URL"
                value={shopWebsite}
                onChange={(event) => setShopWebsite(event.target.value)}
              />
            </div>

            <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Item display</div>
                <div className="text-xs text-muted-foreground">
                  {draftItems.length} item(s) added
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Item name"
                  value={itemTitle}
                  onChange={(event) => setItemTitle(event.target.value)}
                />

                <Input
                  placeholder="Item image URL"
                  value={itemImage}
                  onChange={(event) => setItemImage(event.target.value)}
                />
              </div>

              <Textarea
                placeholder="Item description"
                value={itemDescription}
                onChange={(event) => setItemDescription(event.target.value)}
              />

              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  type="number"
                  placeholder="Price in Rands"
                  value={itemPrice}
                  onChange={(event) => setItemPrice(event.target.value)}
                  disabled={!itemShowPrice}
                />

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={itemShowPrice}
                    onChange={(event) => setItemShowPrice(event.target.checked)}
                  />
                  Show price to customers
                </label>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={addDraftItem}>
                Add item to shop
              </Button>

              {draftItems.length > 0 && (
                <div className="grid gap-2">
                  {draftItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border bg-background p-2 text-xs"
                    >
                      <span className="truncate">{item.title}</span>
                      <span className="text-muted-foreground">
                        {item.showPrice && item.price
                          ? `R${item.price}`
                          : 'Price hidden'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShopOpen(false)}>
              Cancel
            </Button>

            <Button onClick={addShop}>Publish shop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buy Ad Credits</DialogTitle>
            <DialogDescription>
              Ad credits are used for Sponsored Posts, Story Ads, Search Ads, and Marketplace promotions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Pricing: R200 = 2,000 impressions
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[200, 500, 1000].map((amount) => (
                <Button
                  key={amount}
                  variant={creditsRand === amount ? 'default' : 'outline'}
                  onClick={() => setCreditsRand(amount)}
                >
                  R{amount}
                </Button>
              ))}
            </div>

            <Input
              type="number"
              value={creditsRand}
              onChange={(event) =>
                setCreditsRand(parseInt(event.target.value || '0', 10))
              }
            />

            <div className="text-sm">
              Estimated reach:{' '}
              <span className="font-semibold">
                {impressionsFor(creditsRand).toLocaleString()}
              </span>{' '}
              impressions
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditsOpen(false)}>
              Cancel
            </Button>

            <Button
              onClick={() => {
                const newBalance = creditsBalance + impressionsFor(creditsRand);
                setCreditsBalance(newBalance);
                saveLS('ads:credits', newBalance);
                pushUsage({
                  type: 'buy_credits',
                  rands: creditsRand,
                  impressions: impressionsFor(creditsRand),
                  balance: newBalance,
                });
                setCreditsOpen(false);
                toast({
                  title: 'Ad credits added',
                  description: `Balance: ${newBalance.toLocaleString()} impressions.`,
                });
              }}
            >
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Set up a simple campaign to promote a shop, item, or post.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Campaign name"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
            />

            <Input
              placeholder="Objective"
              value={campaignObjective}
              onChange={(event) => setCampaignObjective(event.target.value)}
            />

            <Input
              placeholder="Budget (R)"
              value={campaignBudget}
              onChange={(event) => setCampaignBudget(event.target.value)}
            />

            <Textarea placeholder="Creative notes, audience, location, product..." />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCampaignOpen(false)}>
              Cancel
            </Button>

            <Button
              onClick={() => {
                const draft = {
                  name: campaignName || 'Untitled',
                  objective: campaignObjective,
                  budget: campaignBudget,
                  ts: new Date().toISOString(),
                };

                const next = [draft, ...drafts].slice(0, 10);
                saveDrafts(next);
                setCampaignOpen(false);

                toast({
                  title: 'Draft saved',
                  description: `${draft.name}, budget R${draft.budget}`,
                });
              }}
            >
              Save Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
