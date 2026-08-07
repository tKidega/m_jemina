import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetOrder, apiGetOrders, ApiOrder } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const STATUS_COLORS: Record<string, string> = {
  pending: colors.statusFlash,
  processing: colors.statusFeatured,
  shipped: colors.statusFeatured,
  delivered: colors.statusSuccess,
  cancelled: colors.outline,
  completed: colors.statusSuccess,
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? colors.outline;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function OrderCard({ order }: { order: ApiOrder }) {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<ApiOrder | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail && token) {
      setLoadingDetail(true);
      apiGetOrder(token, order.id)
        .then(setDetail)
        .catch(() => {})
        .finally(() => setLoadingDetail(false));
    }
  }, [expanded, detail, token, order.id]);

  return (
    <Pressable style={styles.orderCard} onPress={toggle}>
      <View style={styles.orderHeader}>
        <View style={styles.orderTopRow}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <View style={[styles.statusChip, { backgroundColor: statusColor(order.status) }]}>
            <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        <View style={styles.orderMetaRow}>
          <Text style={styles.orderItems}>
            {order.items_count != null ? `${order.items_count} item${order.items_count === 1 ? '' : 's'}` : 'Order'}
          </Text>
          <Text style={styles.orderTotal}>{formatUGX(order.total_amount)}</Text>
        </View>
      </View>

      {expanded ? (
        <View style={styles.detail}>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery</Text>
            <Text style={styles.detailValue}>{formatUGX(order.shipping_amount ?? 0)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tax</Text>
            <Text style={styles.detailValue}>{formatUGX(order.tax_amount ?? 0)}</Text>
          </View>
          {order.payment_method ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment</Text>
              <Text style={styles.detailValue}>{order.payment_method}</Text>
            </View>
          ) : null}

          {loadingDetail ? (
            <Text style={styles.loadingText}>Loading items...</Text>
          ) : detail?.items && detail.items.length > 0 ? (
            <View style={styles.itemsList}>
              {detail.items.map((item, i) => (
                <View key={`${item.product_id}-${i}`} style={styles.detailItem}>
                  {item.product_image ? (
                    <Image source={{ uri: item.product_image }} style={styles.detailItemImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.detailItemImage, styles.detailItemImagePlaceholder]}>
                      <Icon name="store" size={20} color={colors.outlineVariant} />
                    </View>
                  )}
                  <View style={styles.detailItemBody}>
                    <Text style={styles.detailItemName} numberOfLines={2}>{item.product_name}</Text>
                    <Text style={styles.detailItemQty}>Qty: {item.quantity} × {formatUGX(item.unit_price)}</Text>
                  </View>
                  <Text style={styles.detailItemTotal}>{formatUGX(item.total)}</Text>
                </View>
              ))}
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
      ) : null}
    </Pressable>
  );
}

export function OrdersScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
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

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="My Orders" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="receipt-long" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to view orders</Text>
          <Text style={styles.centerSub}>Track and manage your orders after signing in.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => navigate('Login')} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="My Orders" showBack onBack={goBack} />
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingMain}>Loading your orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Couldn't load orders</Text>
          <Text style={styles.centerSub}>{error}</Text>
          <Button label="Try Again" variant="primary" fullWidth onPress={() => loadOrders()} style={styles.centerBtn} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Icon name="receipt-long" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>No orders yet</Text>
          <Text style={styles.centerSub}>When you place an order, it will show up here.</Text>
          <Button label="Browse Marketplace" variant="primary" fullWidth onPress={() => navigate('Marketplace')} style={styles.centerBtn} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
          <Text style={styles.footerText}>Tap an order to view details.</Text>
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  centerTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  centerSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  centerBtn: {
    width: '100%',
  },
  loadingMain: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  loadingText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  orderHeader: {
    gap: spacing.sm,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  orderNumber: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    flex: 1,
  },
  statusChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  statusText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
  },
  orderDate: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderItems: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  orderTotal: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
  },
  detail: {
    marginTop: spacing.sm,
  },
  detailDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  itemsList: {
    marginTop: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailItemImage: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
  },
  detailItemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailItemBody: {
    flex: 1,
  },
  detailItemName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  detailItemQty: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  detailItemTotal: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  addressBox: {
    marginTop: spacing.sm,
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
  footerText: {
    ...typography.labelSm,
    color: colors.outline,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
