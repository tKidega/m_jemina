import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppHeader, HeaderCartButton, HeaderNotificationButton, HeaderSearchButton } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../components/SectionHeader';
import { HeroCarousel, type HeroSlide } from '../components/HeroCarousel';
import { ProductCard, formatUGX, type Product } from '../components/ProductCard';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { apiGetVendors } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import b2bHero1 from '../assets/banners/b2b-hero-1.jpg';
import b2bHero2 from '../assets/banners/b2b-hero-2.jpg';

interface FilterDef {
  label: string;
  match?: (p: Product) => boolean;
  sections?: string[];
}

const FILTERS: FilterDef[] = [
  { label: 'All' },
  {
    label: 'Wholesale (MOQ 10+)',
    sections: ['Wholesale', 'Bulk Orders'],
  },
  {
    label: 'Bulk Grain & Seed',
    match: p => /grain|seed|maize|rice|simsim|soy|sunflower|bean|groundnut|cowpea|fertilizer|agro|agric|honey|oil|sorghum|millet/i.test(`${p.title} ${p.category}`),
  },
  {
    label: 'Solar & Commercial Tech',
    match: p => /solar|power|panel|watt|battery|inverter|tech|electronics|electrical|phone|computer|laptop|telecom|led|audio|generator/i.test(`${p.title} ${p.category}`),
  },
  {
    label: 'Construction',
    match: p => /construction|building|cement|steel|hardware|tool|machine|equipment|plumbing|paint|tile|roofing/i.test(`${p.title} ${p.category}`),
  },
  {
    label: 'Corporate Supplies',
    sections: ['Corporate', 'Enterprise'],
  },
];

const B2B_HERO_SLIDES: HeroSlide[] = [
  { id: 'b2b-hero-1', image: b2bHero1 },
  { id: 'b2b-hero-2', image: b2bHero2 },
];

const formatCount = (n: number) => n.toLocaleString();

const DEPOTS = [
  {
    name: 'Gulu Main Agro Hub',
    address: 'Layibi Industrial Corridor, Gulu City',
    meta: 'Min: UGX 500k',
    tag: 'Self-Pickup Ready',
    icon: 'warehouse' as const,
  },
  {
    name: 'Lira Grain & Hardware Depot',
    address: 'Soroti Road Wholesale Terminal, Lira',
    meta: 'Min: UGX 1.0M',
    tag: 'Inter-district Fleet',
    icon: 'local-shipping' as const,
  },
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
  tags: string[];
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
    tags: ['Retail', 'Wholesale', 'Online Delivery'],
  },
  {
    id: 'fashion',
    vendorId: 2,
    name: 'Fashion Hub Gulu',
    rating: 4.2,
    products: 512,
    icon: 'shopping-bag',
    accent: colors.primary,
    description: 'Latest trends in footwear and apparel. Bulk discounts for resellers available.',
    tags: ['Apparel', 'Footwear'],
  },
];

