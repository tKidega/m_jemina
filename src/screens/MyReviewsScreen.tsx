import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { SectionLoader } from '../components/Loader';
import { useAuth } from '../state/AuthContext';
import { useNavigation } from '../navigation/NavigationContext';
import { absoluteUrl, apiAddReview, apiGetMyReviews, apiGetOrders, ApiMyReview, ApiOrder, ApiOrderItem } from '../data/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={styles.stars}>
      {[0, 1, 2, 3, 4].map(i => (
        <Icon key={i} name={rating >= i + 1 ? 'star' : 'star-border'} size={size} color={colors.secondary} />
      ))}
    </View>
  );
}

interface PendingItem {
  productId: number;
  productName: string;
  image?: string;
  orderNumber?: string;
  deliveredAt?: string;
}

const SUCCESS_STATUSES = 'completed,delivered';

function buildLists(reviewList: ApiMyReview[], orders: ApiOrder[]) {
  const reviewedIds = new Set(reviewList.map(r => String(r.product.id)));
  const isDelivered = (o: { status: string }) => {
    const s = o.status.toLowerCase();
    return s === 'delivered' || s === 'completed';
  };
  const items = orders
    .filter(isDelivered)
    .flatMap(o =>
      (o.items ?? []).map((it: ApiOrderItem) => ({
        productId: Number(it.product_id),
        productName: it.product_name,
        image: absoluteUrl(it.product_image),
        orderNumber: o.order_number,
        deliveredAt: o.delivered_at ?? o.created_at,
      })),
    );
  const seen = new Set<number>();
  const pendingList = items.filter(
    it => !reviewedIds.has(String(it.productId)) && !seen.has(it.productId) && seen.add(it.productId),
  );

  // Reviewed tab = user's reviews for products from successfully completed/delivered orders.
  const orderedProductIds = new Set(items.map(it => String(it.productId)));
  const reviewedList = reviewList.filter(r => orderedProductIds.has(String(r.product.id)));

  return { pendingList, reviewedList };
}

async function fetchLists(token: string) {
  const [reviewList, orders] = await Promise.all([
    apiGetMyReviews(token),
    apiGetOrders(token, SUCCESS_STATUSES).catch(() => []),
  ]);
  return buildLists(reviewList, orders);
}

