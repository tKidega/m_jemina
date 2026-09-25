import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { SectionLoader } from '../components/Loader';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetInquiryInvoice, ApiInquiryInvoice } from '../data/api';
import { formatUGX } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
}

function invoiceStatusConfig(status: string) {
  switch (status) {
    case 'paid':
      return { bg: '#e8f5e9', fg: '#2e7d32', label: 'PAID' };
    case 'sent':
      return { bg: '#e3f2fd', fg: '#1565c0', label: 'SENT' };
    case 'pending':
      return { bg: '#fff3e0', fg: '#e65100', label: 'PENDING' };
    default:
      return {
        bg: colors.surfaceContainer,
        fg: colors.onSurfaceVariant,
        label: String(status || 'issued').replace(/\b\w/g, l => l.toUpperCase()),
      };
  }
}

export function InquiryInvoiceScreen() {
  const { token, isAuthenticated } = useAuth();
  const { params, goBack } = useNavigation();
  const inquiryId = Number(params?.inquiryId);
  const [invoice, setInvoice] = useState<ApiInquiryInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !inquiryId) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiGetInquiryInvoice(token, inquiryId);
      setInvoice(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the invoice.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, inquiryId]);

  useEffect(() => {
    if (isAuthenticated && token) {
      load();
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, token, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Invoice" showBack onBack={goBack} />
        <SectionLoader text="Loading invoice..." icon="receipt-long" />
      </View>
    );
  }

  const st = invoice ? invoiceStatusConfig(invoice.status) : null;

  return (
    <View style={styles.container}>
      <AppHeader title="Invoice" showBack onBack={goBack} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {error || !invoice ? (
          <View style={styles.center}>
            <Icon name="receipt-long" size={56} color={colors.outline} />
            <Text style={styles.errorTitle}>No Invoice Available</Text>
            <Text style={styles.muted}>{error ?? 'No invoice has been issued for this inquiry yet.'}</Text>
            <Button label="Go Back" onPress={goBack} style={styles.retryBtn} />
          </View>
        ) : (
          <>
            {/* Invoice hero */}
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>INVOICE</Text>
                  <Text style={styles.heroNumber}>{invoice.invoice_number}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: st!.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: st!.fg }]}>{st!.label}</Text>
                </View>
              </View>
              <Text style={styles.heroAmount}>{formatUGX(invoice.final_amount)}</Text>
              <Text style={styles.heroSub}>
                {invoice.formatted_reference ? `Inquiry #${invoice.formatted_reference}` : ''}
                {invoice.due_date ? `  •  Due ${formatDate(invoice.due_date)}` : ''}
              </Text>
            </View>

            {/* Parties */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Billed By / To</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vendor</Text>
                <Text style={styles.infoValue}>{invoice.vendor_name ?? '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer</Text>
                <Text style={styles.infoValue}>{invoice.customer_name ?? '—'}</Text>
              </View>
              {invoice.customer_email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{invoice.customer_email}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Product</Text>
                <Text style={styles.infoValue}>{invoice.product_name ?? '—'}</Text>
              </View>
            </View>

            {/* Line items */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Line Items</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quantity</Text>
                <Text style={styles.infoValue}>{invoice.quantity} units</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Unit Price</Text>
                <Text style={styles.infoValue}>{formatUGX(invoice.unit_price)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Subtotal</Text>
                <Text style={styles.infoValue}>{formatUGX(invoice.total_amount)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Discount</Text>
                <Text style={styles.infoValue}>-{formatUGX(invoice.discount_amount)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tax</Text>
                <Text style={styles.infoValue}>{formatUGX(invoice.tax_amount)}</Text>
              </View>
              <View style={[styles.infoRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Due</Text>
                <Text style={styles.totalValue}>{formatUGX(invoice.final_amount)}</Text>
              </View>
            </View>

            {/* Payment details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Details</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>{st!.label}</Text>
              </View>
              {invoice.payment_type && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payment Type</Text>
                  <Text style={styles.infoValue}>{invoice.payment_type}</Text>
                </View>
              )}
              {invoice.payment_terms && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Terms</Text>
                  <Text style={styles.infoValue}>{invoice.payment_terms}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Due Date</Text>
                <Text style={styles.infoValue}>{formatDate(invoice.due_date)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Issued</Text>
                <Text style={styles.infoValue}>{formatDate(invoice.created_at)}</Text>
              </View>
              {invoice.paid_at && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Paid</Text>
                  <Text style={styles.infoValue}>{formatDate(invoice.paid_at)}</Text>
                </View>
              )}
            </View>

            {/* Notes */}
            {invoice.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>NOTES</Text>
                <Text style={styles.notesText}>{invoice.notes}</Text>
              </View>
            ) : null}

            <View style={styles.footerNote}>
              <Icon name="verified-user" size={16} color={colors.primaryFixedDim} />
              <Text style={styles.footerNoteText}>
                Protected by JEMINA Northern Escrow Assurance. Disbursement occurs after receipt and quality sign-off.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  muted: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryBtn: {
    marginTop: spacing.lg,
  },
  hero: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    ...typography.labelSm,
    color: colors.primaryFixedDim,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroNumber: {
    ...typography.headlineSm,
    color: colors.onPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  heroAmount: {
    ...typography.headlineLg,
    color: colors.onPrimary,
    fontWeight: '800',
    fontSize: 28,
  },
  heroSub: {
    ...typography.labelSm,
    color: colors.primaryFixedDim,
  },
  statusBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusBadgeText: {
    ...typography.labelSm,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceContainerHigh,
    gap: spacing.md,
  },
  infoLabel: {
    ...typography.bodySm,
    color: colors.outline,
  },
  infoValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: spacing.sm + 2,
  },
  totalLabel: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  totalValue: {
    ...typography.labelLg,
    color: colors.secondary,
    fontWeight: '800',
    textAlign: 'right',
  },
  notesBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  notesLabel: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '700',
  },
  notesText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 20,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
  },
  footerNoteText: {
    ...typography.labelSm,
    color: colors.primaryFixedDim,
    flex: 1,
    lineHeight: 16,
  },
});
