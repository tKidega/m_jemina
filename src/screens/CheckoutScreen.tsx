import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherDiscount, setVoucherDiscount] = useState<number | null>(null);
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setCreditBalance(null);
      return;
    }
    let cancelled = false;
    apiGetCreditBalance(token)
      .then(data => { if (!cancelled) setCreditBalance(data.balance); })
      .catch(() => { if (!cancelled) setCreditBalance(null); });
    apiGetPaymentMethods(token)
      .then(data => { if (!cancelled) setSavedPaymentMethods(data); })
      .catch(() => { if (!cancelled) setSavedPaymentMethods([]); });
    apiGetAddresses(token)
      .then(addrs => {
        if (!cancelled && addrs.length > 0) {
          setDefaultAddress(addrs.find(a => a.is_default) ?? addrs[0]);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

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
      { key: 'credit', label: 'JEMINA Credits', icon: 'local-atm', note: 'Pay with your credits', method: 'credit' },
    );
    return options;
  }, [defaultSavedMethod]);

  useEffect(() => {
    if (paymentMethod === 'saved' && !defaultSavedMethod) {
      setPaymentMethod('cod');
    } else if (paymentMethod !== 'saved' && defaultSavedMethod) {
      setPaymentMethod('saved');
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
        phone: user?.phone ?? '',
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
      <AppHeader title="Checkout" showBack onBack={goBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Vendor-grouped order summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {vendorGroups.map(group => (
              <View key={group.vendorId ?? group.vendorName} style={styles.summaryCard}>
                <View style={styles.vendorTag}>
                  <Icon name="store" size={14} color={colors.primary} />
                  <Text style={styles.vendorTagText}>{group.vendorName}</Text>
                </View>
                {group.items.map(item => (
                  <View key={item.product.id} style={styles.summaryRow}>
                    <Text style={styles.summaryItemName} numberOfLines={1}>
                      {item.quantity} x {item.product.title}
                    </Text>
                    <Text style={styles.summaryItemPrice}>
                      {formatUGX(item.product.priceValue * item.quantity)}
                    </Text>
                  </View>
                ))}
                <View style={styles.deliveryRow}>
                  <Icon name="local-shipping" size={12} color={colors.onSurfaceVariant} />
                  <Text style={styles.deliveryLabel}>Delivery</Text>
                  <Text style={styles.deliveryValue}>{formatUGX(group.deliveryFee)}</Text>
                </View>
              </View>
            ))}

            <View style={styles.totalsCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatUGX(totals.subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>{formatUGX(totals.delivery)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Platform Fee</Text>
                <Text style={styles.summaryValue}>{formatUGX(totals.platformFee)}</Text>
              </View>
              {totals.discount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.statusFlash }]}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: colors.statusFlash }]}>-{formatUGX(totals.discount)}</Text>
                </View>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatUGX(totals.total)}</Text>
              </View>
            </View>
          </View>

          {/* Coupon */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coupon / Promo Code</Text>
            <View style={styles.couponRow}>
              <TextInput
                style={styles.couponInput}
                value={voucherCode}
                onChangeText={setVoucherCode}
                placeholder="Enter code"
                placeholderTextColor={colors.outline}
                autoCapitalize="characters"
              />
              <Button
                label={voucherLoading ? '...' : 'Apply'}
                variant="outline"
                onPress={handleApplyVoucher}
                style={styles.couponBtn}
              />
            </View>
            {voucherMessage ? (
              <Text style={[styles.couponMsg, voucherDiscount != null ? styles.couponSuccess : styles.couponError]}>
                {voucherMessage}
              </Text>
            ) : null}
          </View>

          {/* Pickup Point / Delivery */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup Point & Delivery</Text>
            <View style={styles.formCard}>
              {PICKUP_POINTS.map(point => {
                const active = fulfilment === 'pickup';
                return (
                  <Pressable
                    key={point.id}
                    style={[styles.pickupOption, active && styles.pickupOptionActive]}
                    onPress={() => setFulfilment('pickup')}
                  >
                    <View style={[styles.pickupIcon, active && styles.pickupIconActive]}>
                      <Icon name="store" size={18} color={active ? colors.onSecondary : colors.primary} />
                    </View>
                    <View style={styles.pickupBody}>
                      <Text style={[styles.pickupName, active && styles.pickupNameActive]}>{point.name}</Text>
                      <Text style={styles.pickupLocation}>{point.location}</Text>
                      <Text style={styles.pickupNote}>Collect your order at the Jemina Official pickup point.</Text>
                    </View>
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}

              <Pressable
                style={[styles.pickupOption, fulfilment === 'delivery' && styles.pickupOptionActive]}
                onPress={() => {
                  if (!defaultAddress) {
                    navigate('AddressBook');
                    return;
                  }
                  setFulfilment('delivery');
                }}
              >
                <View style={[styles.pickupIcon, fulfilment === 'delivery' && styles.pickupIconActive]}>
                  <Icon name="local-shipping" size={18} color={fulfilment === 'delivery' ? colors.onSecondary : colors.primary} />
                </View>
                <View style={styles.pickupBody}>
                  <Text style={[styles.pickupName, fulfilment === 'delivery' && styles.pickupNameActive]}>
                    Deliver to my address
                  </Text>
                  {defaultAddress ? (
                    <Text style={styles.pickupLocation} numberOfLines={2}>
                      {defaultAddress.street_address}
                      {defaultAddress.city ? `, ${defaultAddress.city}` : ''}
                      {defaultAddress.region ? `, ${defaultAddress.region}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.pickupMissing}>No default address set yet.</Text>
                  )}
                </View>
                <View style={[styles.radio, fulfilment === 'delivery' && styles.radioActive]}>
                  {fulfilment === 'delivery' ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>

              {!defaultAddress ? (
                <Pressable style={styles.addressLink} onPress={() => navigate('AddressBook')} hitSlop={8}>
                  <Icon name="add" size={18} color={colors.secondary} />
                  <Text style={styles.addressLinkText}>Add a delivery address to your address book</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Order notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Notes (optional)</Text>
            <View style={styles.formCard}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Pickup or delivery instructions"
                placeholderTextColor={colors.outline}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Payment method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {savedPaymentMethods.length > 0 ? (
              <Pressable style={styles.savedPayCard} onPress={() => navigate('PaymentMethods')}>
                <View style={styles.savedPayBody}>
                  <Text style={styles.savedPayLabel}>Saved payment methods</Text>
                  <Text style={styles.savedPayValue}>
                    {savedPaymentMethods.length} saved · tap to manage
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.primary} />
              </Pressable>
            ) : (
              <Pressable style={styles.savedPayCard} onPress={() => navigate('PaymentMethods')}>
                <View style={styles.savedPayBody}>
                  <Text style={styles.savedPayLabel}>Saved payment methods</Text>
                  <Text style={styles.savedPayEmpty}>No saved method yet — tap to add one</Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.primary} />
              </Pressable>
            )}
            {creditBalance != null ? (
              <View style={styles.creditCard}>
                <View style={styles.creditIcon}>
                  <Icon name="local-atm" size={20} color={colors.onSecondary} />
                </View>
                <View style={styles.creditBody}>
                  <Text style={styles.creditLabel}>JEMINA Credits Balance</Text>
                  <Text style={styles.creditValue}>{formatUGX(creditBalance)}</Text>
                </View>
              </View>
            ) : null}
            {paymentOptions.map(option => {
              const active = paymentMethod === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.payMethod, active && styles.payMethodActive]}
                  onPress={() => setPaymentMethod(option.key)}
                >
                  <View style={[styles.payIcon, active && styles.payIconActive]}>
                    <Icon name={option.icon} size={20} color={active ? colors.onSecondary : colors.primary} />
                  </View>
                  <View style={styles.payBody}>
                    <Text style={[styles.payLabel, active && styles.payLabelActive]}>{option.label}</Text>
                    <Text style={styles.payNote}>{option.note}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Button
            label={loading ? 'Placing Order...' : 'Place Order'}
            variant="primary"
            fullWidth
            onPress={handlePlaceOrder}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodyLg,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  vendorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  vendorTagText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
  },
  totalsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryItemName: {
    ...typography.labelSm,
    color: colors.onSurface,
    flex: 1,
  },
  summaryItemPrice: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  deliveryLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  deliveryValue: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  summaryLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '700',
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
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  couponRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  couponInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  couponBtn: {
    paddingHorizontal: spacing.lg,
  },
  couponMsg: {
    ...typography.labelSm,
    marginTop: spacing.xs,
  },
  couponSuccess: {
    color: colors.statusFlash,
  },
  couponError: {
    color: colors.error,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pickupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  pickupOptionActive: {
    borderColor: colors.secondaryContainer,
    borderWidth: 2,
  },
  pickupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupIconActive: {
    backgroundColor: colors.secondaryContainer,
  },
  pickupBody: {
    flex: 1,
  },
  pickupName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  pickupNameActive: {
    color: colors.secondary,
  },
  pickupLocation: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  pickupNote: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  pickupMissing: {
    ...typography.labelSm,
    color: colors.error,
    marginTop: 2,
    fontStyle: 'italic',
  },
  addressLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addressLinkText: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  input: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  payMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  payMethodActive: {
    borderColor: colors.secondaryContainer,
    borderWidth: 2,
  },
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  savedPayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  savedPayBody: {
    flex: 1,
  },
  savedPayLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  savedPayValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: 2,
  },
  savedPayEmpty: {
    ...typography.bodyMd,
    color: colors.outline,
    fontStyle: 'italic',
    marginTop: 2,
  },
  creditIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditBody: {
    flex: 1,
  },
  creditLabel: {
    ...typography.labelSm,
    color: colors.onPrimaryContainer,
  },
  creditValue: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 1,
  },
  payIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payIconActive: {
    backgroundColor: colors.secondaryContainer,
  },
  payBody: {
    flex: 1,
  },
  payLabel: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  payLabelActive: {
    color: colors.secondary,
  },
  payNote: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.secondaryContainer,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondaryContainer,
  },
  submitBtn: {
    paddingVertical: spacing.md,
  },
});
