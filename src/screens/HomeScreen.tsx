import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppHeader, HeaderActions } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Badge } from '../components/Badge';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../components/SectionHeader';
import { ProductCard } from '../components/ProductCard';
import { HeroCarousel, type HeroSlide } from '../components/HeroCarousel';
import { ProductCarousel } from '../components/ProductCarousel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { useNotification } from '../state/NotificationContext';
import { promoImageUrl } from '../lib/promo';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { images } from '../data/images';
import {
  absoluteUrl,
  apiGetPromotions,
  apiGetVendors,
  apiTrackPromotionClick,
  apiTrackPromotionView,
  ApiPromotion,
  ApiVendorSummary,
} from '../data/api';
import type { Product } from '../components/ProductCard';
import type { IconName } from '../components/Icon';

const HERO_SLIDES: HeroSlide[] = images.heroBanners.map((image, i) => ({
  id: `hero-${i + 1}`,
  image,
}));

const PROMO_POPUP_INDEX_KEY = '@jemina/promoPopupIndex';

const TRUST_INDICATORS = [
  { icon: 'local-shipping' as const, title: 'Shipping Options', subtitle: 'Flexible Shipping or transportation' },
  { icon: 'shield' as const, title: 'Secure Payment', subtitle: '100% Protected Transactions' },
  { icon: 'support-agent' as const, title: '24/7 Support', subtitle: 'Dedicated Customer Care' },
  { icon: 'replay' as const, title: 'Easy Returns', subtitle: '30-Day Money Back Guarantee' },
];

// Seasons mirror resources/views/welcome.blade.php (PublicController
// $seasonalDefinitions). Tabs only render for seasons with products tagged
// with the matching seasonal_theme, within a 60-day window (site + app parity).

const SEASONS: { slug: string; name: string; icon: IconName; month: number; day: number }[] = [
  { slug: 'valentine', name: "Valentine's Day", icon: 'favorite', month: 2, day: 14 },
  { slug: 'easter', name: 'Easter Season', icon: 'spa', month: 4, day: 1 },
  { slug: 'ramadan', name: 'Ramadan Special', icon: 'nightlight-round', month: 3, day: 1 },
  { slug: 'eid', name: 'Eid Specials', icon: 'star', month: 4, day: 20 },
  { slug: 'back_to_school', name: 'Back to School', icon: 'school', month: 8, day: 15 },
  { slug: 'black_friday', name: 'Black Friday', icon: 'shopping-bag', month: 11, day: 15 },
  { slug: 'holiday', name: 'Holiday/Christmas', icon: 'redeem', month: 12, day: 1 },
];

const SEASON_WINDOW_DAYS = 60;
const SEASON_SHOW_FROM_PAST_DAYS = 30;

