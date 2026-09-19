import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppHeader, HeaderNotificationButton, HeaderCartButton } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { SectionLoader } from '../components/Loader';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useWishlist } from '../state/WishlistContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetWishlist, apiValidateVoucher, ApiWishlistItem, absoluteUrl } from '../data/api';
import { formatUGX, Product } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

/* ─── Coupon catalog (design-driven; backend list API pending) ─── */

interface Coupon {
  badge: string;
  title: string;
  name: string;
  desc: string;
  code: string;
  metaIcon: 'schedule' | 'location-on';
  meta: string;
}

const COUPONS: Coupon[] = [
  {
    badge: 'JEMINA EXCLUSIVE',
    title: '5% OFF',
    name: 'Jemina Platform Voucher',
    desc: 'Get 5% off your next order. Valid on all products across the marketplace.',
    code: 'JEMINA5',
    metaIcon: 'schedule',
    meta: 'Limited time offer',
  },
];

const APPLIED_KEY = '@jemina/coupons/applied/v1';

/* ─── Helpers ─────────────────────────────────────────── */

function effectivePrice(i: ApiWishlistItem): number {
  const dp = i.product.discounted_price;
  return dp != null && dp < i.product.price ? dp : i.product.price;
}
function hasDiscount(i: ApiWishlistItem): boolean {
  return i.product.discounted_price != null && i.product.discounted_price < i.product.price;
}
function discountPct(i: ApiWishlistItem): number {
  if (!hasDiscount(i)) return 0;
  const dp = i.product.discounted_price as number;
  return Math.round(((i.product.price - dp) / i.product.price) * 100);
}
function isInStock(i: ApiWishlistItem): boolean {
  return i.product.stock_quantity > 0;
}
function isSolarOrIrrigation(i: ApiWishlistItem): boolean {
  return /solar|irrigation|pump|seed|maize|fertilizer/i.test(i.product.name);
}

