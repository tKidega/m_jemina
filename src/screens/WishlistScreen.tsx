import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, HeaderNotificationButton, HeaderCartButton } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useWishlist } from '../state/WishlistContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetWishlist, ApiWishlistItem, absoluteUrl } from '../data/api';
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
  const { toggle } = useWishlist();
  const { navigate, goBack, switchTab } = useNavigation();
  const [items, setItems] = useState<ApiWishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = useCallback(async () => {
    if (!token) {
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      setItems(await apiGetWishlist(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wishlist.');
    } finally {
      setRefreshing(false);
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
      await toggle(productId);
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
        <EmptyState
          icon="favorite-border"
          title="Sign in to see your wishlist"
          subtitle="Save products you love and find them here anytime."
          actionLabel="Sign In"
          onAction={() => navigate('Login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Wishlist"
        showBack
        onBack={goBack}
        right={<><HeaderNotificationButton /><HeaderCartButton count={itemCount} onPress={() => switchTab('Cart')} /></>}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Loading your saved items...</Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="favorite-border"
          title="Your wishlist is empty"
          subtitle="Tap the heart on any product to save it here for later."
          actionLabel="Browse Marketplace"
          onAction={() => navigate('Marketplace')}
        />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
          }
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Icon name="favorite" size={20} color={colors.secondary} />
              <Text style={styles.headerCount}>
                {items.length} {items.length === 1 ? 'item' : 'items'} saved
              </Text>
            </View>
            <Pressable style={styles.clearAllBtn} onPress={() => {
              Alert.alert('Clear Wishlist', 'Remove all items from your wishlist?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear All', style: 'destructive', onPress: async () => {
                  for (const item of items) {
                    await handleRemove(item.product.id);
                  }
                }},
              ]);
            }}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </Pressable>
          </View>
          {error ? (
            <View style={styles.errorBox}>
              <Icon name="info" size={16} color={colors.statusFlash} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {items.map(item => {
            const product = wishlistItemToProduct(item);
            const hasDiscount = item.product.discounted_price != null && item.product.discounted_price < item.product.price;
            const discountPct = hasDiscount ? Math.round(((item.product.price - (item.product.discounted_price as number)) / item.product.price) * 100) : 0;
            const imageUrl = product.image ? absoluteUrl(product.image) ?? product.image : undefined;
            return (
              <View key={item.id} style={styles.card}>
                <Pressable
                  style={styles.cardImageWrap}
                  onPress={() => navigate('ProductDetails', { product })}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardImage, styles.imagePlaceholder]}>
                      <Icon name="store" size={32} color={colors.outlineVariant} />
                    </View>
                  )}
                  {hasDiscount ? (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-{discountPct}%</Text>
                    </View>
                  ) : null}
                </Pressable>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.product.name}</Text>
                    <Pressable
                      style={styles.removeBtn}
                      onPress={() => handleRemove(item.product.id)}
                      disabled={removing === item.product.id}
                      hitSlop={8}
                    >
                      <Icon
                        name={removing === item.product.id ? 'sync' : 'favorite'}
                        size={20}
                        color={colors.secondary}
                      />
                    </Pressable>
                  </View>
                  {item.product.rating ? (
                    <View style={styles.ratingRow}>
                      <Icon name="star" size={14} color={colors.secondary} />
                      <Text style={styles.ratingText}>{item.product.rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatUGX(item.product.price)}</Text>
                    {hasDiscount && item.product.discounted_price != null ? (
                      <Text style={styles.originalPrice}>{formatUGX(item.product.price)}</Text>
                    ) : null}
                  </View>
                  <Button
                    label="Add to Cart"
                    variant="primary"
                    icon="add-shopping-cart"
                    fullWidth
                    style={styles.addBtn}
                    onPress={() => addItem(product, 1)}
                  />
                </View>
              </View>
            );
          })}
          <View style={styles.browseMore}>
            <Button
              label="Browse Marketplace"
              variant="outline"
              fullWidth
              onPress={() => navigate('Marketplace')}
            />
          </View>
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
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerCount: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  clearAllBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  clearAllText: {
    ...typography.labelMd,
    color: colors.outline,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardImageWrap: {
    width: 120,
    height: 'auto',
    backgroundColor: colors.surfaceContainerLow,
  },
  cardImage: {
    width: 120,
    height: 140,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.statusFlash,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  discountText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
    fontSize: 10,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },
  removeBtn: {
    padding: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.xs,
  },
  ratingText: {
    ...typography.labelSm,
    color: colors.secondary,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  price: {
    ...typography.headlineSm,
    color: colors.secondary,
    fontWeight: '800',
  },
  originalPrice: {
    ...typography.bodySm,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    marginTop: spacing.sm,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.statusFlash,
    flex: 1,
  },
  browseMore: {
    marginTop: spacing.md,
  },
});