interface SeasonalTab {
  slug: string;
  name: string;
  icon: IconName;
  products: Product[];
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function seasonDate(month: number, day: number, year: number): Date {
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function buildSeasonalTabs(products: Product[], now: Date): SeasonalTab[] {
  const today = startOfDay(now);
  const tabs: SeasonalTab[] = [];
  for (const def of SEASONS) {
    let candidate = seasonDate(def.month, def.day, today.getFullYear());
    let daysUntil = daysBetween(today, candidate);
    if (daysUntil < -SEASON_SHOW_FROM_PAST_DAYS) {
      candidate = seasonDate(def.month, def.day, today.getFullYear() + 1);
      daysUntil = daysBetween(today, candidate);
    }
    if (daysUntil > SEASON_WINDOW_DAYS) {
      continue;
    }
    const list = products.filter(p => (p.seasonalTheme ?? '').trim().toLowerCase() === def.slug);
    if (list.length > 0) {
      tabs.push({ slug: def.slug, name: def.name, icon: def.icon, products: list });
    }
  }
  const general = products.filter(p => p.seasonal && !(p.seasonalTheme ?? '').trim());
  if (general.length > 0) {
    tabs.push({ slug: 'seasonal', name: 'General Seasonal', icon: 'eco', products: general });
  }
  return tabs;
}

const CATEGORIES: { key: string; label: string; word: string; icon: IconName; match: RegExp; b2b?: boolean }[] = [
  { key: 'agric', label: 'Agric & Seeds', word: 'Agric', icon: 'agriculture', match: /agric|seed|produce|farm|fertilizer/i },
  { key: 'it-solar', label: 'IT & Solar', word: 'Tech', icon: 'computer', match: /it|technology|mobile|phone|tablet|computer|laptop|tech|electronics|electrical|audio|headset|camera|solar/i },
  { key: 'construction', label: 'Home & Construction', word: 'Home', icon: 'home', match: /construction|engineering|building|home|housing|interior/i },
  { key: 'tools', label: 'Tools', word: 'Tools', icon: 'handyman', match: /tool|hardware/i },
  { key: 'fashion', label: 'Fashion', word: 'Fashion', icon: 'checkroom', match: /fashion|design|clothing|footwear|shoes|apparel/i },
  { key: 'office', label: 'Office Supplies', word: 'Office', icon: 'corporate-fare', match: /office|stationery|supplies/i },
  { key: 'food', label: 'Food & Grain', word: 'Food', icon: 'grain', match: /food|grain|edibles|cooking|ingredient|beverage|drink|snack|oil|honey/i },
  { key: 'b2b', label: 'B2B RFQ', word: 'B2B', icon: 'request-quote', match: /wholesale|bulk|corporate|b2b/i, b2b: true },
];

const B2B_STEPS: { title: string; desc: string }[] = [
  { title: 'Submit your RFQ', desc: 'Request custom bulk pricing for the products you need, with quantities and delivery details.' },
  { title: 'Get a tailored quote', desc: 'A B2B specialist reviews your request and responds within 2 hours with pricing, MOQ and terms.' },
  { title: 'Approve & pay', desc: 'Accept the quote and settle securely via JEMINA Credits, mobile money or card. Invoices issued.' },
  { title: 'Scheduled dispatch', desc: 'Collect at a regional depot or schedule delivery, then track your order in the app.' },
];

const BRANDS: { key: string; label: string; icon: IconName; match: RegExp }[] = [
  { key: 'sony', label: 'Sony', icon: 'photo-camera', match: /sony|playstation|xperia/i },
  { key: 'oppo', label: 'OPPO', icon: 'smartphone', match: /oppo/i },
  { key: 'apple', label: 'Apple', icon: 'computer', match: /apple|macbook|iphone|ipad|imac/i },
  { key: 'samsung', label: 'Samsung', icon: 'smartphone', match: /samsung|galaxy/i },
  { key: 'toshiba', label: 'Toshiba', icon: 'computer', match: /toshiba/i },
  { key: 'xiaomi', label: 'Xiaomi', icon: 'smartphone', match: /xiaomi|redmi|poco/i },
  { key: 'hp', label: 'HP', icon: 'computer', match: /\bhp\b|hewlett/i },
  { key: 'oneplus', label: 'OnePlus', icon: 'smartphone', match: /oneplus/i },
];

interface StoreData {
  id: string;
  vendorId: number;
  name: string;
  rating: number;
  products: number;
  icon: 'storefront' | 'shopping-bag';
  accent: string;
  description: string;
  location: string;
  logo?: string;
}

const DEFAULT_STORES: StoreData[] = [
  {
    id: 'jemina',
    vendorId: 1,
    name: 'Jemina Official',
    rating: 4.8,
    products: 247,
    icon: 'storefront',
    accent: colors.secondary,
    description: "Gulu's premier shop for curated electronics and office supplies. Verified Vendor.",
    location: 'Gulu, Uganda',
  },
];

function useFlashCountdown() {
  const endOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);
  const [left, setLeft] = useState(() => Math.max(0, endOfDay - Date.now()));
  useEffect(() => {
    if (left <= 0) {
      return;
    }
    const t = setTimeout(() => setLeft(Math.max(0, endOfDay - Date.now())), 1000);
    return () => clearTimeout(t);
  }, [left, endOfDay]);
  const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');
  return `${pad(left / 3600000)}:${pad((left / 60000) % 60)}:${pad((left / 1000) % 60)}`;
}

export function HomeScreen() {
  const { navigate, switchTab } = useNavigation();
  const { addItem } = useCart();
  const { flashSale: flashSaleProducts, featured: featuredProducts, topRated: topRatedProducts, newArrivals: newArrivalsProducts, seasonal: seasonalProducts, products, loading, error, refresh } = useCatalog();
  const { width } = useWindowDimensions();
  const [liveVendors, setLiveVendors] = useState<StoreData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDealTab, setActiveDealTab] = useState<'flash' | 'featured' | 'top' | 'new'>('flash');
  const [featuredImageRatio, setFeaturedImageRatio] = useState<number | null>(null);
  const [promotions, setPromotions] = useState<ApiPromotion[]>([]);
  const [activeSeasonSlug, setActiveSeasonSlug] = useState<string | null>(null);
  const [b2bModalOpen, setB2bModalOpen] = useState(false);
  const { showPromo } = useNotification();
  const countdown = useFlashCountdown();
  const seasonalTabs = useMemo(() => buildSeasonalTabs(products, new Date()), [products]);
  const activeSeasonalTab = seasonalTabs.find(t => t.slug === activeSeasonSlug) ?? seasonalTabs[0] ?? null;

