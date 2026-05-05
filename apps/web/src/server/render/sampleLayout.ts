import 'server-only'
import type { LayoutNode, SlotSchema } from '@framework/types'

interface SampleLayout {
  layout: LayoutNode
  slotSchema: SlotSchema
}

const SPRING_DROP: SampleLayout = {
  layout: {
    type: 'frame',
    id: 'root',
    layout: { mode: 'vertical', padding: 80, justify: 'space-between', align: 'start' },
    style: { background: 'colors.semantic.bg', width: '100%', height: '100%' },
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
      },
      {
        type: 'text',
        id: 'title',
        slotKey: 'title',
        defaultText: 'SPRING DROP 2026',
        style: {
          tokenRef: 'display',
          fontSize: 120,
          fontWeight: 800,
          color: 'colors.semantic.fg',
        },
      },
      {
        type: 'text',
        id: 'date',
        slotKey: 'date',
        defaultText: 'April 12 — 21',
        style: { tokenRef: 'body', fontSize: 22, color: 'colors.semantic.fg' },
      },
    ],
  },
  slotSchema: [
    { type: 'text', key: 'kicker', label: 'Kicker', constraints: { maxChars: 24 } },
    { type: 'text', key: 'title', label: 'Title', constraints: { maxChars: 40, required: true } },
    { type: 'text', key: 'date', label: 'Date', constraints: { maxChars: 32 } },
  ],
}

const TEMPLATES: Record<string, SampleLayout> = {
  'spring-drop': SPRING_DROP,
  'lookbook-cover': SPRING_DROP,
}

export function sampleLayoutFor(slug: string): SampleLayout | null {
  return TEMPLATES[slug] ?? null
}
