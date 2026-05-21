import { useState } from 'react'
import type { Block, BlockKind } from '@framework/types'

interface Props {
  onClose: () => void
  onPick: (block: Block) => void
}

interface LibraryItem {
  kind: BlockKind
  label: string
  hint: string
  defaults: (id: string) => Block
}

const ITEMS: { category: string; items: LibraryItem[] }[] = [
  {
    category: 'Structure',
    items: [
      {
        kind: 'hero',
        label: 'Hero',
        hint: 'Full-width band with title + subtitle',
        defaults: (id) => ({
          id,
          kind: 'hero',
          title: 'Title',
          subtitle: 'Add a subtitle here',
          bgKind: 'primary',
          height: 'md',
          align: 'left',
        }),
      },
      {
        kind: 'section',
        label: 'Section',
        hint: 'Eyebrow header + optional subtitle',
        defaults: (id) => ({ id, kind: 'section', title: 'Section title', subtitle: '' }),
      },
      {
        kind: 'divider',
        label: 'Divider',
        hint: 'Line or vertical space',
        defaults: (id) => ({ id, kind: 'divider', style: 'line' }),
      },
      {
        kind: 'spacer',
        label: 'Spacer',
        hint: 'Empty vertical space',
        defaults: (id) => ({ id, kind: 'spacer', height: 48 }),
      },
      {
        kind: 'related',
        label: 'Related links',
        hint: 'Cross-link to other pages',
        defaults: (id) => ({ id, kind: 'related', links: [{ label: 'Logo', pageSlug: 'logo' }] }),
      },
      {
        kind: 'callout',
        label: 'Callout',
        hint: 'Info / do / don\'t / warn card',
        defaults: (id) => ({ id, kind: 'callout', tone: 'info', body: 'Body text' }),
      },
    ],
  },
  {
    category: 'Text',
    items: [
      {
        kind: 'text',
        label: 'Text',
        hint: 'Paragraph of body copy',
        defaults: (id) => ({ id, kind: 'text', markdown: 'Edit this paragraph…', width: 'narrow' }),
      },
      {
        kind: 'heading',
        label: 'Heading',
        hint: 'h2 / h3 / h4',
        defaults: (id) => ({ id, kind: 'heading', text: 'Heading', level: 2 }),
      },
      {
        kind: 'table',
        label: 'Key/value table',
        hint: 'Specs table',
        defaults: (id) => ({ id, kind: 'table', rows: [{ key: 'Key', value: 'Value' }] }),
      },
    ],
  },
  {
    category: 'Color',
    items: [
      {
        kind: 'palette',
        label: 'Palette',
        hint: 'Auto-grid from tokens',
        defaults: (id) => ({ id, kind: 'palette', columns: 3, showFields: ['hex'] }),
      },
      {
        kind: 'colorCard',
        label: 'Color card',
        hint: 'One color with full specs',
        defaults: (id) => ({ id, kind: 'colorCard', showFields: ['hex', 'rgb'] }),
      },
      {
        kind: 'colorPairing',
        label: 'Color pairing',
        hint: 'Fg-on-bg combos',
        defaults: (id) => ({ id, kind: 'colorPairing' }),
      },
      {
        kind: 'tintScale',
        label: 'Tint scale',
        hint: '25/50/75/100 of one color',
        defaults: (id) => ({ id, kind: 'tintScale', stops: [100, 75, 50, 25], mode: 'opacity' }),
      },
    ],
  },
  {
    category: 'Logo',
    items: [
      {
        kind: 'logoSpecimen',
        label: 'Logo specimen',
        hint: 'Single large logo card',
        defaults: (id) => ({ id, kind: 'logoSpecimen', bg: 'bg', height: 140 }),
      },
      {
        kind: 'logoGrid',
        label: 'Logo grid',
        hint: 'Variants × backgrounds',
        defaults: (id) => ({ id, kind: 'logoGrid', bgs: ['bg', 'fg', 'primary'] }),
      },
      {
        kind: 'logoClearspace',
        label: 'Clearspace',
        hint: 'Clearspace diagram',
        defaults: (id) => ({ id, kind: 'logoClearspace', clearspaceX: 1 }),
      },
      {
        kind: 'logoMisuse',
        label: 'Misuse grid',
        hint: '✕ examples',
        defaults: (id) => ({
          id,
          kind: 'logoMisuse',
          columns: 2,
          items: [
            { label: 'Do not apply a stroke' },
            { label: 'Do not tilt or angle' },
          ],
        }),
      },
      {
        kind: 'logoPlacement',
        label: 'Placement',
        hint: '5-position diagram',
        defaults: (id) => ({ id, kind: 'logoPlacement', positions: ['tl', 'tr', 'bl', 'br', 'c'] }),
      },
    ],
  },
  {
    category: 'Type',
    items: [
      {
        kind: 'typeSpecimen',
        label: 'Type specimen',
        hint: 'Role at largest scale',
        defaults: (id) => ({ id, kind: 'typeSpecimen', role: 'heading' }),
      },
      {
        kind: 'typeScale',
        label: 'Type scale',
        hint: 'Auto-rows from tokens',
        defaults: (id) => ({ id, kind: 'typeScale' }),
      },
      {
        kind: 'characterSet',
        label: 'Character set',
        hint: 'Glyph wall',
        defaults: (id) => ({ id, kind: 'characterSet', role: 'body', set: 'all' }),
      },
    ],
  },
  {
    category: 'Imagery',
    items: [
      {
        kind: 'image',
        label: 'Image',
        hint: 'Single image + caption',
        defaults: (id) => ({ id, kind: 'image', fit: 'cover', aspect: '16:9' }),
      },
      {
        kind: 'imageGrid',
        label: 'Image grid',
        hint: 'Multi-image mosaic',
        defaults: (id) => ({ id, kind: 'imageGrid', assetIds: [], columns: 3, aspect: '4:3' }),
      },
      {
        kind: 'doDontGrid',
        label: 'Do / Don\'t',
        hint: 'Side-by-side comparison',
        defaults: (id) => ({
          id,
          kind: 'doDontGrid',
          columns: 2,
          items: [
            { caption: 'Do this', kind: 'do' },
            { caption: 'Don\'t do this', kind: 'dont' },
          ],
        }),
      },
      {
        kind: 'patternGrid',
        label: 'Pattern grid',
        hint: 'Tileable previews',
        defaults: (id) => ({ id, kind: 'patternGrid' }),
      },
    ],
  },
  {
    category: 'Voice',
    items: [
      {
        kind: 'toneChips',
        label: 'Tone chips',
        hint: 'Voice attribute pills',
        defaults: (id) => ({ id, kind: 'toneChips' }),
      },
      {
        kind: 'vocabulary',
        label: 'Vocabulary',
        hint: 'Preferred vs Avoid',
        defaults: (id) => ({ id, kind: 'vocabulary' }),
      },
      {
        kind: 'copyExamples',
        label: 'Copy examples',
        hint: 'Before / after pairs',
        defaults: (id) => ({
          id,
          kind: 'copyExamples',
          pairs: [{ before: 'Before', after: 'After' }],
        }),
      },
    ],
  },
  {
    category: 'Resources',
    items: [
      {
        kind: 'downloads',
        label: 'Downloads',
        hint: 'Logo pack, fonts, files',
        defaults: (id) => ({ id, kind: 'downloads' }),
      },
      {
        kind: 'mediaLibrary',
        label: 'Media library',
        hint: 'Auto-aggregates assets by kind',
        defaults: (id) => ({ id, kind: 'mediaLibrary', filter: 'photo', columns: 3, aspect: '4:3', showLabels: true }),
      },
      {
        kind: 'embed',
        label: 'Embed',
        hint: 'Sandboxed HTML',
        defaults: (id) => ({ id, kind: 'embed', html: '<p>Embed</p>', height: 200 }),
      },
    ],
  },
]

function newBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Categorized block picker. Click a tile → instantiates the block with
 * sensible defaults and inserts it at the call site.
 */
export function BlockLibrary({ onClose, onPick }: Props) {
  const [query, setQuery] = useState('')
  const lower = query.toLowerCase()
  const filtered = ITEMS.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (it) =>
        !lower || it.label.toLowerCase().includes(lower) || it.hint.toLowerCase().includes(lower),
    ),
  })).filter((cat) => cat.items.length > 0)

  return (
    <div className="fw-bbook-edit__modal-backdrop" onClick={onClose}>
      <div className="fw-bbook-edit__modal" onClick={(e) => e.stopPropagation()}>
        <header className="fw-bbook-edit__modal-head">
          <h2>Add a block</h2>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="fw-bbook-edit__modal-search"
          />
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="fw-bbook-edit__library">
          {filtered.map((cat) => (
            <section key={cat.category}>
              <h3>{cat.category}</h3>
              <div className="fw-bbook-edit__library-grid">
                {cat.items.map((it) => (
                  <button
                    key={it.kind}
                    type="button"
                    className="fw-bbook-edit__library-tile"
                    onClick={() => onPick(it.defaults(newBlockId()))}
                  >
                    <span className="fw-bbook-edit__library-label">{it.label}</span>
                    <span className="fw-bbook-edit__library-hint">{it.hint}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