  const loadPromotions = useCallback(async () => {
    try {
      const promos = await apiGetPromotions();
      setPromotions(promos);
      promos.slice(0, 10).forEach(p => apiTrackPromotionView(p.id));
    } catch {
      setPromotions([]);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const autoShowPopup = useCallback(
    (next: ApiPromotion[]): void => {
      if (next.length === 0) {
        return;
      }
      AsyncStorage.getItem(PROMO_POPUP_INDEX_KEY)
        .then(raw => {
          const parsed = Number(raw);
          const lastIndex =
            raw !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : -1;
          const idx = (lastIndex + 1) % next.length;
          showPromo(next[idx]);
          AsyncStorage.setItem(PROMO_POPUP_INDEX_KEY, String(idx)).catch(() => {});
        })
        .catch(() => {
          showPromo(next[0]);
        });
    },
    [showPromo],
  );

  useEffect(() => {
    autoShowPopup(promotions);
  }, [promotions, autoShowPopup]);

  const loadVendors = useCallback(() => {
    apiGetVendors()
      .then((vendors: ApiVendorSummary[]) => {
        const mapped: StoreData[] = vendors.map((v, i) => ({
          id: `vendor-${v.id}`,
          vendorId: v.id,
          name: v.name || 'Jemina Vendor',
          rating: v.rating,
          products: v.product_count,
          icon: (i % 2 === 0 ? 'storefront' : 'shopping-bag') as 'storefront' | 'shopping-bag',
          accent: i % 2 === 0 ? colors.secondary : colors.secondary,
          description: v.description || `${v.name || 'Vendor'} - ${v.location || 'Uganda'}`,
          location: v.location || 'Uganda',
          logo: absoluteUrl(v.logo) ?? undefined,
        }));
        if (mapped.length > 0) {
          setLiveVendors(mapped);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGetVendors()
      .then((vendors: ApiVendorSummary[]) => {
        if (cancelled) {
          return;
        }
        const mapped: StoreData[] = vendors.map((v, i) => ({
          id: `vendor-${v.id}`,
          vendorId: v.id,
          name: v.name || 'Jemina Vendor',
          rating: v.rating,
          products: v.product_count,
          icon: (i % 2 === 0 ? 'storefront' : 'shopping-bag') as 'storefront' | 'shopping-bag',
          accent: i % 2 === 0 ? colors.secondary : colors.secondary,
          description: v.description || `${v.name || 'Vendor'} - ${v.location || 'Uganda'}`,
          location: v.location || 'Uganda',
          logo: absoluteUrl(v.logo) ?? undefined,
        }));
        if (mapped.length > 0) {
          setLiveVendors(mapped);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), loadVendors(), loadPromotions()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, loadVendors, loadPromotions]);

  const openPromo = (promo: ApiPromotion) => {
    apiTrackPromotionClick(promo.id).catch(() => {});
    showPromo(promo);
  };

  const stores = liveVendors.length > 0 ? liveVendors : DEFAULT_STORES;
  const jeminaStore = stores.find(s => s.name.toLowerCase().includes('jemina')) ?? DEFAULT_STORES[0];
  const bannerPromos = promotions.filter(p => (p.type ?? '').toLowerCase() === 'banner');
  const regularPromos = promotions.filter(p => (p.type ?? '').toLowerCase() !== 'banner');

  const featuredProduct = featuredProducts[0];
  const smallProducts = flashSaleProducts.slice(0, 8);
  const topRated = topRatedProducts;

  const DEAL_TABS: { key: 'flash' | 'featured' | 'top' | 'new'; label: string; list: Product[] }[] = [
    { key: 'flash', label: 'Flash', list: flashSaleProducts },
    { key: 'featured', label: 'Featured', list: featuredProducts },
    { key: 'top', label: 'Top Picks', list: topRatedProducts },
    { key: 'new', label: 'New Arrivals', list: newArrivalsProducts },
  ];
  const activeDealTabConfig = DEAL_TABS.find(t => t.key === activeDealTab) ?? DEAL_TABS[0];
  const activeDealList = activeDealTabConfig.list;

  const renderDealRow = (list: Product[], emptyKey: string) =>
    list.length > 0 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
        {list.slice(0, 8).map(p => (
          <View key={p.id} style={[styles.flashCard, { width: flashCardWidth }]}>
            <Pressable style={styles.flashImageWrap} onPress={() => navigate('ProductDetails', { product: p })}>
              <Image source={{ uri: p.image }} style={styles.flashImage} resizeMode="cover" />
              <View style={styles.flashBadge}>
                <Badge label={p.discount ?? 'SALE'} variant="flash" />
              </View>
            </Pressable>
            <View style={styles.flashBody}>
              <Text style={styles.flashCategory} numberOfLines={1}>{p.vendor?.name ?? p.category}</Text>
              <Text style={styles.flashTitle} numberOfLines={2}>{p.title}</Text>
              <View style={styles.flashPriceRow}>
                <Text style={styles.flashPrice}>{p.price}</Text>
                {p.originalPrice ? <Text style={styles.flashOriginalPrice}>{p.originalPrice}</Text> : null}
              </View>
              <Pressable style={styles.flashAddBtn} onPress={() => addItem(p)}>
                <Icon name="add-shopping-cart" size={16} color={colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    ) : (
      <View style={styles.emptyCentered}>
        <Pressable style={styles.flashEmptyCard} onPress={refresh}>
          <Icon name="bolt" size={40} color={colors.secondary} />
          <Text style={styles.flashEmptyTitle}>No {emptyKey} right now</Text>
          <Text style={styles.flashEmptySub}>Tap to refresh the live catalog.</Text>
        </Pressable>
      </View>
    );

  const brandSections = useMemo(
    () =>
      BRANDS.map(brand => {
        const list = products.filter(p => brand.match.test(p.title));
        return { brand, list };
      }).filter(s => s.list.length > 0),
    [products],
  );

  const extraSections = useMemo(() => {
    const matchesCategory = (keywords: RegExp) => products.filter(p => keywords.test(p.category));
    const byPrice = (max: number) => products.filter(p => p.priceValue > 0 && p.priceValue <= max);
    const toCarousel = (icon: IconName, title: string, subtitle: string, list: Product[]) =>
      list.length > 0 ? { icon, title, subtitle, list } : null;
    const b2bItems = (list: Product[]) => list.filter(p => p.isWholesale || p.bulkOrder || p.corporateReady || p.enterpriseSolution);
    return [
      toCarousel('memory', 'Electronics', 'The latest gadgets and devices', matchesCategory(/mobile|phone|tablet|computer|laptop|tech|audio|electrical/i)),
      toCarousel('checkroom', "Fashion & Apparel", 'The latest trends for the whole family', matchesCategory(/fashion|clothing|women|men|kids|footwear/i)),
      toCarousel('storefront', 'Local Heroes', 'Locally manufactured Ugandan products', matchesCategory(/local|uganda|handmade|craft|agric/i)),
      toCarousel('lightbulb', 'Home & Living', 'Everything you need for your space', matchesCategory(/home|living|kitchen|furniture|office/i)),
      toCarousel('star', 'Best Picks', 'Handpicked favorites by our customers', [...products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8)),
      toCarousel('business-center', 'Corporate & Wholesale', 'B2B solutions and bulk-sale products', b2bItems(products)),
      toCarousel('sell', 'Under 50K', 'Great products at affordable prices', byPrice(50000)),
    ].filter((s): s is { icon: IconName; title: string; subtitle: string; list: Product[] } => s !== null);
  }, [products]);

  const flashCardWidth = Math.round((width - spacing.md * 2 - spacing.gutter) / 2);
  const productCardWidth = flashCardWidth;
  const seasonalCardWidth = Math.round(width * 0.6);
  const sectorTileWidth = Math.round((width - spacing.md * 2 - spacing.gutter * 3) / 4);

  return (
    <View style={styles.root}>
      <AppHeader
        right={<HeaderActions />}
      />
      {error ? (
        <Pressable style={styles.statusBanner} onPress={refresh}>
          <Icon name="sync" size={16} color={colors.white} />
          <Text style={styles.statusBannerText}>Offline — live catalog unavailable. Tap to retry.</Text>
        </Pressable>
      ) : loading ? (
        <View style={styles.statusBanner}>
          <Icon name="sync" size={16} color={colors.white} />
          <Text style={styles.statusBannerText}>Loading live catalog...</Text>
        </View>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
      >
        {/* Hero carousel */}
        <View style={styles.heroSection}>
          <HeroCarousel slides={HERO_SLIDES} showDots />
        </View>

        {/* Explore sectors */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat.key}
                style={[styles.sectorTile, { width: sectorTileWidth }]}
                onPress={() => {
                  if (cat.b2b) {
                    switchTab('Marketplace');
                    return;
                  }
                  const list = products.filter(p => cat.match.test(p.category));
                  navigate('AllProducts', { title: cat.label, products: list });
                }}
              >
                <View style={styles.sectorIcon}>
                  <Icon name={cat.icon} size={24} color={colors.secondary} />
                </View>
                <Text style={styles.sectorLabel} numberOfLines={1}>{cat.word}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Deals: Flash / Featured / Top Picks / New Arrivals */}
        <View style={styles.section}>
          <SectionHeader
            icon="bolt"
            iconColor={colors.statusFlash}
            title="Deals"
            subtitle="Flash sales, featured picks, top rated &amp; new arrivals."
            actionLabel="See All"
            onAction={() => navigate('AllProducts', { title: activeDealTabConfig.label, subtitle: `${activeDealTabConfig.label} products`, products: activeDealList })}
            trailing={activeDealTab === 'flash' ? <View style={styles.countdownPill}><Text style={styles.countdownText}>{countdown}</Text></View> : null}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealTabs}>
            {DEAL_TABS.map(tab => {
              const active = tab.key === activeDealTab;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.dealTab, active && styles.dealTabActive]}
                  onPress={() => setActiveDealTab(tab.key)}
                >
                  <Text style={[styles.dealTabText, active && styles.dealTabTextActive]}>{tab.label}</Text>
                  {tab.list.length > 0 ? (
                    <Text style={[styles.dealTabCount, active && styles.dealTabCountActive]}>{tab.list.length}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {renderDealRow(activeDealList, activeDealTabConfig.label)}
        </View>

        {/* Verified Hubs & Vendors */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Verified Hubs &amp; Vendors</Text>
              <Text style={styles.sectionSubtitle}>Direct store inventory &amp; escrow</Text>
            </View>
            <Pressable style={styles.sectionLink} onPress={() => navigate('FeaturedVendors')}>
              <Text style={styles.sectionLinkText}>View Featured</Text>
              <Icon name="chevron-right" size={16} color={colors.secondary} />
            </Pressable>
          </View>
          <View style={styles.hubList}>
            {jeminaStore ? (
              <Pressable
                key={jeminaStore.id}
                style={styles.hubCard}
                onPress={() => navigate('VendorProfile', { vendorId: jeminaStore.vendorId, vendorName: jeminaStore.name })}
              >
                <View style={styles.hubLeft}>
                  <View style={styles.hubLogoWrap}>
                    <HubLogo logo={jeminaStore.logo} icon={jeminaStore.icon} />
                  </View>
                  <View style={styles.hubBody}>
                    <View style={styles.hubNameRow}>
                      <Text style={styles.hubName} numberOfLines={1}>{jeminaStore.name}</Text>
                      <Icon name="verified" size={16} color={colors.secondaryContainer} />
                    </View>
                    <View style={styles.hubMeta}>
                      <Icon name="star" size={13} color={colors.secondaryContainer} />
                      <Text style={styles.hubRating}>{jeminaStore.rating > 0 ? jeminaStore.rating.toFixed(1) : '—'}</Text>
                      <Text style={styles.hubMetaSuffix}>· {jeminaStore.products} products</Text>
                      <Text style={styles.hubMetaSuffix}>· <Text style={styles.hubRegion}>{jeminaStore.location}</Text></Text>
                    </View>
                  </View>
                </View>
                <View style={styles.hubVisitBtn}>
                  <Text style={styles.hubVisitText}>Visit</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Featured brands */}
        {brandSections.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              icon="verified"
              title="Featured Brands"
              subtitle="Shop top electronics and lifestyle brands."
              actionLabel="View All"
              onAction={() => {
                const all = brandSections.flatMap(s => s.list);
                navigate('AllProducts', { title: 'Featured Brands', subtitle: 'Shop top electronics and lifestyle brands.', products: all });
              }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRow}>
              {brandSections.map(({ brand, list }) => (
                <Pressable
                  key={brand.key}
                  style={styles.brandTile}
                  onPress={() =>
                    navigate('AllProducts', { title: brand.label, subtitle: `${brand.label} products`, products: list })
                  }
                >
                  <View style={styles.brandCircle}>
                    <Icon name={brand.icon} size={24} color={colors.primaryContainer} />
                  </View>
                  <Text style={styles.brandName} numberOfLines={1}>{brand.label}</Text>
                  <Text style={styles.brandCount}>{list.length} product{list.length === 1 ? '' : 's'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Smart picks */}
        <View style={styles.section}>
          <SectionHeader
            icon="auto-awesome"
            title="Smart Picks"
            trailing={flashSaleProducts.length > 0 ? <Badge label={`${flashSaleProducts.length} DEALS`} variant="flash" style={styles.dealsBadge} /> : null}
          />
          {featuredProduct ? (
            <Pressable
              style={({ pressed }) => [styles.featuredCard, pressed && styles.pressed]}
              onPress={() => navigate('ProductDetails', { product: featuredProduct })}
            >
              <View style={[styles.featuredImageWrap, { aspectRatio: featuredImageRatio ?? 16 / 9 }]}>
                <Image
                  source={{ uri: featuredProduct.image }}
                  style={styles.featuredImage}
                  resizeMode="contain"
                  onLoad={e => {
                    const { width: w, height: h } = e.nativeEvent.source;
                    if (w && h) {
                      setFeaturedImageRatio(w / h);
                    }
                  }}
                />
                <View style={styles.featuredBadge}>
                  <Badge label="Featured" variant="featured" />
                </View>
              </View>
              <View style={styles.featuredBody}>
                <Text style={styles.featuredCategory}>{featuredProduct.category}</Text>
                <Text style={styles.featuredTitle}>{featuredProduct.title}</Text>
                <View style={styles.featuredBottom}>
                  <View>
                    <Text style={styles.featuredPrice}>{featuredProduct.price}</Text>
                    {featuredProduct.minOrder ? (
                      <Text style={styles.featuredMinOrder}>{featuredProduct.minOrder}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    style={styles.cartIconBtn}
                    onPress={() => addItem(featuredProduct)}
                  >
                    <Icon name="add-shopping-cart" size={20} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ) : null}

          <ProductCarousel
            products={smallProducts}
            cardWidth={productCardWidth}
            imageHeight={130}
            compact
            showDots={false}
            autoPlay
            loop
            autoPlayInterval={10000}
            onPress={p => navigate('ProductDetails', { product: p })}
              onAddToCart={p => addItem(p)}
          />
        </View>

        {/* Top rated */}
        <View style={styles.section}>
          <SectionHeader
            icon="star"
            title="Top Rated"
            subtitle="Most loved products by our customers."
            actionLabel="View All"
            onAction={() => navigate('AllProducts', { title: 'Top Rated', subtitle: 'Most loved products by our customers.', products: topRated })}
          />
          {topRated.length > 0 ? (
            <View style={styles.productGrid}>
              {topRated.map(p => (
                <View key={p.id} style={styles.productCardWrap}>
                  <ProductCard
                    product={p}
                    compact
                    imageHeight={120}
                    onPress={() => navigate('ProductDetails', { product: p })}
                    onAddToCart={() => addItem(p)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCentered}>
              <Pressable style={styles.flashEmptyCard} onPress={refresh}>
                <Icon name="star" size={40} color={colors.secondary} />
                <Text style={styles.flashEmptyTitle}>No products right now</Text>
                <Text style={styles.flashEmptySub}>Tap to refresh the live catalog.</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Promotions */}
        <View style={styles.section}>
          <SectionHeader
            icon="auto-awesome"
            iconColor={colors.secondary}
            title="Promotions"
            subtitle="Special offers live right now."
            actionLabel="View All"
            onAction={() => navigate('AllProducts', { title: 'Promotions', subtitle: 'Special offers live right now.', products: seasonalProducts })}
            trailing={promotions.length > 0 ? <Badge label={`${promotions.length} OFFERS`} variant="flash" style={styles.dealsBadge} /> : null}
          />

          {promotions.length > 0 ? (
            <View>
              {bannerPromos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
                  {bannerPromos.map(promo => (
                    <PromoBannerCard
                      key={promo.id}
                      promo={promo}
                      onPress={() => openPromo(promo)}
                    />
                  ))}
                </ScrollView>
              ) : null}
              {regularPromos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
                  {regularPromos.slice(0, 8).map(promo => (
                    <PromoFlashCard
                      key={promo.id}
                      promo={promo}
                      width={seasonalCardWidth}
                      onPress={() => openPromo(promo)}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : seasonalProducts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
            {seasonalProducts.slice(0, 8).map(p => (
              <SeasonalProductCard
                key={p.id}
                product={p}
                width={seasonalCardWidth}
                onPress={() => navigate('ProductDetails', { product: p })}
                onAddToCart={() => addItem(p)}
              />
            ))}
          </ScrollView>
          ) : (
            <View style={styles.emptyCentered}>
              <Pressable style={styles.flashEmptyCard} onPress={refresh}>
                <Icon name="auto-awesome" size={40} color={colors.secondary} />
                <Text style={styles.flashEmptyTitle}>No promotions right now</Text>
                <Text style={styles.flashEmptySub}>Tap to refresh the live catalog.</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Seasonal (per-season tabs) */}
        {seasonalTabs.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              icon="eco"
              iconColor={colors.secondary}
              title="Seasonal"
              subtitle="On-season products for each celebration, like the website."
              actionLabel="View All"
              onAction={activeSeasonalTab ? () => navigate('AllProducts', { title: activeSeasonalTab.name, subtitle: `${activeSeasonalTab.name} products`, products: activeSeasonalTab.products }) : () => {}}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealTabs}>
              {seasonalTabs.map(tab => {
                const active = tab.slug === activeSeasonalTab?.slug;
                return (
                  <Pressable
                    key={tab.slug}
                    style={[styles.dealTab, active && styles.dealTabActive]}
                    onPress={() => setActiveSeasonSlug(tab.slug)}
                  >
                    <Icon name={tab.icon} size={16} color={active ? colors.onSecondaryContainer : colors.onSurfaceVariant} />
                    <Text style={[styles.dealTabText, active && styles.dealTabTextActive]}>{tab.name}</Text>
                    {tab.products.length > 0 ? (
                      <Text style={[styles.dealTabCount, active && styles.dealTabCountActive]}>{tab.products.length}</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            {activeSeasonalTab ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
                {activeSeasonalTab.products.slice(0, 8).map(p => (
                  <SeasonalProductCard
                    key={p.id}
                    product={p}
                    width={seasonalCardWidth}
                    onPress={() => navigate('ProductDetails', { product: p })}
                    onAddToCart={() => addItem(p)}
                  />
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {/* B2B Wholesale CTA */}
        <View style={styles.section}>
          <View style={styles.b2bCta}>
            <View style={styles.b2bCtaTop}>
              <View style={styles.b2bCtaHead}>
                <View style={styles.b2bCtaBadge}>
                  <Text style={styles.b2bCtaBadgeText}>B2B Wholesale</Text>
                </View>
                <Text style={styles.b2bCtaTitle}>Commercial &amp; Bulk Orders</Text>
                <Text style={styles.b2bCtaDesc}>
                  Request custom pricing, MOQ procurement, tax invoices &amp; scheduled depot dispatch.
                </Text>
              </View>
              <Icon name="fact-check" size={42} color={colors.secondaryContainer} />
            </View>
            <View style={styles.b2bCtaFoot}>
              <Text style={styles.b2bCtaNote}>Response in {'< 2 hours'}</Text>
              <Pressable style={styles.b2bCtaBtn} onPress={() => setB2bModalOpen(true)}>
                <Text style={styles.b2bCtaBtnText}>Request RFQ</Text>
                <Icon name="arrow-forward" size={16} color={colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Trust indicators */}
        <View style={styles.trustSection}>
          <View style={styles.trustGrid}>
            {TRUST_INDICATORS.map(t => (
              <View key={t.title} style={styles.trustItem}>
                <Icon name={t.icon} size={22} color={colors.secondary} />
                <View style={styles.trustBody}>
                  <Text style={styles.trustTitle}>{t.title}</Text>
                  <Text style={styles.trustSubtitle}>{t.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Additional product sections (mirrors website homepage) */}
        {extraSections.map(section => (
          <View key={section.title} style={styles.section}>
            <SectionHeader
              icon={section.icon}
              title={section.title}
              subtitle={section.subtitle}
              actionLabel="View All"
              onAction={() => navigate('AllProducts', { title: section.title, subtitle: section.subtitle, products: section.list })}
            />
            <ProductCarousel
              products={section.list}
              cardWidth={productCardWidth}
              imageHeight={150}
              showDots={false}
              autoPlay
              loop
              autoPlayInterval={10000}
              onPress={p => navigate('ProductDetails', { product: p })}
            onAddToCart={p => addItem(p)}
            />
          </View>
        ))}
      </ScrollView>

      <Modal visible={b2bModalOpen} animationType="slide" transparent onRequestClose={() => setB2bModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How B2B Wholesale Works</Text>
              <Pressable onPress={() => setB2bModalOpen(false)} hitSlop={8}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {B2B_STEPS.map((step, i) => (
                <View key={i} style={styles.b2bStepRow}>
                  <View style={styles.b2bStepNum}>
                    <Text style={styles.b2bStepNumText}>{i + 1}</Text>
                  </View>
                  <View style={styles.b2bStepBody}>
                    <Text style={styles.b2bStepTitle}>{step.title}</Text>
                    <Text style={styles.b2bStepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
              <Pressable
                style={[styles.b2bCtaBtn, styles.b2bModalCta]}
                onPress={() => {
                  setB2bModalOpen(false);
                  switchTab('Marketplace');
                }}
              >
                <Text style={styles.b2bCtaBtnText}>Continue to B2B Marketplace</Text>
                <Icon name="arrow-forward" size={16} color={colors.onPrimary} />
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomNav />
    </View>
  );
}

function PromoFlashCard({
  promo,
  width,
  onPress,
}: {
  promo: ApiPromotion;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.hlCard, { width }]} onPress={onPress}>
      <View style={styles.hlImageWrap}>
        {promo.image_url ? (
          <Image source={{ uri: promoImageUrl(promo.image_url) }} style={styles.hlImage} resizeMode="cover" />
        ) : (
          <View style={styles.hlNoImage}>
            <Icon name="auto-awesome" size={24} color={colors.secondary} />
          </View>
        )}
        <View style={styles.hlBadge}>
          <Badge label={(promo.type ?? 'PROMO').toUpperCase()} variant="flash" />
        </View>
      </View>
      <View style={styles.hlBody}>
        <Text style={styles.hlCategory} numberOfLines={1}>{promo.vendor?.name ?? 'JEMINA'}</Text>
        <Text style={styles.hlTitle} numberOfLines={1}>{promo.title}</Text>
        <View style={[styles.hlFoot, styles.hlFootEnd]}>
          <Pressable style={styles.hlBtn} onPress={onPress}>
            <Text style={styles.hlBtnText}>View</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function PromoBannerCard({
  promo,
  onPress,
}: {
  promo: ApiPromotion;
  onPress: () => void;
}) {
  const { width } = useWindowDimensions();
  return (
    <Pressable
      style={[styles.bannerCard, { width: width - spacing.lg * 2 }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {promo.image_url ? (
        <Image source={{ uri: promoImageUrl(promo.image_url) }} style={styles.bannerImage} resizeMode="cover" />
      ) : (
        <View style={[styles.bannerImage, styles.bannerNoImage]}>
          <Icon name="auto-awesome" size={32} color={colors.secondary} />
        </View>
      )}
      <View style={styles.bannerOverlay}>
        <View style={styles.bannerBadge}>
          <Badge label={(promo.type ?? 'BANNER').toUpperCase()} variant="flash" />
        </View>
        <View style={styles.bannerCta}>
          <Text style={styles.bannerCtaText}>View Offer</Text>
          <Icon name="chevron-right" size={14} color={colors.onPrimary} />
        </View>
      </View>
    </Pressable>
  );
}

function HubLogo({ logo, icon }: { logo?: string; icon: 'storefront' | 'shopping-bag' }) {
  const [failed, setFailed] = useState(false);
  if (!logo || failed) {
    return (
      <View style={styles.hubLogoFallback}>
        <Icon name={icon} size={28} color={colors.primaryContainer} />
      </View>
    );
  }
  return <Image source={{ uri: logo }} style={styles.hubLogo} resizeMode="cover" onError={() => setFailed(true)} />;
}

function SeasonalProductCard({
  product,
  width,
  onPress,
  onAddToCart,
}: {
  product: Product;
  width: number;
  onPress: () => void;
  onAddToCart: () => void;
}) {
  return (
    <Pressable style={[styles.hlCard, { width }]} onPress={onPress}>
      <View style={styles.hlImageWrap}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.hlImage} resizeMode="cover" />
        ) : (
          <View style={styles.hlNoImage}>
            <Icon name="auto-awesome" size={24} color={colors.secondary} />
          </View>
        )}
        <View style={styles.hlBadge}>
          <Badge label={product.holidaySpecial ? 'HOLIDAY' : product.seasonal ? 'SEASONAL' : product.discount ? 'SALE' : 'PROMO'} variant="flash" />
        </View>
      </View>
      <View style={styles.hlBody}>
        <Text style={styles.hlCategory} numberOfLines={1}>{product.category}</Text>
        <Text style={styles.hlTitle} numberOfLines={1}>{product.title}</Text>
        <View style={styles.hlFoot}>
          <Text style={styles.hlPrice} numberOfLines={1}>{product.price}</Text>
          <Pressable style={styles.hlBtn} onPress={onAddToCart}>
            <Text style={styles.hlBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statusBannerText: {
    ...typography.labelMd,
    color: colors.white,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  pressed: {
    opacity: 0.85,
  },
  heroSection: {
    paddingTop: 0,
    paddingHorizontal: 0,
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 2,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 1,
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionLinkText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  sectorTile: {
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sectorIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectorLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  dealsBadge: {
    marginLeft: spacing.sm,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.lg,
    backgroundColor: colors.errorContainer,
  },
  countdownText: {
    ...typography.labelSm,
    color: colors.onErrorContainer,
    fontWeight: '800',
  },
  dealTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
  },
  dealTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm - 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLowest,
  },
  dealTabActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  dealTabText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  dealTabTextActive: {
    color: colors.onSecondaryContainer,
    fontWeight: '800',
  },
  dealTabCount: {
    ...typography.labelSm,
    color: colors.outline,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.sm + 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  dealTabCountActive: {
    color: colors.onSecondaryContainer,
    backgroundColor: colors.secondaryContainer,
  },
  featuredCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  featuredImageWrap: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  featuredBody: {
    padding: spacing.md,
  },
  featuredCategory: {
    ...typography.labelMd,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  featuredTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  featuredBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  featuredPrice: {
    ...typography.headlineSm,
    color: colors.statusFlash,
    fontWeight: '700',
  },
  featuredMinOrder: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  cartIconBtn: {
    backgroundColor: colors.secondaryContainer,
    padding: 10,
    borderRadius: radius.lg,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gutter,
  },
  productCardWrap: {
    width: '48%',
  },
  flashRow: {
    gap: spacing.gutter,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
  },
  flashCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  flashImageWrap: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
  },
  flashImage: {
    width: '100%',
    height: 132,
    borderRadius: radius.lg,
  },
  flashBadge: {
    position: 'absolute',
    top: spacing.sm + 8,
    left: spacing.sm + 8,
    zIndex: 1,
  },
  flashBody: {
    padding: 10,
  },
  flashCategory: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flashTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
  flashPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm - 2,
  },
  flashPrice: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  flashOriginalPrice: {
    ...typography.labelSm,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  flashAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  flashAddText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  flashEmptyCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashEmptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  flashEmptySub: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  hlCard: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  hlImageWrap: {
    width: 84,
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  hlImage: {
    width: '100%',
    height: '100%',
  },
  hlNoImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  hlBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    zIndex: 1,
  },
  hlBody: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  hlCategory: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hlTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
  hlFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  hlFootEnd: {
    justifyContent: 'flex-end',
  },
  hlPrice: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '700',
    flexShrink: 1,
  },
  hlBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  hlBtnText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  bannerCard: {
    flexShrink: 0,
    position: 'relative',
    height: 180,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
  },
  bannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bannerNoImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: 'transparent',
  },
  bannerBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 1,
  },
  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  bannerCtaText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  brandRow: {
    gap: spacing.gutter,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
  },
  brandTile: {
    width: 108,
    flexShrink: 0,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  brandCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  brandName: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  brandCount: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  hubList: {
    gap: 10,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    padding: spacing.md - 4,
  },
  hubLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    flex: 1,
  },
  hubLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hubLogo: {
    width: '100%',
    height: '100%',
  },
  hubLogoFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubBody: {
    flex: 1,
  },
  hubNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hubName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    flexShrink: 1,
  },
  hubMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  hubRating: {
    ...typography.bodySm,
    color: colors.secondary,
    fontWeight: '700',
  },
  hubMetaSuffix: {
    ...typography.bodySm,
    color: colors.outline,
  },
  hubRegion: {
    ...typography.labelSm,
    color: colors.onSecondaryFixedVariant,
  },
  hubVisitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  hubVisitText: {
    ...typography.labelMd,
    color: colors.primaryContainer,
  },
  b2bCta: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    padding: spacing.md,
    overflow: 'hidden',
  },
  b2bCtaTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  b2bCtaHead: {
    flex: 1,
  },
  b2bCtaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.lg,
  },
  b2bCtaBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  b2bCtaTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  b2bCtaDesc: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 4,
    maxWidth: 250,
  },
  b2bCtaFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    marginTop: spacing.md,
    paddingTop: spacing.md - 2,
  },
  b2bCtaNote: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '600',
  },
  b2bCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  b2bCtaBtnText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.md,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  b2bStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  b2bStepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  b2bStepNumText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '800',
  },
  b2bStepBody: {
    flex: 1,
    paddingTop: 2,
  },
  b2bStepTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  b2bStepDesc: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  b2bModalCta: {
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  trustSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trustItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: 10,
  },
  trustBody: {
    flex: 1,
  },
  trustTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  trustSubtitle: {
    ...typography.bodySm,
    color: colors.outline,
    fontSize: 11,
    marginTop: 2,
  },
});