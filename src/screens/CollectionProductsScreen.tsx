import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { EmptyState } from '../components/EmptyState';
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

  const groupedRows = useMemo(() => {
    const groupMap = new Map<string, Product[]>();
    filtered.forEach(p => {
      const key = p.subcategory?.trim() || p.category?.trim() || 'Other';
      const existing = groupMap.get(key);
      if (existing) {
        existing.push(p);
      } else {
        groupMap.set(key, [p]);
      }
    });
    return Array.from(groupMap.entries());
  }, [filtered]);

  const hasGroups = groupedRows.length > 1;

  type ListRow =
    | { kind: 'header'; key: string; title: string; count: number }
    | { kind: 'row'; key: string; items: Product[] };

  const listRows = useMemo<ListRow[]>(() => {
    const rows: ListRow[] = [];
    if (!hasGroups) {
      for (let i = 0; i < filtered.length; i += 2) {
        rows.push({ kind: 'row', key: `row-${i}`, items: filtered.slice(i, i + 2) });
      }
      return rows;
    }
    groupedRows.forEach(([groupTitle, items]) => {
      rows.push({ kind: 'header', key: `header-${groupTitle}`, title: groupTitle, count: items.length });
      for (let i = 0; i < items.length; i += 2) {
        rows.push({ kind: 'row', key: `row-${groupTitle}-${i}`, items: items.slice(i, i + 2) });
      }
    });
    return rows;
  }, [filtered, groupedRows, hasGroups]);

  const renderItem = ({ item }: { item: ListRow }) => {
    if (item.kind === 'header') {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>{item.title}</Text>
          <Text style={styles.groupCount}>{item.count}</Text>
        </View>
      );
    }
    return (
      <View style={styles.row}>
        {item.items.map(product => (
          <View key={product.id} style={[styles.cardWrap, { width: cardWidth }]}>
            <ProductCard
              product={product}
              compact
              imageHeight={120}
              onPress={() => navigate('ProductDetails', { product })}
              onAddToCart={() => addItem(product)}
            />
          </View>
        ))}
      </View>
    );
  };

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
        data={listRows}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        numColumns={1}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="inventory"
            title="No products found"
            subtitle="Try a different filter to find what you're looking for."
          />
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  groupTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  groupCount: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  column: {
    gap: spacing.md,
  },
  cardWrap: {
    flexShrink: 0,
  },
});