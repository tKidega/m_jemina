import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetOrder, apiGetOrders, ApiOrder, ApiTrackingInfo } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

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

function TrackingTimeline({ tracking }: { tracking?: ApiTrackingInfo }) {
  const events = tracking?.timeline ?? [];
  if (events.length === 0) {
    if (tracking?.status && tracking.status.toLowerCase() !== 'none') {
      return (
        <View style={styles.statusBanner}>
          <Icon name="local-shipping" size={28} color={colors.statusFeatured} />
          <Text style={styles.statusBannerText}>
            {tracking.status}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyTimeline}>
        <Icon name="inventory" size={40} color={colors.outlineVariant} />
        <Text style={styles.emptyTimelineTitle}>No tracking updates yet</Text>
        <Text style={styles.emptyTimelineSub}>
          Tracking will appear here once your item is dispatched.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {events.map((ev, i) => {
        const isLast = i === events.length - 1;
        return (
          <View key={`${i}`} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={[styles.timelineDot, isLast && { backgroundColor: colors.statusSuccess }]}>
                <Text style={styles.timelineIndex}>{i + 1}</Text>
              </View>
              {!isLast ? <View style={styles.timelineLine} /> : null}
            </View>
            <View style={styles.timelineBody}>
              <View style={styles.timelineStatusRow}>
                <Text style={styles.timelineStatus}>{ev.status}</Text>
                <Text style={styles.timelineDate}>{formatDate(ev.created_at)}</Text>
              </View>
              {ev.location ? <Text style={styles.timelineLocation}>📍 {ev.location}</Text> : null}
              {ev.notes ? <Text style={styles.timelineNotes}>{ev.notes}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function OrderTrackingCard({ order, onPress }: { order: ApiOrder; onPress: () => void }) {
  const hasTracking = order.items?.some(item => item.tracking && item.tracking.status && item.tracking.status.toLowerCase() !== 'none');
  return (
    <Pressable style={styles.orderCard} onPress={onPress}>
      <View style={styles.orderTop}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        </View>
        <Icon name="chevron-right" size={24} color={colors.outline} />
      </View>
      {hasTracking ? (
        <View style={styles.trackingPill}>
          <Icon name="local-shipping" size={16} color={colors.statusFeatured} />
          <Text style={styles.trackingPillText}>Tracking available</Text>
        </View>
      ) : (
        <Text style={styles.noTrackingText}>No tracking available yet</Text>
      )}
    </Pressable>
  );
}

export function OrderTrackingScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack } = useNavigation();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeOrder, setActiveOrder] = useState<ApiOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const openOrder = async (order: ApiOrder) => {
    setActiveOrder(order);
    if (token) {
      setDetailLoading(true);
      try {
        const detail = await apiGetOrder(token, order.id);
        setActiveOrder(detail);
      } catch {
        setActiveOrder(order);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const doSearch = async () => {
    if (!query.trim()) {
      return;
    }
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetOrders(token);
      const q = query.trim().toLowerCase();
      const match = data.find(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.items?.some(item => item.tracking?.tracking_number?.toLowerCase().includes(q)) ||
        o.items?.some(item => item.product_name.toLowerCase().includes(q)),
      );
      if (match) {
        await openOrder(match);
      } else {
        Alert.alert('No match', `No order or tracking number matched "${query.trim()}".`);
      }
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="Track Orders" showBack onBack={goBack} />
        <View style={styles.center}>
          <Icon name="my-location" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>Sign in to track orders</Text>
          <Text style={styles.centerSub}>Follow your packages from dispatch to delivery.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => setOrders([])} style={styles.centerBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Track Orders" showBack onBack={goBack} />
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color={colors.outline} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Order no. or tracking no."
            placeholderTextColor={colors.outline}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={doSearch}
          />
        </View>
        <Button label="Search" variant="primary" onPress={doSearch} />
      </View>

      {activeOrder ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.detailHeader}>
            <Pressable onPress={() => setActiveOrder(null)} hitSlop={8} style={styles.backRow}>
              <Icon name="chevron-right" size={22} color={colors.secondary} style={{ transform: [{ rotate: '180deg' }] }} />
              <Text style={styles.backText}>All orders</Text>
            </Pressable>
            <Text style={styles.detailOrderNumber}>{activeOrder.order_number}</Text>
            {detailLoading ? <Text style={styles.detailLoading}>Refreshing tracking...</Text> : null}
            {activeOrder.items && activeOrder.items.length > 0 ? (
              <View style={styles.itemsList}>
                {activeOrder.items.map((item, i) => (
                  <View key={`${item.product_id}-${i}`} style={styles.itemCard}>
                    <View style={styles.itemTop}>
                      {item.product_image ? (
                        <Image source={{ uri: item.product_image }} style={styles.itemImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                          <Icon name="inventory" size={22} color={colors.outlineVariant} />
                        </View>
                      )}
                      <View style={styles.itemBody}>
                        <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                        <Text style={styles.itemMeta}>Qty: {item.quantity} · {formatUGX(item.total)}</Text>
                      </View>
                    </View>
                    <TrackingTimeline tracking={item.tracking} />
                    <ItemTrackingInfo tracking={item.tracking} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : loading ? (
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
          <Icon name="my-location" size={56} color={colors.outlineVariant} />
          <Text style={styles.centerTitle}>No orders to track</Text>
          <Text style={styles.centerSub}>Orders you place will appear here with live tracking.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          <Text style={styles.listTitle}>Recent Orders</Text>
          {orders.map(order => (
            <OrderTrackingCard key={order.id} order={order} onPress={() => openOrder(order)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function ItemTrackingInfo({ tracking }: { tracking?: ApiTrackingInfo }) {
  if (!tracking || (!tracking.tracking_number && !tracking.carrier)) {
    return null;
  }
  return (
    <View style={styles.itemTrackingRow}>
      {tracking.tracking_number ? (
        <Text style={styles.itemTrackingText}>TN: {tracking.tracking_number}</Text>
      ) : null}
      {tracking.carrier ? <Text style={styles.itemTrackingText}>· {tracking.carrier}</Text> : null}
      {tracking.status && tracking.status.toLowerCase() !== 'none' ? (
        <Text style={styles.itemTrackingText}>· {tracking.status}</Text>
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
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
  listTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  orderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  orderInfo: {
    flex: 1,
    gap: 2,
  },
  orderNumber: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
  },
  orderDate: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  trackingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  trackingPillText: {
    ...typography.labelSm,
    color: colors.statusFeatured,
    fontWeight: '700',
  },
  noTrackingText: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: spacing.md,
  },
  detailHeader: {
    gap: spacing.sm,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '600',
  },
  detailOrderNumber: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
  },
  detailLoading: {
    ...typography.labelSm,
    color: colors.outline,
  },
  itemsList: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
  },
  itemImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  itemMeta: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  trackingCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  trackingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackingTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
  },
  statusChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  statusChipText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
  },
  trackingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  trackingInfoLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  trackingInfoValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
  },
  transitBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  transitTitle: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  transitText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  timelineSection: {
    marginTop: spacing.md,
  },
  timelineSectionTitle: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  timeline: {},
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineRail: {
    alignItems: 'center',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIndex: {
    ...typography.labelSm,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: colors.borderLight,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  timelineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  timelineStatus: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  timelineDate: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  timelineLocation: {
    ...typography.labelMd,
    color: colors.secondary,
    marginTop: 2,
  },
  timelineNotes: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.statusFeatured,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statusText: {
    ...typography.bodyMd,
    color: colors.white,
    fontWeight: '700',
  },
  statusBannerText: {
    ...typography.bodyMd,
    color: colors.white,
    fontWeight: '700',
  },
  emptyTimeline: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyTimelineTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  emptyTimelineTracking: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  emptyTimelineSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  itemTrackingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
  },
  itemTrackingText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
