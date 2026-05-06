import type { BrandTokens, LayoutNode, SlotSchema, SlotValues } from '@framework/types'

const tokens: BrandTokens = {
  colors: {
    primary: '#FF0033',
    palette: [
      { name: 'brand-red', hex: '#FF0033', usage: 'primary' },
      { name: 'ink', hex: '#0A0A0A' },
      { name: 'paper', hex: '#FAFAF7' },
      { name: 'sand', hex: '#E8E1D3' },
    ],
    semantic: { bg: '#0A0A0A', fg: '#FAFAF7', accent: '#FF0033' },
  },
  typography: {
    display: {
      fontFamily: 'Inter',
      fontTokenKey: 'display',
      weights: [700, 900],
      defaultWeight: 900,
      scale: [120, 96, 72],
      lineHeight: 1.0,
      letterSpacing: -0.03,
    },
    body: {
      fontFamily: 'Inter',
      fontTokenKey: 'body',
      weights: [400],
      defaultWeight: 400,
      scale: [22, 16],
      lineHeight: 1.4,
    },
  },
  spacing: { unit: 8, scale: [4, 8, 16, 24, 32, 48, 64, 96, 128] },
  logos: [],
}

const layout: LayoutNode = {
  type: 'frame',
  id: 'root',
  layout: { mode: 'vertical', padding: 80, gap: 24, justify: 'space-between', align: 'start' },
  // `slot:background` makes the canvas color editable from the brand
  // palette via the slot inspector.
  style: { background: 'slot:background' },
  children: [
    {
      type: 'text',
      id: 'kicker',
      slotKey: 'kicker',
      defaultText: 'COLLECTION',
      style: {
        tokenRef: 'body',
        fontSize: 14,
        fontWeight: 500,
        color: 'colors.primary',
        textTransform: 'uppercase',
        letterSpacing: 2,
      },
      constraints: { maxChars: 24 },
    },
    {
      type: 'text',
      id: 'title',
      slotKey: 'title',
      defaultText: 'SPRING DROP 2026',
      style: {
        tokenRef: 'display',
        color: 'colors.semantic.fg',
        align: 'left',
      },
      constraints: { maxChars: 40, autoShrink: true },
    },
    {
      type: 'frame',
      id: 'meta',
      layout: { mode: 'horizontal', justify: 'space-between', align: 'baseline' },
      children: [
        {
          type: 'text',
          id: 'date',
          slotKey: 'date',
          defaultText: 'April 12 — 21',
          style: { tokenRef: 'body', fontSize: 22, color: 'colors.semantic.fg' },
          constraints: { maxChars: 32 },
        },
        {
          type: 'text',
          id: 'venue',
          slotKey: 'venue',
          defaultText: 'PARIS',
          style: {
            tokenRef: 'body',
            fontSize: 22,
            color: 'colors.semantic.fg',
            letterSpacing: 1,
          },
          constraints: { maxChars: 24 },
        },
      ],
    },
  ],
}

const slotSchema: SlotSchema = [
  {
    type: 'color',
    key: 'background',
    label: 'Background',
    constraints: { paletteOnly: true },
    default: '#0A0A0A',
  },
  {
    type: 'text',
    key: 'kicker',
    label: 'Kicker',
    constraints: { maxChars: 24, required: false },
    default: 'COLLECTION',
  },
  {
    type: 'text',
    key: 'title',
    label: 'Title',
    constraints: { maxChars: 40, required: true },
    default: 'SPRING DROP 2026',
  },
  {
    type: 'text',
    key: 'date',
    label: 'Date',
    constraints: { maxChars: 32, required: false },
    default: 'April 12 — 21',
  },
  {
    type: 'text',
    key: 'venue',
    label: 'Venue',
    constraints: { maxChars: 24, required: false },
    default: 'PARIS',
  },
]

const defaultValues: SlotValues = {
  background: { type: 'color', hex: '#0A0A0A' },
  kicker: { type: 'text', value: 'COLLECTION' },
  title: { type: 'text', value: 'SPRING DROP 2026' },
  date: { type: 'text', value: 'April 12 — 21' },
  venue: { type: 'text', value: 'PARIS' },
}

export const demoTemplate = { tokens, layout, slotSchema, defaultValues }
