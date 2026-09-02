import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { AppHeader, HeaderCartButton, HeaderNotificationButton } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Badge } from '../components/Badge';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../components/SectionHeader';
import { ProductCard } from '../components/ProductCard';
import { HeroCarousel, type HeroSlide } from '../components/HeroCarousel';
import { ProductCarousel } from '../components/ProductCarousel';
import { CategoryCarousel } from '../components/CategoryCarousel';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { images } from '../data/images';
import { apiGetVendors, ApiVendorSummary } from '../data/api';
import type { Product } from '../components/ProductCard';
import type { IconName } from '../components/Icon';

const HERO_SLIDES: HeroSlide[] = images.heroBanners.map((image, i) => ({
  id: `hero-${i + 1}`,
  image,
}));

const TRUST_INDICATORS = [
  { icon: 'local-shipping' as const, title: 'Shipping', subtitle: 'Flexible Transport' },
  { icon: 'verified-user' as const, title: 'Secure', subtitle: '100% Protected' },
  { icon: 'support-agent' as const, title: '24/7 Care', subtitle: 'Dedicated Help' },
  { icon: 'replay' as const, title: 'Easy Returns', subtitle: '30-Day Money Back' },
];

const CATEGORIES: { key: string; label: string; icon: IconName; match: RegExp }[] = [
  { key: 'it-tech', label: 'IT & Tech', icon: 'computer', match: /it|technology|mobile|phone|tablet|computer|laptop|tech|electronics|electrical|audio|headset|camera/i },
  { key: 'fashion', label: 'Fashion', icon: 'checkroom', match: /fashion|design|clothing|footwear|shoes/i },
  { key: 'construction', label: 'Construction', icon: 'construction', match: /construction|engineering|building|tool|hardware/i },
  { key: 'agric', label: 'Agric', icon: 'agriculture', match: /agric|produce|farm|seed|fertilizer/i },
  { key: 'home-living', label: 'Home & Living', icon: 'home', match: /home|living|kitchen|furniture|furnishing|interior|decor|bedroom|living room/i },
  { key: 'food', label: 'Food & Edibles', icon: 'restaurant', match: /food|edibles|cooking|ingredient|beverage|drink|snack|oil|honey/i },
  { key: 'service', label: 'Service Delivery', icon: 'handshake', match: /service|delivery|professional|beauty|wellness|consult/i },
  { key: 'art', label: 'Art & Culture', icon: 'palette', match: /art|culture|craft|handmade|music|painting|book/i },
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
  {
    id: 'fashion',
    vendorId: 2,
    name: 'Fashion Hub Gulu',
    rating: 4.2,
    products: 512,
    icon: 'shopping-bag',
    accent: colors.primary,
    description: 'Trending fashion, footwear and accessories for the whole family.',
    location: 'Gulu, Uganda',
  },
];

