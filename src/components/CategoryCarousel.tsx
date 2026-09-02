import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Icon, IconName } from './Icon';

export interface CategoryTile {
  key: string;
  label: string;
  icon: IconName;
  color?: string;
}

interface CategoryCarouselProps {
  categories: CategoryTile[];
  onPress?: (category: CategoryTile) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function CategoryCarousel({
  categories,
  onPress,
  autoPlay = false,
  autoPlayInterval = 4000,
}: CategoryCarouselProps) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);

  const tileWidth = 88;
  const step = tileWidth + spacing.gutter;
  const perView = Math.max(1, Math.floor((width - spacing.lg * 2 + spacing.gutter) / step));
  const pageCount = Math.max(1, Math.ceil(categories.length / perView));

  useEffect(() => {
    if (!autoPlay || categories.length === 0 || pageCount <= 1) {
      return;
    }
    const timer = setInterval(() => {
      const target = ((pageRef.current + 1) % pageCount + pageCount) % pageCount;
      pageRef.current = target;
      scrollRef.current?.scrollTo({ x: target * perView * step, animated: true });
    }, autoPlayInterval);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, autoPlayInterval, pageCount, categories.length]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        contentContainerStyle={styles.content}
      >
        {categories.map((cat) => (
          <Pressable key={cat.key} style={styles.tile} onPress={() => onPress?.(cat)}>
            <View style={styles.circle}>
              <Icon name={cat.icon} size={26} color={cat.color ?? colors.secondary} />
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingRight: spacing.lg,
    gap: spacing.gutter,
    paddingBottom: spacing.sm,
  },
  tile: {
    width: 88,
    alignItems: 'center',
    flexShrink: 0,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    textAlign: 'center',
    lineHeight: 16,
  },
});