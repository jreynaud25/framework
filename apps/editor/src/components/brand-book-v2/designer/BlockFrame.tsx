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
 *   - hover border + floating toolbar (drag, move, duplicate, delete)
 *   - HTML5 drag-and-drop to reorder blocks within the page
 *   - click to select (Inspector picks up via context.selection)
 *   - "+ block" affordance directly below for insertion at idx+1
 */
export function BlockFrame({ pageId, block, index, total, children }: Props) {
  const { selection, setSelection } = useBrandBookContext()
  const ops = useBlockOps()
  const [showLibrary, setShowLibrary] = useState(false)
  const [dropZone, setDropZone] = useState<'above' | 'below' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const isSelected = selection.blockId === block.id

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDropZone(null)
    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === block.id) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const above = e.clientY < rect.top + rect.height / 2
    const targetIndex = above ? index : index + 1
    void ops.moveBlockTo(pageId, draggedId, targetIndex)
  }

  return (
    <>
      <div
        className={`fw-bbook-edit__frame ${isSelected ? 'is-selected' : ''} ${
          isDragging ? 'is-dragging' : ''
        } ${dropZone ? `is-drop-${dropZone}` : ''}`}
        data-block-id={block.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', block.id)
          e.dataTransfer.effectAllowed = 'move'
          setIsDragging(true)
        }}
        onDragEnd={() => {
          setIsDragging(false)
          setDropZone(null)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          const above = e.clientY < rect.top + rect.height / 2
          setDropZone(above ? 'above' : 'below')
        }}
        onDragLeave={() => setDropZone(null)}
        onDrop={handleDrop}
        onClick={(e) => {
          e.stopPropagation()
          setSelection({ pageId, blockId: block.id })
        }}
      >
        <div className="fw-bbook-edit__toolbar" onClick={(e) => e.stopPropagation()}>
          <span
            className="fw-bbook-edit__toolbar-grip"
            title="Drag to reorder"
            aria-hidden
          >
            ⋮⋮
          </span>
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
