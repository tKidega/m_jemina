import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppHeader, HeaderCartButton, HeaderSearchButton } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../components/SectionHeader';
import { Button } from '../components/Button';
import { ProductCard, Product } from '../components/ProductCard';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { apiGetVendors } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const FILTERS = ['All', 'Wholesale', 'Bulk Orders', 'Corporate', 'Enterprise'];

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
  const { itemCount } = useCart();
  const {
    flashSale,
    products,
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

  const isB2B = (p: { isWholesale?: boolean; bulkOrder?: boolean; corporateReady?: boolean; enterpriseSolution?: boolean; badge?: { variant?: string } }) =>
    Boolean(p.isWholesale) || Boolean(p.bulkOrder) || Boolean(p.corporateReady) || Boolean(p.enterpriseSolution) ||
    p.badge?.variant === 'wholesale' ||
    p.badge?.variant === 'corporate';

  const b2bProducts = products.filter(isB2B);

  const b2bFlash = (flashSale.length > 0 ? flashSale : products.slice(0, 4)).filter(isB2B);
  const flashDeals = (b2bFlash.length > 0 ? b2bFlash : b2bProducts.slice(0, 4)).slice(0, 4);

  const b2bSections = [
    { icon: 'storefront' as const, title: 'Wholesale', subtitle: 'Buy in bulk at wholesale prices.', list: wholesale.length > 0 ? wholesale : b2bProducts.filter(p => p.isWholesale || p.badge?.variant === 'wholesale') },
    { icon: 'inventory' as const, title: 'Bulk Orders', subtitle: 'Large-volume bulk purchasing for businesses.', list: bulkOrder.length > 0 ? bulkOrder : b2bProducts.filter(p => p.bulkOrder) },
    { icon: 'business-center' as const, title: 'Corporate', subtitle: 'Corporate-ready products and solutions.', list: corporateReady.length > 0 ? corporateReady : b2bProducts.filter(p => p.corporateReady || p.badge?.variant === 'corporate') },
    { icon: 'handshake' as const, title: 'Enterprise', subtitle: 'Enterprise-scale solutions for large teams.', list: enterpriseSolutions.length > 0 ? enterpriseSolutions : b2bProducts.filter(p => p.enterpriseSolution) },
  ].filter(section => {
    if (activeFilter === 0) return true;
    const filterMap: Record<string, string[]> = {
      'Wholesale': ['Wholesale'],
      'Bulk Orders': ['Bulk Orders'],
      'Corporate': ['Corporate'],
      'Enterprise': ['Enterprise'],
    };
    const allowed = filterMap[FILTERS[activeFilter]] ?? [];
    return allowed.includes(section.title);
  });

  const openInquiry = (product: Product) => navigate('ProductInquiry', { product });

  return (
    <View style={styles.root}>
      <AppHeader
        right={
          <>
            <HeaderSearchButton onPress={() => navigate('Search')} />
            <HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />
          </>
        }
      />
      {error ? (
        <Pressable style={styles.statusBanner} onPress={refresh}>
          <Icon name="sync" size={16} color={colors.white} />
          <Text style={styles.statusBannerText}>Offline â€” showing saved catalog. Tap to retry.</Text>
        </Pressable>
      ) : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
        }
      >
        {/* B2B hero */}
        <View style={styles.hero}>
          <View style={styles.heroPill}>
            <Icon name="business-center" size={14} color={colors.onSecondary} />
            <Text style={styles.heroPillText}>B2B Marketplace</Text>
          </View>
          <Text style={styles.heroTitle}>Procurement & Wholesale</Text>
          <Text style={styles.heroText}>
            Sourcing for your business? Browse wholesale, bulk and corporate-ready products and send an
            inquiry to the vendor directly.
          </Text>
        </View>

        {/* Search & filters */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={20} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by product name, brand, or category..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
          </View>
          <Button label="Search Products" variant="primary" icon="tune" onPress={runSearch} style={styles.searchBtn} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f, i) => (
            <Pressable
              key={f}
              style={[styles.chip, i === activeFilter && styles.chipActive]}
              onPress={() => setActiveFilter(i)}
            >
              <Text style={[styles.chipText, i === activeFilter && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>

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

        {/* B2B Assistance */}
        <View style={styles.section}>
          <Pressable style={styles.supportCard} onPress={() => navigate('VendorProfile')}>
            <Icon name="support-agent" size={44} color={colors.onSecondary} />
            <Text style={styles.supportTitle}>Need B2B Assistance?</Text>
            <Text style={styles.supportDesc}>
              Our dedicated corporate support team is ready to assist with procurement and tax-exempt orders.
            </Text>
            <View style={styles.supportBtn}>
              <Text style={styles.supportBtnText}>Contact Expert</Text>
            </View>
          </Pressable>
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
            <Pressable style={styles.seeAllCard} onPress={() => {}}>
              <Icon name="fast-forward" size={44} color={colors.outline} />
            </Pressable>
          </ScrollView>
        </View>

        {/* Featured stores */}
        <View style={styles.section}>
          <SectionHeader icon="verified" title="Featured Stores" subtitle="Top rated vendors and brands." />
          {stores.map(s => (
            <Pressable key={s.id} style={styles.storeCard} onPress={() => navigate('VendorProfile', { vendorId: s.vendorId, vendorName: s.name })}>
              <View style={[styles.storeHeader]}>
                <View style={styles.storeIconWrap}>
                  <Icon name={s.icon} size={30} color={s.accent} />
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{s.name}</Text>
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={14} color={colors.secondary} />
                    <Text style={styles.rating}>{s.rating}</Text>
                    <Text style={styles.reviews}>Rating â€¢ {s.products} Products</Text>
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
              <Pressable style={[styles.storeBtn, { backgroundColor: s.accent }]}>
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
            <Button label="Subscribe" variant="primary" onPress={() => {}} style={styles.subscribeBtn} />
          </View>
        </View>
      </ScrollView>
      <BottomNav />
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
    backgroundColor: colors.primary,
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
  heroImage: {
    width: '100%',
    aspectRatio: 500 / 325,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  hero: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  heroPillText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...typography.headlineLg,
    color: colors.onSecondary,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  heroText: {
    ...typography.bodyMd,
    color: colors.onSecondary,
    opacity: 0.92,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  productCardWrap: {
    marginBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: 'column',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: spacing.sm,
  },
  searchBtn: {
    paddingVertical: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipActive: {
    backgroundColor: colors.secondaryContainer,
  },
  chipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: colors.onSecondary,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  b2bGrid: {
    gap: spacing.lg,
  },
  b2bMain: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  b2bImageWrap: {
    position: 'relative',
    height: 200,
  },
  b2bImage: {
    width: '100%',
    height: '100%',
  },
  b2bBadges: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  b2bBody: {
    padding: spacing.lg,
  },
  b2bTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  b2bTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    flex: 1,
  },
  b2bPrice: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  b2bDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  b2bMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  b2bMetaItem: {
    ...typography.labelMd,
    color: colors.outline,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  outlineBtnText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  b2bSide: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  b2bMiniCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  b2bMiniImage: {
    width: '100%',
    height: 90,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  b2bMiniImageWrap: {
    position: 'relative',
  },
  miniAddBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  miniAddText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
  },
  b2bMiniCat: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  b2bMiniTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginTop: 2,
    fontSize: 16,
    lineHeight: 22,
  },
  b2bMiniPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  b2bMiniPrice: {
    ...typography.headlineMd,
    color: colors.statusFlash,
    fontWeight: '700',
    fontSize: 17,
  },
  offBadge: {
    ...typography.labelSm,
    color: colors.statusFlash,
    backgroundColor: 'rgba(220,53,69,0.1)',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontWeight: '700',
  },
  b2bMiniOrder: {
    ...typography.labelSm,
    color: colors.outline,
    fontStyle: 'italic',
    marginTop: 4,
  },
  supportCard: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  supportTitle: {
    ...typography.headlineLg,
    color: colors.onSecondary,
    marginTop: spacing.md,
  },
  supportDesc: {
    ...typography.bodyMd,
    color: colors.onSecondary,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  supportBtn: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
  },
  supportBtnText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  flashRow: {
    gap: spacing.lg,
    paddingRight: spacing.lg,
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
  flashImage: {
    width: '100%',
    height: '100%',
  },
  flashDiscount: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
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
  flashOriginal: {
    ...typography.labelSm,
    color: colors.outline,
    textDecorationLine: 'line-through',
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
    width: 100,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primary,
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
    paddingVertical: spacing.md,
  },
});