export function MyReviewsScreen() {
  const { token, isAuthenticated } = useAuth();
  const { navigate, goBack } = useNavigation();
  const [tab, setTab] = useState<'todo' | 'done'>('todo');
  const [reviews, setReviews] = useState<ApiMyReview[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<PendingItem | null>(null);
  const [modalRating, setModalRating] = useState(0);
  const [modalTitle, setModalTitle] = useState('');
  const [modalComment, setModalComment] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setReviews([]);
      setPending([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { pendingList, reviewedList } = await fetchLists(token);
      setPending(pendingList);
      setReviews(reviewedList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your reviews.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    setError(null);
    try {
      const { pendingList, reviewedList } = await fetchLists(token);
      setPending(pendingList);
      setReviews(reviewedList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your reviews.');
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const reviewCounts = useMemo(
    () => ({
      todo: pending.length,
      done: reviews.length,
    }),
    [pending.length, reviews.length],
  );

  const openProduct = (id: number) =>
    navigate('ProductDetails', { product: { id: String(id), category: 'Product', title: '', price: '', priceValue: 0, image: '' } });

  const openReviewModal = (item: PendingItem) => {
    setReviewTarget(item);
    setModalRating(0);
    setModalTitle('');
    setModalComment('');
    setModalError(null);
    setModalSubmitting(false);
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    if (modalSubmitting) return;
    setShowReviewModal(false);
    setReviewTarget(null);
  };

  const submitModalReview = useCallback(async () => {
    if (!token || !reviewTarget) return;
    if (modalRating === 0) {
      setModalError('Please select a star rating.');
      return;
    }
    if (!modalComment.trim()) {
      setModalError('Please write a short comment.');
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await apiAddReview(token, reviewTarget.productId, {
        rating: modalRating,
        comment: modalComment.trim(),
        title: modalTitle.trim() || undefined,
      });
      setShowReviewModal(false);
      setReviewTarget(null);
      setModalRating(0);
      setModalTitle('');
      setModalComment('');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not submit your review.';
      if (message.toLowerCase().includes('already reviewed')) {
        setModalError('You have already reviewed this product.');
      } else {
        setModalError(message);
      }
    } finally {
      setModalSubmitting(false);
    }
  }, [token, reviewTarget, modalRating, modalTitle, modalComment, load]);

  if (!isAuthenticated) {
    return (
      <View style={styles.root}>
        <AppHeader title="Ratings & Reviews" showBack onBack={goBack} />
        <EmptyState
          icon="star-border"
          title="Sign in to see your ratings"
          subtitle="Rate and review delivered products to earn up to 1000 credits."
          actionLabel="Sign In"
          onAction={() => navigate('Login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title="Ratings & Reviews" showBack onBack={goBack} />

      {/* Credit incentive banner */}
      <View style={styles.incentive}>
        <Icon name="verified" size={18} color={colors.statusSuccess} />
        <Text style={styles.incentiveText}>
          Share quality feedback on delivered orders to earn{' '}
          <Text style={styles.incentiveBold}>1000 Credits</Text> on every review.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {([
          { key: 'todo' as const, label: 'To Review' },
          { key: 'done' as const, label: 'Reviewed' },
        ]).map(t => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabOn]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtOn]}>{t.label}</Text>
            <View style={[styles.tabCount, tab === t.key && styles.tabCountOn]}>
              <Text style={[styles.tabCountTxt, tab === t.key && styles.tabCountTxtOn]}>{reviewCounts[t.key]}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <SectionLoader text="Loading your reviews..." icon="rate-review" />
        </View>
      ) : error ? (
        <EmptyState icon="error-outline" title="Couldn't load reviews" subtitle={error} actionLabel="Try Again" onAction={() => load()} />
      ) : tab === 'todo' && pending.length === 0 ? (
        <EmptyState
          icon="verified"
          title="Nothing to review"
          subtitle="When a delivered order arrives, you can rate its quality and earn credits."
          actionLabel="Browse Marketplace"
          onAction={() => navigate('Marketplace')}
        />
      ) : tab === 'done' && reviews.length === 0 ? (
        <EmptyState
          icon="star-border"
          title="No reviews yet"
          subtitle="Reviews you have written will appear here."
          actionLabel="Browse Marketplace"
          onAction={() => navigate('Marketplace')}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        >
          {tab === 'todo'
            ? pending.map(item => (
                <Pressable key={item.productId} style={styles.card} onPress={() => openProduct(item.productId)}>
                  <View style={styles.imageWrap}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                    ) : (
                      <View style={[styles.image, styles.imagePlaceholder]}>
                        <Icon name="store" size={24} color={colors.outlineVariant} />
                      </View>
                    )}
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
                    {item.orderNumber ? <Text style={styles.metaText}>Order {item.orderNumber}</Text> : null}
                    {item.deliveredAt ? <Text style={styles.metaText}>Delivered {formatDate(item.deliveredAt)}</Text> : null}
                    <StarRow rating={0} />
                    <Text style={styles.unratedText}>Unrated - tap to rate quality and purity</Text>
                    <View style={styles.reviewBtnWrap}>
                      <Button label="Write Review (+1000 Credits)" variant="primary" icon="rate-review" onPress={() => openReviewModal(item)} />
                    </View>
                  </View>
                </Pressable>
              ))
            : reviews.map(review => (
                <Pressable
                  key={review.id}
                  style={styles.card}
                  onPress={() => openProduct(review.product.id)}
                >
                  <View style={styles.imageWrap}>
                    {review.product.images?.[0] ? (
                      <Image source={{ uri: absoluteUrl(review.product.images[0]) }} style={styles.image} resizeMode="cover" />
                    ) : (
                      <View style={[styles.image, styles.imagePlaceholder]}>
                        <Icon name="store" size={24} color={colors.outlineVariant} />
                      </View>
                    )}
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.productName} numberOfLines={1}>{review.product.name}</Text>
                    <View style={styles.ratingRow}>
                      <StarRow rating={review.rating} />
                      <Text style={styles.ratingValue}>{review.rating.toFixed(1)}</Text>
                    </View>
                    {review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}
                    <Text style={styles.comment} numberOfLines={3}>{review.comment}</Text>
                    <Text style={styles.date}>{formatDate(review.created_at)}</Text>
                  </View>
                </Pressable>
              ))}
          <View style={styles.trust}>
            <Icon name="gavel" size={16} color={colors.outline} />
            <Text style={styles.trustTxt}>
              All ratings are tied to verified purchases and help other buyers choose with confidence.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Write Review modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent onRequestClose={closeReviewModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <Pressable onPress={closeReviewModal} hitSlop={8} disabled={modalSubmitting}>
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>

            {reviewTarget ? (
              <>
                <View style={styles.modalProductRow}>
                  {reviewTarget.image ? (
                    <Image source={{ uri: reviewTarget.image }} style={styles.modalProductImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.modalProductImage, styles.imagePlaceholder]}>
                      <Icon name="store" size={20} color={colors.outlineVariant} />
                    </View>
                  )}
                  <View style={styles.modalProductInfo}>
                    <Text style={styles.modalProductName} numberOfLines={2}>{reviewTarget.productName}</Text>
                    {reviewTarget.orderNumber ? (
                      <Text style={styles.modalProductMeta}>Order {reviewTarget.orderNumber}</Text>
                    ) : null}
                  </View>
                </View>

                <Text style={styles.modalLabel}>Your rating</Text>
                <View style={styles.modalStars}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Pressable key={n} onPress={() => setModalRating(n)} hitSlop={6} disabled={modalSubmitting}>
                      <Icon
                        name={modalRating >= n ? 'star' : 'star-border'}
                        size={36}
                        color={colors.secondary}
                      />
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.modalReward}>Earn 1000 Credits when you submit</Text>

                <Text style={styles.modalLabel}>Title</Text>
                <TextInput
                  style={styles.modalInput}
                  value={modalTitle}
                  onChangeText={setModalTitle}
                  placeholder="Sum it up in a few words"
                  placeholderTextColor={colors.outline}
                  maxLength={80}
                  editable={!modalSubmitting}
                />

                <Text style={styles.modalLabel}>Review</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextarea]}
                  value={modalComment}
                  onChangeText={setModalComment}
                  placeholder="What did you like or dislike about quality and purity?"
                  placeholderTextColor={colors.outline}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  editable={!modalSubmitting}
                />

                {modalError ? <Text style={styles.modalError}>{modalError}</Text> : null}

                <Button
                  label={modalSubmitting ? 'Submitting...' : 'Submit Review (+1000 Credits)'}
                  variant="primary"
                  fullWidth
                  icon="rate-review"
                  onPress={submitModalReview}
                  disabled={modalSubmitting}
                  style={styles.modalSubmit}
                />
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  incentive: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: colors.statusSuccess, borderRadius: radius.lg, padding: spacing.sm + 2, margin: spacing.md, marginBottom: 0 },
  incentiveText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 16 },
  incentiveBold: { color: '#065f46', fontWeight: '800' },
  tabRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surfaceContainerLowest },
  tabOn: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  tabTxt: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '600' },
  tabTxtOn: { color: colors.onPrimary, fontWeight: '700' },
  tabCount: { minWidth: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  tabCountOn: { backgroundColor: colors.onPrimary },
  tabCountTxt: { ...typography.labelSm, color: colors.onSurface, fontWeight: '700', fontSize: 11 },
  tabCountTxtOn: { color: colors.primaryContainer },
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  imageWrap: { width: 72, height: 72, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceContainerHigh },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  productName: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },
  metaText: { ...typography.labelSm, color: colors.outline, marginTop: 1 },
  stars: { flexDirection: 'row', gap: 2, marginTop: spacing.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingValue: { ...typography.labelMd, color: colors.secondary, fontWeight: '700' },
  reviewTitle: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700', marginTop: spacing.sm },
  unratedText: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  comment: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  date: { ...typography.labelSm, color: colors.outline, marginTop: spacing.sm },
  reviewBtnWrap: { marginTop: spacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  trust: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.md },
  trustTxt: { ...typography.labelSm, color: colors.outline, flex: 1, lineHeight: 16 },

  /* Review modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.headlineMd, color: colors.onSurface, fontWeight: '700' },
  modalProductRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalProductImage: { width: 48, height: 48, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceContainerHigh },
  modalProductInfo: { flex: 1, minWidth: 0 },
  modalProductName: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '700' },
  modalProductMeta: { ...typography.labelSm, color: colors.outline, marginTop: 2 },
  modalLabel: { ...typography.labelLg, color: colors.onSurface, marginTop: spacing.sm, marginBottom: spacing.xs },
  modalStars: { flexDirection: 'row', gap: spacing.sm },
  modalReward: { ...typography.labelSm, color: colors.statusSuccess, marginTop: spacing.xs, fontWeight: '600' },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    ...typography.bodyMd,
  },
  modalTextarea: { minHeight: 110, paddingTop: spacing.sm },
  modalError: { ...typography.bodyMd, color: colors.error, marginTop: spacing.sm },
  modalSubmit: { marginTop: spacing.md },
});
