import { useState } from 'react'
import type { Block, BlockKind } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { useBlockOps } from './useBlockOps'
import { BlockLibrary } from './BlockLibrary'

interface Props {
  pageId: string
  block: Block
  index: number
  total: number
  children: React.ReactNode
}

/**
 * Designer-only wrapper around a block. Adds:
 *   - hover border + floating toolbar (move, duplicate, delete)
 *   - click to select (Inspector picks up via context.selection)
 *   - "+ block" affordance directly below for insertion at idx+1
 * Pure presentational chrome — no editing of the block's content happens
 * here; that's the Inspector's job.
 */
export function BlockFrame({ pageId, block, index, total, children }: Props) {
  const { selection, setSelection } = useBrandBookContext()
  const ops = useBlockOps()
  const [showLibrary, setShowLibrary] = useState(false)
  const isSelected = selection.blockId === block.id

  return (
    <>
      <div
        className={`fw-bbook-edit__frame ${isSelected ? 'is-selected' : ''}`}
        data-block-id={block.id}
        onClick={(e) => {
          e.stopPropagation()
          setSelection({ pageId, blockId: block.id })
        }}
      >
        <div className="fw-bbook-edit__toolbar" onClick={(e) => e.stopPropagation()}>
          <span className="fw-bbook-edit__toolbar-kind">{labelFor(block.kind)}</span>
          <button
            type="button"
            disabled={index === 0}
            title="Move up"
            onClick={() => ops.moveBlock(pageId, block.id, 'up')}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            title="Move down"
            onClick={() => ops.moveBlock(pageId, block.id, 'down')}
          >
            ↓
          </button>
          <button
            type="button"
            title="Duplicate"
            onClick={() => ops.duplicateBlock(pageId, block.id)}
          >
            ⎘
          </button>
          <button
            type="button"
            title="Delete"
            className="is-danger"
            onClick={() => {
              if (confirm('Delete this block?')) void ops.deleteBlock(pageId, block.id)
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
      <button
        type="button"
        className="fw-bbook-edit__add-affordance"
        onClick={() => setShowLibrary(true)}
        title="Insert block below"
      >
        <span>+ block</span>
      </button>
      {showLibrary ? (
        <BlockLibrary
          onClose={() => setShowLibrary(false)}
          onPick={(b) => {
            setShowLibrary(false)
            void ops.addBlock(pageId, b, index + 1)
          }}
        />
      ) : null}
    </>
  )
}

const KIND_LABELS: Record<BlockKind, string> = {
  hero: 'Hero',
  section: 'Section',
  text: 'Text',
  heading: 'Heading',
  divider: 'Divider',
  spacer: 'Spacer',
  callout: 'Callout',
  related: 'Related links',
  table: 'Table',
  palette: 'Palette',
  colorCard: 'Color card',
  colorPairing: 'Color pairing',
  tintScale: 'Tint scale',
  logoSpecimen: 'Logo specimen',
  logoGrid: 'Logo grid',
  logoClearspace: 'Logo clearspace',
  logoMisuse: 'Logo misuse',
  logoPlacement: 'Logo placement',
  typeSpecimen: 'Type specimen',
  typeScale: 'Type scale',
  characterSet: 'Character set',
  image: 'Image',
  imageGrid: 'Image grid',
  doDontGrid: 'Do / Don\'t',
  toneChips: 'Tone chips',
  vocabulary: 'Vocabulary',
  copyExamples: 'Copy examples',
  patternGrid: 'Pattern grid',
  downloads: 'Downloads',
  embed: 'Embed',
}

function labelFor(kind: BlockKind): string {
  return KIND_LABELS[kind] ?? kind
}
