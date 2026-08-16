import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { apiGetMyReviews, ApiMyReview } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

function formatDate(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[0, 1, 2, 3, 4].map(i => (
        <Icon key={i} name={rating >= i + 1 ? 'star' : 'star-border'} size={16} color={colors.secondary} />
      ))}
    </View>
  );
}

export function MyReviewsScreen() {
  const { token, isAuthenticated } = useAuth();
  const { navigate, goBack } = useNavigation();
  const [reviews, setReviews] = useState<ApiMyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setReviews(await apiGetMyReviews(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your reviews.');
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
      setReviews(await apiGetMyReviews(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your reviews.');
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAuthenticated) {
    return (
      <View style={styles.root}>
        <AppHeader title="My Reviews" showBack onBack={goBack} />
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="star-border" size={56} color={colors.outlineVariant} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to see your reviews</Text>
          <Text style={styles.emptySubtitle}>Reviews you have written will appear here.</Text>
          <Button label="Sign In" variant="primary" fullWidth onPress={() => navigate('Login')} style={styles.emptyBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="My Reviews" showBack onBack={goBack} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="star-border" size={56} color={colors.outlineVariant} />
          </View>
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptySubtitle}>
            After a product you ordered is delivered, you can rate and review it.
          </Text>
          <Button label="Browse Marketplace" variant="primary" fullWidth onPress={() => navigate('Marketplace')} style={styles.emptyBtn} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />
          }
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {reviews.map(review => (
            <Pressable
              key={review.id}
              style={styles.card}
              onPress={() =>
                navigate('ProductDetails', {
                  product: {
                    id: String(review.product.id),
                    category: 'Product',
                    title: review.product.name,
                    price: '',
                    priceValue: 0,
                    image: review.product.images?.[0],
                  },
                })
              }
            >
              <View style={styles.imageWrap}>
                {review.product.images?.[0] ? (
                  <Image source={{ uri: review.product.images[0] }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Icon name="store" size={24} color={colors.outlineVariant} />
                  </View>
                )}
              </View>
              <View style={styles.body}>
                <Text style={styles.productName} numberOfLines={1}>{review.product.name}</Text>
                <StarRow rating={review.rating} />
                {review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}
                <Text style={styles.comment} numberOfLines={3}>{review.comment}</Text>
                <Text style={styles.date}>{formatDate(review.created_at)}</Text>
              </View>
            </Pressable>
          ))}
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
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  productName: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '700',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: spacing.sm,
  },
  reviewTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  comment: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  date: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: spacing.sm,
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
