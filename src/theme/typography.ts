import { TextStyle } from 'react-native';

export const typography = {
  displayLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.64,
  },
  displayLgMobile: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  },
  headlineLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
  },
  headlineMd: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
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
  labelMd: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  labelSm: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
  },
} as const satisfies Record<string, TextStyle>;
