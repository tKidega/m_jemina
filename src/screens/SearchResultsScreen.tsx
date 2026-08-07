import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { ProductCard } from '../components/ProductCard';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { apiSearchProducts, apiProductToProduct, ApiProduct } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export function SearchResultsScreen() {
  const { params, goBack, navigate } = useNavigation();
  const { addItem } = useCart();
  const query = String(params?.query ?? '');
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!query.trim()) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setProducts(await apiSearchProducts(query.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: ApiProduct }) => {
    const product = apiProductToProduct(item);
    return (
      <ProductCard
        product={product}
        onPress={() => navigate('ProductDetails', { product })}
        onAddToCart={() => addItem(product)}
        imageHeight={140}
      />
    );
  };

  return (
    <View style={styles.root}>
      <AppHeader title={query ? `Results for "${query}"` : 'Search'} showBack onBack={goBack} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.centerText}>Searching products...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error-outline" size={40} color={colors.error} />
          <Text style={styles.centerTitle}>Search failed</Text>
          <Text style={styles.centerText}>{error}</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Icon name="search" size={40} color={colors.outlineVariant} />
          </View>
          <Text style={styles.centerTitle}>No results found</Text>
          <Text style={styles.centerText}>
            We couldn't find any products matching "{query}". Try a different search term.
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.column}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {products.length} {products.length === 1 ? 'result' : 'results'} found
            </Text>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  centerTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  centerText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
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
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  column: {
    gap: spacing.md,
  },
  resultCount: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
});
