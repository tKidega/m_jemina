import React, { useCallback, useEffect, useState } from 'react';
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
import { Badge } from '../components/Badge';
import { Icon, type IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import { apiAddReview, apiAddToWishlist, apiGetWishlist, apiRemoveFromWishlist, apiProductToProduct, fetchProductDetail } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import type { Product, ProductSpecifications } from '../components/ProductCard';

const SPEC_TABS = ['Specifications', 'Description', 'Reviews', 'Shipping & Returns'];

const SPEC_ICONS: IconName[] = ['inventory', 'verified', 'eco', 'build'];

function toSpecEntries(specs: ProductSpecifications | null | undefined): { label: string; value: string }[] {
  const technical = specs?.technical;
  if (technical && typeof technical === 'object') {
    return Object.entries(technical)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => ({ label: k, value: String(v) }));
  }
  return [];
}

function toSpecCards(specs: ProductSpecifications | null | undefined) {
  return toSpecEntries(specs)
    .slice(0, 4)
    .map((entry, i) => ({ icon: SPEC_ICONS[i % SPEC_ICONS.length], label: entry.label, value: entry.value }));
}

function toBulletItems(items: unknown): string[] {
  if (Array.isArray(items)) {
    return items.filter((i): i is string => typeof i === 'string' && i.trim() !== '');
  }
  return [];
}

function toAudienceItems(specs: ProductSpecifications | null | undefined): string[] {
  const audience = specs?.audience;
  if (audience && typeof audience === 'object' && Array.isArray((audience as { ideal?: unknown }).ideal)) {
    return toBulletItems((audience as { ideal?: unknown }).ideal);
  }
  return [];
}

const WHOLESALE_BENEFITS = [
  'Tiered pricing for orders over 100 units',
  'Custom branding/logo engraving available',
  '2-Year Extended Business Warranty',
  'Dedicated Corporate Account Manager',
];

const FALLBACK_PRODUCT: Product = {
  id: 'enterprise-phone',
  category: 'Mobile Devices',
  title: 'Phone Ultra (Enterprise Edition)',
  price: 'UGX 38,584',
  priceValue: 38584,
  originalPrice: 'UGX 40,183',
  originalPriceValue: 40183,
  discount: '3.98% OFF',
  minOrder: 'Min. Order: 39 units',
  minOrderValue: 39,
  rating: 4.8,
  reviews: 124,
  stock: 'IN STOCK',
  badge: { label: 'Flash Sale', variant: 'flash' },
};

