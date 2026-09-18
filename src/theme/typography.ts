import { TextStyle } from 'react-native';

export const typography = {
  displayLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.48,
  },
  displayLgMobile: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.48,
  },
  headlineLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.48,
  },
  headlineMd: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.18,
  },
  headlineSm: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  bodyLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  bodyMd: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  bodySm: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '400',
  },
  labelLg: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  labelMd: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 0.22,
  },
  labelSm: {
    fontFamily: 'Hanken Grotesk',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
} as const satisfies Record<string, TextStyle>;
