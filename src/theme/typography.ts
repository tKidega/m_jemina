import { TextStyle } from 'react-native';

export const typography = {
  displayLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.56,
  },
  displayLgMobile: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.56,
  },
  headlineLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.56,
  },
  headlineMd: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.22,
  },
  headlineSm: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  bodyLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyMd: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  bodySm: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  labelLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  labelMd: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.24,
  },
  labelSm: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
} as const satisfies Record<string, TextStyle>;
