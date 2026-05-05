import type { EditorProject } from '../state/editorStore'
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
      weights: [400, 700, 900],
      defaultWeight: 800,
      scale: [144, 96, 64],
      lineHeight: 1.0,
      letterSpacing: -0.03,
    },
    body: {
      fontFamily: 'Inter',
      fontTokenKey: 'body',
      weights: [400, 500],
      defaultWeight: 400,
      scale: [16],
      lineHeight: 1.4,
    },
  },
  spacing: { unit: 8, scale: [4, 8, 16, 24, 32, 48, 64] },
  logos: [],
}

const layout: LayoutNode = {
  type: 'frame',
  id: 'root',
  layout: { mode: 'vertical', gap: 16, padding: 64, justify: 'space-between', align: 'start' },
  style: { background: 'colors.semantic.bg', width: '100%', height: '100%' },
  children: [
    {
      type: 'text',
      id: 'kicker',
      slotKey: 'kicker',
      defaultText: 'SS26',
      style: {
        tokenRef: 'body',
        fontSize: 14,
        fontWeight: 500,
        color: 'colors.semantic.fg',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
      },
      constraints: { maxChars: 12 },
    },
    {
      type: 'text',
      id: 'title',
      slotKey: 'title',
      defaultText: 'SPRING DROP',
      style: {
        tokenRef: 'display',
        fontSize: 144,
        fontWeight: 800,
        color: 'colors.semantic.fg',
        textTransform: 'uppercase',
      },
      constraints: { maxChars: 24, autoShrink: true, minFontSize: 64 },
    },
    {
      type: 'text',
      id: 'date',
      slotKey: 'date',
      defaultText: 'APRIL 12 — 21',
      style: {
        tokenRef: 'body',
        fontSize: 18,
        color: 'colors.semantic.accent',
        letterSpacing: 1,
      },
      constraints: { maxChars: 32 },
    },
  ],
}

const slotSchema: SlotSchema = [
  { type: 'text', key: 'kicker', label: 'Kicker', constraints: { maxChars: 12 } },
  { type: 'text', key: 'title', label: 'Title', constraints: { maxChars: 24, required: true } },
  { type: 'text', key: 'date', label: 'Date', constraints: { maxChars: 32 } },
]

const initialSlotValues: SlotValues = {
  kicker: { type: 'text', value: 'SS26' },
  title: { type: 'text', value: 'SPRING DROP' },
  date: { type: 'text', value: 'APRIL 12 — 21' },
}

export const sampleProject: EditorProject = {
  templateId: 'sample-spring-drop',
  templateName: 'Spring Drop',
  brandName: '30 70 Agency',
  layout,
  tokens,
  slotSchema,
  initialSlotValues,
  formats: ['1:1', '9:16', '16:9'],
}
