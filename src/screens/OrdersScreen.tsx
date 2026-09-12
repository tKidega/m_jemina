import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetOrder, apiGetOrders, ApiOrder } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type OrderFilter = 'all' | 'active' | 'delivered' | 'cancelled';

const FILTERS: { key: OrderFilter; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

function isActive(status: string): boolean {
  const s = status.toLowerCase();
  return ['pending', 'processing', 'confirmed', 'shipped', 'paid'].includes(s);
}

function isDelivered(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'delivered' || s === 'completed';
}

function isCancelled(status: string): boolean {
  return status.toLowerCase() === 'cancelled';
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function OrderCard({ order, token }: { order: ApiOrder; token?: string | null }) {
  const { navigate } = useNavigation();
  const [detail, setDetail] = useState<ApiOrder | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    let active = true;
    if (token && !order.items) {
      setLoadingDetail(true);
      apiGetOrder(token, order.id)
        .then(d => {
          if (active) {
            setDetail(d);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) {
            setLoadingDetail(false);
          }
        });
    } else {
      setDetail(order);
    }
    return () => {
      active = false;
    };
  }, [token, order]);

  const items = detail?.items ?? order.items;
  const status = order.status.toLowerCase();
  const statusView = statusLabel(order.status);
  const paid = order.payment_status?.toLowerCase() === 'paid';
  const shipping = order.shipping_amount ?? 0;
  const tax = order.tax_amount ?? 0;
  const subtotal = Math.max((order.total_amount ?? 0) - shipping - tax, 0);
  const placedAt = isDelivered(status) && order.delivered_at ? `Delivered on ${formatDateTime(order.delivered_at)}` : `Placed on ${formatDateTime(order.created_at)}`;

  const copyId = () => {
    Alert.alert('Order ID', order.order_number, [{ text: 'OK' }]);
  };

  const onTrack = () => navigate('OrderTracking', { orderId: order.id });

  return (
    <View style={styles.orderCard}>
      <View style={styles.identBar}>
        <View style={styles.identLeft}>
          <View style={styles.identNumberRow}>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <Pressable onPress={copyId} hitSlop={8}>
              <Icon name="content-copy" size={16} color={colors.outline} />
            </Pressable>
          </View>
          <Text style={styles.orderDate}>{placedAt}</Text>
        </View>
        <View style={styles.chipStack}>
          <View style={[styles.statusChip, statusView.bg]}>
            {statusView.icon ? <Icon name={statusView.icon} size={12} color={statusView.fg} /> : null}
            <Text style={[styles.statusChipText, { color: statusView.fg }]}>{statusView.label}</Text>
          </View>
          <View style={[styles.statusChip, styles.chipMuted]}>
            <Text style={[styles.statusChipText, { color: paid ? colors.onSurface : colors.statusFlash }]}>
              {paid ? (order.payment_method && order.payment_method.toLowerCase().includes('momo') ? 'PAID (Mobile Money)' : 'PAID') : 'UNPAID'}
            </Text>
          </View>
        </View>
      </View>

      {items && items.length > 0 ? (
        <View style={styles.itemsSection}>
          {items.map((item, i) => (
            <View key={`${item.product_id}-${i}`} style={[styles.itemRow, i > 0 && styles.itemRowDivider]}>
              {item.product_image ? (
                <Image source={{ uri: item.product_image }} style={styles.itemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Icon name="store" size={20} color={colors.outlineVariant} />
                </View>
              )}
              <View style={styles.itemBody}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.itemQty}>Qty: <Text style={styles.itemQtyStrong}>{item.quantity} unit{item.quantity === 1 ? '' : 's'}</Text></Text>
                  <Text style={styles.itemTotal}>{formatUGX(item.total)}</Text>
                </View>
                {item.tracking && item.tracking.destination_location ? (
                  <Text style={styles.itemNote} numberOfLines={1}>Dispatch to: {item.tracking.destination_location}</Text>
                ) : item.tracking && item.tracking.tracking_number ? (
                  <Text style={styles.itemNote} numberOfLines={1}>TN: {item.tracking.tracking_number}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : loadingDetail ? (
        <Text style={styles.loadingItems}>Loading items...</Text>
      ) : null}

      <View style={styles.breakdown}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Subtotal</Text>
          <Text style={styles.breakdownValue}>{formatUGX(subtotal)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Regional Delivery</Text>
          <Text style={styles.breakdownValue}>{formatUGX(shipping)}</Text>
        </View>
        {tax > 0 ? (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Taxes & Charges</Text>
            <Text style={styles.breakdownValue}>{formatUGX(tax)}</Text>
          </View>
        ) : null}
        <View style={styles.breakdownTotalRow}>
          <Text style={styles.breakdownTotalLabel}>Total Amount</Text>
          <Text style={styles.breakdownTotalValue}>{formatUGX(order.total_amount ?? 0)}</Text>
        </View>
      </View>

      {showInvoice ? <InvoiceSection order={order} /> : null}

      <View style={styles.actionsRow}>
        {!isCancelled(status) && !isDelivered(status) ? (
          <>
            <Pressable style={[styles.actionBtn, styles.actionTrack]} onPress={onTrack}>
              <Icon name="local-shipping" size={18} color={colors.onSecondaryContainer} />
              <Text style={styles.actionTrackText}>Track Package</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.actionOutline]} onPress={() => setShowInvoice(v => !v)}>
              <Icon name="receipt-long" size={18} color={colors.primaryContainer} />
              <Text style={styles.actionOutlineText}>View Invoice</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={[styles.actionBtn, styles.actionPrimary]} onPress={() => navigate('Marketplace')}>
              <Icon name="replay" size={18} color={colors.onPrimary} />
              <Text style={styles.actionPrimaryText}>Reorder</Text>
            </Pressable>
            {isDelivered(status) ? (
              <Pressable style={[styles.actionBtn, styles.actionNeutral]} onPress={() => navigate('MyReviews')}>
                <Icon name="rate-review" size={18} color={colors.onSurface} />
                <Text style={styles.actionNeutralText}>Write Review</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.actionBtn, styles.actionOutline]} onPress={() => setShowInvoice(v => !v)}>
                <Icon name="receipt-long" size={18} color={colors.primaryContainer} />
                <Text style={styles.actionOutlineText}>View Invoice</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function InvoiceSection({ order }: { order: ApiOrder }) {
  return (
    <View style={styles.invoice}>
      {order.payment_method ? (
        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Payment</Text>
          <Text style={styles.invoiceValue}>{order.payment_method}</Text>
        </View>
      ) : null}
      {order.notes ? (
        <View style={styles.invoiceRow}>
          <Text style={styles.invoiceLabel}>Notes</Text>
          <Text style={styles.invoiceValue} numberOfLines={3}>{order.notes}</Text>
        </View>
      ) : null}
      {order.shipping_address ? (
        <View style={styles.addressBox}>
          <Text style={styles.addressTitle}>Deliver to</Text>
          <Text style={styles.addressText}>{order.shipping_address.name}</Text>
          <Text style={styles.addressText}>
            {order.shipping_address.address}, {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip_code}
          </Text>
          <Text style={styles.addressText}>{order.shipping_address.country} · {order.shipping_address.phone}</Text>
        </View>
      ) : null}
    </View>
  );
}

function statusLabel(status: string): { label: string; fg: string; bg: object; icon?: 'verified' } {
  if (isDelivered(status)) {
    return { label: 'DELIVERED', fg: colors.onPrimary, bg: styles.chipContainerBg, icon: 'verified' };
  }
  if (isCancelled(status)) {
    return { label: 'CANCELLED', fg: colors.onSurface, bg: styles.chipMuted };
  }
  let label = 'PROCESSING';
  if (status.startsWith('pending')) {
    label = 'PENDING';
  } else if (status.startsWith('ship')) {
    label = 'SHIPPED';
  } else if (status.startsWith('confirm')) {
    label = 'CONFIRMED';
  }
  return { label, fg: colors.onPrimary, bg: styles.chipSolidBg };
}

export function OrdersScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack, navigate, switchTab } = useNavigation();
  const { itemCount } = useCart();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await apiGetOrders(token);
        setOrders(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load orders.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(() => loadOrders(true), [loadOrders]);

  const counts = useMemo(
    () => ({
      all: orders.length,
      active: orders.filter(o => isActive(o.status)).length,
      delivered: orders.filter(o => isDelivered(o.status)).length,
      cancelled: orders.filter(o => isCancelled(o.status)).length,
    }),
    [orders],
  );

  const visibleOrders = useMemo(() => {
    if (filter === 'all') {
      return orders;
    }
    if (filter === 'active') {
      return orders.filter(o => isActive(o.status));
    }
    if (filter === 'delivered') {
      return orders.filter(o => isDelivered(o.status));
    }
    return orders.filter(o => isCancelled(o.status));
  }, [orders, filter]);

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="My Orders" showBack onBack={goBack} />
        <EmptyState
          icon="receipt-long"
          title="Sign in to view orders"
          subtitle="Track and manage your orders after signing in."
          actionLabel="Sign In"
          onAction={() => navigate('Login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="My Orders"
        showBack
        onBack={goBack}
        right={
          <View style={styles.headerActions}>
            <Pressable style={styles.headerIconBtn} onPress={() => navigate('Search')} hitSlop={6}>
              <Icon name="search" size={20} color={colors.onPrimary} />
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={() => switchTab('Cart')} hitSlop={6}>
              <Icon name="shopping-cart" size={20} color={colors.onPrimary} />
              {itemCount > 0 ? <View style={styles.headerCartDot} /> : null}
            </Pressable>
          </View>
        }
      />
      <View style={styles.filterSection}>
        <View style={styles.filterTopRow}>
          <Text style={styles.filterEyebrow}>PURCHASE ORDER HISTORY</Text>
          <Pressable style={styles.filterToggle} onPress={() => setFilter('all')} hitSlop={6}>
            <Icon name="tune" size={14} color={colors.primary} />
            <Text style={styles.filterToggleText}>Filter</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map(f => {
            const selected = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterChipLabel, selected && styles.filterChipLabelSelected]}>{f.label}</Text>
                <View style={[styles.filterChipCount, selected && styles.filterChipCountSelected]}>
                  <Text style={[styles.filterChipCountText, selected && styles.filterChipCountTextSelected]}>{counts[f.key]}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingMain}>Loading your orders...</Text>
        </View>
      ) : error ? (
        <EmptyState
          icon="error-outline"
          title="Couldn't load orders"
          subtitle={error}
          actionLabel="Try Again"
          onAction={() => loadOrders()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt-long"
          title="No orders yet"
          subtitle="When you place an order, it will show up here."
          actionLabel="Browse Marketplace"
          onAction={() => navigate('Marketplace')}
        />
      ) : visibleOrders.length === 0 ? (
        <EmptyState
          icon="receipt-long"
          title="Nothing here"
          subtitle="No orders match this filter."
          actionLabel="Show All Orders"
          onAction={() => setFilter('all')}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {visibleOrders.map(order => (
            <OrderCard key={order.id} order={order} token={token} />
          ))}

          <View style={styles.helpCard}>
            <View style={styles.helpIcon}>
              <Icon name="support-agent" size={20} color={colors.secondary} />
            </View>
            <View style={styles.helpBody}>
              <Text style={styles.helpTitle}>Need Help with an Order?</Text>
              <Text style={styles.helpSub}>Contact Gulu Logistics Hub Dispatch</Text>
            </View>
            <Pressable onPress={() => navigate('HelpCenter')} hitSlop={6}>
              <Text style={styles.helpAction}>Call Helpdesk</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconBtn: {
    padding: spacing.sm,
    position: 'relative',
  },
  headerCartDot: {
    position: 'absolute',
    top: 6,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondaryContainer,
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
  },
  filterSection: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  filterEyebrow: {
    ...typography.labelSm,
    color: colors.outline,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterToggleText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  filterChipSelected: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
  },
  filterChipLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  filterChipLabelSelected: {
    color: colors.onSecondaryContainer,
    fontWeight: '600',
  },
  filterChipCount: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  filterChipCountSelected: {
    backgroundColor: 'rgba(115, 65, 0, 0.15)',
  },
  filterChipCountText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  filterChipCountTextSelected: {
    color: colors.onSecondaryContainer,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  loadingMain: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  loadingItems: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    padding: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  identBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(242, 243, 249, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  identLeft: {
    flex: 1,
    gap: 2,
  },
  identNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumber: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '800',
  },
  orderDate: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  chipStack: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusChipText: {
    ...typography.labelSm,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  chipSolidBg: {
    backgroundColor: colors.primary,
  },
  chipContainerBg: {
    backgroundColor: colors.primaryContainer,
  },
  chipMuted: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  itemsSection: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
    paddingTop: spacing.sm,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: spacing.sm,
  },
  itemQty: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  itemQtyStrong: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  itemTotal: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  itemNote: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },
  breakdown: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    ...typography.bodySm,
    color: colors.outline,
  },
  breakdownValue: {
    ...typography.bodySm,
    color: colors.outline,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    paddingTop: spacing.xs,
    marginTop: 4,
  },
  breakdownTotalLabel: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '800',
  },
  breakdownTotalValue: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '800',
  },
  invoice: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  invoiceLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  invoiceValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  addressBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  addressTitle: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  addressText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingTop: 0,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionTrack: {
    backgroundColor: colors.secondaryContainer,
  },
  actionTrackText: {
    ...typography.labelLg,
    color: colors.onSecondaryContainer,
    fontWeight: '600',
  },
  actionOutline: {
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  actionOutlineText: {
    ...typography.labelLg,
    color: colors.primaryContainer,
    fontWeight: '600',
  },
  actionPrimary: {
    backgroundColor: colors.primaryContainer,
  },
  actionPrimaryText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  actionNeutral: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  actionNeutralText: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '600',
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    marginTop: spacing.xs,
  },
  helpIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBody: {
    flex: 1,
  },
  helpTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  helpSub: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 1,
  },
  helpAction: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
});