function resolveWishlistImage(i: ApiWishlistItem): string | undefined {
  const imgs = i.product.images ?? [];
  for (const img of imgs) {
    if (!img) continue;
    if (/^https?:\/\//i.test(img)) return img;
    if (img.startsWith('/') && img !== '/public/storage' && !img.endsWith('storage')) {
      return absoluteUrl(img) ?? img;
    }
  }
  return undefined;
}

function wishlistItemToProduct(i: ApiWishlistItem): Product {
  const price = effectivePrice(i);
  return {
    id: String(i.product.id),
    image: resolveWishlistImage(i),
    category: 'Wishlist',
    title: i.product.name,
    price: formatUGX(price),
    priceValue: price,
    originalPrice: hasDiscount(i) ? formatUGX(i.product.price) : undefined,
    originalPriceValue: hasDiscount(i) ? i.product.price : undefined,
    rating: i.product.rating,
  };
}

type Filter = 'all' | 'dropped' | 'instock' | 'solar';
type SortMode = 'newest' | 'high-low' | 'low-high';

export function WishlistScreen() {
  const { token, isAuthenticated } = useAuth();
  const { addItem, itemCount } = useCart();
  const { toggle } = useWishlist();
  const { navigate, goBack, switchTab } = useNavigation();
  const [items, setItems] = useState<ApiWishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [appliedCodes, setAppliedCodes] = useState<string[]>([]);
  const [appliedLoaded, setAppliedLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeRedeemed, setCodeRedeemed] = useState(false);
  const [howToReedemOpen, setHowToReedemOpen] = useState(false);
  const [movingAll, setMovingAll] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /* Load wishlist */
  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await apiGetWishlist(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wishlist.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    setError(null);
    try {
      setItems(await apiGetWishlist(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wishlist.');
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  /* Applied coupons persistence */
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(APPLIED_KEY)
      .then(raw => {
        if (cancelled) return;
        if (raw) {
          try {
            setAppliedCodes(JSON.parse(raw) as string[]);
          } catch {
            /* ignore */
          }
        }
      })
      .finally(() => {
        if (!cancelled) setAppliedLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!appliedLoaded) return;
    AsyncStorage.setItem(APPLIED_KEY, JSON.stringify(appliedCodes)).catch(() => {});
  }, [appliedCodes, appliedLoaded]);

  const applyCouponCode = useCallback(
    (code: string) => {
      setAppliedCodes(prev => (prev.includes(code) ? prev : [...prev, code]));
      showToast(`${code} applied — pre-filled at checkout`);
    },
    [showToast],
  );

  const copyCoupon = useCallback(
    (code: string) => {
      Clipboard.setString(code);
      applyCouponCode(code);
      showToast('Code copied · ready to paste at checkout');
    },
    [applyCouponCode, showToast],
  );

  /* Derived wishlist views */
  const sortedItems = useMemo(() => {
    const list = [...items];
    if (sortMode === 'newest') {
      list.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
    } else if (sortMode === 'high-low') {
      list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    } else {
      list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    }
    return list;
  }, [items, sortMode]);

  const filteredItems = useMemo(() => {
    if (filter === 'dropped') return sortedItems.filter(hasDiscount);
    if (filter === 'instock') return sortedItems.filter(isInStock);
    if (filter === 'solar') return sortedItems.filter(isSolarOrIrrigation);
    return sortedItems;
  }, [sortedItems, filter]);

  const inStockItems = useMemo(() => items.filter(isInStock), [items]);
  const droppedCount = useMemo(() => items.filter(hasDiscount).length, [items]);
  const solarCount = useMemo(() => items.filter(isSolarOrIrrigation).length, [items]);
  const availableTotal = useMemo(() => inStockItems.reduce((s, i) => s + effectivePrice(i), 0), [inStockItems]);

  const cycleSort = useCallback(() => {
    setSortMode(m =>
      m === 'newest' ? 'high-low' : m === 'high-low' ? 'low-high' : 'newest',
    );
  }, []);
  const sortLabel =
    sortMode === 'newest' ? 'Date Added' : sortMode === 'high-low' ? 'Price: High → Low' : 'Price: Low → High';

  const handleRemove = async (productId: number) => {
    if (!token || removing != null) return;
    setRemoving(productId);
    try {
      await toggle(productId);
      setItems(prev => prev.filter(i => i.product.id !== productId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove item.');
    } finally {
      setRemoving(null);
    }
  };

  const addToCart = (item: ApiWishlistItem) => {
    addItem(wishlistItemToProduct(item), 1);
    showToast('Added to cart');
  };

  const moveAllToCart = async () => {
    if (inStockItems.length === 0 || movingAll) return;
    setMovingAll(true);
    try {
      inStockItems.forEach(item => addItem(wishlistItemToProduct(item), 1));
      showToast(`Moved ${inStockItems.length} items to cart`);
      setTimeout(() => switchTab('Cart'), 650);
    } finally {
      setMovingAll(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code || !token) return;
    setCodeValidating(true);
    setCodeRedeemed(false);
    try {
      const v = await apiValidateVoucher(token, code);
      applyCouponCode(v.code || code);
      setCodeRedeemed(true);
      setCodeInput('');
      setTimeout(() => {
        setShowCodeModal(false);
        setCodeRedeemed(false);
      }, 1500);
    } catch (e) {
      Alert.alert('Invalid code', e instanceof Error ? e.message : 'This code could not be verified.');
    } finally {
      setCodeValidating(false);
    }
  };

  const filterBtn = (f: Filter, label: string, count: number) => (
    <Pressable style={[styles.chip, filter === f && styles.chipOn]} onPress={() => setFilter(f)}>
      {filter === f ? <Icon name="check" size={14} color={colors.white} /> : null}
      <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>
        {label} ({count})
      </Text>
    </Pressable>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.root}>
        <AppHeader title="Wishlist & Coupons" showBack onBack={goBack} />
        <EmptyState
          icon="favorite-border"
          title="Sign in to see your wishlist"
          subtitle="Save products and promo coupons and find them here anytime."
          actionLabel="Sign In"
          onAction={() => navigate('Login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Wishlist & Coupons"
        showBack
        onBack={goBack}
        right={
          <>
            <HeaderNotificationButton />
            <HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />
          </>
        }
      />

      {loading ? (
        <View style={styles.loading}>
          <SectionLoader text="Loading your saved items..." icon="favorite" />
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
            }
          >
            {/* Summary stat cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Icon name="bookmark" size={20} color={colors.secondary} />
                </View>
                <Text style={styles.statLabel}>Saved Items</Text>
                <Text style={styles.statValue}>{items.length}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Icon name="confirmation-number" size={20} color={colors.secondary} />
                </View>
                <Text style={styles.statLabel}>Promo Coupons</Text>
                <Text style={styles.statValue}>{appliedCodes.length} applied</Text>
              </View>
            </View>

            {/* Trust strip */}
            <View style={styles.trustStrip}>
              <View style={styles.trustLeft}>
                <Icon name="verified-user" size={18} color={colors.statusSuccess} />
                <Text style={styles.trustText} numberOfLines={1}>
                  JEMINA Escrow Protected · MTN &amp; Airtel MoMo
                </Text>
              </View>
              <View style={styles.trustBadge}>
                <Icon name="verified" size={12} color={colors.statusSuccess} />
                <Text style={styles.trustBadgeText}>Audit Verified</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Icon name="info" size={16} color={colors.statusFlash} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Promo Coupons */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIcon}>
                  <Icon name="redeem" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Available Promo Coupons</Text>
                  <Text style={styles.sectionSub}>Regional trade &amp; harvest vouchers</Text>
                </View>
              </View>
            </View>

            {COUPONS.map(coupon => {
              const applied = appliedCodes.includes(coupon.code);
              return (
                <View key={coupon.code} style={[styles.couponCard, applied && styles.couponCardApplied]}>
                  <View style={styles.couponHeader}>
                    <View style={[styles.couponBadge, applied && styles.couponBadgeActive]}>
                      <Text style={[styles.couponBadgeText, applied && styles.couponBadgeTextActive]}>
                        {applied ? 'APPLIED' : 'AVAILABLE'}
                      </Text>
                    </View>
                    <Text style={styles.couponTitle}>{coupon.title}</Text>
                  </View>
                  <Text style={styles.couponName}>{coupon.name}</Text>
                  <Text style={styles.couponDesc}>{coupon.desc}</Text>
                  <View style={styles.couponCodeRow}>
                    <View style={styles.couponCodeWrap}>
                      <Text style={styles.couponCodeLabel}>COUPON CODE</Text>
                      <Text style={styles.couponCode}>{coupon.code}</Text>
                    </View>
                    <Pressable
                      style={[styles.copyBtn, applied && styles.copyBtnDone]}
                      onPress={() => copyCoupon(coupon.code)}
                    >
                      <Icon
                        name={applied ? 'check-circle' : 'content-copy'}
                        size={16}
                        color={applied ? colors.statusSuccess : colors.white}
                      />
                      <Text style={[styles.copyBtnText, applied && styles.copyBtnTextDone]}>
                        {applied ? 'Copied' : 'Copy & Apply'}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.couponMeta}>
                    <Icon name={coupon.metaIcon} size={15} color={colors.outline} />
                    <Text style={styles.couponMetaText}>{coupon.meta}</Text>
                  </View>
                </View>
              );
            })}

            {/* How to redeem */}
            <View style={styles.howCard}>
              <Pressable style={styles.howHeader} onPress={() => setHowToReedemOpen(v => !v)}>
                <Icon name="info" size={18} color={colors.onSurfaceVariant} />
                <Text style={styles.howTitle}>How to Redeem Coupons in Escrow Checkout</Text>
                <Icon
                  name="expand-more"
                  size={20}
                  color={colors.onSurfaceVariant}
                  style={{ transform: [{ rotate: howToReedemOpen ? '180deg' : '0deg' }] }}
                />
              </Pressable>
              {howToReedemOpen ? (
                <View style={styles.howBody}>
                  <View style={styles.howStep}>
                    <View style={styles.howNum}>
                      <Text style={styles.howNumText}>1</Text>
                    </View>
                    <Text style={styles.howStepText}>
                      Tap Copy &amp; Apply or input code during wholesale lot review. The discount is
                      locked into the JEMINA trade vault.
                    </Text>
                  </View>
                  <View style={styles.howStep}>
                    <View style={styles.howNum}>
                      <Text style={styles.howNumText}>2</Text>
                    </View>
                    <Text style={styles.howStepText}>
                      Discount amount is auto-deducted immediately before final MTN/Airtel MoMo escrow
                      confirmation.
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Wishlist */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIcon}>
                  <Icon name="favorite" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>My Jemina Wishlist</Text>
                  <Text style={styles.sectionSub}>Your saved products and wishlist items</Text>
                </View>
              </View>
            </View>

            {/* Sort + filter chips */}
            <View style={styles.chipsScroller}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {filterBtn('all', 'All Items', items.length)}
                {filterBtn('dropped', 'Price Dropped', droppedCount)}
                {filterBtn('instock', 'In Stock at Hub', inStockItems.length)}
                {filterBtn('solar', 'Solar & Irrigation', solarCount)}
              </ScrollView>
            </View>
            <Pressable style={styles.sortRow} onPress={cycleSort}>
              <Icon name="filter-list" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.sortText}>Sort by: {sortLabel}</Text>
              <Icon name="keyboard-arrow-down" size={18} color={colors.onSurfaceVariant} />
            </Pressable>

            {filteredItems.length === 0 ? (
              <EmptyState
                icon="favorite-border"
                title={items.length === 0 ? 'Your wishlist is empty' : 'No items match this filter'}
                subtitle="Tap the heart on any product to save it here for later."
                actionLabel="Browse Marketplace"
                onAction={() => navigate('Marketplace')}
              />
            ) : (
              filteredItems.map(item => {
                const product = wishlistItemToProduct(item);
                const imageUrl = resolveWishlistImage(item);
                const inStock = isInStock(item);
                const dropp = hasDiscount(item);
                const oldPrice = item.product.price;
                const saveAmt = dropp ? oldPrice - effectivePrice(item) : 0;
                return (
                  <View key={item.id} style={styles.card}>
                    <Pressable
                      style={styles.cardImageWrap}
                      onPress={() => navigate('ProductDetails', { product })}
                    >
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.cardImage, styles.imagePlaceholder]}>
                          <Icon name="store" size={30} color={colors.outlineVariant} />
                        </View>
                      )}
                      {dropp ? (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>-{discountPct(item)}%</Text>
                        </View>
                      ) : null}
                    </Pressable>
                    <View style={styles.cardBody}>
                      <View style={styles.cardTop}>
                        <Pressable
                          style={styles.productTitleWrap}
                          onPress={() => navigate('ProductDetails', { product })}
                        >
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {item.product.name}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.removeBtn}
                          onPress={() => handleRemove(item.product.id)}
                          disabled={removing === item.product.id}
                          hitSlop={8}
                          accessibilityLabel={`Remove ${item.product.name}`}
                        >
                          <Icon
                            name={removing === item.product.id ? 'sync' : 'delete'}
                            size={20}
                            color={colors.outline}
                          />
                        </Pressable>
                      </View>

                      <View style={styles.priceRow}>
                        <Text style={styles.price}>{formatUGX(effectivePrice(item))}</Text>
                        {dropp ? <Text style={styles.originalPrice}>{formatUGX(oldPrice)}</Text> : null}
                      </View>
                      {dropp ? (
                        <Text style={styles.saveText}>Save {formatUGX(saveAmt)}</Text>
                      ) : null}

                      {inStock ? (
                        <View style={styles.metaRow}>
                          <Icon name="warehouse" size={14} color={colors.onSurfaceVariant} />
                          <Text style={styles.metaText} numberOfLines={1}>
                            In Stock · {item.product.stock_quantity} available at Gulu Hub
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.metaRow}>
                          <Icon name="schedule" size={14} color={colors.statusFlash} />
                          <Text style={[styles.metaText, styles.metaOut]} numberOfLines={1}>
                            Out of stock · restock alerts on
                          </Text>
                        </View>
                      )}

                      <View style={styles.cardActions}>
                        <Pressable
                          style={styles.detailsBtn}
                          onPress={() => navigate('ProductDetails', { product })}
                        >
                          <Text style={styles.detailsBtnText}>
                            {inStock ? 'Details' : 'Notify Stock'}
                          </Text>
                        </Pressable>
                        {inStock ? (
                          <Pressable style={styles.moveBtn} onPress={() => addToCart(item)}>
                            <Icon name="shopping-cart" size={15} color={colors.white} />
                            <Text style={styles.moveBtnText}>Move to Cart</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* Freight strip */}
            {items.length > 0 ? (
              <View style={styles.freightStrip}>
                <Icon name="local-shipping" size={20} color={colors.secondary} />
                <View style={styles.freightBody}>
                  <Text style={styles.freightTitle}>Northern Corridor Fast Freight</Text>
                  <Text style={styles.freightText}>
                    Consolidated weekly dispatches via Layibi Rail Depot &amp; Lira Main Terminal. Escrow
                    funds released only upon physical inspection.
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={styles.bottomPad} />
          </ScrollView>

          {/* Bottom total bar */}
          {items.length > 0 ? (
            <View style={styles.totalBar}>
              <View style={styles.totalInfo}>
                <Text style={styles.totalLabel}>Total Available ({inStockItems.length} items)</Text>
                <Text style={styles.totalValue}>{formatUGX(availableTotal)}</Text>
              </View>
              <Button
                label={movingAll ? 'Moving...' : 'Move All to Cart'}
                variant="primary"
                icon="add-shopping-cart"
                disabled={inStockItems.length === 0 || movingAll}
                onPress={moveAllToCart}
                style={styles.moveAllBtn}
              />
            </View>
          ) : null}
        </>
      )}

      {/* Toast / banner */}
      {toast ? (
        <View style={styles.toast}>
          <Icon name="check-circle" size={16} color={colors.white} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {/* Enter Code modal */}
      <Modal visible={showCodeModal} transparent animationType="fade" onRequestClose={() => setShowCodeModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCodeModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <Icon name="confirmation-number" size={20} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Redeem Promo Code</Text>
              <Pressable onPress={() => setShowCodeModal(false)} hitSlop={10}>
                <Icon name="close" size={20} color={colors.outline} />
              </Pressable>
            </View>
            <Text style={styles.modalDesc}>
              Enter vouchers distributed by regional agricultural co-ops, district trade offices, or
              suppliers.
            </Text>
            <Text style={styles.modalLabel}>Voucher Code</Text>
            <TextInput
              style={styles.modalInput}
              value={codeInput}
              onChangeText={setCodeInput}
              placeholder="e.g. JEMINA5"
              placeholderTextColor={colors.outline}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {codeRedeemed ? (
              <View style={styles.redeemedRow}>
                <Icon name="check-circle" size={16} color={colors.statusSuccess} />
                <Text style={styles.redeemedText}>Coupon applied successfully!</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowCodeModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Button
                label={codeValidating ? 'Verifying...' : 'Verify & Apply'}
                variant="primary"
                icon="arrow-forward"
                onPress={handleVerifyCode}
                disabled={codeValidating || !codeInput.trim()}
                style={styles.verifyBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─── Styles ───────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.statusFlash,
    flex: 1,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  statValue: {
    ...typography.labelLg,
    color: colors.secondary,
    fontWeight: '800',
    marginTop: 2,
  },

  /* Trust strip */
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.lg,
  },
  trustLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  trustText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d4edda',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  trustBadgeText: {
    ...typography.labelSm,
    color: colors.statusSuccess,
    fontWeight: '700',
    fontSize: 9,
  },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  sectionSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  enterCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  enterCodeText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },

  /* Coupon card */
  couponCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  couponCardApplied: {
    borderColor: colors.statusSuccess,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  couponBadge: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  couponBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
    fontWeight: '800',
    fontSize: 9,
  },
  couponBadgeActive: {
    backgroundColor: colors.statusSuccess,
  },
  couponBadgeTextActive: {
    color: colors.white,
  },
  appliedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d4edda',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  appliedChipText: {
    ...typography.labelSm,
    color: colors.statusSuccess,
    fontWeight: '700',
    fontSize: 10,
  },
  couponTitle: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '800',
  },
  couponName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  couponDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  couponCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  couponCodeWrap: {
    flex: 1,
  },
  couponCodeLabel: {
    ...typography.labelSm,
    color: colors.outline,
    fontSize: 9,
  },
  couponCode: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  copyBtnDone: {
    backgroundColor: '#d4edda',
  },
  copyBtnText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  copyBtnTextDone: {
    color: colors.statusSuccess,
  },
  couponMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  couponMetaText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },

  /* How to redeem */
  howCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  howHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  howTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  howBody: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  howStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  howNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howNumText: {
    ...typography.labelSm,
    color: colors.onSecondary,
    fontWeight: '800',
  },
  howStepText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    flex: 1,
  },

  /* Chips */
  chipsScroller: {
    marginBottom: spacing.sm,
  },
  chipsRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipOn: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  chipText: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  chipTextOn: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  sortText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },

  /* Product card */
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardImageWrap: {
    width: 116,
    backgroundColor: colors.surfaceContainerLow,
  },
  cardImage: {
    width: 116,
    height: 152,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.statusFlash,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  discountText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
    fontSize: 10,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    paddingLeft: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  productTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    lineHeight: 20,
  },
  removeBtn: {
    padding: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  price: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '800',
  },
  originalPrice: {
    ...typography.bodySm,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  saveText: {
    ...typography.labelSm,
    color: colors.statusSuccess,
    fontWeight: '700',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    flex: 1,
  },
  metaOut: {
    color: colors.statusFlash,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  detailsBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  detailsBtnText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  moveBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
  },
  moveBtnText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },

  /* Freight strip */
  freightStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  freightBody: {
    flex: 1,
  },
  freightTitle: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
    marginBottom: 2,
  },
  freightText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 17,
  },
  bottomPad: {
    height: spacing.lg,
  },

  /* Bottom bar */
  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surfaceContainerLowest,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  totalValue: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '800',
  },
  moveAllBtn: {
    flex: 1.2,
  },

  /* Toast */
  toast: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(8,19,29,0.92)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    zIndex: 20,
  },
  toastText: {
    ...typography.labelMd,
    color: colors.white,
    fontWeight: '600',
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignSelf: 'center',
    maxWidth: 460,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  modalDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    letterSpacing: 0.4,
  },
  redeemedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: '#d4edda',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  redeemedText: {
    ...typography.labelMd,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    ...typography.labelMd,
    color: colors.outline,
    fontWeight: '700',
  },
  verifyBtn: {
    flex: 1,
  },
});