export function MarketplaceScreen() {
  const { navigate, switchTab } = useNavigation();
  const { itemCount, addItem } = useCart();
  const {
    flashSale,
    products,
    categories,
    wholesale,
    bulkOrder,
    corporateReady,
    enterpriseSolutions,
    error,
    refresh,
  } = useCatalog();
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);
  const [liveVendors, setLiveVendors] = useState<StoreData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const flashCardWidth = Math.round((width - spacing.lg * 2 - spacing.lg) / 2);

  const loadVendors = useCallback(() => {
    apiGetVendors()
      .then(vendors => {
        const mapped: StoreData[] = vendors.map((v, i) => ({
          id: `vendor-${v.id}`,
          vendorId: v.id,
          name: v.name || 'Jemina Vendor',
          rating: v.rating,
          products: v.product_count,
          icon: (i % 2 === 0 ? 'storefront' : 'shopping-bag') as 'storefront' | 'shopping-bag',
          accent: i % 2 === 0 ? colors.secondary : colors.primary,
          description: v.description || `${v.name || 'Vendor'} - ${v.location || 'Uganda'}`,
          tags: [v.location || 'Online', 'Verified'],
        }));
        if (mapped.length > 0) setLiveVendors(mapped);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), loadVendors()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, loadVendors]);

  const stores = liveVendors.length > 0 ? liveVendors : DEFAULT_STORES;

  const runSearch = () => {
    const query = searchText.trim();
    if (query) {
      navigate('SearchResults', { query });
    }
  };

  const isB2B = (p: Product) =>
    Boolean(p.isWholesale) || Boolean(p.bulkOrder) || Boolean(p.corporateReady) || Boolean(p.enterpriseSolution) ||
    p.badge?.variant === 'wholesale' ||
    p.badge?.variant === 'corporate';

  const b2bProducts = products.filter(isB2B);

  const activeDef = FILTERS[activeFilter] ?? FILTERS[0];

  const activeMatches = useCallback(
    (p: Product) => {
      if (!activeDef.label || activeFilter === 0) return true;
      if (activeDef.match) return activeDef.match(p);
      if (activeDef.sections) {
        const inWholesale = (activeDef.sections.includes('Wholesale') || activeDef.sections.includes('Bulk Orders')) &&
          (Boolean(p.isWholesale) || Boolean(p.bulkOrder) || p.badge?.variant === 'wholesale');
        const inCorporate = (activeDef.sections.includes('Corporate') || activeDef.sections.includes('Enterprise')) &&
          (Boolean(p.corporateReady) || Boolean(p.enterpriseSolution) || p.badge?.variant === 'corporate');
        return inWholesale || inCorporate;
      }
      return true;
    },
    [activeDef, activeFilter],
  );

  const wholesaleLots = useMemo(
    () => (activeFilter === 0 ? b2bProducts : b2bProducts.filter(activeMatches)).slice(0, 3),
    [b2bProducts, activeFilter, activeMatches],
  );

  const b2bFlash = (flashSale.length > 0 ? flashSale : products.slice(0, 4)).filter(isB2B);
  const flashDeals = (b2bFlash.length > 0 ? b2bFlash : b2bProducts.slice(0, 4)).slice(0, 4);

  const roster = useMemo(() => {
    const base = [
      { icon: 'storefront' as const, title: 'Wholesale', subtitle: 'Buy in bulk at wholesale prices.', list: wholesale.length > 0 ? wholesale : b2bProducts.filter(p => p.isWholesale || p.badge?.variant === 'wholesale') },
      { icon: 'inventory' as const, title: 'Bulk Orders', subtitle: 'Large-volume bulk purchasing for businesses.', list: bulkOrder.length > 0 ? bulkOrder : b2bProducts.filter(p => p.bulkOrder) },
      { icon: 'business-center' as const, title: 'Corporate', subtitle: 'Corporate-ready products and solutions.', list: corporateReady.length > 0 ? corporateReady : b2bProducts.filter(p => p.corporateReady || p.badge?.variant === 'corporate') },
      { icon: 'handshake' as const, title: 'Enterprise', subtitle: 'Enterprise-scale solutions for large teams.', list: enterpriseSolutions.length > 0 ? enterpriseSolutions : b2bProducts.filter(p => p.enterpriseSolution) },
    ];
    if (activeFilter === 0) return base;
    if (activeDef.sections) {
      return base.filter(s => (activeDef.sections ?? []).includes(s.title));
    }
    return base.map(s => ({ ...s, list: s.list.filter(activeMatches) }));
  }, [wholesale, bulkOrder, corporateReady, enterpriseSolutions, b2bProducts, activeFilter, activeDef.sections, activeMatches]);

  const b2bSections = roster.filter(section => section.list.length > 0);

  const openInquiry = (product: Product) => navigate('ProductInquiry', { product });

  const categoryIcon = (name: string): string => {
    if (/agro|grain|seed|agric|produce|food/i.test(name)) return 'agriculture';
    if (/solar|power|tech|elect|computer|phone|solar/i.test(name)) return 'solar-power';
    if (/build|construction|material|iron|hardware/i.test(name)) return 'construction';
    if (/equipment|machine|tool/i.test(name)) return 'precision-manufacturing';
    if (/fashion|clothing|footwear|apparel/i.test(name)) return 'checkroom';
    return 'inventory';
  };

  return (
    <View style={styles.root}>
      <AppHeader
        right={
          <>
            <HeaderNotificationButton />
            <HeaderSearchButton onPress={() => navigate('Search')} />
            <HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />
          </>
        }
      />
      {error ? (
        <Pressable style={styles.statusBanner} onPress={refresh}>
          <Icon name="sync" size={16} color={colors.white} />
          <Text style={styles.statusBannerText}>Offline — live catalog unavailable. Tap to retry.</Text>
        </Pressable>
      ) : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
      >
        {/* Hub selector & context bar */}
        <View style={styles.hubBar}>
          <View style={styles.hubBarLeft}>
            <Icon name="location-on" size={18} color={colors.secondaryContainer} />
            <Text style={styles.hubBarText}>
              Delivery Hub: <Text style={styles.hubBarStrong}>Gulu Central Warehouse</Text>
            </Text>
          </View>
          <Pressable style={styles.hubBarChange} onPress={() => navigate('AllProducts', { title: 'Regional Depots', subtitle: 'Verified physical hubs across Northern Uganda.', products: b2bProducts })}>
            <Text style={styles.hubBarChangeText}>Change</Text>
            <Icon name="expand-more" size={14} color={colors.secondaryFixedDim} />
          </Pressable>
        </View>

        {/* Search B2B & wholesale */}
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Icon name="search" size={20} color={colors.outline} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search wholesale seeds, solar, tools, MOQ..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
                onSubmitEditing={runSearch}
              />
            </View>
            <Pressable style={styles.searchBtn} onPress={runSearch}>
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
          </View>
          <View style={styles.searchAssurance}>
            <Text style={styles.searchAssuranceText}>
              <Icon name="verified" size={14} color={colors.secondary} /> Regional Tax Invoice &amp; Waybills Guaranteed
            </Text>
            <Pressable onPress={() => navigate('ProductInquiry', { product: wholesaleLots[0] ?? b2bProducts[0] })}>
              <Text style={styles.bulkRfqText}>Bulk RFQ</Text>
            </Pressable>
          </View>
        </View>

        {/* B2B hero carousel */}
        <View style={styles.heroSection}>
          <HeroCarousel slides={B2B_HERO_SLIDES} aspectRatio={672 / 288} resizeMode="cover" showDots />
        </View>

        {/* Live stats bento strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValuePrimary]}>{formatCount(products.length)}+</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueSecondary]}>{formatCount(b2bProducts.length)}</Text>
            <Text style={styles.statLabel}>Bulk Deals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValuePrimary]}>{formatCount(categories.length)}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValuePrimary]}>{formatCount(stores.length)}</Text>
            <Text style={styles.statLabel}>N. Hub Vendors</Text>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.chipSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((f, i) => (
              <Pressable
                key={f.label}
                style={[styles.chip, i === activeFilter && styles.chipActive]}
                onPress={() => setActiveFilter(i)}
              >
                <Text style={[styles.chipText, i === activeFilter && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Browse by category rail */}
        {categories.length > 0 ? (
          <View style={styles.catSection}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Browse by Category</Text>
              <Pressable style={styles.sectionLink} onPress={() => navigate('AllProducts', { title: 'All Categories', subtitle: 'Browse every department.', products })}>
                <Text style={styles.sectionLinkText}>View All ({categories.length})</Text>
                <Icon name="chevron-right" size={14} color={colors.secondary} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {categories.slice(0, 12).map(cat => {
                const list = products.filter(p => p.category.toLowerCase() === cat.name.toLowerCase());
                return (
                  <Pressable
                    key={cat.id}
                    style={styles.catCard}
                    onPress={() =>
                      navigate('AllProducts', {
                        title: cat.name,
                        subtitle: `${cat.name} products`,
                        products: list.length > 0 ? list : products,
                      })
                    }
                  >
                    <View style={styles.catIcon}>
                      {cat.image ? (
                        <Image source={{ uri: cat.image }} style={styles.catIconImage} resizeMode="cover" />
                      ) : (
                        <Icon name={categoryIcon(cat.name) as never} size={26} color={colors.secondary} />
                      )}
                    </View>
                    <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                    <Text style={styles.catCount}>
                      {formatCount(cat.product_count ?? 0)}+ Lots
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Verified wholesale lots */}
        <View style={styles.lotsSection}>
          <View style={styles.lotsHead}>
            <View style={styles.lotsTitleRow}>
              <View style={styles.accentBar} />
              <Text style={styles.sectionTitle}>Verified Wholesale Lots</Text>
            </View>
            <View style={styles.escrowBadge}>
              <Text style={styles.escrowBadgeText}>ESCROW SECURED</Text>
            </View>
          </View>

          {wholesaleLots.length > 0 ? (
            <View style={styles.lotList}>
              {wholesaleLots.map(p => (
                <WholesaleLotCard
                  key={p.id}
                  product={p}
                  onInquiry={() => openInquiry(p)}
                  onOrder={() => addItem(p)}
                  onOpen={() => navigate('ProductDetails', { product: p })}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyRoster}>
              <Pressable style={styles.emptyRosterBtn} onPress={() => setActiveFilter(0)}>
                <Icon name="inventory" size={36} color={colors.secondary} />
                <Text style={styles.emptyRosterTitle}>No wholesale lots in this filter</Text>
                <Text style={styles.emptyRosterSub}>Reset to All to see everything.</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* B2B carousels */}
        {b2bSections.map(section => {
          const items = section.list.slice(0, 8);
          if (items.length === 0) return null;
          return (
            <View key={section.title} style={styles.section}>
              <SectionHeader
                icon={section.icon}
                title={section.title}
                subtitle={section.subtitle}
                actionLabel={`${section.list.length} items`}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
                {items.map(p => (
                  <View key={p.id} style={[styles.productCardWrap, { width: flashCardWidth }]}>
                    <ProductCard
                      product={p}
                      compact
                      imageHeight={140}
                      actionVariant="inquiry"
                      onPress={() => navigate('ProductDetails', { product: p })}
                      onInquiry={() => openInquiry(p)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}

        {/* NGO & Tender Desk */}
        <View style={styles.section}>
          <View style={styles.tenderCard}>
            <View style={styles.tenderBadgeRow}>
              <Icon name="corporate-fare" size={22} color={colors.secondaryContainer} />
              <View style={styles.tenderBadge}>
                <Text style={styles.tenderBadgeText}>NGO &amp; Tender Desk</Text>
              </View>
            </View>
            <Text style={styles.tenderTitle}>B2B Dedicated Procurement Assistance</Text>
            <Text style={styles.tenderDesc}>
              Need custom tax invoices, URA EFRIS fiscal receipts, or large volume supply contracts for Gulu, Lira, Kitgum, or West Nile projects?
            </Text>
            <Pressable style={styles.tenderCta} onPress={() => navigate('Contact')}>
              <Icon name="chat" size={20} color={colors.onSecondaryContainer} />
              <Text style={styles.tenderCtaText}>Contact B2B Specialist (WhatsApp / Call)</Text>
            </Pressable>
            <Text style={styles.tenderCaption}>Direct hotline: +256 (0) 471 432 900 · Response within 15 mins</Text>
          </View>
        </View>

        {/* Regional supply depots */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Regional Supply Depots</Text>
            <Text style={styles.sectionLinkText}>Verified Physical Hubs</Text>
          </View>
          <View style={styles.depotList}>
            {DEPOTS.map(d => (
              <Pressable key={d.name} style={styles.depotCard} onPress={() => navigate('AllProducts', { title: d.name, subtitle: `${d.address}.`, products: b2bProducts })}>
                <View style={styles.depotIcon}>
                  <Icon name={d.icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.depotBody}>
                  <View style={styles.depotNameRow}>
                    <Text style={styles.depotName}>{d.name}</Text>
                    <Icon name="verified" size={15} color={colors.secondary} />
                  </View>
                  <Text style={styles.depotAddress}>{d.address}</Text>
                  <View style={styles.depotMetaRow}>
                    <View style={styles.depotMetaChip}>
                      <Text style={styles.depotMetaChipText}>{d.meta}</Text>
                    </View>
                    <Text style={styles.depotTag}>{d.tag}</Text>
                  </View>
                </View>
                <View style={styles.depotStoreBtn}>
                  <Text style={styles.depotStoreText}>Store</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Flash sales */}
        <View style={styles.section}>
          <SectionHeader
            icon="bolt"
            iconColor={colors.statusFlash}
            title="Flash Sales"
            subtitle="Limited time offers, act fast!"
            actionLabel="View All"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
            {flashDeals.map(d => (
              <View key={d.id} style={[styles.productCardWrap, { width: flashCardWidth }]}>
                <ProductCard
                  product={d}
                  compact
                  imageHeight={140}
                  actionVariant="inquiry"
                  onPress={() => navigate('ProductDetails', { product: d })}
                  onInquiry={() => openInquiry(d)}
                />
              </View>
            ))}
            <View style={[styles.productCardWrap, { width: flashCardWidth }]}>
              <Pressable
                style={styles.seeAllCard}
                onPress={() => navigate('AllProducts', { title: 'Flash Sales', subtitle: 'Limited time offers, act fast!', products: flashDeals })}
              >
                <View style={[styles.flashImageWrap, styles.seeAllImage]}>
                  <View style={styles.seeAllBadge}>
                    <Icon name="bolt" size={36} color={colors.statusFlash} />
                  </View>
                </View>
                <View style={styles.flashBody}>
                  <Text style={styles.flashCategory}>Flash Sales</Text>
                  <Text style={styles.flashTitle} numberOfLines={1}>View all flash deals</Text>
                  <View style={styles.flashPriceRow}>
                    <Text style={styles.flashPrice}>{flashDeals.length} Deals</Text>
                  </View>
                  <View style={styles.flashAddBtn}>
                    <Text style={styles.flashAddText}>View All</Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        {/* Featured stores */}
        <View style={styles.section}>
          <SectionHeader icon="verified" title="Featured Stores" subtitle="Top rated vendors and brands." />
          {stores.map(s => (
            <Pressable key={s.id} style={styles.storeCard} onPress={() => navigate('VendorProfile', { vendorId: s.vendorId, vendorName: s.name })}>
              <View style={styles.storeHeader}>
                <View style={styles.storeIconWrap}>
                  <Icon name={s.icon} size={30} color={s.accent} />
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{s.name}</Text>
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={14} color={colors.secondary} />
                    <Text style={styles.rating}>{s.rating}</Text>
                    <Text style={styles.reviews}>Rating • {s.products} Products</Text>
                  </View>
                </View>
                <View style={styles.openBadge}>
                  <View style={styles.openDot} />
                  <Text style={styles.openText}>Open</Text>
                </View>
              </View>
              <Text style={styles.storeDesc}>{s.description}</Text>
              <View style={styles.tagRow}>
                {s.tags.map(t => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={[styles.storeBtn, { backgroundColor: s.accent }]}
                onPress={() => navigate('VendorProfile', { vendorId: s.vendorId, vendorName: s.name })}
              >
                <Text style={styles.storeBtnText}>Visit Store</Text>
                <Icon name="launch" size={16} color={colors.onPrimary} />
              </Pressable>
            </Pressable>
          ))}
        </View>

        {/* Newsletter */}
        <View style={styles.newsletter}>
          <Text style={styles.newsletterTitle}>Stay Ahead of the Curve</Text>
          <Text style={styles.newsletterSubtitle}>
            Get deals, promotions, and new arrivals straight to your inbox.
          </Text>
          <View style={styles.newsletterForm}>
            <TextInput
              style={styles.newsletterInput}
              placeholder="Enter your email address"
              placeholderTextColor={colors.onPrimaryContainer}
              keyboardType="email-address"
            />
            <Pressable style={styles.subscribeBtn} onPress={() => {}}>
              <Text style={styles.subscribeBtnText}>Subscribe</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function WholesaleLotCard({
  product: p,
  onInquiry,
  onOrder,
  onOpen,
}: {
  product: Product;
  onInquiry: () => void;
  onOrder: () => void;
  onOpen: () => void;
}) {
  const savePct =
    p.originalPriceValue && p.originalPriceValue > p.priceValue
      ? Math.round(((p.originalPriceValue - p.priceValue) / p.originalPriceValue) * 100)
      : null;
  const moq = p.minOrder ?? 'MOQ: 10+';
  const vendorName = p.vendor?.name ?? 'Jemina Verified Vendor';
  const stockLine = p.stock ?? 'In Northern Hub Depot';
  const dispatch = p.badge?.label ?? (p.isWholesale ? 'Dispatches in 24h' : 'Verified Lot');

  return (
    <View style={styles.wLotCard}>
      <View style={styles.wLotTop}>
        <View style={styles.wLotHead}>
          <View style={styles.wLotBadges}>
            <View style={styles.moqBadge}>
              <Text style={styles.moqBadgeText}>{moq}</Text>
            </View>
            <View style={styles.vendorRow}>
              <Icon name="verified-user" size={13} color={colors.secondary} />
              <Text style={styles.vendorName} numberOfLines={1}>{vendorName}</Text>
            </View>
          </View>
          <Pressable onPress={onOpen}>
            <Text style={styles.wLotTitle} numberOfLines={2}>{p.title}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.wLotThumb} onPress={onOpen}>
          {p.image ? (
            <Image source={{ uri: p.image }} style={styles.wLotThumbImage} resizeMode="cover" />
          ) : (
            <View style={styles.wLotThumbPlaceholder}>
              <Icon name="inventory" size={24} color={colors.outlineVariant} />
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.priceMatrix}>
        <View style={styles.priceMatrixCell}>
          <Text style={styles.priceMatrixLabel}>BULK TIER PRICE</Text>
          <Text style={styles.priceMatrixValue}>
            {formatUGX(p.priceValue)} <Text style={styles.priceMatrixUnit}>{p.unitLabel ?? '/ unit'}</Text>
          </Text>
        </View>
        <View style={styles.priceMatrixDivider} />
        <View style={styles.priceMatrixCell}>
          {savePct !== null ? (
            <>
              <Text style={styles.priceMatrixLabel}>RETAIL VALUE</Text>
              {p.originalPrice ? (
                <Text style={styles.priceMatrixStrike}>{p.originalPrice}</Text>
              ) : null}
              <Text style={styles.priceMatrixSave}>Save {savePct}% on MOQ</Text>
            </>
          ) : (
            <>
              <Text style={styles.priceMatrixLabel}>MIN ORDER</Text>
              <Text style={styles.priceMatrixNote}>{moq}</Text>
              <Text style={styles.priceMatrixSaveSecondary}>Depot dispatch available</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.stockRow}>
        <View style={styles.stockLine}>
          <Icon name="inventory" size={14} color={colors.primary} />
          <Text style={styles.stockLineText}>{stockLine}</Text>
        </View>
        <Text style={styles.dispatchText}>{dispatch}</Text>
      </View>

      <View style={styles.lotActions}>
        <Pressable style={styles.rfqBtn} onPress={onInquiry}>
          <Icon name="receipt-long" size={16} color={colors.primaryContainer} />
          <Text style={styles.rfqBtnText}>Request RFQ</Text>
        </Pressable>
        <Pressable style={styles.quickOrderBtn} onPress={onOrder}>
          <Icon name="bolt" size={16} color={colors.onSecondaryContainer} />
          <Text style={styles.quickOrderBtnText}>Quick Order</Text>
        </Pressable>
      </View>
    </View>
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
    paddingHorizontal: spacing.lg,
  },
  statusBannerText: {
    ...typography.labelMd,
    color: colors.white,
    fontWeight: '700',
  },
  content: {
    paddingBottom: 24,
  },
  hubBar: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hubBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  hubBarText: {
    ...typography.bodySm,
    color: colors.surfaceContainerLow,
  },
  hubBarStrong: {
    ...typography.labelMd,
    color: colors.secondaryFixedDim,
    fontWeight: '700',
  },
  hubBarChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hubBarChangeText: {
    ...typography.labelSm,
    color: colors.secondaryFixedDim,
    fontWeight: '700',
  },
  searchSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: 12,
  },
  searchBtn: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  searchBtnText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  searchAssurance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: spacing.sm,
  },
  searchAssuranceText: {
    ...typography.bodySm,
    color: colors.outline,
  },
  bulkRfqText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  heroSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  statsStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    ...typography.labelLg,
    fontWeight: '600',
  },
  statValuePrimary: {
    color: colors.primary,
    fontWeight: '800',
  },
  statValueSecondary: {
    color: colors.secondary,
    fontWeight: '800',
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
    fontSize: 9,
  },
  chipSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
    paddingVertical: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  chipText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.onSecondary,
    fontWeight: '700',
  },
  catSection: {
    paddingVertical: spacing.md + 2,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: 10,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionLinkText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  catRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  catCard: {
    width: 112,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  catIconImage: {
    width: '100%',
    height: '100%',
  },
  catName: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  catCount: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
    fontSize: 10,
  },
  lotsSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md + 2,
  },
  lotsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  lotsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentBar: {
    width: 10,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
  },
  escrowBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  escrowBadgeText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  lotList: {
    gap: spacing.md,
  },
  wLotCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.md - 4,
  },
  wLotTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  wLotHead: {
    flex: 1,
  },
  wLotBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  moqBadge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moqBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  vendorName: {
    ...typography.bodySm,
    color: colors.outline,
    flexShrink: 1,
  },
  wLotTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
    lineHeight: 19,
  },
  wLotThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  wLotThumbImage: {
    width: '100%',
    height: '100%',
  },
  wLotThumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceMatrix: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    padding: spacing.sm,
    marginTop: spacing.sm + 4,
  },
  priceMatrixCell: {
    flex: 1,
  },
  priceMatrixDivider: {
    width: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginHorizontal: spacing.sm,
  },
  priceMatrixLabel: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 10,
  },
  priceMatrixValue: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '800',
  },
  priceMatrixUnit: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '400',
    fontSize: 11,
  },
  priceMatrixStrike: {
    ...typography.bodySm,
    color: colors.outline,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  priceMatrixSave: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  priceMatrixNote: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  priceMatrixSaveSecondary: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '400',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md - 2,
  },
  stockLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  stockLineText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 11,
    flexShrink: 1,
  },
  dispatchText: {
    ...typography.bodySm,
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 11,
    marginLeft: spacing.sm,
  },
  lotActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md - 2,
  },
  rfqBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
  },
  rfqBtnText: {
    ...typography.labelMd,
    color: colors.primaryContainer,
    fontWeight: '700',
  },
  quickOrderBtn: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
  },
  quickOrderBtnText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  emptyRoster: {
    alignItems: 'center',
  },
  emptyRosterBtn: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyRosterTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  emptyRosterSub: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  tenderCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.md + 4,
    position: 'relative',
    overflow: 'hidden',
  },
  tenderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tenderBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tenderBadgeText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tenderTitle: {
    ...typography.headlineSm,
    color: colors.onPrimary,
    marginTop: spacing.sm,
  },
  tenderDesc: {
    ...typography.bodySm,
    color: colors.onPrimaryContainer,
    lineHeight: 20,
    marginTop: 2,
  },
  tenderCta: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tenderCtaText: {
    ...typography.labelLg,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  tenderCaption: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 10,
  },
  depotList: {
    gap: 10,
  },
  depotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md - 4,
  },
  depotIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depotBody: {
    flex: 1,
  },
  depotNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  depotName: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  depotAddress: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
    fontSize: 11,
  },
  depotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  depotMetaChip: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  depotMetaChipText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
    fontSize: 10,
  },
  depotTag: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 10,
  },
  depotStoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  depotStoreText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  productCardWrap: {
    marginBottom: spacing.sm,
  },
  flashRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
  },
  flashCard: {
    width: 260,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  flashImageWrap: {
    position: 'relative',
    height: 150,
    backgroundColor: colors.surfaceContainerHigh,
  },
  flashBody: {
    padding: spacing.lg,
  },
  flashCategory: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flashTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginTop: 2,
    fontSize: 16,
    lineHeight: 22,
  },
  flashPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  flashPrice: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 17,
  },
  flashAddBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  flashAddText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
  },
  seeAllCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  seeAllImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.sm,
  },
  rating: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  reviews: {
    ...typography.labelSm,
    color: colors.outline,
  },
  storeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondaryContainer,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  storeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(40,167,69,0.1)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  openDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.statusSuccess,
  },
  openText: {
    ...typography.labelSm,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  storeDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  tagText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  storeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  storeBtnText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  newsletter: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  newsletterTitle: {
    ...typography.displayLg,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  newsletterSubtitle: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  newsletterForm: {
    width: '100%',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  newsletterInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.bodyMd,
    color: colors.onPrimary,
  },
  subscribeBtn: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  subscribeBtnText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
});