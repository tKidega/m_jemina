import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon, IconName } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiInitiatePayment, apiGetPaymentStatus, ApiPaymentResult, ApiPaymentStatus } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const GATEWAY_LABELS: Record<string, { label: string; icon: IconName; currency: string }> = {
  mtn: { label: 'MTN Mobile Money', icon: 'smartphone', currency: 'UGX' },
  mtn_mobile_money: { label: 'MTN Mobile Money', icon: 'smartphone', currency: 'UGX' },
  stripe: { label: 'Card Payment', icon: 'credit-card', currency: 'USD' },
  flutterwave: { label: 'Flutterwave', icon: 'account-balance-wallet', currency: 'UGX' },
  bitcoin: { label: 'Bitcoin', icon: 'currency-bitcoin', currency: 'BTC' },
};

const GATEWAY_TO_API: Record<string, string> = {
  mtn: 'mtn_mobile_money',
  stripe: 'stripe',
  flutterwave: 'flutterwave',
  bitcoin: 'bitcoin',
};

export function PaymentScreen() {
  const { token } = useAuth();
  const { params, navigate, goBack } = useNavigation();
  const gateway = (params?.gateway as string | undefined) ?? 'stripe';
  const amount = Number(params?.amount ?? 0);
  const orderId = params?.orderId != null ? Number(params.orderId) : undefined;

  const [result, setResult] = useState<ApiPaymentResult | null>(null);
  const [status, setStatus] = useState<ApiPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const info = GATEWAY_LABELS[gateway] ?? GATEWAY_LABELS.stripe;

  const initiate = useCallback(async () => {
    if (!token) {
      setError('You need to be signed in to pay.');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiInitiatePayment(token, {
        gateway: GATEWAY_TO_API[gateway] ?? gateway,
        amount,
        currency: info.currency,
        order_id: orderId,
        description: `Order payment on JEMINA Marketplace`,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, gateway, amount, orderId, info.currency]);

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    if (!result?.transaction_id || !token) {
      return;
    }
    pollTimer.current = setInterval(() => {
      apiGetPaymentStatus(token, result.transaction_id as string)
        .then(s => setStatus(s))
        .catch(() => {});
    }, 5000);
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    };
  }, [result, token]);

  const checkStatus = async () => {
    if (!result?.transaction_id || !token) {
      return;
    }
    setChecking(true);
    try {
      const s = await apiGetPaymentStatus(token, result.transaction_id as string);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check payment status.');
    } finally {
      setChecking(false);
    }
  };

  const openPaymentLink = () => {
    const link = result?.gateway_data?.payment_link as string | undefined;
    if (link) {
      Linking.openURL(link).catch(() => setError('Could not open the payment link.'));
    }
  };

  const paymentLink = result?.gateway_data?.payment_link as string | undefined;
  const paid = status?.status === 'completed' || status?.gateway_status === 'completed' || status?.gateway_status === 'succeeded';

  return (
    <View style={styles.root}>
      <AppHeader
        title="Checkout & Payment"
        showBack
        onBack={goBack}
        right={
          <View style={styles.secureBadge}>
            <Icon name="lock" size={14} color={colors.secondaryContainer} />
            <Text style={styles.secureBadgeText}>ESCROW</Text>
          </View>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stepper */}
        <View style={styles.stepper}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, styles.stepDotComplete]}><Icon name="check" size={14} color={colors.onPrimary} /></View>
            <View>
              <Text style={styles.stepEyebrow}>STEP 1</Text>
              <Text style={styles.stepTitle}>Address</Text>
            </View>
          </View>
          <View style={styles.stepConnector} />
          <View style={styles.stepItem}>
            <View style={styles.stepDotActive}><Text style={styles.stepNumber}>2</Text></View>
            <View>
              <Text style={[styles.stepEyebrow, styles.stepEyebrowActive]}>STEP 2</Text>
              <Text style={styles.stepTitle}>Review & Pay</Text>
            </View>
          </View>
        </View>

        {/* Gateway + Amount */}
        <View style={styles.gatewayCard}>
          <View style={styles.gatewayIcon}>
            <Icon name={info.icon} size={18} color={colors.secondary} />
          </View>
          <View style={styles.gatewayBody}>
            <Text style={styles.gatewayLabel}>Paying with</Text>
            <Text style={styles.gatewayName}>{info.label}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.statusCard}>
            <View style={styles.statusIconCircle}>
              <Icon name="sync" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.statusTitle}>Initiating payment...</Text>
            <Text style={styles.statusSub}>Connecting securely to {info.label}. Your funds remain in escrow until delivery.</Text>
          </View>
        ) : error ? (
          <View style={[styles.statusCard, styles.errorCard]}>
            <Icon name="error-outline" size={26} color={colors.error} />
            <Text style={[styles.statusTitle, styles.errorTitle]}>Payment not initiated</Text>
            <Text style={[styles.statusSub, styles.errorText]}>{error}</Text>
            <Button label="Retry" variant="primary" fullWidth onPress={initiate} style={styles.actionBtn} />
            <Button label="Go to My Orders" variant="outline" fullWidth onPress={() => navigate('Orders')} />
          </View>
        ) : result ? (
          <>
            {/* Payment requested / received */}
            <View style={[styles.statusCard, paid && styles.paidCard]}>
              <View style={[styles.statusIconCircle, paid && styles.paidIconCircle]}>
                <Icon name={paid ? 'check-circle' : 'verified'} size={24} color={paid ? colors.onSecondary : colors.secondary} />
              </View>
              <Text style={styles.statusTitle}>{paid ? 'Payment received' : 'Payment link ready'}</Text>
              <Text style={styles.statusSub}>
                {paid
                  ? 'Your payment has been confirmed and is locked in escrow. We\'re now processing your order.'
                  : paymentLink
                    ? 'Complete your payment securely with your chosen gateway to release this order for dispatch.'
                    : 'Your payment is being processed. We\'ll update your order once confirmed.'}
              </Text>
            </View>

            {/* Settlement summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryHeader}>Settlement Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Amount</Text>
                <Text style={styles.summaryValue}>{formatUGX(amount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.summaryLabelFlex]}>
                  Escrow & Verification Fee
                </Text>
                <Text style={styles.summaryValue}>Included</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <Text style={styles.totalSub}>Taxes & Logistics Handling Included</Text>
                </View>
                <Text style={styles.totalValue}>{formatUGX(amount)}</Text>
              </View>
            </View>

            {/* Reference details */}
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {result.transaction_id}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gateway</Text>
                <Text style={styles.detailValue}>{info.label}</Text>
              </View>
              {status ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, paid ? styles.detailPaid : styles.detailPending]}>{status.status}</Text>
                </View>
              ) : null}
            </View>

            {paymentLink ? (
              <Pressable style={styles.payNowBtn} onPress={openPaymentLink}>
                <Icon name="lock" size={18} color={colors.onSecondary} />
                <Text style={styles.payNowText}>Complete Payment Securely</Text>
                <Icon name="launch" size={18} color={colors.onSecondary} />
              </Pressable>
            ) : null}
            <View style={styles.sslRow}>
              <Icon name="verified" size={12} color={colors.secondary} />
              <Text style={styles.sslText}>256-Bit SSL Encrypted Escrow Transaction</Text>
            </View>

            <Button
              label={checking ? 'Checking...' : 'Check Payment Status'}
              variant="outline"
              fullWidth
              onPress={checkStatus}
              style={styles.actionBtn}
            />
            <Button label="Go to My Orders" variant="ghost" fullWidth onPress={() => navigate('Orders')} />
          </>
        ) : null}

        {/* Escrow guarantee */}
        <View style={styles.escrowPanel}>
          <Icon name="gavel" size={24} color={colors.primary} />
          <Text style={styles.escrowText}>
            <Text style={styles.escrowBold}>Northern Uganda Trade Escrow: </Text>
            Payment is safely locked and only released to suppliers once cargo is inspected and accepted at dispatch address.
          </Text>
        </View>
      </ScrollView>
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
    gap: spacing.sm,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(196,198,203,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
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
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
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
  stepDotActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    ...typography.labelSm,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  stepEyebrow: {
    ...typography.labelSm,
    color: colors.outline,
  },
  stepEyebrowActive: {
    color: colors.secondary,
  },
  stepTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.secondary,
    marginHorizontal: spacing.sm,
  },
  gatewayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  gatewayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatewayBody: {
    flex: 1,
  },
  gatewayLabel: {
    ...typography.labelSm,
    color: colors.outline,
  },
  gatewayName: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: 1,
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidCard: {
    borderColor: colors.secondaryContainer,
    borderWidth: 2,
  },
  paidIconCircle: {
    backgroundColor: colors.secondary,
  },
  statusTitle: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  statusSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  errorCard: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
  },
  errorTitle: {
    color: colors.onErrorContainer,
  },
  errorText: {
    color: colors.onErrorContainer,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryHeader: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHighest,
    paddingBottom: spacing.xs,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    ...typography.bodySm,
    color: colors.outline,
  },
  summaryLabelFlex: {
    flex: 1,
  },
  summaryValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
    marginVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  totalLabel: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  totalSub: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: 1,
  },
  totalValue: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  detailCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHighest,
  },
  detailLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailPaid: {
    color: colors.statusSuccess,
  },
  detailPending: {
    color: colors.secondary,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  payNowText: {
    ...typography.labelLg,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  sslRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    alignSelf: 'center',
  },
  sslText: {
    ...typography.labelSm,
    color: colors.outline,
    textAlign: 'center',
  },
  actionBtn: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  escrowPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  escrowText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    flex: 1,
  },
  escrowBold: {
    color: colors.onSurface,
    fontWeight: '700',
  },
});