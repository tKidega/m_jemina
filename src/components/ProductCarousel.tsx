import React, { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { ProductCard } from './ProductCard';
import type { Product } from './ProductCard';

interface ProductCarouselProps {
  products: Product[];
  onPress?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  cardWidth?: number;
  imageHeight?: number;
  compact?: boolean;
  showDots?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  loop?: boolean;
  renderItem?: (product: Product) => React.ReactNode;
}

export function ProductCarousel({
  products,
  onPress,
  onAddToCart,
  cardWidth,
  imageHeight = 120,
  compact = true,
  showDots = true,
  autoPlay = true,
  autoPlayInterval = 10000,
  loop = true,
  renderItem,
}: ProductCarouselProps) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);

  const itemWidth = cardWidth ?? Math.round(width * 0.46);
  const step = itemWidth + spacing.gutter;
  const perView = Math.max(1, Math.floor((width - spacing.lg * 2 + spacing.gutter) / step));
  const pageCount = Math.max(1, Math.ceil(products.length / perView));

  useEffect(() => {
    if (!autoPlay || products.length === 0 || pageCount <= 1) {
      return;
    }
    const timer = setInterval(() => {
      goToPage(loop ? active + 1 : Math.min(active + 1, pageCount - 1));
    }, autoPlayInterval);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, loop, autoPlayInterval, pageCount, products.length, active]);

  if (products.length === 0) {
    return null;
  }

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / step);
    if (index >= 0 && index < products.length) {
      setActive(Math.min(pageCount - 1, Math.floor(index / perView)));
    }
  };

  const goToPage = (page: number) => {
    const target = ((page % pageCount) + pageCount) % pageCount;
    scrollRef.current?.scrollTo({ x: target * perView * step, animated: true });
    setActive(target);
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={styles.content}
      >
        {products.map(product => (
          <View key={product.id} style={[styles.item, { width: itemWidth }]}>
            {renderItem ? (
              renderItem(product)
            ) : (
              <ProductCard
                product={product}
                compact={compact}
                imageHeight={imageHeight}
                onPress={() => onPress?.(product)}
                onAddToCart={() => onAddToCart?.(product)}
              />
            )}
          </View>
        ))}
      </ScrollView>
      {showDots && pageCount > 1 ? (
        <View style={styles.dots}>
          {Array.from({ length: pageCount }).map((_, i) => (
            <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.gutter,
  },
  item: {
    flexShrink: 0,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant,
  },
  dotActive: {
    width: 14,
    backgroundColor: colors.secondary,
  },
});
