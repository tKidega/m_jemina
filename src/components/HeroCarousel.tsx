import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  ImageSourcePropType,
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
  image: ImageSourcePropType | string;
  title?: string;
  subtitle?: string;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  aspectRatio?: number;
  resizeMode?: 'contain' | 'cover';
  showDots?: boolean;
}

const AUTO_PLAY_INTERVAL = 4000;

export function HeroCarousel({ slides, aspectRatio = 16 / 9, resizeMode = 'contain', showDots = false }: HeroCarouselProps) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    slides.forEach(slide => {
      if (typeof slide.image === 'string') {
        Image.prefetch(slide.image);
      }
    });
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1 || reduceMotion) {
      return;
    }
    const timer = setInterval(() => {
      const next = (active + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: !reduceMotion });
      setActive(next);
    }, AUTO_PLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [slides.length, reduceMotion, active, width]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    if (index >= 0 && index < slides.length && index !== active) {
      setActive(index);
    }
  };

  const toSource = (image: HeroSlide['image']): ImageSourcePropType => {
    if (typeof image === 'object' && image !== null) {
      return image;
    }
    return typeof image === 'number' ? image : { uri: image };
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
        {slides.map(slide => (
          <View key={slide.id} style={[styles.page, { width }]}>
            <View style={[styles.frame, { aspectRatio }]}>
              <Image source={toSource(slide.image)} style={styles.image} resizeMode={resizeMode} />
            </View>
          </View>
        ))}
      </ScrollView>
      {showDots && slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <View key={slide.id} style={[styles.dot, i === active && styles.dotActive]} />
          ))}
        </View>
      ) : null}
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
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
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