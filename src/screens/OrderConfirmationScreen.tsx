import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetCreditBalance, apiGetOrder } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_image?: string | null;
}

interface OrderTotals {
  subtotal: number;
  shipping: number;
  delivery: number;
  platformFee: number;
  discount: number;
  total: number;
}

interface OrderConfirmationParams {
  orderId: number;
  orderNumber: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  fulfilment: 'pickup' | 'delivery';
  totals: OrderTotals;
  items: OrderItem[];
  vendorGroupCount: number;
}

function paymentIcon(method: string): 'payment' | 'smartphone' | 'currency-bitcoin' | 'account-balance-wallet' | 'credit-card' {
  if (method === 'cod') return 'payment';
  if (method === 'credit') return 'account-balance-wallet';
  if (method === 'bitcoin') return 'currency-bitcoin';
  if (method.includes('card') || method === 'stripe') return 'credit-card';
  return 'smartphone';
}

export function OrderConfirmationScreen() {
  const { params } = useNavigation();
  const { token } = useAuth();
  const { navigate } = useNavigation();
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [fetchedOrder, setFetchedOrder] = useState<OrderConfirmationParams | null>(null);
  const [fetching, setFetching] = useState(false);

  const order = (params as OrderConfirmationParams | undefined) ?? fetchedOrder;

  // If only orderId is passed (from Payment screen), fetch order details
  useEffect(() => {
    if (!order && params?.orderId && token) {
      setFetching(true);
      apiGetOrder(token, Number(params.orderId))
        .then(o => {
          setFetchedOrder({
            orderId: o.id,
            orderNumber: o.order_number,
            paymentMethod: o.payment_method ?? 'cod',
            paymentMethodLabel: o.payment_method ?? 'Cash on Delivery',
            fulfilment: 'pickup',
            totals: {
              subtotal: o.total_amount - o.shipping_amount - o.tax_amount,
              shipping: 0,
              delivery: o.shipping_amount,
              platformFee: 1500,
              discount: 0,
              total: o.total_amount,
            },
            items: o.items ?? [],
            vendorGroupCount: 1,
          });
        })
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [order, params?.orderId, token]);

  useEffect(() => {
    if (token && order?.paymentMethod === 'credit') {
      apiGetCreditBalance(token)
        .then(bal => setCreditBalance(bal.balance))
        .catch(() => {});
    }
  }, [token, order?.paymentMethod]);

  if (!order) {
    return (
      <View style={styles.root}>
        <AppHeader title="Order" titleStyle={styles.headerTitle} />
        <View style={styles.empty}>
          {fetching ? (
            <>
              <Icon name="sync" size={48} color={colors.outlineVariant} />
              <Text style={styles.emptyText}>Loading order details...</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyText}>No order details found.</Text>
              <Button label="Go to Orders" variant="primary" onPress={() => navigate('Orders')} style={styles.btnFull} />
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Order Confirmed" titleStyle={styles.headerTitle} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="check-circle" size={72} color={colors.statusSuccess} />
          </View>
          <Text style={styles.heroTitle}>Order Placed Successfully</Text>
          <Text style={styles.heroSubtitle}>
            Your order <Text style={styles.heroOrderNumber}>#{order.orderNumber}</Text> has been received and is being processed.
          </Text>
        </View>

        {/* Order info card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="receipt-long" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Order Details</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Number</Text>
            <Text style={styles.infoValue}>#{order.orderNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{order.fulfilment === 'pickup' ? 'Ready for Pickup' : 'Processing'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fulfilment</Text>
            <Text style={styles.infoValue}>{order.fulfilment === 'pickup' ? 'Self Pickup at Jemina Point' : 'Delivery to Your Address'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Items</Text>
            <Text style={styles.infoValue}>{order.items.length} product{order.items.length !== 1 ? 's' : ''} from {order.vendorGroupCount} vendor{order.vendorGroupCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Payment summary card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name={paymentIcon(order.paymentMethod)} size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Summary</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Subtotal</Text>
            <Text style={styles.summaryValue}>{formatUGX(order.totals.subtotal)}</Text>
          </View>
          {order.totals.shipping > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping (Vendor → Hub)</Text>
              <Text style={styles.summaryValue}>{formatUGX(order.totals.shipping)}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery (Hub → You)</Text>
            <Text style={[styles.summaryValue, order.totals.delivery === 0 && styles.freeText]}>
              {order.totals.delivery === 0 ? 'FREE' : formatUGX(order.totals.delivery)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform Escrow Fee</Text>
            <Text style={styles.summaryValue}>{formatUGX(order.totals.platformFee)}</Text>
          </View>
          {order.totals.discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.discountLabel}>Coupon Discount</Text>
              <Text style={styles.discountValue}>-{formatUGX(order.totals.discount)}</Text>
            </View>
          ) : null}
          <View style={styles.summaryDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>{formatUGX(order.totals.total)}</Text>
          </View>
        </View>

        {/* Payment method card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name={paymentIcon(order.paymentMethod)} size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>
          <View style={styles.payMethodRow}>
            <Icon name={paymentIcon(order.paymentMethod)} size={24} color={colors.secondary} />
            <View style={styles.payMethodInfo}>
              <Text style={styles.payMethodLabel}>{order.paymentMethodLabel}</Text>
              <Text style={styles.payMethodNote}>
                {order.paymentMethod === 'cod'
                  ? 'Pay when your order arrives'
                  : order.paymentMethod === 'credit'
                    ? 'Paid from your JEMINA credit balance'
                    : order.paymentMethod === 'bitcoin'
                      ? 'Cryptocurrency payment initiated'
                      : 'Payment processed securely'}
              </Text>
            </View>
          </View>
        </View>

        {/* Credit balance (if credit payment) */}
        {order.paymentMethod === 'credit' && creditBalance != null ? (
          <View style={[styles.card, styles.creditCard]}>
            <View style={styles.cardHeader}>
              <Icon name="account-balance-wallet" size={20} color={colors.statusSuccess} />
              <Text style={styles.cardTitle}>Credit Balance</Text>
            </View>
            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>Remaining Balance</Text>
              <Text style={styles.creditValue}>{formatUGX(creditBalance)}</Text>
            </View>
            <Text style={styles.creditNote}>
              Your JEMINA credit balance after this purchase. Use credits for faster checkout on future orders.
            </Text>
          </View>
        ) : null}

        {/* Items ordered */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="shopping-bag" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Items Ordered</Text>
          </View>
          {order.items.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                <Text style={styles.itemQty}>Qty: {item.quantity} × {formatUGX(item.unit_price)}</Text>
              </View>
              <Text style={styles.itemTotal}>{formatUGX(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* What's next */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="info" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>What Happens Next</Text>
          </View>
          {order.fulfilment === 'pickup' ? (
            <>
              <View style={styles.nextStep}>
                <Icon name="storefront" size={18} color={colors.secondary} />
                <Text style={styles.nextStepText}>Your order will be prepared at Jemina Point for pickup.</Text>
              </View>
              <View style={styles.nextStep}>
                <Icon name="notifications" size={18} color={colors.secondary} />
                <Text style={styles.nextStepText}>You'll receive a notification when your order is ready.</Text>
              </View>
              <View style={styles.nextStep}>
                <Icon name="location-on" size={18} color={colors.secondary} />
                <Text style={styles.nextStepText}>Pick up at: Jemina Point, 789 Commerce Street, Gulu.</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.nextStep}>
                <Icon name="inventory" size={18} color={colors.secondary} />
                <Text style={styles.nextStepText}>Vendors will prepare your items for shipping.</Text>
              </View>
              <View style={styles.nextStep}>
                <Icon name="local-shipping" size={18} color={colors.secondary} />
                <Text style={styles.nextStepText}>Items will ship to JEMINA Hub, then delivered to you.</Text>
              </View>
              <View style={styles.nextStep}>
                <Icon name="track-changes" size={18} color={colors.secondary} />
                <Text style={styles.nextStepText}>Track your order status from the Orders screen.</Text>
              </View>
            </>
          )}
        </View>

        {/* CTA buttons */}
        <View style={styles.ctaGroup}>
          <Button
            label="Track This Order"
            variant="primary"
            onPress={() => navigate('OrderTracking', { orderId: order.orderId })}
            style={styles.btnFull}
          />
          <Button
            label="Continue Shopping"
            variant="outline"
            onPress={() => navigate('Marketplace')}
            style={styles.btnFull}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  headerTitle: {
    ...typography.headlineSm,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  heroIcon: {
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroOrderNumber: {
    fontWeight: '700',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  creditCard: {
    borderColor: colors.statusSuccess,
    backgroundColor: colors.surfaceContainerLow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    ...typography.bodySm,
    color: colors.outline,
  },
  infoValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.sm,
  },
  statusBadge: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    ...typography.labelSm,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    ...typography.bodySm,
    color: colors.outline,
  },
  summaryValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  freeText: {
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  discountLabel: {
    ...typography.bodySm,
    color: colors.statusSuccess,
    fontWeight: '600',
  },
  discountValue: {
    ...typography.bodySm,
    color: colors.statusSuccess,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '700',
  },
  totalValue: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '800',
  },
  payMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  payMethodInfo: {
    flex: 1,
  },
  payMethodLabel: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  payMethodNote: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  creditLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  creditValue: {
    ...typography.headlineSm,
    color: colors.statusSuccess,
    fontWeight: '800',
  },
  creditNote: {
    ...typography.bodySm,
    color: colors.outline,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  itemQty: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  itemTotal: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  nextStepText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 20,
  },
  ctaGroup: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btnFull: {
    width: '100%',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
