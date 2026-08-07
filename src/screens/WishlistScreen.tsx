import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, HeaderCartButton } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetWishlist, apiRemoveFromWishlist, ApiWishlistItem } from '../data/api';
import { formatUGX, Product } from '../components/ProductCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

function wishlistItemToProduct(item: ApiWishlistItem): Product {
  const hasDiscount = item.product.discounted_price != null && item.product.discounted_price < item.product.price;
  const effective = hasDiscount ? (item.product.discounted_price as number) : item.product.price;
  const originalValue = hasDiscount ? item.product.price : undefined;
  return {
    id: String(item.product.id),
    image: item.product.images?.[0],
    category: 'Wishlist',
    title: item.product.name,
    price: formatUGX(effective),
    priceValue: effective,
    originalPrice: originalValue != null ? formatUGX(originalValue) : undefined,
    originalPriceValue: originalValue,
    rating: item.product.rating,
  };
}

export function WishlistScreen() {
  const { token, isAuthenticated } = useAuth();
  const { addItem, itemCount } = useCart();
  const { navigate, goBack, switchTab } = useNavigation();
  const [items, setItems] = useState<ApiWishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await apiGetWishlist(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wishlist.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (productId: number) => {
    if (!token || removing != null) {
      return;
    }
    setRemoving(productId);
    try {
      await apiRemoveFromWishlist(token, productId);
      setItems(prev => prev.filter(i => i.product.id !== productId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove item.');
    } finally {
      setRemoving(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.root}>
        <AppHeader title="Wishlist" showBack onBack={goBack} />
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="favorite-border" size={56} color={colors.outlineVariant} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to see your wishlist</Text>
          <Text style={styles.emptySubtitle}>Save products you love and find them here anytime.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => navigate('Login')} style={styles.emptyBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Wishlist"
        showBack
        onBack={goBack}
        right={<HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} />}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="favorite-border" size={56} color={colors.outlineVariant} />
          </View>
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart on any product to save it here for later.
          </Text>
          <Button label="Browse Marketplace" variant="primary" fullWidth onPress={() => navigate('Marketplace')} style={styles.emptyBtn} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsHeaderText}>
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </Text>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {items.map(item => {
            const product = wishlistItemToProduct(item);
            return (
              <View key={item.id} style={styles.item}>
                <Pressable
                  style={styles.itemImageWrap}
                  onPress={() => navigate('ProductDetails', { product })}
                >
                  {product.image ? (
                    <Image source={{ uri: product.image }} style={styles.itemImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.itemImage, styles.imagePlaceholder]}>
                      <Icon name="store" size={28} color={colors.outlineVariant} />
                    </View>
                  )}
                </Pressable>
                <View style={styles.itemBody}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.product.name}</Text>
                  <Text style={styles.itemPrice}>{formatUGX(item.product.price)}</Text>
                  {product.originalPrice ? (
                    <Text style={styles.itemOriginal}>{product.originalPrice}</Text>
                  ) : null}
                  <View style={styles.itemActions}>
                    <Button
                      label="Add to Cart"
                      variant="primary"
                      icon="add-shopping-cart"
                      style={styles.itemBtn}
                      onPress={() => {
                        addItem(product, 1);
                      }}
                    />
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => handleRemove(item.product.id)}
                      disabled={removing === item.product.id}
                      hitSlop={4}
                    >
                      <Icon
                        name={removing === item.product.id ? 'sync' : 'delete-outline'}
                        size={20}
                        color={colors.outline}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
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
  itemsHeader: {
    marginBottom: spacing.lg,
  },
  itemsHeaderText: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemImageWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  itemPrice: {
    ...typography.headlineMd,
    color: colors.secondary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  itemOriginal: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  itemBtn: {
    flex: 1,
  },
  removeBtn: {
    padding: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.headlineLg,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    width: '100%',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.statusFlash,
    marginBottom: spacing.md,
  },
});
