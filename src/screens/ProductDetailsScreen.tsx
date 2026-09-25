import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, HeaderNotificationButton, HeaderCartButton } from '../components/AppHeader';
import { Badge } from '../components/Badge';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import { useWishlist } from '../state/WishlistContext';
import { apiProductToProduct, fetchProductDetail } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import type { Product, ProductSpecifications } from '../components/ProductCard';

const SPEC_TABS = ['Specs & Agronomy', 'Bulk & Wholesale', 'Reviews', 'Escrow & Returns'];

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
  return toSpecEntries(specs).slice(0, 4);
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

const LOT_PILLS = [
  { value: 1, title: 'Single' },
  { value: 10, title: '10 Bulk' },
  { value: 50, title: '50 Commercial' },
];

const MAX_QTY = 99;

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
  const insets = useSafeAreaInsets();
  const { addItem, itemCount } = useCart();
  const { token } = useAuth();
  const { isSaved, toggle } = useWishlist();
  const [activeTab, setActiveTab] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  const product = (params?.product as Product | undefined) ?? FALLBACK_PRODUCT;
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const resolved = detailProduct ?? product;
  const gallery = resolved.gallery?.length ? resolved.gallery : resolved.image ? [resolved.image] : [];
  const thumbnails = gallery.slice(0, 3);
  const reviewCount = resolved.reviews ?? 0;
  const saved = isSaved(resolved.id);
  const unitPrice = resolved.priceValue ?? 0;
  const totalValue = unitPrice * qty;
  const savings = (resolved.originalPriceValue ?? 0) > unitPrice ? (resolved.originalPriceValue ?? 0) - unitPrice : 0;
  const isWholesale = Boolean(resolved.isWholesale || resolved.bulkOrder || resolved.corporateReady || resolved.minOrder);
  const hasDelivery = (resolved.deliveryFee ?? 0) > 0 || (resolved.shippingFee ?? 0) > 0;
  const unitLabel = resolved.unitLabel;

  const handleAddToCart = () => {
    addItem(product, qty);
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
      await toggle(resolved.id);
    } catch (e) {
      setWishlistError(e instanceof Error ? e.message : 'Could not update wishlist.');
    }
  }, [token, resolved.id, toggle, navigate]);

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

  return (
    <View style={styles.root}>
      <AppHeader
        showBack
        onBack={goBack}
        title="Product Details"
        right={
          <>
            <Pressable style={styles.headerIconBtn} onPress={toggleWishlist} hitSlop={8} accessibilityRole="button" accessibilityLabel="Wishlist">
              <Icon name={saved ? 'favorite' : 'favorite-border'} size={24} color={saved ? colors.statusFlash : colors.onPrimary} />
            </Pressable>
            <HeaderNotificationButton />
            <HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />
          </>
        }
      />

      <View style={styles.breadcrumbBar}>
        <Icon name="storefront" size={14} color={colors.outline} />
        <Text style={styles.breadcrumbText}>Home</Text>
        <Text style={styles.breadcrumbSep}>/</Text>
        <Text style={[styles.breadcrumbText, styles.breadcrumbActive]} numberOfLines={1}>
          {resolved.category || 'Marketplace'}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero gallery */}
        <View style={styles.galleryWrap}>
          {thumbnails.length > 0 ? (
            <Image source={{ uri: thumbnails[activeImage] }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.imagePlaceholder]}>
              <Icon name="store" size={48} color={colors.outlineVariant} />
            </View>
          )}
          <View style={styles.heroBadges}>
            {isWholesale ? (
              <View style={styles.verifyPill}>
                <Icon name="verified" size={13} color={colors.secondaryFixedDim} />
                <Text style={styles.verifyPillText}>VERIFIED WHOLESALE &amp; RETAIL</Text>
              </View>
            ) : null}
            <View style={styles.escrowPill}>
              <Icon name="shield" size={13} color={colors.onSecondaryContainer} />
              <Text style={styles.escrowPillText}>ESCROW PROTECTED</Text>
            </View>
          </View>
          {resolved.discount ? (
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>{resolved.discount}</Text>
            </View>
          ) : null}
          {gallery.length > 1 ? (
            <View style={styles.dots}>
              {Array.from({ length: Math.min(gallery.length, 4) }).map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          ) : null}
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

        {/* Title & meta */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{resolved.title}</Text>
          {wishlistError ? <Text style={styles.wishlistError}>{wishlistError}</Text> : null}

          <View style={styles.metaRow}>
            <Icon name="star" size={16} color={colors.secondary} />
            <Text style={styles.ratingValue}>{(resolved.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({reviewCount} reviews)</Text>
            <View style={styles.metaDot} />
            <View style={styles.stockPill}>
              <Text style={styles.stockText}>{resolved.stock ?? 'IN STOCK'}</Text>
            </View>
            {hasDelivery ? (
              <>
                <View style={styles.metaDot} />
                <View style={styles.deliveryChip}>
                  <Icon name="local-shipping" size={13} color={colors.secondary} />
                  <Text style={styles.deliveryChipText}>Delivery Available</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Pricing tier card */}
          <View style={styles.priceCard}>
            <View style={styles.priceTopRow}>
              <View style={styles.priceLeft}>
                <Text style={styles.priceLabel}>RETAIL PRICE</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{formatUGX(unitPrice)}</Text>
                  {resolved.originalPriceValue ? (
                    <Text style={styles.originalPrice}>{resolved.originalPrice}</Text>
                  ) : null}
                  {resolved.discount ? <Badge label={resolved.discount} variant="flash" style={styles.offBadge} /> : null}
                </View>
              </View>
              {isWholesale ? (
                <View style={styles.wholesaleBlock}>
                  <Text style={styles.priceLabel}>
                    {resolved.minOrder ? `BULK MOQ ${resolved.minOrderValue ?? ''}+` : 'WHOLESALE RATE'}
                  </Text>
                  <View style={styles.wholesalePill}>
                    <Text style={styles.wholesalePillText}>
                      {formatUGX(unitPrice)}
                      {unitLabel ? ` / ${unitLabel}` : ''}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
            {savings > 0 ? (
              <View style={styles.savingsRow}>
                <Icon name="savings" size={14} color={colors.secondary} />
                <Text style={styles.savingsText}>Save {formatUGX(savings)} on retail price</Text>
              </View>
            ) : null}
            {resolved.corporateReady ? (
              <>
                <View style={styles.divider} />
                <View style={styles.corporateRow}>
                  <View style={styles.corporateText}>
                    <Text style={styles.corporateTitle}>Corporate Ready</Text>
                    <Text style={styles.corporateSubtitle}>Contact vendor for wholesale custom pricing</Text>
                  </View>
                  <Icon name="verified" size={24} color={colors.secondary} />
                </View>
              </>
            ) : null}
          </View>

          {/* Vendor storefront */}
          <View style={styles.vendorCard}>
            <View style={styles.vendorRow}>
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
                <View style={styles.vendorNameRow}>
                  <Text style={styles.vendorName} numberOfLines={1}>
                    {resolved.vendor?.name ?? 'Jemina Official'}
                  </Text>
                  <Icon name="verified" size={14} color={colors.secondary} />
                </View>
                <View style={styles.vendorMeta}>
                  <Icon name="location-on" size={13} color={colors.onSurfaceVariant} />
                  <Text style={styles.vendorMetaText} numberOfLines={1}>
                    {resolved.vendor?.location ?? 'Gulu, Uganda'}
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.visitStoreBtn}
                onPress={() =>
                  navigate('VendorProfile', {
                    vendorId: resolved.vendor?.id ?? 1,
                    vendorName: resolved.vendor?.name ?? 'Jemina Official',
                  })
                }
              >
                <Text style={styles.visitStoreText}>Visit Store</Text>
              </Pressable>
            </View>

            <View style={styles.dispatchBox}>
              <View style={styles.dispatchRow}>
                <Icon name="schedule" size={16} color={colors.secondary} />
                <Text style={styles.dispatchText}>Dispatches within 24 hours of order confirmation</Text>
              </View>
              {resolved.shippingFee !== undefined && resolved.shippingFee > 0 ? (
                <View style={styles.dispatchRow}>
                  <Icon name="local-shipping" size={16} color={colors.secondary} />
                  <Text style={styles.dispatchText}>
                    Vendor → JEMINA Hub: <Text style={styles.dispatchStrong}>{formatUGX(resolved.shippingFee)}</Text>
                  </Text>
                </View>
              ) : null}
              {resolved.deliveryFee !== undefined && resolved.deliveryFee > 0 ? (
                <View style={styles.dispatchRow}>
                  <Icon name="local-shipping" size={16} color={colors.secondary} />
                  <Text style={styles.dispatchText}>
                    Hub → Customer: <Text style={styles.dispatchStrong}>{formatUGX(resolved.deliveryFee)}</Text>
                  </Text>
                </View>
              ) : null}
              {resolved.originCountry ? (
                <View style={styles.dispatchRow}>
                  <Icon name="warehouse" size={16} color={colors.secondary} />
                  <Text style={styles.dispatchText}>
                    Free Pickup at JEMINA Hub · Origin: {resolved.originCountry}
                  </Text>
                </View>
              ) : (
                <View style={styles.dispatchRow}>
                  <Icon name="warehouse" size={16} color={colors.secondary} />
                  <Text style={styles.dispatchText}>Free Pickup at JEMINA Hub</Text>
                </View>
              )}
              {resolved.quality ? (
                <View style={styles.dispatchRow}>
                  <Icon name="eco" size={16} color={colors.secondary} />
                  <Text style={styles.dispatchText}>{resolved.quality}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Spec bento */}
          {(() => {
            const specCards = toSpecCards(resolved.specifications);
            if (specCards.length === 0) {
              return null;
            }
            return (
              <View style={styles.specSection}>
                <View style={styles.specHeader}>
                  <Icon name="tune" size={18} color={colors.secondary} />
                  <Text style={styles.specHeaderText}>Agronomic Specifications</Text>
                </View>
                <View style={styles.specGrid}>
                  {specCards.map(s => (
                    <View key={s.label} style={styles.specCard}>
                      <Text style={styles.specLabel}>{s.label.toUpperCase()}</Text>
                      <Text style={styles.specValue}>{s.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
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
              {resolved.description ? <Text style={styles.description}>{resolved.description}</Text> : null}
              {(() => {
                const specs = resolved.specifications;
                const specEntries = toSpecEntries(specs);
                const features = toBulletItems(specs?.features);
                const safety = toBulletItems(specs?.safety);
                const warranty = toBulletItems(specs?.warranty);
                const audience = toAudienceItems(specs);
                if (
                  !resolved.description &&
                  (!specs ||
                    (specEntries.length === 0 && features.length === 0 && safety.length === 0 && warranty.length === 0 && audience.length === 0))
                ) {
                  return <Text style={styles.description}>No specifications provided for this product.</Text>;
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
                        <Text style={styles.specSectionTitle}>Warranty &amp; Returns</Text>
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
              {resolved.minOrder ? (
                <View style={styles.minOrderCard}>
                  <Icon name="inventory" size={18} color={colors.secondary} />
                  <View style={styles.minOrderInfo}>
                    <Text style={styles.minOrderTitle}>Minimum Order</Text>
                    <Text style={styles.minOrderValue}>{resolved.minOrder}</Text>
                  </View>
                </View>
              ) : null}
              <Text style={styles.specSectionTitle}>Wholesale Benefits</Text>
              {WHOLESALE_BENEFITS.map(b => (
                <View key={b} style={styles.specBulletRow}>
                  <Icon name="check-circle" size={16} color={colors.secondary} />
                  <Text style={styles.specBulletText}>{b}</Text>
                </View>
              ))}
              <Button label="Download Pricing Sheet" variant="primary" onPress={() => {}} style={styles.downloadBtn} />
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
                <Text style={styles.reviewRedirectHint}>Rate this product from Ratings &amp; Reviews after delivery.</Text>
              </View>
            </View>
          )}

          {activeTab === 3 && (
            <View style={styles.tabContent}>
              <View style={styles.escrowBox}>
                <View style={styles.escrowHeader}>
                  <Icon name="verified-user" size={20} color={colors.secondary} />
                  <Text style={styles.escrowTitle}>JEMINA Escrow Protection</Text>
                </View>
                <Text style={styles.escrowText}>
                  Your payment is held securely in JEMINA Escrow until you inspect your order at pickup or on delivery.
                  Funds are released to the vendor only after confirmation.
                </Text>
              </View>
              <Text style={styles.specSectionTitle}>Returns</Text>
              <Text style={styles.description}>
                Eligible items can be returned within 30 days of delivery. Contact support to arrange a return or
                exchange. Inspection pass is required at the JEMINA hub before funds are released.
              </Text>
            </View>
          )}
        </View>

        {/* Quantity & lot selection */}
        <View style={styles.qtySection}>
          <Text style={styles.qtyLabel}>Select Quantity</Text>
          <View style={styles.lotRow}>
            {LOT_PILLS.map(p => {
              const active = qty === p.value;
              return (
                <Pressable
                  key={p.value}
                  style={[styles.lotPill, active && styles.lotPillActive]}
                  onPress={() => setQty(p.value)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.lotPillTitle, active && styles.lotPillTitleActive]}>{p.title}</Text>
                  <Text style={[styles.lotPillDesc, active && styles.lotPillDescActive]}>
                    {unitLabel ? `${p.value} ${p.value === 1 ? unitLabel : unitLabel + 's'}` : `${p.value} units`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.stepperRow}>
            <View style={styles.stepper}>
              <Pressable style={styles.stepperBtn} onPress={() => setQty(q => Math.max(1, q - 1))} hitSlop={6} accessibilityRole="button" accessibilityLabel="Decrease quantity">
                <Icon name="remove" size={20} color={colors.primary} />
              </Pressable>
              <Text style={styles.stepperValue}>{qty}</Text>
              <Pressable style={styles.stepperBtn} onPress={() => setQty(q => Math.min(MAX_QTY, q + 1))} hitSlop={6} accessibilityRole="button" accessibilityLabel="Increase quantity">
                <Icon name="add" size={20} color={colors.primary} />
              </Pressable>
            </View>
            <Text style={styles.stepperNote}>Total: {formatUGX(totalValue)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.inquireBtn, !resolved.corporateReady && styles.inquireBtnDisabled]}
            disabled={!resolved.corporateReady}
            onPress={() => navigate('ProductInquiry', { product: resolved })}
          >
            <Icon name="chat" size={18} color={resolved.corporateReady ? colors.primary : colors.outline} />
            <Text style={[styles.inquireText, !resolved.corporateReady && styles.inquireTextDisabled]}>Bulk Inquiry</Text>
          </Pressable>
          <Pressable style={[styles.addBtn, added && styles.addBtnAdded]} onPress={handleAddToCart}>
            <Icon name={added ? 'check' : 'shopping-cart'} size={18} color={added ? colors.white : colors.onSecondaryContainer} />
            <Text style={styles.addText}>{added ? 'ADDED!' : `Add to Cart · ${formatUGX(totalValue)}`}</Text>
          </Pressable>
        </View>
        <View style={styles.escrowTrust}>
          <Icon name="verified-user" size={13} color={colors.secondary} />
          <Text style={styles.escrowTrustText}>Payment held securely in JEMINA Escrow until inspection</Text>
        </View>
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
    paddingBottom: spacing.lg,
  },
  headerIconBtn: {
    padding: 9,
    borderRadius: 4,
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  breadcrumbText: {
    ...typography.labelSm,
    color: colors.outline,
  },
  breadcrumbActive: {
    color: colors.secondary,
    fontWeight: '700',
    flexShrink: 1,
  },
  breadcrumbSep: {
    ...typography.labelSm,
    color: colors.outline,
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
  heroBadges: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    flexDirection: 'column',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  verifyPillText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  escrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  escrowPillText: {
    ...typography.labelSm,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  discountPill: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.error,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  discountPillText: {
    ...typography.labelMd,
    color: colors.onError,
    fontWeight: '700',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    backgroundColor: colors.white,
    opacity: 0.7,
  },
  thumbActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 1,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  title: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  wishlistError: {
    ...typography.labelMd,
    color: colors.statusFlash,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  ratingValue: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  reviewCount: {
    ...typography.bodySm,
    color: colors.outline,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.xs,
  },
  stockPill: {
    backgroundColor: 'rgba(40,167,69,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  stockText: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  deliveryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  deliveryChipText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  priceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  priceLeft: {
    flex: 1,
  },
  priceLabel: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  price: {
    ...typography.headlineLg,
    color: colors.secondary,
    fontWeight: '800',
  },
  originalPrice: {
    ...typography.bodyMd,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  offBadge: {
    borderRadius: radius.sm,
  },
  wholesaleBlock: {
    alignItems: 'flex-end',
  },
  wholesalePill: {
    backgroundColor: colors.secondaryFixed,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: 2,
  },
  wholesalePillText: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '800',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  savingsText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.4,
    marginVertical: spacing.md,
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
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
  },
  corporateSubtitle: {
    ...typography.bodySm,
    color: colors.outline,
  },
  vendorCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorLogo: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorLogoText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '800',
  },
  vendorInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  vendorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorName: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
    flexShrink: 1,
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
    flexShrink: 1,
  },
  visitStoreBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
  },
  visitStoreText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
  },
  dispatchBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  dispatchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 6,
  },
  dispatchText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  dispatchStrong: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  specSection: {
    marginTop: spacing.lg,
  },
  specHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  specHeaderText: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  specCard: {
    width: '47%',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  specLabel: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  specValue: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '800',
    marginTop: 2,
  },
  tabSection: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  tab: {
    paddingBottom: spacing.sm,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  detailCard: {
    width: '47%',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
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
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
  minOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  minOrderInfo: {
    flex: 1,
  },
  minOrderTitle: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '700',
  },
  minOrderValue: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '800',
  },
  downloadBtn: {
    marginTop: spacing.md,
  },
  ratingHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingBig: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '800',
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewRedirectHint: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  escrowBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  escrowTitle: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
  },
  escrowText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  qtySection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  qtyLabel: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  lotRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lotPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  lotPillActive: {
    backgroundColor: colors.secondaryFixed,
    borderColor: colors.secondary,
  },
  lotPillTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  lotPillTitleActive: {
    color: colors.primary,
  },
  lotPillDesc: {
    ...typography.labelSm,
    color: colors.outline,
  },
  lotPillDescActive: {
    color: colors.onSecondaryFixed,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'center',
  },
  stepperNote: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  actionBar: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inquireBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  inquireBtnDisabled: {
    borderColor: colors.outlineVariant,
    opacity: 0.5,
  },
  inquireText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '800',
  },
  inquireTextDisabled: {
    color: colors.outline,
  },
  addBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addText: {
    ...typography.labelMd,
    color: colors.onSecondaryContainer,
    fontWeight: '800',
  },
  addBtnAdded: {
    backgroundColor: colors.statusSuccess,
  },
  escrowTrust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  escrowTrustText: {
    ...typography.labelSm,
    color: colors.outline,
  },
});