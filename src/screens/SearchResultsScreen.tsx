import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { useNavigation } from '../navigation/NavigationContext';
import { useCart } from '../state/CartContext';
import { apiSearchProducts, apiProductToProduct, ApiProduct } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

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
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}
          onPress={() => navigate('ProductDetails', { product })}
        >
          <View style={styles.thumb}>
            {product.image ? (
              <Image source={{ uri: product.image }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
                <Icon name="store" size={22} color={colors.outlineVariant} />
              </View>
            )}
            {product.discount ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discount}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>
              {product.title}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{product.price}</Text>
              {product.originalPrice ? (
                <Text style={styles.originalPrice}>{product.originalPrice}</Text>
              ) : null}
            </View>
            <View style={styles.meta}>
              <Icon name="star" size={13} color={colors.secondary} />
              <Text style={styles.metaText}>
                {product.rating !== undefined ? product.rating.toFixed(1) : '—'}
              </Text>
              {product.category ? (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText} numberOfLines={1}>
                    {product.category}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </Pressable>
        <Pressable style={styles.addBtn} onPress={() => addItem(product)}>
          <Icon name="add-shopping-cart" size={18} color={colors.primary} />
        </Pressable>
      </View>
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
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={14}
          maxToRenderPerBatch={14}
          windowSize={7}
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
  resultCount: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.statusFlash,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  discountText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: 2,
    gap: 6,
  },
  price: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
  originalPrice: {
    ...typography.labelSm,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  metaText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
  },
  metaDot: {
    color: colors.outlineVariant,
    marginHorizontal: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
});