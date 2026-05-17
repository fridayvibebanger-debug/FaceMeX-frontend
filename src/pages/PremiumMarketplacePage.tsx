import { useEffect, useMemo, useState } from 'react';
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
import { useUserStore } from '@/store/userStore';
import { createYocoCheckoutSession } from '@/lib/billing';

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

interface CreatorGig {
  id: string;
  title: string;
  price: number;
  description: string;
  createdAt: string;
}

interface BusinessProject {
  id: string;
  title: string;
  budget: number;
  description: string;
  createdAt: string;
}

interface EscrowItem {
  id: string;
  title: string;
  amount: number;
  status: 'draft' | 'funded' | 'released';
  createdAt: string;
}

const SHOP_ADDON_PRICE_ZAR = 370;
const SHOP_ADDON_BONUS_IMPRESSIONS = 1000;

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
  const { tier, hasTier } = useUserStore();

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

  const readLocalShops = (): Shop[] => {
    const local = readLS('mall:shops');
    return Array.isArray(local) ? local : [];
  };

  const getShopAddonActive = () => {
    try {
      return localStorage.getItem('facemex_marketplace_shop_addon') === 'active';
    } catch {
      return false;
    }
  };

  const [query, setQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card'>('card');

  const [creditsOpen, setCreditsOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [creditsRand, setCreditsRand] = useState<number>(200);
  const [campaignName, setCampaignName] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('Awareness');
  const [campaignBudget, setCampaignBudget] = useState('500');

  const [shops, setShops] = useState<Shop[]>(exampleShops);
  const [loadingShops, setLoadingShops] = useState(false);

  const [shopOpen, setShopOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopCheckoutBusy, setShopCheckoutBusy] = useState(false);
  const [shopAddonActive, setShopAddonActive] = useState(() =>
    getShopAddonActive()
  );

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

  const [creditsBalance, setCreditsBalance] = useState<number>(
    () => readLS('ads:credits') || 0
  );

  const [drafts, setDrafts] = useState<
    Array<{
      name: string;
      objective: string;
      budget: string;
      ts: string;
      lastRun?: string;
    }>
  >(() =>
    Array.isArray(readLS('ads:campaigns')) ? readLS('ads:campaigns') : []
  );

  const [usage, setUsage] = useState<Array<any>>(() =>
    Array.isArray(readLS('ads:usage')) ? readLS('ads:usage') : []
  );

  const [showAllDrafts, setShowAllDrafts] = useState(false);

  const [gigOpen, setGigOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [escrowOpen, setEscrowOpen] = useState(false);

  const [gigTitle, setGigTitle] = useState('');
  const [gigPrice, setGigPrice] = useState('');
  const [gigDescription, setGigDescription] = useState('');

  const [projectTitle, setProjectTitle] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const [escrowTitle, setEscrowTitle] = useState('');
  const [escrowAmount, setEscrowAmount] = useState('');

  const [gigs, setGigs] = useState<CreatorGig[]>(() =>
    Array.isArray(readLS('facemex_marketplace_gigs'))
      ? readLS('facemex_marketplace_gigs')
      : []
  );

  const [projects, setProjects] = useState<BusinessProject[]>(() =>
    Array.isArray(readLS('facemex_business_projects'))
      ? readLS('facemex_business_projects')
      : []
  );

  const [escrows, setEscrows] = useState<EscrowItem[]>(() =>
    Array.isArray(readLS('facemex_escrows')) ? readLS('facemex_escrows') : []
  );

  const currentTier = String(tier || 'free').toLowerCase();

  const businessPlusCanOpenShopFree =
    Boolean(hasTier?.('business')) ||
    currentTier === 'business' ||
    currentTier === 'exclusive';

  const canOpenShop = businessPlusCanOpenShopFree || shopAddonActive;

  const impressionsFor = (rands: number) => Math.max(0, (rands || 0) * 10);

  const pushUsage = (event: any) => {
    const next = [{ ts: new Date().toISOString(), ...event }, ...usage].slice(
      0,
      50
    );
    setUsage(next);
    saveLS('ads:usage', next);
  };

  const addImpressions = (amount: number, reason: string) => {
    const next = creditsBalance + amount;

    setCreditsBalance(next);
    saveLS('ads:credits', next);

    pushUsage({
      type: reason,
      impressions: amount,
      balance: next,
    });

    return next;
  };

  const addMonthlyShopBonus = () => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const bonusKey = 'facemex_marketplace_shop_addon_bonus_month';

    try {
      const lastBonusMonth = localStorage.getItem(bonusKey);

      if (lastBonusMonth === monthKey) return;

      localStorage.setItem(bonusKey, monthKey);

      addImpressions(
        SHOP_ADDON_BONUS_IMPRESSIONS,
        'shop_addon_monthly_bonus'
      );

      toast({
        title: 'Shop boost added',
        description: `Your R${SHOP_ADDON_PRICE_ZAR}/month shop add-on added ${SHOP_ADDON_BONUS_IMPRESSIONS.toLocaleString()} bonus impressions.`,
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let mounted = true;

    async function loadMarketplaceShops() {
      const localShops = readLocalShops();

      setShops([...localShops, ...exampleShops]);
      setLoadingShops(false);

      const { data: dbShops, error: shopsError } = await supabase
        .from('marketplace_shops')
        .select('*')
        .eq('is_active', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (shopsError) {
        console.log('Marketplace shops load failed:', shopsError.message);
        return;
      }

      if (!dbShops || dbShops.length === 0) {
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
        setShops([...localShops, ...mapped, ...exampleShops]);
        setLoadingShops(false);
      }
    }

    loadMarketplaceShops();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('shop_addon') === 'success') {
      localStorage.setItem('facemex_marketplace_shop_addon', 'active');
      setShopAddonActive(true);
      addMonthlyShopBonus();
      setShopOpen(true);

      window.history.replaceState({}, '', window.location.pathname);
    }
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
    const onlyLocal = next.filter((shop) => shop.id.startsWith('local-shop-'));
    saveLS('mall:shops', onlyLocal);
    setShops(next);
  };

  const openShopItems = (shop: Shop) => {
    setSelectedShop(shop);
    setItemsOpen(true);
  };

  const handleOpenShopClick = async () => {
    if (canOpenShop) {
      setShopOpen(true);
      return;
    }

    if (currentTier === 'pro') {
      try {
        setShopCheckoutBusy(true);

        toast({
          title: 'Marketplace shop add-on',
          description: `Pro users pay R${SHOP_ADDON_PRICE_ZAR}/month and receive ${SHOP_ADDON_BONUS_IMPRESSIONS.toLocaleString()} bonus impressions monthly.`,
        });

        const origin = window.location.origin;

        const checkout = await createYocoCheckoutSession({
          amountZar: SHOP_ADDON_PRICE_ZAR,
          currency: 'ZAR',
          successUrl: `${origin}/marketplace?shop_addon=success`,
          cancelUrl: `${origin}/marketplace?shop_addon=cancelled`,
          failureUrl: `${origin}/marketplace?shop_addon=failed`,
          metadata: {
            billingPurpose: 'marketplace_shop_addon',
            addon: 'marketplace_shop',
            monthlyBonusImpressions: String(SHOP_ADDON_BONUS_IMPRESSIONS),
            tier: currentTier,
          },
          externalId: `marketplace-shop-${Date.now()}`,
        });

        window.location.href = checkout.redirectUrl;
      } catch (error: any) {
        toast({
          title: 'Checkout failed',
          description:
            error?.message || 'Could not start marketplace shop payment.',
        });
      } finally {
        setShopCheckoutBusy(false);
      }

      return;
    }

    toast({
      title: 'Upgrade required',
      description:
        'Business and Exclusive users open shops for free. Pro users can unlock a shop for R370/month with 1,000 bonus impressions.',
    });
  };

  const contactSeller = (shop: Shop) => {
    const text = encodeURIComponent(
      `Hi ${shop.sellerName}, I saw your shop "${shop.shopName}" on FaceMeX Marketplace. I am interested in your items.`
    );

    if (shop.whatsapp) {
      const cleanPhone = shop.whatsapp.replace(/\D/g, '');
      window.open(
        `https://wa.me/${cleanPhone}?text=${text}`,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    if (shop.phone) {
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
        'This seller has not added WhatsApp or phone details yet. Try viewing their items or website.',
    });
  };

  const secondaryShopAction = (shop: Shop) => {
    if (shop.website && shop.cta === 'website') {
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
      id: `local-item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    if (!canOpenShop) {
      handleOpenShopClick();
      return;
    }

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
      id: `local-shop-${Date.now()}`,
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
        description: `Need ${needed.toLocaleString()} impressions, you have ${creditsBalance.toLocaleString()}. Buy more credits or use your shop bonus impressions.`,
      });
      return;
    }

    const newBalance = creditsBalance - needed;
    setCreditsBalance(newBalance);
    saveLS('ads:credits', newBalance);

    const updated = drafts.slice();
    updated[index] = { ...draft, lastRun: new Date().toISOString() };
    saveDrafts(updated);

    const promotedShop = shops[0];

    const feedAds = Array.isArray(readLS('facemex_feed_slide_ads'))
      ? readLS('facemex_feed_slide_ads')
      : [];

    const newFeedAd = {
      id: `feed-ad-${Date.now()}`,
      title: draft.name,
      objective: draft.objective,
      budget: draft.budget,
      impressions: needed,
      shopId: promotedShop?.id || '',
      shopName: promotedShop?.shopName || 'Marketplace Promotion',
      category: promotedShop?.category || 'Marketplace',
      location: promotedShop?.location || 'Nearby',
      image: promotedShop?.coverImage || '',
      tagline: promotedShop?.tagline || 'Recommended near you',
      createdAt: new Date().toISOString(),
      active: true,
    };

    saveLS('facemex_feed_slide_ads', [newFeedAd, ...feedAds].slice(0, 20));

    try {
      window.dispatchEvent(new Event('facemex-feed-ads-updated'));
    } catch {
      // ignore
    }

    pushUsage({
      type: 'run_campaign',
      name: draft.name,
      spentImpressions: needed,
      balance: newBalance,
    });

    toast({
      title: 'Campaign running',
      description: `${draft.name} launched · ${needed.toLocaleString()} impressions added to feed slide recommendations nearby.`,
    });
  };

  const saveGig = () => {
    if (!gigTitle.trim()) {
      toast({ title: 'Add gig title' });
      return;
    }

    const next = [
      {
        id: `gig-${Date.now()}`,
        title: gigTitle,
        price: Number(gigPrice || 0),
        description: gigDescription || 'Creator service available.',
        createdAt: new Date().toISOString(),
      },
      ...gigs,
    ];

    setGigs(next);
    saveLS('facemex_marketplace_gigs', next);
    setGigTitle('');
    setGigPrice('');
    setGigDescription('');
    setGigOpen(false);

    toast({ title: 'Gig created', description: 'Your creator gig is saved.' });
  };

  const saveProject = () => {
    if (!projectTitle.trim()) {
      toast({ title: 'Add project title' });
      return;
    }

    const next = [
      {
        id: `project-${Date.now()}`,
        title: projectTitle,
        budget: Number(projectBudget || 0),
        description: projectDescription || 'Business project available.',
        createdAt: new Date().toISOString(),
      },
      ...projects,
    ];

    setProjects(next);
    saveLS('facemex_business_projects', next);
    setProjectTitle('');
    setProjectBudget('');
    setProjectDescription('');
    setProjectOpen(false);

    toast({ title: 'Project created', description: 'Business project saved.' });
  };

  const saveEscrow = () => {
    if (!escrowTitle.trim()) {
      toast({ title: 'Add escrow title' });
      return;
    }

    const next: EscrowItem[] = [
      {
        id: `escrow-${Date.now()}`,
        title: escrowTitle,
        amount: Number(escrowAmount || 0),
        status: 'draft',
        createdAt: new Date().toISOString(),
      },
      ...escrows,
    ];

    setEscrows(next);
    saveLS('facemex_escrows', next);
    setEscrowTitle('');
    setEscrowAmount('');
    setEscrowOpen(false);

    toast({ title: 'Escrow created', description: 'Escrow draft saved.' });
  };

  const updateEscrowStatus = (
    escrowId: string,
    status: EscrowItem['status']
  ) => {
    const next = escrows.map((escrow) =>
      escrow.id === escrowId ? { ...escrow, status } : escrow
    );

    setEscrows(next);
    saveLS('facemex_escrows', next);

    toast({
      title: 'Escrow updated',
      description: `Escrow status changed to ${status}.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-4 px-4 pt-0 pb-10 md:pt-1">
        <div className="rounded-2xl border bg-card px-4 py-3">
          <div className="text-sm font-semibold">FaceMeX Marketplace Mall</div>
          <div className="text-xs text-muted-foreground">
            Example shops are shown below so users can see how sellers display
            products, prices, contact buttons and item previews.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="min-w-[240px] flex-1"
            placeholder="Search shops, products, services..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Pay with Card:</span>
            <Button
              variant="default"
              className="rounded-full"
              onClick={() => setPaymentMethod('card')}
            >
              {paymentMethod === 'card' ? 'Card active' : 'Card'}
            </Button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {creditsBalance > 0 && (
              <Badge variant="secondary">
                Ad Credits: {creditsBalance.toLocaleString()} impressions
              </Badge>
            )}

            {shopAddonActive && (
              <Badge variant="outline">
                Shop add-on active · +1,000/mo
              </Badge>
            )}

            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => setCreditsOpen(true)}
            >
              Buy Ad Credits
            </Button>

            <Button
              variant="outline"
              className="rounded-full"
              onClick={handleOpenShopClick}
              disabled={shopCheckoutBusy}
            >
              {canOpenShop
                ? 'Open Shop'
                : currentTier === 'pro'
                  ? 'Open Shop · R370/mo'
                  : 'Open Shop'}
            </Button>

            <Button
              className="rounded-full"
              onClick={() => setCampaignOpen(true)}
            >
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

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
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
                        className="rounded-full"
                        onClick={() => contactSeller(shop)}
                      >
                        Contact seller
                      </Button>

                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => secondaryShopAction(shop)}
                      >
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
            <div className="space-y-3 md:sticky md:top-20">
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold">Draft Campaigns</div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
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
                    {drafts
                      .slice(0, showAllDrafts ? 10 : 5)
                      .map((draft, index) => (
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
                                Last run:{' '}
                                {new Date(draft.lastRun).toLocaleString()}
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-full"
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
                  <div className="text-xs text-muted-foreground">
                    No usage yet.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {usage.slice(0, 5).map((event, index) => (
                      <div
                        key={`${event.ts}-${index}`}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span>
                          {event.type === 'buy_credits' &&
                            `Bought ${
                              event.impressions?.toLocaleString?.() ||
                              event.impressions
                            }`}
                          {event.type === 'shop_addon_monthly_bonus' &&
                            `Shop bonus ${
                              event.impressions?.toLocaleString?.() ||
                              event.impressions
                            }`}
                          {event.type === 'run_campaign' &&
                            `Ran ${event.name} · Spent ${
                              event.spentImpressions?.toLocaleString?.() ||
                              event.spentImpressions
                            }`}
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
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => setGigOpen(true)}
                >
                  New Gig
                </Button>
              </div>

              {gigs.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Create a gig for design, editing, content, delivery promo or social media services.
                </div>
              ) : (
                <div className="space-y-2">
                  {gigs.slice(0, 3).map((gig) => (
                    <div key={gig.id} className="rounded-xl border p-2">
                      <div className="truncate text-sm font-medium">
                        {gig.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        From R{gig.price || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Projects</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Hire creators</div>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => setProjectOpen(true)}
                >
                  New Project
                </Button>
              </div>

              {projects.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Businesses can post creator jobs and campaign projects here.
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.slice(0, 3).map((project) => (
                    <div key={project.id} className="rounded-xl border p-2">
                      <div className="truncate text-sm font-medium">
                        {project.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Budget R{project.budget || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escrow</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">
                  Secure in-app payments
                </div>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => setEscrowOpen(true)}
                >
                  New Escrow
                </Button>
              </div>

              {escrows.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Create payment records before work starts.
                </div>
              ) : (
                <div className="space-y-2">
                  {escrows.slice(0, 3).map((escrow) => (
                    <div key={escrow.id} className="rounded-xl border p-2">
                      <div className="truncate text-sm font-medium">
                        {escrow.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        R{escrow.amount || 0} · {escrow.status}
                      </div>

                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={escrow.status !== 'draft'}
                          onClick={() => updateEscrowStatus(escrow.id, 'funded')}
                        >
                          Fund
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={escrow.status !== 'funded'}
                          onClick={() =>
                            updateEscrowStatus(escrow.id, 'released')
                          }
                        >
                          Release
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={itemsOpen} onOpenChange={setItemsOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[88vh] overflow-hidden rounded-3xl p-0">
          <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
            <DialogHeader>
              <DialogTitle className="text-base">
                {selectedShop?.shopName || 'Shop items'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedShop?.tagline || 'View what this seller offers.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[68vh] overflow-y-auto px-4 py-4">
            {selectedShop && (
              <div className="space-y-4">
                <div className="rounded-2xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {selectedShop.description}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3">
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

                      <div className="space-y-1.5 p-2.5">
                        <div className="truncate text-xs font-semibold">
                          {item.title}
                        </div>

                        <div className="h-10 overflow-hidden text-[11px] leading-snug text-muted-foreground">
                          {item.description}
                        </div>

                        <div className="text-xs font-bold">
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
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-background px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItemsOpen(false)}
            >
              Close
            </Button>

            {selectedShop && (
              <Button size="sm" onClick={() => contactSeller(selectedShop)}>
                Contact seller
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Open your shop</DialogTitle>
            <DialogDescription>
              {businessPlusCanOpenShopFree
                ? 'Business+ opens shops for free.'
                : shopAddonActive
                  ? 'Your marketplace shop add-on is active.'
                  : `Pro users pay R${SHOP_ADDON_PRICE_ZAR}/month and receive ${SHOP_ADDON_BONUS_IMPRESSIONS.toLocaleString()} bonus impressions monthly.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pb-2">
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

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDraftItem}
              >
                Add item to shop
              </Button>
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
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Buy Ad Credits</DialogTitle>
            <DialogDescription>
              Use credits to run feed slide promotions recommended to nearby users.
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
                const added = impressionsFor(creditsRand);
                const newBalance = creditsBalance + added;

                setCreditsBalance(newBalance);
                saveLS('ads:credits', newBalance);
                pushUsage({
                  type: 'buy_credits',
                  rands: creditsRand,
                  impressions: added,
                  balance: newBalance,
                });
                setCreditsOpen(false);

                toast({
                  title: 'Ad credits added',
                  description: `Your balance is now ${newBalance.toLocaleString()} impressions.`,
                });
              }}
            >
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>
              Save a draft, then run it from Draft Campaigns to show in feed slide recommendations.
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

      <Dialog open={gigOpen} onOpenChange={setGigOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create Creator Gig</DialogTitle>
            <DialogDescription>
              Offer a service like design, video editing, delivery promo, or social media content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Gig title"
              value={gigTitle}
              onChange={(event) => setGigTitle(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Starting price in Rands"
              value={gigPrice}
              onChange={(event) => setGigPrice(event.target.value)}
            />
            <Textarea
              placeholder="Describe your service"
              value={gigDescription}
              onChange={(event) => setGigDescription(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveGig}>Save Gig</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create Business Project</DialogTitle>
            <DialogDescription>
              Post a business project to hire creators or service providers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Project title"
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Budget in Rands"
              value={projectBudget}
              onChange={(event) => setProjectBudget(event.target.value)}
            />
            <Textarea
              placeholder="Describe what you need"
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProject}>Save Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={escrowOpen} onOpenChange={setEscrowOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create Escrow</DialogTitle>
            <DialogDescription>
              Create a secure payment record before work starts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Escrow title"
              value={escrowTitle}
              onChange={(event) => setEscrowTitle(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Amount in Rands"
              value={escrowAmount}
              onChange={(event) => setEscrowAmount(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEscrowOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEscrow}>Save Escrow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
