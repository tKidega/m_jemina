import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { absoluteUrl, apiGetVendors, ApiVendorSummary } from '../data/api';
import { useNavigation } from '../navigation/NavigationContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

interface VendorCardData {
  id: number;
  name: string;
  rating: number;
  productCount: number;
  description: string | null;
  location: string | null;
  logo: string | null;
}

function VendorLogo({ logo }: { logo: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!logo || failed) {
    return (
      <View style={styles.logoFallback}>
        <Icon name="storefront" size={26} color={colors.primaryContainer} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: logo }}
      style={styles.logo}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

export function FeaturedVendorsScreen() {
  const { goBack, navigate } = useNavigation();
  const [vendors, setVendors] = useState<VendorCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVendors = useCallback(
    (asRefresh = false) => {
      if (asRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      apiGetVendors()
        .then((list: ApiVendorSummary[]) => {
          setVendors(
            list
              .filter(v => v.is_featured === true)
              .map(v => ({
                id: v.id,
                name: v.name || 'Jemina Vendor',
                rating: v.rating,
                productCount: v.product_count,
                description: v.description || null,
                location: v.location || null,
                logo: absoluteUrl(v.logo) ?? null,
              })),
          );
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [],
  );

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const renderItem = ({ item }: { item: VendorCardData }) => (
    <Pressable
      style={styles.card}
      onPress={() => navigate('VendorProfile', { vendorId: item.id, vendorName: item.name })}
    >
      <View style={styles.cardTop}>
        <VendorLogo logo={item.logo} />
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Icon name="verified" size={16} color={colors.secondaryContainer} />
          </View>
          <View style={styles.metaRow}>
            <Icon name="star" size={13} color={colors.secondaryContainer} />
            <Text style={styles.rating}>{item.rating > 0 ? item.rating.toFixed(1) : '—'}</Text>
            <Text style={styles.metaSuffix}>· {item.productCount} products</Text>
            {item.location ? (
              <Text style={styles.metaSuffix}>· <Text style={styles.region}>{item.location}</Text></Text>
            ) : null}
          </View>
        </View>
        <View style={styles.visitBtn}>
          <Text style={styles.visitText}>Visit</Text>
        </View>
      </View>
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <AppHeader title="Featured Vendors" showBack onBack={goBack} />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => loadVendors(true)}
          ListEmptyComponent={
            <EmptyState
              icon="storefront"
              title="No featured vendors yet"
              subtitle="Vendors who activate featured status will appear here."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  logoFallback: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  cardInfo: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  rating: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  metaSuffix: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  region: {
    color: colors.onSurface,
  },
  visitBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  visitText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  description: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
});