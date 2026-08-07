import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { images } from '../data/images';
import { FLASH_SALE_PRODUCTS, FEATURED_PRODUCTS, TOP_RATED_PRODUCTS } from '../data/products';
import type { Product } from '../components/ProductCard';
import type { IconName } from '../components/Icon';

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-1',
    image: images.heroBanner,
    title: 'Welcome to JEMINA Marketplace',
    subtitle: 'Products relevant to current season and holidays. Corporate-ready solutions for your business.',
  },
  {
    id: 'hero-2',
    image: images.heroBanner,
    title: 'Corporate-Ready Solutions',
    subtitle: 'Sourcing and supply tailored to your business needs.',
  },
  {
    id: 'hero-3',
    image: images.heroBanner,
    title: 'Local Heroes',
    subtitle: 'Discover locally manufactured products from trusted Ugandan sellers.',
  },
  {
    id: 'hero-4',
    image: images.heroBanner,
    title: 'Bulk & Wholesale Deals',
    subtitle: 'Competitive pricing for retailers and bulk buyers.',
  },
  {
    id: 'hero-5',
    image: images.heroBanner,
    title: 'Seasonal Offers',
    subtitle: 'Limited-time deals curated for the current season.',
  },
];

const TRUST_INDICATORS = [
  { icon: 'local-shipping' as const, title: 'Shipping', subtitle: 'Flexible Transport' },
  { icon: 'verified-user' as const, title: 'Secure', subtitle: '100% Protected' },
  { icon: 'support-agent' as const, title: '24/7 Care', subtitle: 'Dedicated Help' },
  { icon: 'replay' as const, title: 'Easy Returns', subtitle: '30-Day Money Back' },
];

const CATEGORIES = [
  { icon: 'computer' as const, label: 'IT & Tech' },
  { icon: 'checkroom' as const, label: 'Fashion' },
  { icon: 'construction' as const, label: 'Construction' },
  { icon: 'agriculture' as const, label: 'Agric' },
  { icon: 'business-center' as const, label: 'B2B' },
];

const FALLBACK_FEATURED: Product | undefined = FEATURED_PRODUCTS[0];
const FALLBACK_FLASH: Product[] = FLASH_SALE_PRODUCTS.slice(0, 4);

export function HomeScreen() {
  const { navigate, switchTab } = useNavigation();
  const { addItem, itemCount } = useCart();
  const { flashSale: flashSaleProducts, featured: featuredProducts, topRated: topRatedProducts, seasonal: seasonalProducts, products, loading, error, refresh } = useCatalog();
  const { width } = useWindowDimensions();

  const featuredProduct = featuredProducts[0] ?? FALLBACK_FEATURED;
  const smallProducts = (flashSaleProducts.length > 0 ? flashSaleProducts : FALLBACK_FLASH).slice(0, 8);
  const topRated = topRatedProducts.length > 0 ? topRatedProducts : TOP_RATED_PRODUCTS;

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

  const productCardWidth = Math.round((width - spacing.lg * 2 - spacing.gutter) / 2.2);
  const flashCardWidth = Math.round((width - spacing.lg * 2 - spacing.gutter) / 2);

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
          <Text style={styles.statusBannerText}>Offline — showing saved catalog. Tap to retry.</Text>
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
      >
        {/* Hero carousel */}
        <HeroCarousel slides={HERO_SLIDES} />

        {/* Trust indicators */}
        <View style={styles.trustCard}>
          {TRUST_INDICATORS.map((t, i) => (
            <View key={t.title} style={[styles.trustItem, (i === 0 || i === 2) && styles.trustBorderRight, i < 2 && styles.trustBorderBottom]}>
              <Icon name={t.icon} size={22} color={colors.secondary} />
              <Text style={styles.trustTitle}>{t.title}</Text>
              <Text style={styles.trustSubtitle}>{t.subtitle}</Text>
            </View>
          ))}
        </View>

        {/* Browse collections */}
        <View style={styles.section}>
          <SectionHeader title="Browse Collections" actionLabel="View All" onAction={() => navigate('Marketplace')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORIES.map(c => (
              <Pressable key={c.label} style={styles.categoryItem}>
                <View style={styles.categoryCircle}>
                  <Icon name={c.icon} size={26} color={colors.secondary} />
                </View>
                <Text style={styles.categoryLabel}>{c.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Search */}
        <View style={styles.section}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products, brands..."
              placeholderTextColor={colors.onSurfaceVariant}
            />
            <Pressable style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
          </View>
        </View>

        {/* Smart picks */}
        <View style={styles.section}>
          <SectionHeader
            icon="auto-awesome"
            title="Smart Picks"
            trailing={<Badge label="4 DEALS" variant="flash" style={styles.dealsBadge} />}
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
            onAction={() => navigate('Marketplace')}
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
            onAction={() => navigate('Marketplace')}
            trailing={<Badge label={`${seasonalProducts.length} OFFERS`} variant="flash" style={styles.dealsBadge} />}
          />
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
            {seasonalProducts.length === 0 ? (
              <Pressable style={[styles.flashEmptyCard, { width: flashCardWidth }]} onPress={refresh}>
                <Icon name="auto-awesome" size={40} color={colors.secondary} />
                <Text style={styles.flashEmptyTitle}>No seasonal offers right now</Text>
                <Text style={styles.flashEmptySub}>Tap to refresh the live catalog.</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>

        {/* Flash & Deals */}
        <View style={styles.section}>
          <SectionHeader
            icon="bolt"
            iconColor={colors.statusFlash}
            title="Flash & Deals"
            subtitle="Limited time offers, act fast!"
            actionLabel="View All"
            onAction={() => navigate('Marketplace')}
            trailing={<Badge label={`${flashSaleProducts.length} DEALS`} variant="flash" style={styles.dealsBadge} />}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashRow}>
            {flashSaleProducts.slice(0, 8).map(p => (
              <Pressable key={p.id} style={[styles.flashCard, { width: flashCardWidth }]} onPress={() => navigate('ProductDetails', { product: p })}>
                <View style={styles.flashImageWrap}>
                  <Image source={{ uri: p.image }} style={styles.flashImage} resizeMode="cover" />
                  <View style={styles.flashBadge}>
                    <Badge label={p.discount ?? 'SALE'} variant="flash" />
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
            {flashSaleProducts.length === 0 ? (
              <Pressable style={[styles.flashEmptyCard, { width: flashCardWidth }]} onPress={refresh}>
                <Icon name="bolt" size={40} color={colors.statusFlash} />
                <Text style={styles.flashEmptyTitle}>No flash deals right now</Text>
                <Text style={styles.flashEmptySub}>Tap to refresh the live catalog.</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>

        {/* Additional product sections (mirrors website homepage) */}
        {extraSections.map(section => (
          <View key={section.title} style={styles.section}>
            <SectionHeader
              icon={section.icon}
              title={section.title}
              subtitle={section.subtitle}
              actionLabel="View All"
              onAction={() => navigate('Marketplace')}
            />
            <ProductCarousel
              products={section.list}
              cardWidth={productCardWidth}
              imageHeight={150}
              showDots={false}
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
    marginTop: -28,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    padding: spacing.sm,
    zIndex: 3,
  },
  trustItem: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
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
    marginTop: 4,
  },
  trustSubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  categoryRow: {
    gap: spacing.lg,
    paddingRight: spacing.lg,
    paddingBottom: spacing.sm,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    textAlign: 'center',
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
    color: colors.onSurface,
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
    width: 250,
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
    width: 250,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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
});
