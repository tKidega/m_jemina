import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { useCart } from '../state/CartContext';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiCreateOrder, apiGetCreditBalance, apiGetAddresses, apiApplyVoucher, apiGetPaymentMethods } from '../data/api';
import type { ApiPaymentMethod, ApiAddress, ApiShippingAddress } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

type PaymentMethodKey = 'saved' | 'cod' | 'bitcoin' | 'credit';

interface PaymentOption {
  key: PaymentMethodKey;
  label: string;
  icon: IconName;
  note: string;
  method: string;
  gateway?: string;
}

interface PickupPoint {
  id: string;
  name: string;
  location: string;
  city: string;
  state: string;
}

const PICKUP_POINTS: PickupPoint[] = [
  {
    id: 'jemina-point',
    name: 'Jemina Point',
    location: 'Jemina Official · 789 Commerce Street, Building A, Gulu, Uganda',
    city: 'Gulu',
    state: 'Northern Region',
  },
];

type Fulfilment = 'pickup' | 'delivery';

function providerLabel(provider: string): string {
  const p = provider.toLowerCase();
  if (p === 'mtn') return 'MTN Mobile Money';
  if (p === 'airtel') return 'Airtel Money';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function maskAccount(method: ApiPaymentMethod): string {
  return method.type === 'card' ? `•••• ${method.account_number.slice(-4)}` : method.account_number;
}

function gatewayForSavedMethod(method: ApiPaymentMethod): string {
  if (method.type === 'card') return 'stripe';
  if (method.type === 'mobile_money' && method.provider.toLowerCase() === 'mtn') return 'mtn_mobile_money';
  return 'flutterwave';
}

export function CheckoutScreen() {
  const { items, vendorGroups, subtotal, totalDeliveryFees, clearCart } = useCart();
  const { token, user, authMode } = useAuth();
  const { goBack, navigate } = useNavigation();

  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup');
  const [defaultAddress, setDefaultAddress] = useState<ApiAddress | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('cod');
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherDiscount, setVoucherDiscount] = useState<number | null>(null);
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!token) {
      setCreditBalance(null);
      return;
    }
    try {
      const [bal, methods, addrs] = await Promise.all([
        apiGetCreditBalance(token).catch(() => null),
        apiGetPaymentMethods(token).catch(() => []),
        apiGetAddresses(token).catch(() => []),
      ]);
      if (bal != null) setCreditBalance(bal.balance);
      setSavedPaymentMethods(methods);
      if (addrs.length > 0) {
        setDefaultAddress(addrs.find(a => a.is_default) ?? addrs[0]);
      } else {
        setDefaultAddress(null);
      }
    } catch {
      // individual catches above handle each call
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const defaultSavedMethod = useMemo(() => {
    if (savedPaymentMethods.length === 0) {
      return null;
    }
    return savedPaymentMethods.find(m => m.is_default) ?? savedPaymentMethods[0];
  }, [savedPaymentMethods]);

  const paymentOptions = useMemo<PaymentOption[]>(() => {
    const options: PaymentOption[] = [];
    if (defaultSavedMethod) {
      const gateway = gatewayForSavedMethod(defaultSavedMethod);
      options.push({
        key: 'saved',
        label: providerLabel(defaultSavedMethod.provider),
        icon: defaultSavedMethod.type === 'card' ? 'credit-card' : 'smartphone',
        note: `${maskAccount(defaultSavedMethod)} · Default`,
        method: gateway,
        gateway,
      });
    }
    options.push(
      { key: 'cod', label: 'Cash on Delivery', icon: 'payment', note: 'Pay when your order arrives', method: 'cod' },
      { key: 'bitcoin', label: 'Bitcoin', icon: 'currency-bitcoin', note: 'Pay with crypto', method: 'bitcoin', gateway: 'bitcoin' },
      { key: 'credit', label: 'JEMINA Credits', icon: 'account-balance-wallet', note: 'Pay with your credits', method: 'credit' },
    );
    return options;
  }, [defaultSavedMethod]);

  useEffect(() => {
    if (paymentMethod === 'saved' && !defaultSavedMethod) {
      setPaymentMethod('cod');
    }
  }, [defaultSavedMethod, paymentMethod]);

  const platformFee = 1500;
  const totals = useMemo(() => {
    const delivery = totalDeliveryFees;
    const discount = voucherDiscount ?? 0;
    const total = subtotal + delivery + platformFee - discount;
    return { subtotal, delivery, platformFee, discount, total: Math.max(total, 0) };
  }, [subtotal, totalDeliveryFees, platformFee, voucherDiscount]);

  const selectedPickupPoint = PICKUP_POINTS[0];

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || !token) return;
    setVoucherLoading(true);
    setVoucherMessage(null);
    setVoucherDiscount(null);
    try {
      const result = await apiApplyVoucher(token, voucherCode.trim(), subtotal);
      setVoucherDiscount(result.discount);
      setVoucherMessage(result.formatted_discount + ' discount applied!');
    } catch (e) {
      setVoucherMessage(e instanceof Error ? e.message : 'Invalid voucher code');
    } finally {
      setVoucherLoading(false);
    }
  };

  const buildShippingAddress = (): ApiShippingAddress | null => {
    if (fulfilment === 'pickup') {
      const point = selectedPickupPoint;
      return {
        name: point.name,
        address: point.location,
        city: point.city,
        state: point.state,
        zip_code: '256',
        country: 'Uganda',
        phone: user?.phone ?? defaultAddress?.phone ?? '',
      };
    }
    if (!defaultAddress) {
      return null;
    }
    const a = defaultAddress;
    return {
      name: a.full_name || a.name || user?.name || '',
      address: a.street_address,
      city: a.city ?? '',
      state: a.region ?? '',
      zip_code: a.zip_code ?? '',
      country: 'Uganda',
      phone: a.phone ?? user?.phone ?? '',
    };
  };

  const validate = (): string | null => {
    if (!items.length) {
      return 'Your cart is empty.';
    }
    if (fulfilment === 'delivery' && !defaultAddress) {
      return 'Add an address to your address book to enable delivery.';
    }
    if (paymentMethod === 'credit' && creditBalance != null && creditBalance < totals.total) {
      return `Insufficient credits. You need ${formatUGX(totals.total)} but have ${formatUGX(creditBalance)}.`;
    }
    return null;
  };

  const handlePlaceOrder = async () => {
    setError(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    if (!user) {
      navigate('Login');
      return;
    }
    if (authMode === 'demo') {
      clearCart();
      navigate('Orders');
      return;
    }
    if (!token) {
      navigate('Login');
      return;
    }
    setLoading(true);
    try {
      const shippingAddress = buildShippingAddress();
      if (!shippingAddress) {
        setError('Add a delivery address or choose pickup at Jemina Point.');
        setLoading(false);
        return;
      }
      const option = paymentOptions.find(o => o.key === paymentMethod);
      if (!option) {
        setError('Select a payment method.');
        setLoading(false);
        return;
      }
      const order = await apiCreateOrder(token, {
        items: items.map(i => ({ product_id: Number(i.product.id), quantity: i.quantity })),
        shipping_address: shippingAddress,
        payment_method: option.method,
        notes: notes || undefined,
        voucher_code: voucherCode || undefined,
        discount_amount: voucherDiscount || undefined,
        pickup_point:
          fulfilment === 'pickup'
            ? { name: selectedPickupPoint.name, location: selectedPickupPoint.location }
            : null,
        fulfilment,
      });
      clearCart();
      if (paymentMethod === 'credit' || paymentMethod === 'cod') {
        navigate('Orders');
      } else {
        navigate('Payment', {
          gateway: option.gateway as string,
          amount: totals.total,
          orderId: order.id,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="Checkout & Payment"
        showBack
        onBack={goBack}
        right={
          <View style={styles.secureBadge}>
            <Icon name="lock" size={14} color={colors.onPrimary} />
            <Text style={styles.secureBadgeText}>SECURE</Text>
          </View>
        }
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {/* Stepper */}
          <View style={styles.stepper}>
            <View style={[styles.stepItem, styles.stepItemComplete]}>
              <View style={[styles.stepDot, styles.stepDotComplete]}><Icon name="check" size={14} color={colors.onPrimary} /></View>
              <Text style={styles.stepLabel}>Delivery & Address</Text>
            </View>
            <View style={styles.stepConnector} />
            <View style={styles.stepItem}>
              <View style={styles.stepDot}><Text style={styles.stepNumber}>2</Text></View>
              <Text style={styles.stepLabelActive}>Review & Pay</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="error-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!user ? (
            <View style={styles.signInCard}>
              <Icon name="lock" size={24} color={colors.secondary} />
              <Text style={styles.signInTitle}>Sign in to check out</Text>
              <Text style={styles.signInSub}>Your cart will be saved on the server.</Text>
              <Button label="Sign In" variant="primary" fullWidth onPress={() => navigate('Login')} style={styles.signInBtn} />
              <Button label="Create an Account" variant="outline" fullWidth onPress={() => navigate('Register')} />
            </View>
          ) : null}

          {/* Fulfilment toggle */}
          <View style={styles.toggleWrap}>
            <View style={styles.toggleBg}>
              <Pressable
                style={[styles.toggleBtn, fulfilment === 'delivery' && styles.toggleBtnActive]}
                onPress={() => {
                  if (!defaultAddress && fulfilment !== 'delivery') {
                    navigate('AddressBook');
                    return;
                  }
                  setFulfilment('delivery');
                }}
              >
                <Icon name="local-shipping" size={16} color={fulfilment === 'delivery' ? colors.secondary : colors.outline} />
                <Text style={[styles.toggleText, fulfilment === 'delivery' && styles.toggleTextActive]}>Deliver to Address</Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, fulfilment === 'pickup' && styles.toggleBtnActive]}
                onPress={() => setFulfilment('pickup')}
              >
                <Icon name="storefront" size={16} color={fulfilment === 'pickup' ? colors.secondary : colors.outline} />
                <Text style={[styles.toggleText, fulfilment === 'pickup' && styles.toggleTextActive]}>Gulu Pickup Hub</Text>
              </Pressable>
            </View>
          </View>

          {/* Address card */}
          {fulfilment === 'delivery' ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="location-on" size={20} color={colors.secondary} />
                <View style={styles.flex}>
                  <View style={styles.cardLabelRow}>
                    <Text style={styles.cardLabel}>Primary Delivery Location</Text>
                    <View style={styles.chipPrimary}><Text style={styles.chipPrimaryText}>PRIMARY</Text></View>
                  </View>
                  {defaultAddress ? (
                    <>
                      <Text style={styles.addressLine}>{defaultAddress.street_address}{defaultAddress.city ? `, ${defaultAddress.city}` : ''}{defaultAddress.region ? `, ${defaultAddress.region}` : ''}</Text>
                      <Text style={styles.addressSub}>Contact: {defaultAddress.phone ?? user?.phone ?? '—'}</Text>
                    </>
                  ) : (
                    <Text style={styles.pickupMissing}>No default address set yet.</Text>
                  )}
                </View>
              </View>
              <Pressable onPress={() => navigate('AddressBook')} hitSlop={8}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="storefront" size={20} color={colors.secondary} />
                <View style={styles.flex}>
                  <Text style={styles.cardLabel}>{selectedPickupPoint.name}</Text>
                  <Text style={styles.addressLine} numberOfLines={2}>{selectedPickupPoint.location}</Text>
                  <Text style={styles.addressSub}>Collect your order at the Jemina Official pickup point.</Text>
                </View>
              </View>
              <Pressable onPress={() => navigate('AddressBook')} hitSlop={8}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
          )}

          {/* Shipment Packages */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shipment Packages ({vendorGroups.length})</Text>
            <Text style={styles.sectionMeta}>Multi-Vendor Fulfilled</Text>
          </View>
          {vendorGroups.map((group, idx) => (
            <View key={group.vendorId ?? group.vendorName} style={styles.vendorCard}>
              <View style={styles.vendorHeader}>
                <View style={styles.vendorTitleRow}>
                  <Icon name="store" size={18} color={colors.primary} />
                  <Text style={styles.vendorTitle}>{group.vendorName}</Text>
                </View>
                <View style={styles.batchChip}><Text style={styles.batchChipText}>Batch #{String(idx + 1).padStart(2, '0')}</Text></View>
              </View>
              {group.items.map(item => (
                <View key={item.product.id} style={styles.itemRow}>
                  <View style={styles.itemThumb}>
                    {item.product.image ? (
                      <View style={styles.itemThumbPlaceholder}><Icon name="store" size={22} color={colors.outlineVariant} /></View>
                    ) : (
                      <View style={styles.itemThumbPlaceholder}><Icon name="store" size={22} color={colors.outlineVariant} /></View>
                    )}
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.quantity}x {item.product.title}</Text>
                    <Text style={styles.itemPrice}>{formatUGX(item.product.priceValue * item.quantity)}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.deliveryFeeRow}>
                <Icon name="local-shipping" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.deliveryFeeLabel}>Vendor Delivery Fee</Text>
                <Text style={styles.deliveryFeeValue}>{formatUGX(group.deliveryFee)}</Text>
              </View>
            </View>
          ))}

          {/* Voucher */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Voucher or Promotional Code</Text>
            <View style={styles.couponRow}>
              <View style={styles.couponInputWrap}>
                <Icon name="sell" size={18} color={colors.outline} style={styles.couponIcon} />
                <TextInput
                  style={styles.couponInput}
                  value={voucherCode}
                  onChangeText={setVoucherCode}
                  placeholder="Enter Coupon"
                  placeholderTextColor={colors.outline}
                  autoCapitalize="characters"
                />
              </View>
              <Pressable style={styles.couponApplyBtn} onPress={handleApplyVoucher}>
                <Text style={styles.couponApplyBtnText}>{voucherLoading ? '...' : 'Apply'}</Text>
              </Pressable>
            </View>
            {voucherMessage ? (
              <Text style={[styles.couponMsg, voucherDiscount != null ? styles.couponSuccess : styles.couponError]}>
                {voucherMessage}
              </Text>
            ) : null}
          </View>

          {/* Payment Method */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <Text style={styles.sectionMeta}>Escrow Protection</Text>
          </View>

          {savedPaymentMethods.length > 0 ? (
            <Pressable style={styles.savedPayCard} onPress={() => navigate('PaymentMethods')}>
              <View style={styles.savedPayBody}>
                <Text style={styles.savedPayLabel}>Saved payment methods</Text>
                <Text style={styles.savedPayValue}>{savedPaymentMethods.length} saved · tap to manage</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.primary} />
            </Pressable>
          ) : null}

          {paymentOptions.map(option => {
            const active = paymentMethod === option.key;
            const isCredit = option.key === 'credit';
            return (
              <View key={option.key} style={[styles.payCard, active && styles.payCardActive]}>
                <TouchableOpacity activeOpacity={0.7} style={styles.payRow} onPress={() => setPaymentMethod(option.key)}>
                  <View style={[styles.payRadio, active && styles.payRadioActive]}>
                    {active ? <View style={styles.payRadioDot} /> : null}
                  </View>
                  <View style={styles.payBody}>
                    <View style={styles.payLabelRow}>
                      <Text style={[styles.payLabel, active && styles.payLabelActive]}>{option.label}</Text>
                      {isCredit && creditBalance != null ? (
                        <View style={styles.chipSurface}><Text style={styles.chipSurfaceText}>UGX {creditBalance.toLocaleString()} Available</Text></View>
                      ) : null}
                      {option.key === 'cod' ? (
                        <View style={styles.chipSurface}><Text style={styles.chipSurfaceText}>Eligible &lt; 500k</Text></View>
                      ) : null}
                    </View>
                    <Text style={styles.payNote}>{option.note}</Text>
                  </View>
                  <Icon name={option.icon} size={20} color={active ? colors.secondary : colors.outline} />
                </TouchableOpacity>
                {isCredit && creditBalance != null && active ? (
                  <View style={styles.creditBanner}>
                    <Text style={styles.creditBannerText}>Applying your available credits to this order</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* Order notes */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Order & Dispatch Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Special delivery instructions for vendor or courier..."
              placeholderTextColor={colors.outline}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Payment Summary */}
          <View style={styles.card}>
            <Text style={styles.summaryHeader}>Payment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatUGX(totals.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vendor Delivery Fees</Text>
              <Text style={styles.summaryValue}>{formatUGX(totals.delivery)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Escrow & Service Fee</Text>
              <Text style={styles.summaryValue}>{formatUGX(totals.platformFee)}</Text>
            </View>
            {totals.discount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.statusSuccess }]}>JEMINA Credits Applied</Text>
                <Text style={[styles.summaryValue, { color: colors.statusSuccess }]}>-{formatUGX(totals.discount)}</Text>
              </View>
            ) : null}
            <View style={styles.summaryDivider} />
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalSub}>Includes all applicable local taxes</Text>
              </View>
              <Text style={styles.totalValue}>{formatUGX(totals.total)}</Text>
            </View>
          </View>
          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.placeOrderBtn, loading && styles.placeOrderBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          <Icon name="verified-user" size={20} color={colors.secondaryContainer} />
          <Text style={styles.placeOrderBtnText}>{loading ? 'Placing Order...' : `Place Order & Pay ${formatUGX(totals.total)}`}</Text>
          <Icon name="arrow-forward" size={20} color={colors.secondaryContainer} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  spacer: {
    height: 80,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  secureBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    letterSpacing: 1,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.6,
  },
  stepItemComplete: {
    opacity: 1,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotComplete: {
    backgroundColor: colors.primaryContainer,
  },
  stepNumber: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  stepLabel: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '600',
  },
  stepLabelActive: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.surfaceContainerHigh,
    marginHorizontal: spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.labelMd,
    color: colors.onErrorContainer,
    flex: 1,
  },
  signInCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  signInTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  signInSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  signInBtn: {
    marginBottom: spacing.sm,
  },
  toggleWrap: {
    marginBottom: spacing.md,
  },
  toggleBg: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.lg - 2,
  },
  toggleBtnActive: {
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  toggleText: {
    ...typography.labelMd,
    color: colors.outline,
  },
  toggleTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  chipPrimary: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipPrimaryText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 9,
  },
  addressLine: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
    marginTop: 4,
  },
  addressSub: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
  },
  changeLink: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  pickupMissing: {
    ...typography.labelSm,
    color: colors.error,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
  vendorCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  vendorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vendorTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  batchChip: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  batchChipText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  itemThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  itemPrice: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  deliveryFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLow,
  },
  deliveryFeeLabel: {
    ...typography.bodySm,
    color: colors.outline,
    flex: 1,
  },
  deliveryFeeValue: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  couponRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  couponInputWrap: {
    flex: 1,
    position: 'relative',
  },
  couponIcon: {
    position: 'absolute',
    left: 10,
    top: 11,
  },
  couponInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingLeft: 36,
    paddingRight: spacing.md,
    height: 48,
  },
  couponApplyBtn: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  couponApplyBtnText: {
    ...typography.labelLg,
    color: colors.onSecondaryContainer,
    fontWeight: '700',
  },
  couponMsg: {
    ...typography.labelSm,
    marginTop: spacing.xs,
  },
  couponSuccess: {
    color: colors.statusSuccess,
  },
  couponError: {
    color: colors.error,
  },
  savedPayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  savedPayBody: { flex: 1 },
  savedPayLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  savedPayValue: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700', marginTop: 2 },
  payCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  payCardActive: {
    borderWidth: 2,
    borderColor: colors.secondaryContainer,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  payRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payRadioActive: {
    borderColor: colors.secondary,
  },
  payRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  payBody: { flex: 1 },
  payLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  payLabel: { ...typography.labelLg, color: colors.onSurface, fontWeight: '700' },
  payLabelActive: { color: colors.secondary },
  chipSurface: { backgroundColor: colors.surfaceContainer, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  chipSurfaceText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '600', fontSize: 10 },
  payNote: { ...typography.bodySm, color: colors.outline, marginTop: 2 },
  creditBanner: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: -4,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  creditBannerText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  input: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  summaryHeader: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    ...typography.bodyMd,
    color: colors.outline,
  },
  summaryValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  totalLabel: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '800',
  },
  totalSub: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  totalValue: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  placeOrderBtn: {
    height: 48,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  placeOrderBtnDisabled: {
    opacity: 0.6,
  },
  placeOrderBtnText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
});
