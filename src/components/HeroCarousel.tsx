import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  ScrollView,
  StyleSheet,
  View,
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
  /** slide = paged ScrollView (legacy); fade = stacked crossfade like the website hero */
  transition?: 'slide' | 'fade';
  /** Full-bleed edges + overlay indicators — matches site #headercarousel */
  fullBleed?: boolean;
}

const SLIDE_INTERVAL = 4000;
const FADE_MS = 4000;
const HOLD_MS = 6000;
const FADE_INTERVAL = HOLD_MS + FADE_MS;

const toSource = (image: HeroSlide['image']): ImageSourcePropType => {
  if (typeof image === 'object' && image !== null) {
    return image;
  }
  return typeof image === 'number' ? image : { uri: image };
};

export function HeroCarousel({
  slides,
  aspectRatio = 16 / 9,
  resizeMode = 'contain',
  showDots = false,
  transition = 'slide',
  fullBleed = false,
}: HeroCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [active, setActive] = useState(0);
  const [panelWidth, setPanelWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacitiesRef = useRef<Animated.Value[]>([]);
  const activeRef = useRef(0);
  const busyRef = useRef(false);
  const slidesRef = useRef(slides);
  const reduceMotionRef = useRef(false);

  slidesRef.current = slides;
  reduceMotionRef.current = reduceMotion;

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
    slidesRef.current = slides;
    opacitiesRef.current = slides.map((_, i) => new Animated.Value(i === 0 ? 1 : 0));
    activeRef.current = 0;
    setActive(0);
    busyRef.current = false;
    slides.forEach(slide => {
      if (typeof slide.image === 'string') {
        Image.prefetch(slide.image);
      }
    });
  }, [slides]);

  const goToFade = useCallback((target: number) => {
    const list = slidesRef.current;
    if (list.length < 2 || busyRef.current) {
      return;
    }
    const len = list.length;
    const nextIndex = ((target % len) + len) % len;
    const fromIndex = activeRef.current;
    if (nextIndex === fromIndex) {
      return;
    }

    const from = opacitiesRef.current[fromIndex];
    const to = opacitiesRef.current[nextIndex];
    activeRef.current = nextIndex;
    setActive(nextIndex);

    if (!from || !to) {
      return;
    }

    if (reduceMotionRef.current) {
      from.setValue(0);
      to.setValue(1);
      return;
    }

    busyRef.current = true;
    to.setValue(0);
    Animated.parallel([
      Animated.timing(from, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
      Animated.timing(to, { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
    ]).start(() => {
      busyRef.current = false;
    });
  }, []);

  const goToFadeRef = useRef(goToFade);
  goToFadeRef.current = goToFade;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 50) {
          return;
        }
        const dir = g.dx < 0 ? 1 : -1;
        const next = (activeRef.current + dir + slidesRef.current.length) % slidesRef.current.length;
        goToFadeRef.current?.(next);
      },
    }),
  ).current;

  // Website timings: hold 6s + fade 4s
  useEffect(() => {
    if (transition !== 'fade' || slides.length <= 1 || reduceMotion) {
      return;
    }
    const timer = setInterval(() => {
      const next = (activeRef.current + 1) % slidesRef.current.length;
      goToFadeRef.current?.(next);
    }, FADE_INTERVAL);
    return () => clearInterval(timer);
  }, [transition, slides.length, reduceMotion]);

  // Legacy slide mode autoplay
  useEffect(() => {
    if (transition !== 'slide' || slides.length <= 1 || reduceMotion || panelWidth <= 0) {
      return;
    }
    const timer = setInterval(() => {
      const next = (active + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * panelWidth, animated: !reduceMotion });
      setActive(next);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [transition, slides.length, reduceMotion, active, panelWidth]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (panelWidth <= 0) {
      return;
    }
    const index = Math.round(e.nativeEvent.contentOffset.x / panelWidth);
    if (index >= 0 && index < slides.length && index !== active) {
      setActive(index);
    }
  };

  const frameStyle = [styles.frame, { aspectRatio }, fullBleed ? styles.frameBleed : null];

  const dots =
    showDots && slides.length > 1 ? (
      <View style={[styles.dots, fullBleed ? styles.dotsOverlay : null]}>
        {slides.map((slide, i) => (
          <View
            key={slide.id}
            style={[
              styles.dot,
              fullBleed ? styles.dotBleed : null,
              i === active && styles.dotActive,
              i === active && fullBleed ? styles.dotActiveBleed : null,
            ]}
          />
        ))}
      </View>
    ) : null;

  if (transition === 'fade') {
    return (
      <View
        style={styles.wrapper}
        onLayout={e => setPanelWidth(e.nativeEvent.layout.width)}
        {...(slides.length > 1 ? panResponder.panHandlers : {})}
      >
        <View style={frameStyle}>
          {slides.map((slide, i) => {
            const opacity = opacitiesRef.current[i];
            return (
              <Animated.View
                key={slide.id}
                style={[
                  StyleSheet.absoluteFill,
                  { opacity: opacity ?? (i === 0 ? 1 : 0) },
                ]}
                pointerEvents={i === active ? 'auto' : 'none'}
              >
                <Image source={toSource(slide.image)} style={styles.image} resizeMode={resizeMode} />
              </Animated.View>
            );
          })}
        </View>
        {dots}
      </View>
    );
  }

  return (
    <View style={styles.wrapper} onLayout={e => setPanelWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {panelWidth > 0
          ? slides.map(slide => (
              <View
                key={slide.id}
                style={[styles.page, fullBleed ? styles.pageBleed : null, { width: panelWidth }]}
              >
                <View style={frameStyle}>
                  <Image source={toSource(slide.image)} style={styles.image} resizeMode={resizeMode} />
                </View>
              </View>
            ))
          : null}
      </ScrollView>
      {dots}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 0,
    width: '100%',
  },
  page: {
    paddingHorizontal: spacing.sm,
  },
  pageBleed: {
    paddingHorizontal: 0,
  },
  frame: {
    width: '100%',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  frameBleed: {
    borderRadius: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dotsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    marginTop: 0,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outlineVariant,
  },
  dotBleed: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    width: 14,
    backgroundColor: colors.secondary,
  },
  dotActiveBleed: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
});
