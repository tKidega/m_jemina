import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { formatUGX } from '../components/ProductCard';
import { apiGetMyInquiries, ApiInquiryResult } from '../data/api';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

export function MyInquiriesScreen() {
  const { token, isAuthenticated } = useAuth();
  const { goBack, navigate } = useNavigation();
  const [inquiries, setInquiries] = useState<ApiInquiryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    if (!token) return;
    try {
      const items = await apiGetMyInquiries(token);
      setInquiries(items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your inquiries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadInquiries();
    }
  }, [isAuthenticated, token, loadInquiries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInquiries();
  }, [loadInquiries]);

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="My Inquiries" onBack={goBack} />
        <View style={styles.center}>
          <Text style={styles.muted}>Loading your inquiries...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="My Inquiries" onBack={goBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Button label="Retry" onPress={loadInquiries} style={styles.retryBtn} />
          </View>
        ) : inquiries.length === 0 ? (
          <View style={styles.center}>
            <Icon name="request-quote" size={56} color={colors.outline} />
            <Text style={styles.emptyTitle}>No Inquiries Yet</Text>
            <Text style={styles.muted}>Wholesale inquiries and RFQs you submit will appear here.</Text>
            <Button
              label="Submit an Inquiry"
              onPress={() => navigate('ProductInquiry')}
              style={styles.emptyCta}
            />
          </View>
        ) : (
          inquiries.map((inquiry) => (
            <View key={inquiry.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Icon name="request-quote" size={20} color={colors.primary} />
                <Text style={styles.reference}>{inquiry.formatted_reference}</Text>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: inquiry.status_badge?.bg ?? colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: inquiry.status_badge?.fg ?? colors.onSurfaceVariant },
                    ]}
                  >
                    {inquiry.status_name}
                  </Text>
                </View>
              </View>

              <Text style={styles.productName}>{inquiry.product_name}</Text>
              <Text style={styles.muted}>
                {inquiry.product_image ? (
                  `Product ref: ${inquiry.inquiry_reference}`
                ) : (
                  `Product ref: ${inquiry.inquiry_reference}`
                )}
              </Text>

              <View style={styles.detailsRow}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Vendor</Text>
                  <Text style={styles.detailValue}>{inquiry.vendor_name ?? '—'}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Qty Required</Text>
                  <Text style={styles.detailValue}>{inquiry.quantity_required}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailLabel}>Est. Total</Text>
                  <Text style={styles.detailValue}>
                    {inquiry.estimated_total != null ? formatUGX(inquiry.estimated_total) : '—'}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => navigate('ProductInquiry', {})}
                style={styles.footerLink}
              >
                <Text style={styles.footerLinkText}>View inquiry details</Text>
                <Icon name="chevron-right" size={18} color={colors.primary} />
              </Pressable>
            </View>
          ))
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
    paddingBottom: spacing.xl,
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  muted: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  emptyCta: {
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reference: {
    ...typography.labelLg,
    color: colors.onSurface,
    flex: 1,
    marginLeft: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.labelSm,
    fontWeight: '600',
  },
  productName: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    marginTop: 2,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footerLinkText: {
    ...typography.labelLg,
    color: colors.primary,
    marginRight: 2,
  },
});
