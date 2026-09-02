import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
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

const AUTO_PLAY_INTERVAL = 4000;

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    slides.forEach((slide) => {
      Image.prefetch(slide.image);
    });
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }
    const timer = setInterval(() => {
      const next = (active + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setActive(next);
    }, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [slides.length, active, width]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index >= 0 && index < slides.length && index !== active) {
      setActive(index);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
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