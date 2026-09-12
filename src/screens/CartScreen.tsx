import React, { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useCart } from '../state/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const PLATFORM_ESCROW_FEE = 1500;

function vendorHubLabel(name: string): string {
  if (/solar|power/i.test(name)) return 'Direct Gulu Depot';
  if (/agro|seed|irrigation|grain/i.test(name)) return 'Northern Hub';
  return 'Northern Hub';
}

function vendorIcon(name: string, idx: number): 'storefront' | 'solar-power' | 'shopping-bag' {
  if (/solar|power/i.test(name)) return 'solar-power';
  if (/agro|irrigation|seed|grain/i.test(name)) return 'storefront';
  return idx % 2 === 0 ? 'storefront' : 'shopping-bag';
}

export function CartScreen() {
  const { items, vendorGroups, itemCount, subtotal, totalDeliveryFees, updateQuantity, removeItem, clearCart, refresh } = useCart();
  const { navigate } = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [hubPickup, setHubPickup] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const cartTotal = subtotal + totalDeliveryFees + PLATFORM_ESCROW_FEE;

  return (
    <View style={styles.root}>
      <AppHeader
        title={`Shopping Cart (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`}
        right={
          itemCount > 0 ? (
            <Pressable onPress={clearCart} hitSlop={6}>
              <Text style={styles.headerClear}>Clear Cart</Text>
            </Pressable>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="shopping-basket" size={56} color={colors.outlineVariant} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse the marketplace and add products you'd like to purchase.
          </Text>
          <Button label="Start Shopping" variant="primary" onPress={() => navigate('Marketplace')} style={styles.emptyBtn} />
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
            }
          >
            {/* Delivery location selector */}
            <View style={styles.deliveryPill}>
              <View style={styles.deliveryIcon}>
                <Icon name="location-on" size={16} color={colors.primaryContainer} />
              </View>
              <View style={styles.deliveryTextWrap}>
                <Text style={styles.deliveryLabel}>Delivering to:</Text>
                <Text style={styles.deliveryValue} numberOfLines={1}>Plot 14 Acholi Road, Gulu City</Text>
              </View>
              <Pressable onPress={() => navigate('AddressBook')} hitSlop={8}>
                <Text style={styles.deliveryChange}>Change</Text>
              </Pressable>
            </View>

            {/* Hub pickup incentive */}
            <View style={styles.pickupBanner}>
              <Icon name="local-shipping" size={18} color={colors.secondary} />
              <View style={styles.pickupBody}>
                <Text style={styles.pickupTitle}>
                  Save {totalDeliveryFees > 0 ? formatUGX(totalDeliveryFees) : 'funds'} on delivery
                </Text>
                <Text style={styles.pickupDesc}>
                  Switch to free self-pickup at the Gulu Central Hub (Owonzi Complex).
                </Text>
                <Pressable style={styles.pickupToggle} onPress={() => setHubPickup(v => !v)} hitSlop={6}>
                  <Icon name={hubPickup ? 'check-box' : 'check-box-outline-blank'} size={16} color={hubPickup ? colors.primaryContainer : colors.outline} />
                  <Text style={styles.pickupToggleText}>Switch to Gulu Hub Pickup</Text>
                </Pressable>
              </View>
            </View>

            {/* Vendor groups */}
            {vendorGroups.map((group, gi) => (
              <View key={group.vendorId ?? group.vendorName} style={styles.vendorSection}>
                <View style={styles.vendorHeader}>
                  <View style={styles.vendorHeaderLeft}>
                    <Icon name={vendorIcon(group.vendorName, gi)} size={18} color={colors.primaryContainer} />
                    <Text style={styles.vendorName} numberOfLines={1}>{group.vendorName}</Text>
                    <View style={styles.hubBadge}>
                      <Icon name="verified" size={10} color={colors.onPrimary} />
                      <Text style={styles.hubBadgeText}>{vendorHubLabel(group.vendorName)}</Text>
                    </View>
                  </View>
                  <Text style={styles.vendorFee}>Fee: {formatUGX(group.deliveryFee)}</Text>
                </View>

                {group.items.map((item, idx) => (
                  <React.Fragment key={item.product.id}>
                    <View style={[styles.cartItem, idx === 0 && styles.cartItemFirst]}>
                      <View style={styles.itemRow}>
                        <Pressable
                          style={styles.itemImageWrap}
                          onPress={() => navigate('ProductDetails', { product: item.product })}
                        >
                          {item.product.image ? (
                            <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />
                          ) : (
                            <View style={[styles.itemImage, styles.imagePlaceholder]}>
                              <Icon name="store" size={20} color={colors.outlineVariant} />
                            </View>
                          )}
                        </Pressable>
                        <View style={styles.itemBody}>
                          <View style={styles.itemTopRow}>
                            <View style={styles.catPill}>
                              <Text style={styles.catPillText} numberOfLines={1}>{item.product.category}</Text>
                            </View>
                            <Pressable onPress={() => removeItem(item.product.id)} hitSlop={8} style={styles.removeBtn} accessibilityRole="button" accessibilityLabel={`Remove ${item.product.title} from cart`}>
                              <Icon name="delete-outline" size={18} color={colors.outline} />
                            </Pressable>
                          </View>
                          <Text style={styles.itemTitle} numberOfLines={2}>{item.product.title}</Text>
                          <Text style={styles.itemUnitPrice}>
                            {formatUGX(item.product.priceValue)}{item.product.unitLabel ? ` / ${item.product.unitLabel}` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemFooter}>
                        <View style={styles.qtyStepper}>
                          <Pressable style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]} onPress={() => updateQuantity(item.product.id, item.quantity - 1)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Decrease quantity of ${item.product.title}`}>
                            <Icon name="remove" size={16} color={item.quantity <= 1 ? colors.outlineVariant : colors.onSurface} />
                          </Pressable>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                          <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.product.id, item.quantity + 1)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Increase quantity of ${item.product.title}`}>
                            <Icon name="add" size={16} color={colors.onSurface} />
                          </Pressable>
                        </View>
                        <View style={styles.lineTotalWrap}>
                          <Text style={styles.lineTotalLabel}>Line Total</Text>
                          <Text style={styles.lineTotal}>{formatUGX(item.product.priceValue * item.quantity)}</Text>
                        </View>
                      </View>
                    </View>
                    {idx < group.items.length - 1 && <View style={styles.itemSeparator} />}
                  </React.Fragment>
                ))}
              </View>
            ))}

            {/* Order summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryBody}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items Subtotal ({itemCount} items, {vendorGroups.length} {vendorGroups.length === 1 ? 'vendor' : 'vendors'})</Text>
                  <Text style={styles.summaryValue}>{formatUGX(subtotal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Combined Delivery Fees</Text>
                  <Text style={styles.summaryValue}>{formatUGX(totalDeliveryFees)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryLabelRow}>
                    <Text style={styles.summaryLabel}>Platform Escrow Fee</Text>
                    <Icon name="help-outline" size={14} color={colors.outline} />
                  </View>
                  <Text style={styles.summaryValue}>{formatUGX(PLATFORM_ESCROW_FEE)}</Text>
                </View>
              </View>
              <View style={styles.summaryTotalRow}>
                <View>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalNote}>Incl. VAT &amp; Escrow Assurance</Text>
                </View>
                <Text style={styles.totalValue}>{formatUGX(cartTotal)}</Text>
              </View>
            </View>

            {/* Trust badges */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <Icon name="verified-user" size={15} color={colors.secondary} />
                <Text style={styles.trustText}>JEMINA Safe Escrow</Text>
              </View>
              <Text style={styles.trustDot}>•</Text>
              <View style={styles.trustItem}>
                <Icon name="receipt-long" size={15} color={colors.secondary} />
                <Text style={styles.trustText}>EFRIS Invoicing</Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky checkout trigger */}
          <View style={styles.stickyBar}>
            <Pressable style={styles.checkoutBtn} onPress={() => navigate('Checkout')}>
              <Text style={styles.checkoutBtnText}>Proceed to Checkout ({formatUGX(cartTotal)})</Text>
              <Icon name="arrow-forward" size={20} color={colors.onSecondary} />
            </Pressable>
          </View>
        </>
      )}
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
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerClear: {
    ...typography.labelMd,
    color: colors.secondaryFixedDim,
    fontWeight: '700',
  },
  deliveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  deliveryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryTextWrap: {
    flex: 1,
  },
  deliveryLabel: {
    ...typography.labelSm,
    color: colors.outline,
  },
  deliveryValue: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  deliveryChange: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  pickupBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,220,191,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(253,173,93,0.5)',
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  pickupBody: {
    flex: 1,
  },
  pickupTitle: {
    ...typography.labelMd,
    color: colors.secondaryFixed,
    fontWeight: '700',
  },
  pickupDesc: {
    ...typography.bodySm,
    color: colors.onSecondaryContainer,
    marginTop: 2,
  },
  pickupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pickupToggleText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  vendorSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  vendorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  vendorName: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
    flexShrink: 1,
  },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primaryContainer,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hubBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  vendorFee: {
    ...typography.bodySm,
    color: colors.outline,
    flexShrink: 0,
  },
  cartItem: {
    padding: spacing.sm,
  },
  cartItemFirst: {
    paddingTop: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  itemImageWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  catPill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 1,
  },
  catPillText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  removeBtn: {
    padding: 2,
  },
  itemTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '600',
    marginTop: 4,
  },
  itemUnitPrice: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  lineTotalWrap: {
    alignItems: 'flex-end',
  },
  lineTotalLabel: {
    ...typography.bodySm,
    color: colors.outline,
  },
  lineTotal: {
    ...typography.labelLg,
    color: colors.secondary,
    fontWeight: '700',
  },
  itemSeparator: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginHorizontal: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  summaryTitle: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
  },
  summaryBody: {
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
    paddingVertical: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
    gap: spacing.sm,
  },
  totalLabel: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
  },
  totalNote: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  totalValue: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    ...typography.labelSm,
    color: colors.outline,
  },
  trustDot: {
    ...typography.labelSm,
    color: colors.outline,
  },
  stickyBar: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: '#ff9817',
  },
  checkoutBtnText: {
    ...typography.labelLg,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    width: '100%',
  },
});