export function HomeScreen() {
  const { navigate, switchTab } = useNavigation();
  const { addItem, itemCount } = useCart();
  const { flashSale: flashSaleProducts, featured: featuredProducts, topRated: topRatedProducts, seasonal: seasonalProducts, products, loading, error, refresh } = useCatalog();
  const { width } = useWindowDimensions();
  const [liveVendors, setLiveVendors] = useState<StoreData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
          accent: i % 2 === 0 ? colors.secondary : colors.primary,
          description: v.description || `${v.name || 'Vendor'} - ${v.location || 'Uganda'}`,
          location: v.location || 'Uganda',
          logo: v.logo ?? undefined,
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
          accent: i % 2 === 0 ? colors.secondary : colors.primary,
          description: v.description || `${v.name || 'Vendor'} - ${v.location || 'Uganda'}`,
          location: v.location || 'Uganda',
          logo: v.logo ?? undefined,
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
      await Promise.all([refresh(), loadVendors()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, loadVendors]);

  const stores = liveVendors.length > 0 ? liveVendors : DEFAULT_STORES;

  const featuredProduct = featuredProducts[0];
  const smallProducts = flashSaleProducts.slice(0, 8);
  const topRated = topRatedProducts;

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
    const b2b = (list: Product[]) => list.filter(p => p.isWholesale || p.bulkOrder || p.corporateReady || p.enterpriseSolution);
    return [
      toCarousel('memory', 'Electronics', 'The latest gadgets and devices', matchesCategory(/mobile|phone|tablet|computer|laptop|tech|audio|electrical/i)),
      toCarousel('checkroom', "Fashion & Apparel", 'The latest trends for the whole family', matchesCategory(/fashion|clothing|women|men|kids|footwear/i)),
      toCarousel('storefront', 'Local Heroes', 'Locally manufactured Ugandan products', matchesCategory(/local|uganda|handmade|craft|agric/i)),
      toCarousel('lightbulb', 'Home & Living', 'Everything you need for your space', matchesCategory(/home|living|kitchen|furniture|office/i)),
      toCarousel('star', 'Best Picks', 'Handpicked favorites by our customers', [...products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8)),
      toCarousel('business-center', 'Corporate & Wholesale', 'B2B solutions and bulk-sale products', b2b(products)),
      toCarousel('sell', 'Under 50K', 'Great products at affordable prices', byPrice(50000)),
    ].filter((s): s is { icon: IconName; title: string; subtitle: string; list: Product[] } => s !== null);
  }, [products]);

  const flashCardWidth = Math.round((width - spacing.lg * 2 - spacing.gutter) / 2);
  const productCardWidth = flashCardWidth;

  return (
    <View style={styles.root}>
      <AppHeader
        right={
          <>
            <HeaderNotificationButton hasBadge onPress={() => {}} />
            <HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />
          </>
        }
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
        {/* Search */}
        <View style={styles.searchSection}>
          <Pressable style={styles.searchBar} onPress={() => navigate('Search')}>
            <Icon name="search" size={20} color={colors.outline} />
            <Text style={styles.searchInput}>Search products by name...</Text>
            <View style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Search</Text>
            </View>
          </Pressable>
        </View>

        {/* Hero carousel */}
        <HeroCarousel slides={HERO_SLIDES} />

        {/* Browse collections */}
        <View style={styles.section}>
          <SectionHeader title="Browse Collections" subtitle="Shop the latest from every primary category." />
          <CategoryCarousel
            categories={CATEGORIES.map(c => ({ key: c.key, label: c.label, icon: c.icon }))}
            onPress={cat => {
              const def = CATEGORIES.find(c => c.key === cat.key);
              const list = def ? products.filter(p => def.match.test(p.category)) : products;
              navigate('AllProducts', { title: def?.label ?? cat.label, products: list });
            }}
          />
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
                    <Icon name={brand.icon} size={24} color={colors.secondary} />
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
              <View style={styles.featuredImageWrap}>
                <Image source={{ uri: featuredProduct.image }} style={styles.featuredImage} resizeMode="cover" />
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
        </View>

        {/* Seasonal & Promotional */}
        <View style={styles.section}>
          <SectionHeader
            icon="auto-awesome"
            iconColor={colors.secondary}
            title="Seasonal & Promotional"
            subtitle="Products relevant to the current season and holidays."
            actionLabel="View All"
            onAction={() => navigate('AllProducts', { title: 'Seasonal & Promotional', subtitle: 'Products relevant to the current season and holidays.', products: seasonalProducts })}
            trailing={<Badge label={`${seasonalProducts.length} OFFERS`} variant="flash" style={styles.dealsBadge} />}
          />
          {seasonalProducts.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
            {seasonalProducts.slice(0, 8).map(p => (
              <Pressable key={p.id} style={[styles.flashCard, { width: flashCardWidth }]} onPress={() => navigate('ProductDetails', { product: p })}>
                <View style={styles.flashImageWrap}>
                  <Image source={{ uri: p.image }} style={styles.flashImage} resizeMode="cover" />
                  <View style={styles.flashBadge}>
                    <Badge label={p.holidaySpecial ? 'HOLIDAY' : p.seasonal ? 'SEASONAL' : p.discount ? 'SALE' : 'PROMO'} variant="flash" />
                  </View>
                </View>
                <View style={styles.flashBody}>
                  <Text style={styles.flashCategory}>{p.category}</Text>
                  <Text style={styles.flashTitle} numberOfLines={1}>{p.title}</Text>
                  <View style={styles.flashPriceRow}>
                    <Text style={styles.flashPrice}>{p.price}</Text>
                    {p.originalPrice ? <Text style={styles.flashOriginalPrice}>{p.originalPrice}</Text> : null}
                  </View>
                  <Pressable style={styles.flashAddBtn} onPress={() => addItem(p)}>
                    <Text style={styles.flashAddText}>Add to Cart</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          ) : (
            <View style={styles.emptyCentered}>
              <Pressable style={styles.flashEmptyCard} onPress={refresh}>
                <Icon name="auto-awesome" size={40} color={colors.secondary} />
                <Text style={styles.flashEmptyTitle}>No seasonal offers right now</Text>
                <Text style={styles.flashEmptySub}>Tap to refresh the live catalog.</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Featured Stores */}
        <View style={styles.section}>
          <SectionHeader
            icon="storefront"
            title="Featured Stores"
            subtitle="Top rated vendors and brands."
            actionLabel="View All"
            onAction={() => switchTab('Marketplace')}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRow}>
            {stores.map(s => (
              <Pressable
                key={s.id}
                style={styles.storeCard}
                onPress={() => navigate('VendorProfile', { vendorId: s.vendorId, vendorName: s.name })}
              >
                <View style={styles.storeLogoWrap}>
                  {s.logo ? (
                    <Image source={{ uri: s.logo }} style={styles.storeLogo} resizeMode="cover" />
                  ) : (
                    <Icon name={s.icon} size={28} color={s.accent} />
                  )}
                </View>
                <View style={styles.storeBody}>
                  <Text style={styles.storeName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.storeLocation} numberOfLines={1}>{s.location}</Text>
                  <View style={styles.storeMeta}>
                    <Icon name="star" size={13} color={colors.secondary} />
                    <Text style={styles.storeRating}>{s.rating > 0 ? s.rating.toFixed(1) : '—'}</Text>
                    <Text style={styles.storeDot}>·</Text>
                    <Text style={styles.storeProducts}>{s.products} products</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Trust indicators */}
        <View style={styles.trustCard}>
          {TRUST_INDICATORS.map((t, i) => (
            <View key={t.title} style={[styles.trustItem, (i === 0 || i === 2) && styles.trustBorderRight, i < 2 && styles.trustBorderBottom]}>
              <View style={styles.trustIcon}>
                <Icon name={t.icon} size={20} color={colors.secondary} />
              </View>
              <Text style={styles.trustTitle}>{t.title}</Text>
              <Text style={styles.trustSubtitle}>{t.subtitle}</Text>
            </View>
          ))}
        </View>

        {/* Flash & Deals */}
        <View style={styles.section}>
          <SectionHeader
            icon="bolt"
            iconColor={colors.statusFlash}
            title="Flash & Deals"
            subtitle="Limited time offers, act fast!"
            actionLabel="View All"
            onAction={() => navigate('AllProducts', { title: 'Flash & Deals', subtitle: 'Limited time offers, act fast!', products: flashSaleProducts })}
            trailing={<Badge label={`${flashSaleProducts.length} DEALS`} variant="flash" style={styles.dealsBadge} />}
          />
          <ProductCarousel
            products={flashSaleProducts}
            cardWidth={flashCardWidth}
            imageHeight={140}
            showDots={false}
            autoPlay
            loop
            autoPlayInterval={10000}
            onPress={p => navigate('ProductDetails', { product: p })}
            onAddToCart={p => addItem(p)}
            renderItem={product => (
              <View style={styles.flashCard}>
                <View style={styles.flashImageWrap}>
                  <Image source={{ uri: product.image }} style={styles.flashImage} resizeMode="cover" />
                  <View style={styles.flashBadge}>
                    <Badge label={product.discount ?? 'SALE'} variant="flash" />
                  </View>
                </View>
                <View style={styles.flashBody}>
                  <Text style={styles.flashCategory}>{product.category}</Text>
                  <Text style={styles.flashTitle} numberOfLines={1}>{product.title}</Text>
                  <View style={styles.flashPriceRow}>
                    <Text style={styles.flashPrice}>{product.price}</Text>
                    {product.originalPrice ? <Text style={styles.flashOriginalPrice}>{product.originalPrice}</Text> : null}
                  </View>
                  <Pressable style={styles.flashAddBtn} onPress={() => addItem(product)}>
                    <Text style={styles.flashAddText}>Add to Cart</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
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
  scrollContent: {
    paddingBottom: 24,
  },
  pressed: {
    opacity: 0.85,
  },
  trustCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm,
  },
  trustItem: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  trustIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  trustBorderRight: {
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  trustBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  trustTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  trustSubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    paddingVertical: spacing.sm,
  },
  searchBtn: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  searchBtnText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  dealsBadge: {
    marginLeft: spacing.sm,
  },
  featuredCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  featuredImageWrap: {
    position: 'relative',
    height: 180,
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
    padding: spacing.lg,
  },
  featuredCategory: {
    ...typography.labelMd,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  featuredTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  featuredBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  featuredPrice: {
    ...typography.headlineMd,
    color: colors.statusFlash,
    fontWeight: '700',
  },
  featuredMinOrder: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  cartIconBtn: {
    backgroundColor: colors.primary,
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
    paddingRight: spacing.lg,
    paddingBottom: spacing.sm,
  },
  flashCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  flashImageWrap: {
    position: 'relative',
    height: 140,
    backgroundColor: colors.surfaceContainerHigh,
  },
  flashImage: {
    width: '100%',
    height: '100%',
  },
  flashBadge: {
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
    color: colors.statusFlash,
    fontWeight: '700',
    fontSize: 17,
  },
  flashOriginalPrice: {
    ...typography.labelSm,
    color: colors.outline,
    textDecorationLine: 'line-through',
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
  flashEmptyCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyCentered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashEmptyTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  flashEmptySub: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  brandRow: {
    gap: spacing.gutter,
    paddingRight: spacing.lg,
    paddingBottom: spacing.sm,
  },
  brandTile: {
    width: 108,
    flexShrink: 0,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  brandCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondaryContainer,
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
  storeCard: {
    width: 220,
    flexShrink: 0,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  storeLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storeLogo: {
    width: '100%',
    height: '100%',
  },
  storeBody: {
    flex: 1,
  },
  storeName: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 15,
  },
  storeLocation: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  storeRating: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  storeDot: {
    ...typography.labelSm,
    color: colors.outline,
  },
  storeProducts: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
