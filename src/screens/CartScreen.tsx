import React, { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, HeaderCartButton } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useCart } from '../state/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

export function CartScreen() {
  const { items, vendorGroups, itemCount, subtotal, totalDeliveryFees, updateQuantity, removeItem, clearCart, refresh } = useCart();
  const { navigate } = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return (
    <View style={styles.root}>
      <AppHeader
        right={<HeaderCartButton count={itemCount} onPress={() => {}} />}
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
            <View style={styles.itemsHeader}>
              <Text style={styles.itemsHeaderText}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
              </Text>
              <Pressable onPress={clearCart} style={styles.clearBtn}>
                <Icon name="delete-outline" size={14} color={colors.statusFlash} />
                <Text style={styles.clearText}>Clear All</Text>
              </Pressable>
            </View>

            {vendorGroups.map(group => (
              <View key={group.vendorId ?? group.vendorName} style={styles.vendorSection}>
                <View style={styles.vendorHeader}>
                  <View style={styles.vendorBadge}>
                    <Icon name="store" size={14} color={colors.white} />
                  </View>
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName} numberOfLines={1}>{group.vendorName}</Text>
                    <Text style={styles.vendorMeta}>
                      {group.items.length} {group.items.length === 1 ? 'product' : 'products'}
                      {' \u00B7 '}
                      Delivery: {formatUGX(group.deliveryFee)}
                    </Text>
                  </View>
                </View>

                {group.items.map((item, idx) => (
                  <React.Fragment key={item.product.id}>
                    <View style={styles.cartItem}>
                      <Pressable
                        style={styles.itemImageWrap}
                        onPress={() => navigate('ProductDetails', { product: item.product })}
                      >
                        {item.product.image ? (
                          <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />
                        ) : (
                          <View style={[styles.itemImage, styles.imagePlaceholder]}>
                            <Icon name="store" size={24} color={colors.outlineVariant} />
                          </View>
                        )}
                      </Pressable>
                      <View style={styles.itemBody}>
                        <View style={styles.itemTopRow}>
                          <View style={styles.itemTitleWrap}>
                            <Text style={styles.itemTitle} numberOfLines={2}>{item.product.title}</Text>
                            <Text style={styles.itemCategory} numberOfLines={1}>{item.product.category}</Text>
                          </View>
                          <Pressable onPress={() => removeItem(item.product.id)} hitSlop={8} style={styles.removeBtn} accessibilityRole="button" accessibilityLabel={`Remove ${item.product.title} from cart`}>
                            <Icon name="close" size={18} color={colors.outline} />
                          </Pressable>
                        </View>

                        <View style={styles.priceRow}>
                          <Text style={styles.itemPrice}>{formatUGX(item.product.priceValue)}</Text>
                          {item.quantity > 1 && (
                            <Text style={styles.pricePerUnit}>each</Text>
                          )}
                        </View>

                        {item.product.deliveryFee != null && item.product.deliveryFee > 0 && (
                          <View style={styles.deliveryTag}>
                            <Icon name="local-shipping" size={12} color={colors.onSurfaceVariant} />
                            <Text style={styles.deliveryTagText}>
                              Delivery: {formatUGX(item.product.deliveryFee * item.quantity)}
                            </Text>
                          </View>
                        )}

                        <View style={styles.itemActions}>
                          <View style={styles.qtyStepper}>
                            <Pressable style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]} onPress={() => updateQuantity(item.product.id, item.quantity - 1)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Decrease quantity of ${item.product.title}`}>
                              <Icon name="remove" size={16} color={item.quantity <= 1 ? colors.outlineVariant : colors.primary} />
                            </Pressable>
                            <Text style={styles.qtyText}>{item.quantity}</Text>
                            <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.product.id, item.quantity + 1)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Increase quantity of ${item.product.title}`}>
                              <Icon name="add" size={16} color={colors.primary} />
                            </Pressable>
                          </View>
                          <Text style={styles.lineTotal}>{formatUGX(item.product.priceValue * item.quantity)}</Text>
                        </View>
                      </View>
                    </View>
                    {idx < group.items.length - 1 && <View style={styles.itemSeparator} />}
                  </React.Fragment>
                ))}
              </View>
            ))}

            {/* Transaction summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({itemCount} items)</Text>
                <Text style={styles.summaryValue}>{formatUGX(subtotal)}</Text>
              </View>

              {vendorGroups.map(g => (
                <View key={g.vendorId ?? g.vendorName} style={styles.summaryRow}>
                  <Text style={styles.summaryLabelSub}>
                    Delivery \u2014 {g.vendorName}
                  </Text>
                  <Text style={styles.summaryValue}>{formatUGX(g.deliveryFee)}</Text>
                </View>
              ))}

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatUGX(subtotal + totalDeliveryFees)}</Text>
              </View>

              <Button label="Proceed to Checkout" variant="primary" onPress={() => navigate('Checkout')} fullWidth style={styles.checkoutBtn} />
            </View>
          </ScrollView>
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
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  itemsHeaderText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    ...typography.labelSm,
    color: colors.statusFlash,
    fontWeight: '600',
  },
  vendorSection: {
    marginBottom: spacing.lg,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  vendorBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    ...typography.labelMd,
    color: colors.white,
    fontWeight: '700',
  },
  vendorMeta: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  cartItem: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
    marginLeft: spacing.md + 80 + spacing.md,
  },
  itemImageWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
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
    gap: 4,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  itemCategory: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  itemPrice: {
    ...typography.bodyLg,
    color: colors.secondary,
    fontWeight: '700',
  },
  pricePerUnit: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  deliveryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  deliveryTagText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 4,
  },
  lineTotal: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  summaryTitle: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  summaryLabelSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  totalLabel: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  totalValue: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  checkoutBtn: {
    marginTop: spacing.md,
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
