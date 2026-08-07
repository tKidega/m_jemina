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
      <AppHeader title="Payment" showBack onBack={goBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Gateway card */}
        <View style={styles.gatewayCard}>
          <View style={styles.gatewayIcon}>
            <Icon name={info.icon} size={28} color={colors.onSecondary} />
          </View>
          <View style={styles.gatewayBody}>
            <Text style={styles.gatewayLabel}>Paying with</Text>
            <Text style={styles.gatewayName}>{info.label}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Payment Amount</Text>
          <Text style={styles.amountValue}>{formatUGX(amount)}</Text>
        </View>

        {loading ? (
          <View style={styles.statusCard}>
            <Icon name="sync" size={24} color={colors.secondary} />
            <Text style={styles.statusTitle}>Initiating payment...</Text>
            <Text style={styles.statusSub}>Connecting to {info.label}.</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Icon name="error-outline" size={26} color={colors.error} />
            <Text style={styles.errorTitle}>Payment not initiated</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Retry" variant="primary" fullWidth onPress={initiate} style={styles.actionBtn} />
            <Button label="Go to My Orders" variant="outline" fullWidth onPress={() => navigate('Orders')} />
          </View>
        ) : result ? (
          <>
            {/* Success / initiated */}
            <View style={styles.statusCard}>
              <Icon name={paid ? 'check-circle' : 'launch'} size={26} color={paid ? colors.statusSuccess : colors.secondary} />
              <Text style={styles.statusTitle}>{paid ? 'Payment received' : 'Payment link ready'}</Text>
              <Text style={styles.statusSub}>
                {paid
                  ? 'Your payment has been confirmed. We\'re now processing your order.'
                  : paymentLink
                    ? 'Complete your payment securely with your chosen gateway.'
                    : 'Your payment is being processed. We\'ll update your order once confirmed.'}
              </Text>
            </View>

            {/* Reference */}
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {result.transaction_id}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>{formatUGX(amount)}</Text>
              </View>
              {status ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, paid ? styles.detailPaid : null]}>{status.status}</Text>
                </View>
              ) : null}
            </View>

            {paymentLink ? (
              <Pressable style={styles.payNowBtn} onPress={openPaymentLink}>
                <Icon name="lock" size={20} color={colors.onSecondary} />
                <Text style={styles.payNowText}>Complete Payment</Text>
                <Icon name="launch" size={18} color={colors.onSecondary} />
              </Pressable>
            ) : null}

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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  gatewayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  gatewayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatewayBody: {
    flex: 1,
  },
  gatewayLabel: {
    ...typography.labelMd,
    color: colors.onPrimaryContainer,
  },
  gatewayName: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  amountCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  amountLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  amountValue: {
    ...typography.headlineLg,
    color: colors.secondary,
    fontWeight: '700',
    marginTop: 4,
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  statusTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  statusSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.headlineMd,
    color: colors.onErrorContainer,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.onErrorContainer,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  detailCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailPaid: {
    color: colors.statusSuccess,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  payNowText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },
  actionBtn: {
    marginBottom: spacing.md,
  },
});
