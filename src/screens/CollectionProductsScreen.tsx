import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { ProductCard, type Product } from '../components/ProductCard';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

const FILTERS = ['All', 'Wholesale', 'Bulk Orders', 'Corporate', 'Enterprise'];

export function CollectionProductsScreen() {
  const { params, goBack, navigate } = useNavigation();
  const { addItem } = useCart();
  const { width } = useWindowDimensions();

  const allProducts = useMemo(() => (params?.products as Product[] | undefined) ?? [], [params]);

  const [activeFilter, setActiveFilter] = useState(0);
  const [sortMode, setSortMode] = useState<'popular' | 'low' | 'high'>('popular');

  const filtered = useMemo(() => {
    let list = [...allProducts];
    if (activeFilter === 1) {
      list = list.filter(p => p.isWholesale || p.badge?.variant === 'wholesale');
    } else if (activeFilter === 2) {
      list = list.filter(p => p.bulkOrder);
    } else if (activeFilter === 3) {
      list = list.filter(p => p.corporateReady || p.badge?.variant === 'corporate');
    } else if (activeFilter === 4) {
      list = list.filter(p => p.enterpriseSolution);
    }
    if (sortMode === 'low') {
      list = list.sort((a, b) => (a.priceValue ?? 0) - (b.priceValue ?? 0));
    } else if (sortMode === 'high') {
      list = list.sort((a, b) => (b.priceValue ?? 0) - (a.priceValue ?? 0));
    } else {
      list = list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return list;
  }, [allProducts, activeFilter, sortMode]);

  const title = String(params?.title ?? 'Products');
  const subtitle = params?.subtitle ? String(params.subtitle) : undefined;
  const showFilters = params?.showFilters !== false;
  const cardWidth = Math.round((width - spacing.lg * 2 - spacing.gutter) / 2);

  const renderItem = ({ item }: { item: Product }) => (
    <View style={[styles.cardWrap, { width: cardWidth }]}>
      <ProductCard
        product={item}
        compact
        imageHeight={120}
        onPress={() => navigate('ProductDetails', { product: item })}
        onAddToCart={() => addItem(item)}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <AppHeader title={title} showBack onBack={goBack} />
      {showFilters ? (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f, i) => (
              <Pressable
                key={f}
                style={[styles.chip, i === activeFilter && styles.chipActive]}
                onPress={() => setActiveFilter(i)}
              >
                <Text style={[styles.chipText, i === activeFilter && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.toolbar}>
            <Text style={styles.resultCount}>
              {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
            </Text>
            <View style={styles.sortRow}>
              {(
                [
                  { key: 'popular', label: 'Popular' },
                  { key: 'low', label: 'Price ↑' },
                  { key: 'high', label: 'Price ↓' },
                ] as const
              ).map(s => (
                <Pressable key={s.key} onPress={() => setSortMode(s.key)}>
                  <Text style={[styles.sortText, sortMode === s.key && styles.sortTextActive]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="inventory" size={40} color={colors.outlineVariant} />
            </View>
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>Try a different filter to find what you're looking for.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipActive: {
    backgroundColor: colors.secondaryContainer,
  },
  chipText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: colors.onSecondary,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  resultCount: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  sortText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  sortTextActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  column: {
    gap: spacing.md,
  },
  cardWrap: {
    flexShrink: 0,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});