import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { Icon } from './Icon';
import { Badge } from './Badge';

export interface ProductSpecifications {
  features?: string[];
  technical?: Record<string, string | null | undefined>;
  safety?: string[];
  warranty?: string[];
  audience?: { ideal?: string[] } | Record<string, unknown>;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  image?: string;
  gallery?: string[];
  category: string;
  title: string;
  price: string;
  priceValue: number;
  originalPrice?: string;
  originalPriceValue?: number;
  discount?: string;
  rating?: number;
  reviews?: number;
  minOrder?: string;
  minOrderValue?: number;
  unitLabel?: string;
  stock?: string;
  description?: string;
  specifications?: ProductSpecifications | null;
  vendor?: { id?: number; name: string; location?: string; verified?: boolean };
  badge?: { label: string; variant?: 'featured' | 'flash' | 'secondary' | 'wholesale' | 'corporate' | 'new' };
  badgeBottom?: { label: string; variant?: 'featured' | 'flash' | 'secondary' | 'wholesale' | 'corporate' | 'new' };
  isWholesale?: boolean;
  bulkOrder?: boolean;
  corporateReady?: boolean;
  enterpriseSolution?: boolean;
  seasonal?: boolean;
  holidaySpecial?: boolean;
  seasonalTheme?: string;
  isLocal?: boolean;
  handmade?: boolean;
  deliveryFee?: number;
  actionLabel?: string;
  actionVariant?: 'addToCart' | 'inquiry';
}

export function formatUGX(value: number): string {
  const formatted = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `UGX ${formatted}`;
}

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onAddToCart?: () => void;
  imageHeight?: number;
  compact?: boolean;
}

export function ProductCard({ product, onPress, onAddToCart, imageHeight = 128, compact }: ProductCardProps) {
  const { image, category, title, price, originalPrice, discount, rating, reviews, minOrder, unitLabel, badge, badgeBottom, actionLabel, actionVariant = 'addToCart' } = product;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.imageWrap, { height: imageHeight }]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Icon name="store" size={40} color={colors.outlineVariant} />
          </View>
        )}
        {badge ? (
          <View style={styles.badgeTop}>
            <Badge label={badge.label} variant={badge.variant ?? 'featured'} />
          </View>
        ) : null}
        {badgeBottom ? (
          <View style={styles.badgeBottom}>
            <Badge label={badgeBottom.label} variant={badgeBottom.variant ?? 'flash'} />
          </View>
        ) : null}
        {discount ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        {compact ? (
          <>
            <Text style={styles.titleCompact} numberOfLines={1}>{title}</Text>
            <Text style={styles.priceCompact}>{price}</Text>
          </>
        ) : (
          <>
            <Text style={styles.category} numberOfLines={1}>{category}</Text>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            {rating !== undefined ? (
              <View style={styles.ratingRow}>
                <Icon name="star" size={13} color={colors.secondary} />
                <Text style={styles.ratingText}>
                  {rating.toFixed(1)} {reviews !== undefined ? `(${reviews})` : ''}
                </Text>
                {minOrder ? (
                  <>
                    <Text style={styles.sep}>|</Text>
                    <Text style={styles.minOrder}>{minOrder}</Text>
                  </>
                ) : null}
              </View>
            ) : null}
            <View style={styles.priceRow}>
              <Text style={styles.price}>{price}</Text>
              {originalPrice ? <Text style={styles.originalPrice}>{originalPrice}</Text> : null}
              {unitLabel ? <Text style={styles.unit}>{unitLabel}</Text> : null}
            </View>
          </>
        )}
        {actionVariant === 'inquiry' ? (
          <Pressable style={[styles.actionBtn, styles.inquiryBtn]}>
            <Text style={styles.inquiryText}>{actionLabel ?? 'Inquiry Only'}</Text>
          </Pressable>
        ) : (
          <View style={styles.actionRow}>
            <Pressable style={styles.addToCartBtn} onPress={onAddToCart}>
              <Text style={styles.addToCartText}>{actionLabel ?? 'Add to Cart'}</Text>
            </Pressable>
            <Pressable style={styles.favBtn} onPress={onAddToCart}>
              <Icon name="favorite-border" size={18} color={colors.primary} />
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
  imageWrap: {
    backgroundColor: colors.surfaceContainerHigh,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  badgeTop: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badgeBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.statusFlash,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    ...typography.labelSm,
    color: colors.white,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  body: {
    padding: 12,
  },
  category: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    ...typography.headlineMd,
    color: colors.primary,
    marginTop: 2,
    fontSize: 16,
    lineHeight: 22,
  },
  titleCompact: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
    marginBottom: 6,
  },
  ratingText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  sep: {
    ...typography.labelMd,
    color: colors.outlineVariant,
    marginHorizontal: 6,
  },
  minOrder: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  price: {
    ...typography.headlineLg,
    color: colors.secondary,
    fontWeight: '700',
  },
  priceCompact: {
    ...typography.labelMd,
    color: colors.secondary,
    fontWeight: '700',
    marginTop: 4,
  },
  originalPrice: {
    ...typography.labelMd,
    color: colors.outline,
    textDecorationLine: 'line-through',
  },
  unit: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  addToCartBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addToCartText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  favBtn: {
    width: 36,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  inquiryBtn: {
    backgroundColor: colors.secondaryContainer,
  },
  inquiryText: {
    ...typography.labelMd,
    color: colors.onSecondary,
    fontWeight: '700',
  },
});
