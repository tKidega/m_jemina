import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { SectionLoader } from '../components/Loader';
import { ReturnItemModal } from '../components/ReturnItemModal';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import {
  apiGetOrder,
  apiGetOrders,
  apiMarkItemReceived,
  apiProductToProduct,
  fetchProductDetail,
  ApiOrder,
  ApiOrderItem,
  ApiTrackingInfo,
} from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

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

function primaryTracking(items: ApiOrder['items']): ApiTrackingInfo | undefined {
  return items?.map(item => item.tracking).find(t => t?.status || t?.timeline?.length || t?.tracking_number);
}

function StepNode({ state }: { state: 'done' | 'active' | 'upcoming' }) {
  return (
    <View style={styles.stepNodeOuter}>
      {state === 'active' ? <View style={styles.stepNodeRing} /> : null}
      <View
        style={[
          styles.stepNode,
          state === 'done' && styles.stepNodeDone,
          state === 'active' && styles.stepNodeActive,
          state === 'upcoming' && styles.stepNodeUpcoming,
        ]}
      >
        {state === 'done' ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
        {state === 'active' ? <Icon name="local-shipping" size={18} color={colors.onSecondary} /> : null}
        {state === 'upcoming' ? <View style={styles.stepNodeDot} /> : null}
      </View>
    </View>
  );
}

function TrackingTimeline({ tracking, delivered }: { tracking?: ApiTrackingInfo; delivered: boolean }) {
  const events = tracking?.timeline ?? [];
  const hasStatus = Boolean(tracking?.status && tracking.status.toLowerCase() !== 'none');
  const currentIndex = delivered ? events.length : Math.max(events.length - 1, 0);

  if (events.length === 0) {
    if (hasStatus) {
      return (
        <View style={styles.statusBanner}>
          <Icon name="local-shipping" size={22} color={colors.onSecondary} />
          <Text style={styles.statusBannerText}>{tracking?.status}</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyTimeline}>
        <Icon name="inventory" size={36} color={colors.outlineVariant} />
        <Text style={styles.emptyTimelineTitle}>No tracking updates yet</Text>
        <Text style={styles.emptyTimelineSub}>Tracking will appear here once your item is dispatched.</Text>
      </View>
    );
  }

  return (
    <View>
      {events.map((ev, i) => {
        const isLast = i === events.length - 1;
        const state: 'done' | 'active' | 'upcoming' = delivered || i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'upcoming';
        return (
          <View key={`${ev.status}-${i}`} style={styles.stepRow}>
            <View style={styles.stepRail}>
              <StepNode state={state} />
              {!isLast ? <View style={[styles.stepLine, state === 'done' ? styles.stepLineDone : styles.stepLinePending]} /> : null}
            </View>
            <View style={styles.stepBody}>
              <View style={styles.stepTitleRow}>
                <Text style={[styles.stepTitle, state === 'active' && styles.stepTitleActive]}>{ev.status}</Text>
                <Text style={[styles.stepDate, state === 'active' && styles.stepDateActive]}>{formatDateTime(ev.created_at)}</Text>
              </View>
              {ev.location ? <Text style={styles.stepLocation}>{ev.location}</Text> : null}
              {ev.notes ? <Text style={styles.stepNotes}>{ev.notes}</Text> : null}
            </View>
          </View>
        );
      })}
      {!delivered ? (
        <View style={styles.stepRow}>
          <View style={styles.stepRail}>
            <View style={[styles.stepNode, styles.stepNodeUpcoming]}>
              <View style={styles.stepNodeDot} />
            </View>
          </View>
          <View style={styles.stepBody}>
            <View style={styles.stepTitleRow}>
              <Text style={styles.stepTitlePending}>Package Delivered</Text>
              <Text style={styles.stepDate}>Pending</Text>
            </View>
            <Text style={styles.stepNotes}>Escrow release triggers once you confirm delivery.</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ItemTrackingInfo({ tracking }: { tracking?: ApiTrackingInfo }) {
  if (!tracking || (!tracking.tracking_number && !tracking.carrier)) {
    return null;
  }
  return (
    <View style={styles.itemTrackingRow}>
      {tracking.tracking_number ? <Text style={styles.itemTrackingText}>TN: {tracking.tracking_number}</Text> : null}
      {tracking.carrier ? <Text style={styles.itemTrackingText}>· {tracking.carrier}</Text> : null}
      {tracking.status && tracking.status.toLowerCase() !== 'none' ? <Text style={styles.itemTrackingText}>· {tracking.status}</Text> : null}
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
  const { goBack, navigate, params, switchTab } = useNavigation();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeOrder, setActiveOrder] = useState<ApiOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [returnItem, setReturnItem] = useState<ApiOrderItem | null>(null);

  const pendingOrderId = useMemo<number | null>(() => {
    const v = params?.orderId;
    if (typeof v === 'number') {
      return v;
    }
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }, [params]);

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
    if (!token || pendingOrderId == null || activeOrder) {
      return;
    }
    let active = true;
    setLoading(true);
    apiGetOrder(token, pendingOrderId)
      .then(o => {
        if (active) {
          setActiveOrder(o);
        }
      })
      .catch(e => {
        if (active) {
          setError(e instanceof Error ? e.message : 'Could not load this order.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token, pendingOrderId, activeOrder]);

  useEffect(() => {
    if (pendingOrderId == null) {
      loadOrders();
    }
  }, [pendingOrderId, loadOrders]);

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
    if (!token || !query.trim()) {
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

  const refreshDetail = useCallback(async () => {
    if (!token || !activeOrder) {
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await apiGetOrder(token, activeOrder.id);
      setActiveOrder(detail);
    } catch {
      Alert.alert('Refresh failed', 'Could not refresh tracking right now. Please try again.');
    } finally {
      setDetailLoading(false);
    }
  }, [token, activeOrder]);

  const onConfirmReceipt = (item: ApiOrderItem) => {
    const itemId = item.id;
    if (!token || !itemId || !activeOrder) {
      return;
    }
    Alert.alert(
      'Confirm Receipt',
      `Confirm that you received "${item.product_name}"?`,
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiMarkItemReceived(token, activeOrder.id, itemId);
              refreshDetail();
              Alert.alert('Receipt Confirmed', 'You can now return this item within 24 hours.');
            } catch (e) {
              Alert.alert('Could Not Confirm', e instanceof Error ? e.message : 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const onReorderItem = async (item: ApiOrderItem) => {
    try {
      const api = await fetchProductDetail(item.product_id);
      const product = apiProductToProduct(api);
      addItem(product, item.quantity || 1);
      Alert.alert('Added to Cart', `"${product.title}" was added to your cart.`, [
        { text: 'Keep Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => switchTab('Cart') },
      ]);
    } catch (e) {
      Alert.alert('Reorder Failed', e instanceof Error ? e.message : 'Could not add this item to your cart.');
    }
  };

  if (!isAuthenticated || !token) {
    return (
      <View style={styles.root}>
        <AppHeader title="Track Orders" showBack onBack={goBack} />
        <EmptyState
          icon="my-location"
          title="Sign in to track orders"
          subtitle="Follow your packages from dispatch to delivery."
          actionLabel="Sign In"
          onAction={() => navigate('Login')}
        />
      </View>
    );
  }

  if (activeOrder) {
    return (
      <View style={styles.root}>
        <AppHeader
          title={`Track Order ${activeOrder.order_number}`}
          showBack
          onBack={goBack}
          right={
            <Pressable style={styles.headerIconBtn} onPress={() => navigate('HelpCenter')} hitSlop={6}>
              <Icon name="help-outline" size={22} color={colors.onPrimary} />
            </Pressable>
          }
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={detailLoading} onRefresh={refreshDetail} tintColor={colors.secondary} />}
        >
          <View style={styles.detailTop}>
            <Text style={styles.detailOrderNumber}>{activeOrder.order_number}</Text>
            {detailLoading ? <Text style={styles.detailLoading}>Refreshing tracking...</Text> : null}
          </View>
          <TrackingOverview
            order={activeOrder}
            onConfirmReceipt={onConfirmReceipt}
            onStartReturn={setReturnItem}
            onReorder={onReorderItem}
          />
          {token ? (
            <ReturnItemModal
              visible={!!returnItem}
              token={token}
              orderId={activeOrder.id}
              item={returnItem}
              onClose={() => setReturnItem(null)}
              onSubmitted={refreshDetail}
            />
          ) : null}
        </ScrollView>
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.bottomActionPrimary}
            onPress={() => {
              const phone = activeOrder.items?.[0]?.tracking?.carrier;
              if (phone) {
                Linking.openURL(`tel:${phone}`);
              } else {
                Alert.alert('Contact Carrier', 'No carrier phone number available yet.');
              }
            }}
          >
            <Icon name="call" size={20} color={colors.onSecondary} />
            <Text style={styles.bottomActionPrimaryText}>Call Courier</Text>
          </Pressable>
          <Pressable style={styles.bottomActionOutline} onPress={() => navigate('HelpCenter')}>
            <Icon name="flag" size={20} color={colors.primaryContainer} />
            <Text style={styles.bottomActionOutlineText}>Report Issue</Text>
          </Pressable>
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

      {loading ? (
        <SectionLoader text="Loading your orders..." icon="local-shipping" />
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
          icon="my-location"
          title="No orders to track"
          subtitle="Orders you place will appear here with live tracking."
        />
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

function TrackingOverview({
  order,
  onConfirmReceipt,
  onStartReturn,
  onReorder,
}: {
  order: ApiOrder;
  onConfirmReceipt: (item: ApiOrderItem) => void;
  onStartReturn: (item: ApiOrderItem) => void;
  onReorder: (item: ApiOrderItem) => void;
}) {
  const tracking = primaryTracking(order.items);
  const delivered = Boolean(order.delivered_at);
  const statusText = (tracking?.status && tracking.status.toLowerCase() !== 'none' ? tracking.status : order.status).toUpperCase();
  const dispatchLocation = tracking?.dispatch_location ?? null;
  const destinationLocation = tracking?.destination_location
    ? tracking.destination_location
    : order.shipping_address
      ? `${order.shipping_address.city}, ${order.shipping_address.state}`
      : null;
  const events = tracking?.timeline ?? [];
  const lastEvent = events[events.length - 1];
  const progress = delivered ? 100 : events.length === 0 ? 0 : Math.min(Math.round((events.length / (events.length + 1)) * 100), 95);
  const bannerTitle = delivered
    ? `Delivered ${formatDate(order.delivered_at)}`
    : destinationLocation
      ? `Heading to ${destinationLocation}`
      : 'Shipment in progress';
  const bannerSub = delivered
    ? 'Escrow released on customer confirmation'
    : tracking?.dispatched_at
      ? `Dispatched ${formatDateTime(tracking.dispatched_at)}`
      : 'Tracking updates in real time';
  const carrier = tracking?.carrier ?? 'JEMINA Logistics';
  const carrierSub = tracking?.tracking_number ? `TN: ${tracking.tracking_number}` : dispatchLocation ? `Dispatch: ${dispatchLocation}` : 'Regional hub network';

  const items = order.items ?? [];
  const shipping = order.shipping_amount ?? 0;
  const tax = order.tax_amount ?? 0;
  const subtotal = Math.max((order.total_amount ?? 0) - shipping - tax, 0);

  const confirmableItem = items.find(i => i.can_confirm_receipt);
  const returnableItem = items.find(i => i.can_return);
  const reorderableItem = items.find(i => i.can_reorder && (i.stock_quantity ?? 0) > 0);
  const nextDeadline = items
    .filter(i => i.can_return && i.return_deadline)
    .map(i => i.return_deadline as string)
    .sort()[0];
  const hasActiveReturn = items.some(i => i.return_status && i.return_status !== 'completed');
  const anyReturnDeadline = items.some(i => i.return_deadline);

  return (
    <View style={styles.detailStack}>
      <View style={styles.card}>
        <View style={styles.bannerRow}>
          <View style={styles.bannerIcon}>
            <Icon name="local-shipping" size={24} color={colors.secondary} />
          </View>
          <View style={styles.bannerBody}>
            <View style={styles.bannerTop}>
              <Text style={styles.bannerEyebrow}>PRIORITY WHOLESALE TRANSIT</Text>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>{statusText}</Text>
              </View>
            </View>
            <Text style={styles.bannerTitle}>{bannerTitle}</Text>
            <Text style={styles.bannerSub}>{bannerSub}</Text>
          </View>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.carrierRow}>
          <View style={styles.carrierAvatar}>
            <Icon name="person" size={20} color={colors.onSecondary} />
          </View>
          <View style={styles.carrierBody}>
            <Text style={styles.carrierName}>{carrier}</Text>
            <Text style={styles.carrierSub}>{carrierSub}</Text>
          </View>
          {tracking?.tracking_number ? (
            <Pressable
              style={styles.carrierCallBtn}
              onPress={() => Alert.alert('Contact Carrier', `Tracking: ${tracking.tracking_number}\nCarrier: ${carrier}`)}
              hitSlop={6}
            >
              <Icon name="call" size={18} color={colors.onPrimary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {delivered ? (
        <View style={[styles.returnBanner, returnableItem ? styles.returnBannerOpen : styles.returnBannerMuted]}>
          <View style={styles.returnBannerIcon}>
            <Icon
              name={returnableItem ? 'assignment' : reorderableItem ? 'replay' : 'event-available'}
              size={20}
              color={returnableItem ? colors.onPrimary : colors.onSurfaceVariant}
            />
          </View>
          <View style={styles.returnBannerBody}>
            <Text style={styles.returnBannerTitle}>
              {returnableItem
                ? 'Return Window Open · 24h'
                : confirmableItem
                  ? 'Confirm Receipt'
                  : hasActiveReturn
                    ? 'Return In Progress'
                    : anyReturnDeadline
                      ? 'Return Window Expired'
                      : 'Delivered'}
            </Text>
            <Text style={styles.returnBannerSub}>
              {returnableItem && nextDeadline
                ? `Return by ${formatDateTime(nextDeadline)} at a pickup point.`
                : confirmableItem
                  ? 'Confirm delivery to unlock the 24-hour return window.'
                  : hasActiveReturn
                    ? 'We are processing your return. Drop-off details were sent to you.'
                    : reorderableItem
                      ? 'Returns are closed. Reorder items that are still in stock.'
                      : 'No further actions available for this order.'}
            </Text>
          </View>
          {returnableItem ? (
            <Pressable style={styles.returnBannerBtn} onPress={() => onStartReturn(returnableItem)}>
              <Text style={styles.returnBannerBtnText}>Return</Text>
            </Pressable>
          ) : confirmableItem ? (
            <Pressable style={styles.returnBannerBtn} onPress={() => onConfirmReceipt(confirmableItem)}>
              <Text style={styles.returnBannerBtnText}>Confirm</Text>
            </Pressable>
          ) : reorderableItem ? (
            <Pressable style={styles.returnBannerBtn} onPress={() => onReorder(reorderableItem)}>
              <Text style={styles.returnBannerBtnText}>Reorder</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.etaCard}>
        <View style={styles.etaRow}>
          <View style={styles.etaIcon}>
            <Icon name="schedule" size={20} color={colors.onPrimary} />
          </View>
          <View style={styles.etaBody}>
            <Text style={styles.etaLabel}>Estimated Delivery</Text>
            <Text style={styles.etaValue}>
              {delivered
                ? `Delivered ${formatDate(order.delivered_at)}`
                : tracking?.dispatched_at
                  ? 'Tomorrow by 4:00 PM'
                  : 'Pending dispatch'}
            </Text>
          </View>
          <View style={[styles.etaBadge, delivered && styles.etaBadgeDone]}>
            <Text style={[styles.etaBadgeText, delivered && styles.etaBadgeTextDone]}>
              {delivered ? 'DONE' : 'ON SCHEDULE'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.corridorHeader}>
          <View style={styles.corridorTitleWrap}>
            <Icon name="alt-route" size={18} color={colors.secondary} />
            <Text style={styles.corridorTitle}>Transit Corridor</Text>
          </View>
          <Text style={styles.corridorMeta}>{progress}% complete</Text>
        </View>

        <View style={styles.routeInner}>
          <View style={styles.routeNodes}>
            <View style={styles.routeNode}>
              <View style={[styles.routeNodeIcon, styles.routeNodeOrigin]}>
                <Icon name="warehouse" size={16} color={colors.onPrimary} />
              </View>
              <Text style={styles.routeNodeLabel} numberOfLines={1}>{dispatchLocation ?? 'Vendor Hub'}</Text>
              {tracking?.dispatched_at ? <Text style={styles.routeNodeSub} numberOfLines={1}>Dep. {formatDateTime(tracking.dispatched_at)}</Text> : null}
            </View>
            <View style={styles.routeTrack}>
              <View style={[styles.routeFill, { width: `${progress}%` }]} />
              <View style={[styles.routeTruck, { left: `${progress}%` }]}>
                <View style={styles.routeTruckDot}>
                  <Icon name="local-shipping" size={14} color={colors.onSecondary} />
                </View>
              </View>
            </View>
            <View style={styles.routeNode}>
              <View style={[styles.routeNodeIcon, styles.routeNodeDest]}>
                <Icon name="location-on" size={16} color={colors.outline} />
              </View>
              <Text style={styles.routeNodeLabel} numberOfLines={1}>{destinationLocation ?? 'Delivery Point'}</Text>
              <Text style={styles.routeNodeSub} numberOfLines={1}>{delivered ? 'Arrived' : 'Arrival pending'}</Text>
            </View>
          </View>

          {lastEvent ? (
            <View style={styles.checkpointPill}>
              <View style={styles.checkpointDot} />
              <Text style={styles.checkpointText} numberOfLines={1}>Checkpoint: {lastEvent.status}</Text>
              <Text style={styles.checkpointTime}>{formatDateTime(lastEvent.created_at)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shipment Activity</Text>
          <Text style={styles.sectionMeta}>Real-time Telemetry</Text>
        </View>
        <TrackingTimeline tracking={tracking} delivered={delivered} />
      </View>

      {!delivered ? (
        <View style={styles.otpCard}>
          <View style={styles.otpHeader}>
            <Icon name="qr-code" size={22} color={colors.primary} />
            <Text style={styles.otpTitle}>Delivery Verification OTP</Text>
          </View>
          <Text style={styles.otpDesc}>Show this code to the courier upon delivery to release escrow.</Text>
          <View style={styles.otpCodeRow}>
            <Text style={styles.otpCode}>
              {tracking?.tracking_number
                ? tracking.tracking_number.slice(-3).padStart(3, '0')
                : '---'}
            </Text>
            <View style={styles.otpSeparator} />
            <Text style={styles.otpCode}>
              {tracking?.tracking_number
                ? tracking.tracking_number.slice(0, 3).padStart(3, '0')
                : '---'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Items In Shipment</Text>
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>{items.length} Product{items.length === 1 ? '' : 's'}</Text>
            </View>
          </View>
          {tracking?.tracking_number ? <Text style={styles.sectionMeta}>Consignment #{tracking.tracking_number}</Text> : null}
        </View>
        {items.map((item, i) => {
          const categoryBadge = item.sku?.includes('IRR') ? 'IRRIGATION'
            : item.sku?.includes('AGR') ? 'AGRO'
            : item.product_name.toLowerCase().includes('solar') ? 'ENERGY'
            : item.product_name.toLowerCase().includes('pump') ? 'IRRIGATION'
            : null;
          return (
            <View key={`${item.product_id}-${i}`} style={[styles.shipItem, i > 0 && styles.shipItemDivider]}>
              {item.product_image ? (
                <Image source={{ uri: item.product_image }} style={styles.shipImage} resizeMode="cover" />
              ) : (
                <View style={[styles.shipImage, styles.shipImagePlaceholder]}>
                  <Icon name="store" size={20} color={colors.outlineVariant} />
                </View>
              )}
              <View style={styles.shipItemBody}>
                <View style={styles.shipItemNameRow}>
                  <Text style={styles.shipItemName} numberOfLines={2}>{item.product_name}</Text>
                  {categoryBadge ? (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{categoryBadge}</Text>
                    </View>
                  ) : null}
                </View>
                {item.sku ? <Text style={styles.shipItemSku}>SKU: {item.sku}</Text> : null}
                <Text style={styles.shipItemNote}>Qty: {item.quantity} unit{item.quantity === 1 ? '' : 's'}</Text>
                <ItemTrackingInfo tracking={item.tracking} />
                <Text style={styles.shipItemTotal}>{formatUGX(item.total)}</Text>
                {delivered && (item.can_confirm_receipt || item.can_return || (item.can_reorder && (item.stock_quantity ?? 0) > 0)) ? (
                  <View style={styles.shipItemActions}>
                    {item.can_confirm_receipt ? (
                      <Pressable
                        style={[styles.shipItemActionBtn, styles.shipItemActionPrimary]}
                        onPress={() => onConfirmReceipt(item)}
                      >
                        <Icon name="check-circle" size={13} color={colors.onPrimary} />
                        <Text style={styles.shipItemActionPrimaryText}>Confirm Receipt</Text>
                      </Pressable>
                    ) : null}
                    {item.can_return ? (
                      <Pressable
                        style={[styles.shipItemActionBtn, styles.shipItemActionReturn]}
                        onPress={() => onStartReturn(item)}
                      >
                        <Icon name="assignment" size={13} color={colors.primaryContainer} />
                        <Text style={styles.shipItemActionReturnText}>Return · 24h</Text>
                      </Pressable>
                    ) : null}
                    {item.can_reorder && (item.stock_quantity ?? 0) > 0 ? (
                      <Pressable
                        style={[styles.shipItemActionBtn, styles.shipItemActionOutline]}
                        onPress={() => onReorder(item)}
                      >
                        <Icon name="replay" size={13} color={colors.primaryContainer} />
                        <Text style={styles.shipItemActionOutlineText}>Reorder</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
        <View style={styles.breakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Wholesale Subtotal</Text>
            <Text style={styles.breakdownValue}>{formatUGX(subtotal)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Commercial Cargo Freight</Text>
            <Text style={styles.breakdownValue}>{formatUGX(shipping)}</Text>
          </View>
          <View style={styles.breakdownTotalRow}>
            <Text style={styles.breakdownTotalLabel}>Total Escrow Value</Text>
            <Text style={styles.breakdownTotalValue}>{formatUGX(order.total_amount ?? 0)}</Text>
          </View>
        </View>
      </View>
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
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  headerIconBtn: {
    padding: spacing.xs,
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
    borderRadius: radius.lg,
    padding: spacing.md,
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
    ...typography.headlineSm,
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
  detailTop: {
    marginBottom: spacing.md,
  },
  detailOrderNumber: {
    ...typography.headlineMd,
    color: colors.primary,
    fontWeight: '700',
  },
  detailLoading: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 2,
  },
  detailStack: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBody: {
    flex: 1,
    minWidth: 0,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  bannerEyebrow: {
    ...typography.labelSm,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  bannerBadge: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bannerBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  bannerTitle: {
    ...typography.headlineSm,
    color: colors.primary,
    marginTop: 4,
  },
  bannerSub: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  carrierAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierBody: {
    flex: 1,
  },
  carrierCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierName: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
  },
  carrierSub: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 1,
  },
  corridorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  corridorTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  corridorTitle: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  corridorMeta: {
    ...typography.labelSm,
    color: colors.outline,
  },
  routeInner: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  routeNodes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  routeNode: {
    alignItems: 'center',
    width: 96,
  },
  routeNodeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeNodeOrigin: {
    backgroundColor: colors.primaryContainer,
  },
  routeNodeDest: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  routeNodeLabel: {
    ...typography.labelMd,
    color: colors.primary,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  routeNodeSub: {
    ...typography.bodySm,
    color: colors.outline,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 2,
  },
  routeTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    marginTop: 13,
    marginHorizontal: 6,
    position: 'relative',
  },
  routeFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.secondaryContainer,
  },
  routeTruck: {
    position: 'absolute',
    top: -9,
    marginLeft: -12,
  },
  routeTruckDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  checkpointPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  checkpointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondaryContainer,
  },
  checkpointText: {
    ...typography.labelSm,
    color: colors.onSurface,
    flex: 1,
  },
  checkpointTime: {
    ...typography.bodySm,
    color: colors.outline,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
  },
  sectionMeta: {
    ...typography.labelSm,
    color: colors.outline,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statusBannerText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
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
  emptyTimelineSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepRail: {
    alignItems: 'center',
  },
  stepNodeOuter: {
    position: 'relative',
    width: 28,
    height: 28,
    zIndex: 10,
  },
  stepNodeRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.tertiary,
    opacity: 0.4,
  },
  stepNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stepNodeDone: {
    backgroundColor: colors.primaryContainer,
  },
  stepNodeActive: {
    backgroundColor: colors.secondaryContainer,
    borderWidth: 4,
    borderColor: colors.secondaryFixed,
  },
  stepNodeUpcoming: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  stepNodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.outlineVariant,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
  },
  stepLineDone: {
    backgroundColor: colors.primaryContainer,
  },
  stepLinePending: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  stepBody: {
    flex: 1,
    paddingBottom: spacing.lg,
    paddingTop: 2,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepTitle: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  stepTitleActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  stepTitlePending: {
    ...typography.labelLg,
    color: colors.outline,
  },
  stepDate: {
    ...typography.bodySm,
    color: colors.outline,
  },
  stepDateActive: {
    color: colors.secondary,
    fontWeight: '600',
  },
  stepLocation: {
    ...typography.labelMd,
    color: colors.secondary,
    marginTop: 2,
  },
  stepNotes: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  countChip: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countChipText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  shipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  shipItemDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
  },
  shipImage: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  shipImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shipItemBody: {
    flex: 1,
    minWidth: 0,
  },
  shipItemNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  shipItemName: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    ...typography.labelSm,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  shipItemSku: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  shipItemNote: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  shipItemTotal: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 15,
    marginTop: 4,
  },
  itemTrackingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemTrackingText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  breakdown: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
    marginTop: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  breakdownLabel: {
    ...typography.bodySm,
    color: colors.outline,
  },
  breakdownValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    paddingTop: 4,
    marginTop: 4,
  },
  breakdownTotalLabel: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  breakdownTotalValue: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  etaCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  etaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaBody: {
    flex: 1,
  },
  etaLabel: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
    opacity: 0.7,
  },
  etaValue: {
    ...typography.headlineSm,
    color: colors.onPrimaryContainer,
    fontWeight: '700',
    marginTop: 2,
  },
  etaBadge: {
    backgroundColor: colors.onPrimaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  etaBadgeDone: {
    backgroundColor: colors.secondary,
  },
  etaBadgeText: {
    ...typography.labelSm,
    color: colors.primaryContainer,
    fontWeight: '700',
    fontSize: 10,
  },
  etaBadgeTextDone: {
    color: colors.onSecondary,
  },
  otpCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  otpTitle: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
  },
  otpDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  otpCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  otpCode: {
    ...typography.headlineLg,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 32,
    letterSpacing: 4,
  },
  otpSeparator: {
    width: 2,
    height: 32,
    backgroundColor: colors.outlineVariant,
    borderRadius: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.gutter,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  bottomActionPrimary: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bottomActionPrimaryText: {
    ...typography.labelLg,
    color: colors.onSecondaryContainer,
    fontWeight: '600',
  },
  bottomActionOutline: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bottomActionOutlineText: {
    ...typography.labelLg,
    color: colors.primaryContainer,
    fontWeight: '600',
  },
  returnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  returnBannerOpen: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondary,
  },
  returnBannerMuted: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.surfaceContainerHigh,
  },
  returnBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnBannerBody: {
    flex: 1,
  },
  returnBannerTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '800',
  },
  returnBannerSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  returnBannerBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  returnBannerBtnText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '800',
  },
  shipItemActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  shipItemActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  shipItemActionPrimary: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  shipItemActionPrimaryText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  shipItemActionReturn: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.secondary,
  },
  shipItemActionReturnText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  shipItemActionOutline: {
    backgroundColor: 'transparent',
    borderColor: colors.outlineVariant,
  },
  shipItemActionOutlineText: {
    ...typography.labelSm,
    color: colors.primaryContainer,
    fontWeight: '700',
  },
});