import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export interface HeroSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  autoPlayInterval?: number;
  fadeDuration?: number;
}

export function HeroCarousel({
  slides,
  autoPlayInterval = 10000,
  fadeDuration = 1100,
}: HeroCarouselProps) {
  const { width } = useWindowDimensions();
  const [active, setActive] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const animatingRef = useRef(false);
  const activeRef = useRef(0);

  const updateActive = (index: number) => {
    activeRef.current = index;
    setActive(index);
  };

  const goTo = useCallback(
    (index: number) => {
      const target = ((index % slides.length) + slides.length) % slides.length;
      if (target === activeRef.current || animatingRef.current) {
        return;
      }
      animatingRef.current = true;
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeDuration,
        useNativeDriver: true,
      }).start(() => {
        updateActive(target);
        opacity.setValue(0);
        Animated.timing(opacity, {
          toValue: 1,
          duration: fadeDuration,
          useNativeDriver: true,
        }).start(({ finished: _finished }) => {
          animatingRef.current = false;
        });
      });
    },
    [opacity, fadeDuration, slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }
    const timer = setInterval(() => {
      goTo(activeRef.current + 1);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [slides.length, autoPlayInterval, goTo]);

  const slide = slides[active];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.slide, { width, opacity }]}>
        <Image source={{ uri: slide.image }} style={styles.bg} resizeMode="cover" />
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>
      </Animated.View>
      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <Pressable key={s.id} onPress={() => goTo(i)} hitSlop={6}>
              <View style={[styles.dot, i === active && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    height: 280,
    position: 'relative',
    overflow: 'hidden',
  },
  slide: {
    height: 280,
    position: 'relative',
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.45,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    opacity: 0.55,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  title: {
    ...typography.headlineLg,
    color: colors.onPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    opacity: 0.8,
  },
  dots: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.onPrimary,
    opacity: 0.4,
  },
  dotActive: {
    width: 20,
    opacity: 1,
    backgroundColor: colors.secondary,
  },
});
