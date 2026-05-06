import 'server-only'
import type { BrandTokens } from '@framework/types'
import type { BrandLoaded } from './brand'

const tokens3070: BrandTokens = {
  colors: {
    primary: '#FF0033',
    palette: [
      { name: 'brand-red', hex: '#FF0033', usage: 'primary' },
      { name: 'ink', hex: '#0A0A0A' },
      { name: 'paper', hex: '#FAFAF7' },
      { name: 'sand', hex: '#E8E1D3' },
      { name: 'noir', hex: '#111111' },
    ],
    semantic: { bg: '#0A0A0A', fg: '#FAFAF7', accent: '#FF0033' },
  },
  typography: {
    display: {
      fontFamily: 'Inter',
      fontTokenKey: 'display',
      weights: [400, 700, 900],
      defaultWeight: 700,
      scale: [96, 72, 56, 40, 32],
      lineHeight: 1.05,
      letterSpacing: -0.02,
    },
    heading: {
      fontFamily: 'Inter',
      fontTokenKey: 'heading',
      weights: [400, 600, 700],
      defaultWeight: 600,
      scale: [40, 32, 24, 20],
      lineHeight: 1.1,
    },
    body: {
      fontFamily: 'Inter',
      fontTokenKey: 'body',
      weights: [400, 500],
      defaultWeight: 400,
      scale: [16, 14, 12],
      lineHeight: 1.5,
    },
  },
  spacing: { unit: 8, scale: [4, 8, 16, 24, 32, 48, 64, 96, 128] },
  logos: [
    {
      name: '30 70 Wordmark',
      variant: 'wordmark',
      r2Key: 'mock/3070/wordmark.svg' as never,
      clearSpaceMultiplier: 0.5,
      minSizePx: 48,
      allowedBackgrounds: ['*'],
    },
  ],
  motion: {
    durations: { fast: 120, base: 240, slow: 480 },
    easings: { default: 'cubic-bezier(0.2, 0, 0, 1)', emphasized: 'cubic-bezier(0.3, 0, 0, 1)' },
    principles: ['Decisive', 'Confident', 'Never bounces'],
  },
  voice: {
    tone: ['Confident', 'Spare', 'No exclamation points'],
    vocabulary: { preferred: ['drop', 'collection'], avoid: ['launch', 'unveil'] },
    forbidden: ['game-changer', 'revolutionary'],
  },
  imagery: {
    dos: ['High contrast', 'Single subject', 'Natural light'],
    donts: ['Stock', 'Stickers', 'Filters'],
  },
}

const MOCK_BRANDS: Record<string, BrandLoaded> = {
  '3070': {
    id: 'mock-3070',
    slug: '3070',
    name: '30 70 Agency',
    industry: 'Fashion',
    websiteUrl: 'https://3070.agency',
    tokens: tokens3070,
    templates: [
      {
        id: 'tpl-spring-drop',
        name: 'Spring Drop',
        slug: 'spring-drop',
        thumbnailUrl: '/api/og/template/spring-drop',
        formats: ['1:1', '9:16', '16:9'],
        isNew: true,
      },
      {
        id: 'tpl-lookbook',
        name: 'Lookbook Cover',
        slug: 'lookbook-cover',
        thumbnailUrl: '/api/og/template/lookbook-cover',
        formats: ['1:1', '4:5'],
        isNew: false,
      },
    ],
  },
}

export function mockBrandBySlug(slug: string): BrandLoaded | null {
  return MOCK_BRANDS[slug] ?? null
}