export function ProductDetailsScreen() {
  const { goBack, params, navigate, switchTab } = useNavigation();
  const { addItem, itemCount } = useCart();
  const { token, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const product = (params?.product as Product | undefined) ?? FALLBACK_PRODUCT;
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const resolved = detailProduct ?? product;
  const gallery = resolved.gallery?.length ? resolved.gallery : resolved.image ? [resolved.image] : [];
  const thumbnails = gallery.slice(0, 3);
  const reviewCount = resolved.reviews ?? 0;

  const handleAddToCart = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const toggleWishlist = useCallback(async () => {
    if (!token) {
      navigate('Login');
      return;
    }
    setWishlistError(null);
    try {
      if (saved) {
        await apiRemoveFromWishlist(token, product.id);
        setSaved(false);
      } else {
        await apiAddToWishlist(token, product.id);
        setSaved(true);
      }
    } catch (e) {
      setWishlistError(e instanceof Error ? e.message : 'Could not update wishlist.');
    }
  }, [token, saved, product.id, navigate]);

  useEffect(() => {
    setSaved(false);
    setWishlistError(null);
  }, [product.id]);

  useEffect(() => {
    if (!token || !product.id) {
      return;
    }
    let cancelled = false;
    apiGetWishlist(token)
      .then(items => {
        if (!cancelled && items.some(item => String(item.product.id) === String(product.id))) {
          setSaved(true);
        }
      })
      .catch(() => {
        // Wishlist preload is best-effort; silently ignore failures.
      });
    return () => {
      cancelled = true;
    };
  }, [token, product.id]);

  useEffect(() => {
    let cancelled = false;
    fetchProductDetail(product.id)
      .then(api => {
        if (!cancelled) {
          setDetailProduct(apiProductToProduct(api));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const submitReview = useCallback(async () => {
    if (!token) {
      navigate('Login');
      return;
    }
    if (reviewRating === 0) {
      setReviewError('Please select a star rating.');
      return;
    }
    if (!reviewComment.trim()) {
      setReviewError('Please write a short comment.');
      return;
    }
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await apiAddReview(token, product.id, { rating: reviewRating, comment: reviewComment.trim() });
      setReviewRating(0);
      setReviewComment('');
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Could not submit your review.');
    } finally {
      setReviewSubmitting(false);
    }
  }, [token, product.id, reviewRating, reviewComment, navigate]);

  return (
    <View style={styles.root}>
      <AppHeader
        showBack
        onBack={goBack}
        right={<HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image gallery */}
        <View style={styles.galleryWrap}>
          {thumbnails.length > 0 ? (
            <Image source={{ uri: thumbnails[activeImage] }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.imagePlaceholder]}>
              <Icon name="store" size={48} color={colors.outlineVariant} />
            </View>
          )}
          <View style={styles.badges}>
            {resolved.badge ? <Badge label={resolved.badge.label} variant={resolved.badge.variant} style={styles.badge} /> : null}
            {resolved.discount ? <Badge label={resolved.discount} variant="flash" style={styles.badge} /> : null}
          </View>
        </View>
        {thumbnails.length > 1 ? (
          <View style={styles.thumbRow}>
            {thumbnails.map((t, i) => (
              <Pressable
                key={i}
                style={[styles.thumb, i === activeImage && styles.thumbActive]}
                onPress={() => setActiveImage(i)}
              >
                <Image source={{ uri: t }} style={styles.thumbImage} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Product info */}
        <View style={styles.infoSection}>
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbText}>Marketplace</Text>
            <Text style={styles.breadcrumbSep}>/</Text>
            <Text style={styles.breadcrumbText}>{resolved.category}</Text>
          </View>

          <View style={styles.titleRow}>
            <Text style={[styles.title, styles.titleFlex]}>{resolved.title}</Text>
            <Pressable style={[styles.favBtn, saved && styles.favBtnActive]} onPress={toggleWishlist} hitSlop={6}>
              <Icon
                name={saved ? 'favorite' : 'favorite-border'}
                size={22}
                color={saved ? colors.statusFlash : colors.outline}
              />
            </Pressable>
          </View>
          {wishlistError ? <Text style={styles.wishlistError}>{wishlistError}</Text> : null}

          <View style={styles.metaRow}>
            <View style={styles.stars}>
              {[0, 1, 2, 3, 4].map(i => {
                const filled = (resolved.rating ?? 0) >= i + 1;
                return (
                  <Icon key={i} name={filled ? 'star' : 'star-border'} size={16} color={colors.secondary} />
                );
              })}
            </View>
            <Text style={styles.reviewCount}>({reviewCount} Reviews)</Text>
            <View style={styles.metaDivider} />
            <Text style={styles.stockText}>{resolved.stock ?? 'IN STOCK'}</Text>
          </View>

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{resolved.price}</Text>
              {resolved.originalPrice ? (
                <Text style={styles.originalPrice}>{resolved.originalPrice}</Text>
              ) : null}
              {resolved.discount ? <Badge label={resolved.discount} variant="flash" style={styles.offBadge} /> : null}
            </View>
            {resolved.minOrder ? (
              <View style={styles.minOrderRow}>
                <Icon name="inventory" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.minOrder}>{resolved.minOrder}</Text>
              </View>
            ) : null}
            <View style={styles.divider} />
            {resolved.corporateReady ? (
              <View style={styles.corporateRow}>
                <View style={styles.corporateText}>
                  <Text style={styles.corporateTitle}>Corporate Ready</Text>
                  <Text style={styles.corporateSubtitle}>Contact vendor for wholesale custom pricing</Text>
                </View>
                <Icon name="verified" size={28} color={colors.secondary} />
              </View>
            ) : null}
          </View>

          {/* Spec bento */}
          {(() => {
            const specCards = toSpecCards(resolved.specifications);
            if (specCards.length === 0) {
              return null;
            }
            return (
              <View style={styles.specGrid}>
                {specCards.map(s => (
                  <View key={s.label} style={styles.specCard}>
                    <View style={styles.specIconWrap}>
                      <Icon name={s.icon} size={20} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.specLabel}>{s.label.toUpperCase()}</Text>
                      <Text style={styles.specValue}>{s.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}

          {/* Vendor snippet */}
          <Pressable
            style={styles.vendorRow}
            onPress={() =>
              navigate('VendorProfile', {
                vendorId: resolved.vendor?.id ?? 1,
                vendorName: resolved.vendor?.name ?? 'Jemina Official',
              })
            }
          >
            <View style={styles.vendorLogo}>
              <Text style={styles.vendorLogoText}>
                {(resolved.vendor?.name ?? 'Jemina Official')
                  .split(/\s+/)
                  .map(w => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>{resolved.vendor?.name ?? 'Jemina Official'}</Text>
              <View style={styles.vendorMeta}>
                <Icon name="location-on" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.vendorMetaText}>{resolved.vendor?.location ?? 'Gulu, Uganda'}</Text>
                <Text style={styles.vendorDot}>•</Text>
                <Text style={styles.vendorVerified}>Verified Vendor</Text>
              </View>
            </View>
            <Text style={styles.visitStore}>VISIT STORE</Text>
          </Pressable>
        </View>

        {/* Tabbed info */}
        <View style={styles.tabSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {SPEC_TABS.map((t, i) => (
              <Pressable key={t} style={styles.tab} onPress={() => setActiveTab(i)}>
                <Text style={[styles.tabText, i === activeTab && styles.tabTextActive]}>{t}</Text>
                <View style={[styles.tabIndicator, i === activeTab && styles.tabIndicatorActive]} />
              </Pressable>
            ))}
          </ScrollView>

          {activeTab === 0 && (
            <View style={styles.tabContent}>
              {(() => {
                const specs = resolved.specifications;
                const specEntries = toSpecEntries(specs);
                const features = toBulletItems(specs?.features);
                const safety = toBulletItems(specs?.safety);
                const warranty = toBulletItems(specs?.warranty);
                const audience = toAudienceItems(specs);
                if (!specs || (specEntries.length === 0 && features.length === 0 && safety.length === 0 && warranty.length === 0 && audience.length === 0)) {
                  return <Text style={styles.description}>{resolved.description ?? 'No specifications provided for this product.'}</Text>;
                }
                return (
                  <>
                    {features.length > 0 ? (
                      <>
                        <Text style={styles.specSectionTitle}>Key Features</Text>
                        {features.map((f, i) => (
                          <View key={i} style={styles.specBulletRow}>
                            <Icon name="check-circle" size={16} color={colors.secondary} />
                            <Text style={styles.specBulletText}>{f}</Text>
                          </View>
                        ))}
                      </>
                    ) : null}
                    {specEntries.length > 0 ? (
                      <View style={styles.detailGrid}>
                        {specEntries.map(c => (
                          <View key={c.label} style={styles.detailCard}>
                            <Text style={styles.detailLabel}>{c.label}</Text>
                            <Text style={styles.detailValue}>{c.value}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {safety.length > 0 ? (
                      <>
                        <Text style={styles.specSectionTitle}>Safety</Text>
                        {safety.map((s, i) => (
                          <View key={i} style={styles.specBulletRow}>
                            <Icon name="check-circle" size={16} color={colors.secondary} />
                            <Text style={styles.specBulletText}>{s}</Text>
                          </View>
                        ))}
                      </>
                    ) : null}
                    {warranty.length > 0 ? (
                      <>
                        <Text style={styles.specSectionTitle}>Warranty & Returns</Text>
                        {warranty.map((w, i) => (
                          <View key={i} style={styles.specBulletRow}>
                            <Icon name="check-circle" size={16} color={colors.secondary} />
                            <Text style={styles.specBulletText}>{w}</Text>
                          </View>
                        ))}
                      </>
                    ) : null}
                    {audience.length > 0 ? (
                      <>
                        <Text style={styles.specSectionTitle}>Ideal For</Text>
                        {audience.map((a, i) => (
                          <View key={i} style={styles.specBulletRow}>
                            <Icon name="check-circle" size={16} color={colors.secondary} />
                            <Text style={styles.specBulletText}>{a}</Text>
                          </View>
                        ))}
                      </>
                    ) : null}
                  </>
                );
              })()}
            </View>
          )}

          {activeTab === 1 && (
            <View style={styles.tabContent}>
              <Text style={styles.description}>
                {resolved.description ?? 'No description available for this product.'}
              </Text>
            </View>
          )}

          {activeTab === 2 && (
            <View style={styles.tabContent}>
              <View style={styles.ratingHeader}>
                <Text style={styles.ratingBig}>{(resolved.rating ?? 0).toFixed(1)}</Text>
                <View style={styles.stars}>
                  {[0, 1, 2, 3, 4].map(i => {
                    const filled = (resolved.rating ?? 0) >= i + 1;
                    return <Icon key={i} name={filled ? 'star' : 'star-border'} size={18} color={colors.secondary} />;
                  })}
                </View>
                <Text style={styles.reviewCount}>Based on {reviewCount} reviews</Text>
              </View>
              {!isAuthenticated ? (
                <Button label="Sign in to write a review" variant="outline" fullWidth onPress={() => navigate('Login')} style={styles.reviewBtn} />
              ) : (
                <>
                  <Text style={styles.reviewFormTitle}>Write a review</Text>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Pressable key={n} onPress={() => setReviewRating(n)} hitSlop={4}>
                        <Icon name={reviewRating >= n ? 'star' : 'star-border'} size={30} color={colors.secondary} />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Share your thoughts about this product..."
                    placeholderTextColor={colors.onSurfaceVariant}
                    multiline
                    value={reviewComment}
                    onChangeText={setReviewComment}
                  />
                  {reviewError ? <Text style={styles.wishlistError}>{reviewError}</Text> : null}
                  <Button
                    label={reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                    variant="primary"
                    fullWidth
                    onPress={submitReview}
                    style={styles.reviewBtn}
                  />
                  <Text style={styles.reviewHint}>Reviews are available after your order is delivered.</Text>
                </>
              )}
            </View>
          )}

          {activeTab === 3 && (
            <View style={styles.tabContent}>
              <Text style={styles.description}>
                Flexible shipping across Uganda with national coverage. Corporate and bulk orders receive priority
                delivery scheduling. 30-day money-back guarantee on eligible items.
              </Text>
            </View>
          )}
        </View>

        {/* Wholesale benefits */}
        <View style={styles.wholesaleSection}>
          <View style={styles.wholesaleCard}>
            <Text style={styles.wholesaleTitle}>Wholesale Benefits</Text>
            {WHOLESALE_BENEFITS.map(b => (
              <View key={b} style={styles.benefitRow}>
                <Icon name="check-circle" size={16} color={colors.secondaryContainer} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
            <Button label="Download Pricing Sheet" variant="primary" onPress={() => {}} style={styles.downloadBtn} />
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.actionBar}>
        <Pressable
          style={[styles.inquireBtn, !resolved.corporateReady && styles.inquireBtnDisabled]}
          disabled={!resolved.corporateReady}
          onPress={() => navigate('ProductInquiry', { product: resolved })}
        >
          <Icon name="chat-bubble" size={18} color={resolved.corporateReady ? colors.primary : colors.outline} />
          <Text style={styles.inquireText}>INQUIRE</Text>
        </Pressable>
        <Pressable style={[styles.addBtn, added && styles.addBtnAdded]} onPress={handleAddToCart}>
          <Icon name={added ? 'check' : 'shopping-cart'} size={18} color={colors.onSecondary} />
          <Text style={styles.addText}>{added ? 'ADDED!' : 'ADD TO CART'}</Text>
        </Pressable>
        <Pressable style={styles.shareBtn}>
          <Icon name="share" size={18} color={colors.outline} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  galleryWrap: {
    position: 'relative',
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    borderRadius: radius.full,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    backgroundColor: colors.white,
    opacity: 0.7,
  },
  thumbActive: {
    borderWidth: 2,
    borderColor: colors.secondary,
    opacity: 1,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  breadcrumbText: {
    ...typography.labelMd,
    color: colors.outline,
  },
  breadcrumbSep: {
    ...typography.labelMd,
    color: colors.outline,
  },
  breadcrumbActive: {
    color: colors.secondary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.displayLgMobile,
    color: colors.onSurface,
  },
  titleFlex: {
    flex: 1,
  },
  favBtn: {
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
  },
  favBtnActive: {
    borderColor: colors.statusFlash,
    backgroundColor: 'rgba(186,26,26,0.08)',
  },
  wishlistError: {
    ...typography.labelMd,
    color: colors.statusFlash,
    marginTop: spacing.sm,
  },
  reviewBtn: {
    marginTop: spacing.md,
  },
  reviewFormTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginTop: spacing.lg,
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
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  reviewHint: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewCount: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.sm,
  },
  stockText: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  priceCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  price: {
    ...typography.headlineLg,
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 20,
  },
  originalPrice: {
    ...typography.bodyLg,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  offBadge: {
    borderRadius: radius.sm,
  },
  minOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  minOrder: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.3,
    marginVertical: spacing.lg,
  },
  corporateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  corporateText: {
    flex: 1,
  },
  corporateTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  corporateSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  specCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  specIconWrap: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  specLabel: {
    ...typography.labelSm,
    color: colors.outline,
  },
  specValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  vendorLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorLogoText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  vendorInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  vendorName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  vendorMetaText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  vendorDot: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  vendorVerified: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  visitStore: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  tabSection: {
    marginTop: spacing.xl,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  tab: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  tabText: {
    ...typography.labelMd,
    color: colors.outline,
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
  tabContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  description: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
    lineHeight: 26,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  detailCard: {
    width: '47%',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  detailLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  detailValue: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  specSectionTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  specBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  specBulletText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 22,
  },
  ratingHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingBig: {
    ...typography.displayLg,
    color: colors.onSurface,
  },
  wholesaleSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  wholesaleCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  wholesaleTitle: {
    ...typography.headlineMd,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  benefitText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    flex: 1,
  },
  downloadBtn: {
    marginTop: spacing.md,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inquireBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
  },
  inquireBtnDisabled: {
    borderColor: colors.outlineVariant,
    opacity: 0.5,
  },
  inquireText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  addBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  addBtnAdded: {
    backgroundColor: colors.statusSuccess,
  },
  shareBtn: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
  },
});
