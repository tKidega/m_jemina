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
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Text>
              <Pressable onPress={clearCart}>
                <Text style={styles.clearText}>Clear All</Text>
              </Pressable>
            </View>

            {vendorGroups.map(group => (
              <View key={group.vendorId ?? group.vendorName} style={styles.vendorSection}>
                <View style={styles.vendorHeader}>
                  <Icon name="store" size={16} color={colors.primary} />
                  <Text style={styles.vendorName} numberOfLines={1}>{group.vendorName}</Text>
                  <Text style={styles.fulfilledBy}>Fulfilled by {group.vendorName}</Text>
                </View>

                {group.items.map(item => (
                  <View key={item.product.id} style={styles.cartItem}>
                    <Pressable
                      style={styles.itemImageWrap}
                      onPress={() => navigate('ProductDetails', { product: item.product })}
                    >
                      {item.product.image ? (
                        <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.itemImage, styles.imagePlaceholder]}>
                          <Icon name="store" size={28} color={colors.outlineVariant} />
                        </View>
                      )}
                    </Pressable>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemCategory} numberOfLines={1}>{item.product.category}</Text>
                      <Text style={styles.itemTitle} numberOfLines={2}>{item.product.title}</Text>
                      <Text style={styles.itemPrice}>{formatUGX(item.product.priceValue * item.quantity)}</Text>
                      <View style={styles.itemActions}>
                        <View style={styles.qtyStepper}>
                          <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.product.id, item.quantity - 1)} hitSlop={4}>
                            <Icon name="remove" size={16} color={colors.primary} />
                          </Pressable>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                          <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(item.product.id, item.quantity + 1)} hitSlop={4}>
                            <Icon name="add" size={16} color={colors.primary} />
                          </Pressable>
                        </View>
                        <Pressable style={styles.removeBtn} onPress={() => removeItem(item.product.id)} hitSlop={4}>
                          <Icon name="delete-outline" size={20} color={colors.outline} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}

                <View style={styles.deliveryRow}>
                  <Icon name="local-shipping" size={14} color={colors.onSurfaceVariant} />
                  <Text style={styles.deliveryLabel}>Delivery ({group.vendorName})</Text>
                  <Text style={styles.deliveryValue}>{formatUGX(group.deliveryFee)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatUGX(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery ({vendorGroups.length} {vendorGroups.length === 1 ? 'vendor' : 'vendors'})</Text>
              <Text style={styles.summaryValue}>{formatUGX(totalDeliveryFees)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatUGX(subtotal + totalDeliveryFees)}</Text>
            </View>
            <Button label="Proceed to Checkout" variant="primary" onPress={() => navigate('Checkout')} fullWidth style={styles.checkoutBtn} />
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
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  itemsHeaderText: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  clearText: {
    ...typography.labelMd,
    color: colors.statusFlash,
    fontWeight: '700',
  },
  vendorSection: {
    marginBottom: spacing.xl,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  vendorName: {
    ...typography.labelMd,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
    flex: 1,
  },
  fulfilledBy: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
    opacity: 0.7,
  },
  cartItem: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  },
  itemCategory: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemTitle: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  itemPrice: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 11,
  },
  qtyText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    padding: spacing.sm,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  deliveryLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  deliveryValue: {
    ...typography.labelMd,
    color: colors.onSurface,
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
  summary: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    padding: spacing.lg,
    paddingBottom: spacing.lg,
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
  summaryValue: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  totalValue: {
    ...typography.headlineLg,
    color: colors.secondary,
    fontWeight: '700',
  },
  checkoutBtn: {
    marginTop: spacing.lg,
  },
});
