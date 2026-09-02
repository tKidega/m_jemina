import React, { useEffect } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

export interface HeroSlide {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const { width } = useWindowDimensions();

  useEffect(() => {
    slides.forEach((slide) => {
      Image.prefetch(slide.image);
    });
  }, [slides]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.page, { width }]}>
            <View style={styles.frame}>
              <Image
                source={{ uri: slide.image }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: spacing.md,
  },
  page: {
    paddingHorizontal: spacing.container,
  },
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});