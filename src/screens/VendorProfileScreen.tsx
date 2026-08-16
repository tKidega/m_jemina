import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader, HeaderCartButton } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { ChatView } from '../components/ChatView';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import {
  apiGetVendor,
  apiProductToProduct,
  apiVendorChatAsk,
  apiVendorChatNotify,
  makeConversationId,
  ApiVendorDetail,
} from '../data/api';
import { ProductCard, type Product } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { images } from '../data/images';

const STATS = [
  { label: 'Products', value: '247', trend: '+12%' },
  { label: 'Response Time', value: '< 1hr', sub: 'Highly Responsive' },
  { label: 'Service Area', value: 'Gulu, UG', sub: 'National Shipping' },
  { label: 'Hours', value: 'Mon - Sat', sub: '8:00 AM - 6:00 PM' },
];

const SERVICES = [
  { label: 'Retail', icon: 'shopping-bag' as const, bg: colors.primary, fg: colors.white },
  { label: 'Wholesale', icon: 'business-center' as const, bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
  { label: 'Online Sales', icon: 'public' as const, bg: colors.secondaryContainer, fg: colors.onSecondary },
];

export function VendorProfileScreen() {
  const { goBack, navigate, switchTab, params } = useNavigation();
  const { addItem, itemCount } = useCart();
  const { products: catalogProducts, error, refresh } = useCatalog();
  const { token, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [vendor, setVendor] = useState<ApiVendorDetail | null>(null);
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [conversationId] = useState(() => makeConversationId());

  const vendorId = params?.vendorId != null ? Number(params.vendorId) : undefined;
  const vendorNameParam = params?.vendorName as string | undefined;

  useEffect(() => {
    if (vendorId == null) {
      setVendor(null);
      setVendorProducts([]);
      setVendorLoading(false);
      return;
    }
    let cancelled = false;
    setVendorLoading(true);
    setVendorError(null);
    apiGetVendor(vendorId)
      .then(data => {
        if (cancelled) {
          return;
        }
        setVendor(data.vendor);
        setVendorProducts(data.products.map(apiProductToProduct));
      })
      .catch(e => {
        if (!cancelled) {
          setVendorError(e instanceof Error ? e.message : 'Could not load this vendor.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setVendorLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  const displayName = vendor?.name ?? vendorNameParam ?? 'Jemina Official';
  const displayRating = vendor?.rating ?? 4.8;
  const reviewCount = vendor?.review_count ?? 98;
  const tagline =
    vendor?.description ?? (vendorNameParam ? `${displayName} on JEMINA Marketplace.` : undefined);

  const PRODUCTS =
    vendorProducts.length > 0
      ? vendorProducts.map(p => ({
          ...p,
          original: p.originalPrice,
          unit: p.unitLabel,
          extraBadge: p.badge?.variant === 'flash' ? { label: 'Flash Sale', variant: 'flash' as const } : undefined,
          inquiry: p.actionVariant === 'inquiry',
        }))
      : catalogProducts.map(p => ({
          ...p,
          original: p.originalPrice,
          unit: p.unitLabel,
          extraBadge: p.badge?.variant === 'flash' ? { label: 'Flash Sale', variant: 'flash' as const } : undefined,
          inquiry: p.actionVariant === 'inquiry',
        }));

  return (
    <View style={styles.root}>
      <AppHeader
        showBack
        onBack={goBack}
        right={<HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />}
      />
      {error ? (
        <Pressable style={styles.statusBanner} onPress={refresh}>
          <Icon name="sync" size={16} color={colors.white} />
          <Text style={styles.statusBannerText}>Offline â€” showing saved catalog. Tap to retry.</Text>
        </Pressable>
      ) : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <View style={styles.coverWrap}>
          <Image source={{ uri: images.vendorCover }} style={styles.coverImage} resizeMode="cover" />
          <View style={styles.coverOverlay} />
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: images.vendorLogo }} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.profileMain}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{displayName}</Text>
              <View style={styles.verifiedChip}>
                <Icon name="verified" size={14} color={colors.secondary} />
                <Text style={styles.verifiedText}>Verified Vendor</Text>
              </View>
            </View>
            <Text style={styles.tagline}>
              {tagline ??
                'Test vendor Two. All products listed are for testing purposes only. Uganda\'s premier marketplace connection.'}
            </Text>
          </View>
          <View style={styles.profileSide}>
            <View style={styles.ratingCard}>
              <Text style={styles.ratingBig}>{displayRating.toFixed(1)}</Text>
              <Icon name="star" size={18} color={colors.secondary} />
              <Text style={styles.ratingCount}>{reviewCount} Reviews</Text>
            </View>
            <View style={styles.profileActions}>
              <Button label="Visit Store" variant="primary" onPress={() => {}} style={styles.visitBtn} />
              <Button
                label={isAuthenticated && token ? 'Chat with Shop' : 'Sign in to Chat'}
                variant="secondary"
                icon="chat"
                onPress={() => {
                  if (!isAuthenticated || !token) {
                    navigate('Login');
                    return;
                  }
                  setChatOpen(true);
                }}
                style={styles.visitBtn}
              />
            </View>
          </View>
        </View>

        {vendorLoading ? (
          <View style={styles.loadingRow}>
            <Icon name="sync" size={28} color={colors.onSurfaceVariant} />
            <Text style={styles.loadingText}>Loading store...</Text>
          </View>
        ) : null}
        {vendorError ? (
          <View style={styles.vendorErrorBox}>
            <Text style={styles.vendorErrorText}>{vendorError}</Text>
          </View>
        ) : null}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {STATS.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              {s.trend ? (
                <View style={styles.trendRow}>
                  <Icon name="trending-up" size={13} color={colors.statusSuccess} />
                  <Text style={styles.trendText}>{s.trend}</Text>
                </View>
              ) : (
                <Text style={styles.statSub}>{s.sub}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          <View style={styles.servicesRow}>
            {SERVICES.map(s => (
              <View key={s.label} style={[styles.serviceChip, { backgroundColor: s.bg }]}>
                <Icon name={s.icon} size={16} color={s.fg} />
                <Text style={[styles.serviceText, { color: s.fg }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {[`All Products`, `Reviews (${reviewCount})`].map((t, i) => (
            <Pressable key={t} style={styles.tab} onPress={() => setActiveTab(i)}>
              <Text style={[styles.tabText, i === activeTab && styles.tabTextActive]}>{t}</Text>
              <View style={[styles.tabIndicator, i === activeTab && styles.tabIndicatorActive]} />
            </Pressable>
          ))}
        </View>

        {/* Search & filter */}
        <View style={styles.shopTools}>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={colors.onSurfaceVariant} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search in this store..."
              placeholderTextColor={colors.onSurfaceVariant}
            />
          </View>
          <Pressable style={styles.filterBtn}>
            <Icon name="filter-list" size={18} color={colors.primary} />
            <Text style={styles.filterText}>Filters</Text>
          </Pressable>
        </View>

        {/* Product grid */}
        {activeTab === 0 ? (
          <View style={styles.productGrid}>
            {PRODUCTS.map(p => (
              <View key={p.id} style={styles.productCardWrap}>
                <ProductCard
                  product={p}
                  compact
                  imageHeight={120}
                  actionVariant={p.inquiry ? 'inquiry' : 'addToCart'}
                  onPress={() => navigate('ProductDetails', { product: p })}
                  onInquiry={() => navigate('ProductInquiry', { product: p })}
                  onAddToCart={() => addItem(p)}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.reviewsEmpty}>
            <Icon name="star" size={36} color={colors.outlineVariant} />
            <Text style={styles.reviewsEmptyText}>No written reviews yet</Text>
            <Text style={styles.reviewsEmptySub}>Be the first to review this store's products.</Text>
          </View>
        )}

        {/* Loading state */}
        <View style={styles.loadingRow}>
          <Icon name="sync" size={28} color={colors.onSurfaceVariant} />
          <Text style={styles.loadingText}>Loading more products...</Text>
        </View>

        {/* Newsletter */}
        <View style={styles.newsletter}>
          <Text style={styles.newsletterTitle}>Subscribe to Our Newsletter</Text>
          <Text style={styles.newsletterSubtitle}>
            Get deals, promotions, and new arrivals straight to your inbox.
          </Text>
          <View style={styles.newsletterForm}>
            <TextInput
              style={styles.newsletterInput}
              placeholder="Enter your email"
              placeholderTextColor={colors.onSurfaceVariant}
              keyboardType="email-address"
            />
            <Button label="Subscribe" variant="primary" onPress={() => {}} style={styles.subscribeBtn} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>About JEMINA</Text>
          <Text style={styles.footerText}>
            Uganda's premier multivendor marketplace connecting buyers with trusted vendors across the country.
            Reliable, corporate-ready, and locally focused.
          </Text>
          <View style={styles.contactRow}>
            <Icon name="location-on" size={16} color={colors.secondary} />
            <Text style={styles.contactText}>Plot 6, Republic Road, Gulu</Text>
          </View>
          <View style={styles.contactRow}>
            <Icon name="mail" size={16} color={colors.secondary} />
            <Text style={styles.contactText}>support@jemi-na.com</Text>
          </View>
          <View style={styles.contactRow}>
            <Icon name="call" size={16} color={colors.secondary} />
            <Text style={styles.contactText}>+256765368348</Text>
          </View>
        </View>
      </ScrollView>
      <BottomNav />

      {chatOpen && vendorId != null && token ? (
        <View style={styles.chatOverlay}>
          <View style={styles.chatSheet}>
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderTitle}>
                <View style={styles.chatAvatar}>
                  <Icon name="chat" size={16} color={colors.onPrimary} />
                </View>
                <View>
                  <Text style={styles.chatTitle}>Chat with {displayName}</Text>
                  <Text style={styles.chatSub}>JVA replies instantly</Text>
                </View>
              </View>
              <Pressable onPress={() => setChatOpen(false)} hitSlop={8}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <ChatView
              assistantName={displayName}
              greeting={`Hi! I'm the assistant for ${displayName}. Ask me about products, prices, or delivery — I'll get you a quick answer.`}
              onSend={message => apiVendorChatAsk(token, vendorId, message, conversationId)}
              onNotifyVendor={message => apiVendorChatNotify(token, vendorId, message)}
            />
          </View>
        </View>
      ) : null}
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
  coverWrap: {
    height: 170,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  profileCard: {
    marginHorizontal: spacing.lg,
    marginTop: -56,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.surfaceContainerLowest,
    backgroundColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -68,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  logo: {
    width: 84,
    height: 84,
  },
  profileMain: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.headlineLg,
    color: colors.primary,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  verifiedText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  tagline: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  profileSide: {
    width: '100%',
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,152,23,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,152,23,0.2)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  ratingBig: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  ratingCount: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    borderLeftWidth: 1,
    borderLeftColor: colors.outlineVariant,
    paddingLeft: spacing.sm,
  },
  visitBtn: {
    width: '100%',
  },
  profileActions: {
    width: '100%',
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gutter,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    ...typography.displayLg,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 26,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  trendText: {
    ...typography.labelSm,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  statSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  serviceText: {
    ...typography.labelMd,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.xl,
  },
  tab: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  tabText: {
    ...typography.headlineMd,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.secondary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: colors.secondary,
  },
  shopTools: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gutter,
    paddingHorizontal: spacing.lg,
  },
  productCardWrap: {
    width: '48%',
  },
  reviewsEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  reviewsEmptyText: {
    ...typography.headlineMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
  reviewsEmptySub: {
    ...typography.bodyMd,
    color: colors.outline,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.headlineMd,
    color: colors.onSurfaceVariant,
  },
  vendorErrorBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  vendorErrorText: {
    ...typography.bodyMd,
    color: colors.onErrorContainer,
    textAlign: 'center',
  },
  newsletter: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  newsletterTitle: {
    ...typography.displayLg,
    color: colors.white,
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
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  subscribeBtn: {
    paddingVertical: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  footerTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  footerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  contactText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  chatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  chatSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '82%',
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surfaceContainerLowest,
  },
  chatHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatAvatar: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
  },
  chatSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
