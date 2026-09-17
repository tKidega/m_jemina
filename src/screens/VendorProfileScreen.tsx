import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, HeaderNotificationButton, HeaderCartButton } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { ChatView } from '../components/ChatView';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import {
  absoluteUrl,
  apiGetVendor,
  apiGetVendorReviews,
  apiProductToProduct,
  apiSubmitVendorReview,
  apiVendorChatAsk,
  apiVendorChatNotify,
  makeConversationId,
  ApiVendorDetail,
  ApiVendorReview,
} from '../data/api';
import { ProductCard, type Product } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { images } from '../data/images';

const SERVICE_STYLES: Record<string, { icon: IconName; bg: string; fg: string }> = {
  retail: { icon: 'shopping-bag', bg: colors.primary, fg: colors.white },
  wholesale: { icon: 'business-center', bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
  online: { icon: 'public', bg: colors.secondaryContainer, fg: colors.onSecondary },
};

const FALLBACK_SERVICES = ['Retail', 'Wholesale', 'Online Sales'];

function formatReviewDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function VendorProfileScreen() {
  const { goBack, navigate, switchTab, params } = useNavigation();
  const { addItem, itemCount } = useCart();
  const { products: catalogProducts, error, refresh } = useCatalog();
  const { user, token, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [vendor, setVendor] = useState<ApiVendorDetail | null>(null);
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [conversationId] = useState(() => makeConversationId());

  const vendorId = params?.vendorId != null ? Number(params.vendorId) : undefined;
  const vendorNameParam = params?.vendorName as string | undefined;

  const [bannerFailed, setBannerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [subEmail, setSubEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const newsletterKey = user ? `@jemina/newsletter/v1:${user.id}` : null;

  const [shopReviews, setShopReviews] = useState<ApiVendorReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoadedFor, setReviewsLoadedFor] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewDone, setReviewDone] = useState<string | null>(null);

  const fetchShopReviews = useCallback(async () => {
    if (vendorId == null) {
      return;
    }
    setReviewsLoading(true);
    try {
      const list = await apiGetVendorReviews(vendorId);
      setShopReviews(list);
      setReviewsLoadedFor(vendorId);
    } catch {
      // keep existing list on refresh failure
    } finally {
      setReviewsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (activeTab === 2 && vendorId != null && reviewsLoadedFor !== vendorId) {
      fetchShopReviews();
    }
  }, [activeTab, vendorId, reviewsLoadedFor, fetchShopReviews]);

  const submitShopReview = useCallback(async () => {
    if (!token) {
      navigate('Login');
      return;
    }
    if (vendorId == null || reviewSubmitting) {
      return;
    }
    if (reviewRating === 0) {
      setReviewError('Please select a star rating.');
      return;
    }
    if (reviewComment.trim().length < 10) {
      setReviewError('Please write a review of at least 10 characters.');
      return;
    }
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const message = await apiSubmitVendorReview(token, vendorId, {
        rating: reviewRating,
        content: reviewComment.trim(),
        name: user?.name,
      });
      setReviewRating(0);
      setReviewComment('');
      setReviewDone(message);
      setReviewsLoadedFor(null);
      fetchShopReviews();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not submit your review.';
      if (msg.toLowerCase().includes('already')) {
        Alert.alert('Already reviewed', 'You have already submitted a review for this vendor.');
        setReviewDone('You have already submitted a review for this vendor.');
      } else {
        setReviewError(msg);
      }
    } finally {
      setReviewSubmitting(false);
    }
  }, [token, vendorId, reviewRating, reviewComment, reviewSubmitting, user, navigate, fetchShopReviews]);

  useEffect(() => {
    if (newsletterKey == null) {
      setSubscribed(false);
      return;
    }
    AsyncStorage.getItem(newsletterKey)
      .then(raw => {
        if (!raw) {
          setSubscribed(false);
          return;
        }
        try {
          const saved = JSON.parse(raw) as { subscribed?: boolean; email?: string };
          setSubscribed(saved.subscribed === true);
          if (typeof saved.email === 'string' && saved.email) {
            setSubEmail(saved.email);
          }
        } catch {
          setSubscribed(false);
        }
      })
      .catch(() => {});
  }, [newsletterKey]);

  const handleSubscribe = useCallback(() => {
    const email = subEmail.trim();
    if (!email || newsletterKey == null) {
      return;
    }
    setSubscribed(true);
    AsyncStorage.setItem(newsletterKey, JSON.stringify({ subscribed: true, email })).catch(() => {});
  }, [subEmail, newsletterKey]);

  useEffect(() => {
    if (vendorId == null) {
      setVendor(null);
      setVendorProducts([]);
      setVendorLoading(false);
      setBannerFailed(false);
      setLogoFailed(false);
      return;
    }
    let cancelled = false;
    setVendorLoading(true);
    setVendorError(null);
    setBannerFailed(false);
    setLogoFailed(false);
    setReviewDone(null);
    setReviewError(null);
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
  const displayRating = vendor?.rating ?? 0;
  const displayRatingText = displayRating > 0 ? displayRating.toFixed(1) : '—';
  const reviewCount = vendor?.review_count ?? 0;
  const tagline = vendor?.description ?? `${displayName} on JEMINA Marketplace.`;
  const bannerUrl = vendor?.banner ? absoluteUrl(vendor.banner) : undefined;
  const logoRawUrl = vendor?.logo ? absoluteUrl(vendor.logo) : undefined;
  const logoUrl = logoRawUrl && !/\.svg(\?|#|$)/i.test(logoRawUrl) ? logoRawUrl : undefined;

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

  const featuredProducts = PRODUCTS.filter(p => p.badge?.variant === 'featured');
  const serviceChips = (
    vendor?.services_offered
      ? vendor.services_offered.split(',').map(s => s.trim()).filter(Boolean)
      : FALLBACK_SERVICES
  )
    .slice(0, 4)
    .map(label => {
      const key = label.toLowerCase().startsWith('online') ? 'online' : label.toLowerCase();
      return {
        label,
        ...(SERVICE_STYLES[key] ?? {
          icon: 'store' as IconName,
          bg: colors.surfaceContainer,
          fg: colors.onSurfaceVariant,
        }),
      };
    });
  const stats = [
    { label: 'Products', value: String(vendor?.product_count ?? vendorProducts.length) },
    { label: 'Rating', value: displayRatingText },
    { label: 'Reviews', value: String(reviewCount) },
    { label: 'Location', value: vendor?.location ?? '—' },
  ];
  const renderGrid = (list: typeof PRODUCTS) => (
    <View style={styles.productGrid}>
      {list.map(p => (
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
  );

  return (
    <View style={styles.root}>
      <AppHeader
        showBack
        onBack={goBack}
        right={<><HeaderNotificationButton /><HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} /></>}
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
          {bannerUrl && !bannerFailed ? (
            <Image
              source={{ uri: bannerUrl }}
              style={styles.coverImage}
              resizeMode="cover"
              onError={() => setBannerFailed(true)}
            />
          ) : (
            <Image source={{ uri: images.vendorCover }} style={styles.coverImage} resizeMode="cover" />
          )}
          <View style={styles.coverOverlay} />
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.logoWrap}>
            {logoUrl && !logoFailed ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.logo}
                resizeMode="contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <Image source={{ uri: images.vendorLogo }} style={styles.logo} resizeMode="contain" />
            )}
          </View>
          <View style={styles.profileMain}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{displayName}</Text>
              <View style={styles.verifiedChip}>
                <Icon name="verified" size={14} color={colors.secondary} />
                <Text style={styles.verifiedText}>Verified Vendor</Text>
              </View>
            </View>
            <Text style={styles.tagline}>{tagline}</Text>
          </View>
          <View style={styles.profileSide}>
            <View style={styles.ratingCard}>
              <Text style={styles.ratingBig}>{displayRatingText}</Text>
              <Icon name="star" size={18} color={colors.secondary} />
              <Text style={styles.ratingCount}>{reviewCount} Reviews</Text>
            </View>
            <View style={styles.profileActions}>
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
          {stats.map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue} numberOfLines={1}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          <View style={styles.servicesRow}>
            {serviceChips.map(s => (
              <View key={s.label} style={[styles.serviceChip, { backgroundColor: s.bg }]}>
                <Icon name={s.icon} size={16} color={s.fg} />
                <Text style={[styles.serviceText, { color: s.fg }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {['Featured', 'All Products', 'Shop Reviews'].map((t, i) => (
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

        {/* Product grids */}
        {activeTab === 0 ? (
          featuredProducts.length > 0 ? (
            renderGrid(featuredProducts)
          ) : (
            <View style={styles.reviewsEmpty}>
              <Icon name="star" size={32} color={colors.outlineVariant} />
              <Text style={styles.reviewsEmptyText}>No featured products yet</Text>
              <Text style={styles.reviewsEmptySub}>See all products for the full catalogue.</Text>
            </View>
          )
        ) : activeTab === 1 ? (
          renderGrid(PRODUCTS)
        ) : (
          <View style={styles.reviewsWrap}>
            <View style={styles.reviewSummary}>
              <Text style={styles.reviewBig}>{displayRatingText}</Text>
              <View style={styles.reviewMeta}>
                <Text style={styles.reviewCount}>
                  {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                </Text>
                <Text style={styles.reviewSub}>from verified buyers of this store</Text>
              </View>
            </View>
            {reviewsLoading && shopReviews.length === 0 ? (
              <View style={styles.reviewsEmpty}>
                <Text style={styles.reviewsEmptySub}>Loading reviews...</Text>
              </View>
            ) : shopReviews.length > 0 ? (
              <View style={styles.reviewList}>
                {shopReviews.map(r => (
                  <View key={r.id} style={styles.reviewItem}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
                        {(r.name || 'J').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.reviewBody}>
                      <View style={styles.reviewTop}>
                        <Text style={styles.reviewName} numberOfLines={1}>{r.name}</Text>
                        <View style={styles.reviewStarsRow}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <Icon
                              key={n}
                              name={r.rating >= n ? 'star' : 'star-border'}
                              size={12}
                              color={colors.secondary}
                            />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>{formatReviewDate(r.created_at)}</Text>
                      <Text style={styles.reviewContentText}>{r.content}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.reviewsEmpty}>
                <Icon name="star" size={32} color={colors.outlineVariant} />
                <Text style={styles.reviewsEmptyText}>No written reviews yet</Text>
                <Text style={styles.reviewsEmptySub}>Be the first to review this store.</Text>
              </View>
            )}
            <Text style={styles.reviewFormTitle}>Write a review</Text>
            {!isAuthenticated || !token ? (
              <Button
                label="Sign in to write a review"
                variant="outline"
                fullWidth
                onPress={() => navigate('Login')}
              />
            ) : reviewDone ? (
              <View style={styles.reviewDoneBox}>
                <Icon name="check-circle" size={18} color={colors.statusSuccess} />
                <Text style={styles.reviewDoneText}>{reviewDone}</Text>
              </View>
            ) : (
              <>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Pressable key={n} onPress={() => setReviewRating(n)} hitSlop={6}>
                      <Icon
                        name={reviewRating >= n ? 'star' : 'star-border'}
                        size={28}
                        color={colors.secondary}
                      />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your experience with this store..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  multiline
                  value={reviewComment}
                  onChangeText={setReviewComment}
                />
                {reviewError ? <Text style={styles.reviewErrorText}>{reviewError}</Text> : null}
                <Button
                  label={reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  variant="primary"
                  fullWidth
                  onPress={submitShopReview}
                />
                <Text style={styles.reviewHint}>Reviews appear here after the vendor approves them.</Text>
              </>
            )}
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
          {subscribed ? (
            <View style={styles.subSuccess}>
              <Icon name="check-circle" size={18} color={colors.white} />
              <Text style={styles.subSuccessText}>Subscribed successfully!</Text>
            </View>
          ) : (
            <View style={styles.newsletterForm}>
              <TextInput
                style={styles.newsletterInput}
                placeholder="Enter your email"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="email-address"
                autoCapitalize="none"
                value={subEmail}
                onChangeText={setSubEmail}
              />
              <Pressable
                style={[styles.subscribeBtnFill, !subEmail.trim() && styles.subscribeBtnDisabled]}
                onPress={handleSubscribe}
                disabled={!subEmail.trim()}
              >
                <Text style={styles.subscribeBtnFillText}>Subscribe</Text>
              </Pressable>
            </View>
          )}
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
  coverWrap: {
    height: 148,
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
    marginHorizontal: spacing.md,
    marginTop: -48,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: colors.surfaceContainerLowest,
    backgroundColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -56,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  logo: {
    width: 68,
    height: 68,
  },
  profileMain: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
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
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  tagline: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 320,
  },
  profileSide: {
    width: '100%',
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
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
    ...typography.headlineSm,
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
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
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  serviceText: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  tab: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tabText: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
    paddingHorizontal: spacing.md,
  },
  productCardWrap: {
    width: '48%',
  },
  reviewsEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  reviewsEmptyText: {
    ...typography.headlineSm,
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
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.bodyMd,
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
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  newsletterTitle: {
    ...typography.headlineSm,
    color: colors.white,
    fontWeight: '700',
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
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  newsletterInput: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  subscribeBtn: {
    paddingVertical: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footerTitle: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  footerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  contactText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  reviewsWrap: {
    paddingHorizontal: spacing.md,
  },
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reviewBig: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '800',
  },
  reviewMeta: {
    flex: 1,
  },
  reviewCount: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  reviewSub: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 1,
  },
  subSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  subSuccessText: {
    ...typography.labelMd,
    color: colors.white,
    fontWeight: '600',
  },
  subscribeBtnFill: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBtnFillText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  subscribeBtnDisabled: {
    opacity: 0.5,
  },
  reviewList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    ...typography.labelLg,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  reviewBody: {
    flex: 1,
    minWidth: 0,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reviewName: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  reviewDate: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  reviewContentText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  reviewFormTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  reviewInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  reviewErrorText: {
    ...typography.labelMd,
    color: colors.statusFlash,
    marginBottom: spacing.sm,
  },
  reviewHint: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  reviewDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  reviewDoneText: {
    ...typography.bodyMd,
    color: colors.statusSuccess,
    flex: 1,
    fontWeight: '600',
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
