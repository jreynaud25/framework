import { useState } from 'react'
import type { HexColor, SlotDefinition, SlotSchema } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'
import { TextSlotEditor } from './slots/TextSlotEditor'
import { ImageSlotEditor } from './slots/ImageSlotEditor'
import { ChoiceSlotEditor } from './slots/ChoiceSlotEditor'
import { ColorSlotEditor } from './slots/ColorSlotEditor'

interface Props {
  schema: SlotSchema
  errors: SlotValidationError[]
  palette?: HexColor[]
  markedSlotKeys: Set<string>
}

/**
 * Sidebar slot list. In designer mode, each row is draggable so the
 * designer can choose the display order the client sees (e.g. Title first,
 * then Kicker). The order persists in `slotOrder` and is baked into the
 * schema on Publish.
 */
export function SlotEditors({ schema, errors, palette, markedSlotKeys }: Props) {
  const slotValues = useCompositionStore((s) => s.slotValues)
  const designerMode = useCompositionStore((s) => s.designerMode)
  const removeMark = useCompositionStore((s) => s.removeMark)
  const excludeSlot = useCompositionStore((s) => s.excludeSlot)
  const setSlotOrder = useCompositionStore((s) => s.setSlotOrder)
  const errorMap = new Map(errors.map((e) => [e.slotKey, e]))

  const [dragKey, setDragKey] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)

  function handleDelete(slotKey: string) {
    if (markedSlotKeys.has(slotKey)) removeMark(slotKey)
    else excludeSlot(slotKey)
  }

  function reorder(from: string, to: string) {
    if (from === to) return
    const current = schema.map((s) => s.key)
    const fromIdx = current.indexOf(from)
    const toIdx = current.indexOf(to)
    if (fromIdx === -1 || toIdx === -1) return
    const next = current.slice()
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved!)
    setSlotOrder(next)
  }

  return (
    <div className={'space-y-1' + (designerMode ? ' fw-slot-list--designer' : '')}>
      <div className="fw-section">Content</div>
      <div>
        {schema.map((slot) => (
          <div
            key={slot.key}
            className={
              'group relative ' +
              (overKey === slot.key && dragKey && dragKey !== slot.key
                ? 'fw-row--drop-target'
                : '')
            }
            draggable={designerMode}
            onDragStart={(e) => {
              if (!designerMode) return
              setDragKey(slot.key)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', slot.key)
            }}
            onDragOver={(e) => {
              if (!designerMode || !dragKey) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (overKey !== slot.key) setOverKey(slot.key)
            }}
            onDragLeave={() => {
              if (overKey === slot.key) setOverKey(null)
            }}
            onDrop={(e) => {
              if (!designerMode) return
              e.preventDefault()
              const from = dragKey ?? e.dataTransfer.getData('text/plain')
              if (from) reorder(from, slot.key)
              setDragKey(null)
              setOverKey(null)
            }}
            onDragEnd={() => {
              setDragKey(null)
              setOverKey(null)
            }}
          >
            <SlotEditor
              slot={slot}
              value={slotValues[slot.key]}
              error={errorMap.get(slot.key)}
              palette={palette}
            />
            {designerMode ? (
              <button
                type="button"
                className="fw-row__delete absolute opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ top: '50%', right: 0, transform: 'translateY(-50%)' }}
                onClick={() => handleDelete(slot.key)}
                title={markedSlotKeys.has(slot.key) ? 'Remove marked slot' : 'Hide from client'}
                aria-label="Delete slot"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        {schema.length === 0 ? (
          <div className="py-2 text-[11px] text-[var(--muted)]">No editable slots yet.</div>
        ) : null}
      </div>
    </div>
  )
}

function SlotEditor({
  slot,
  value,
  error,
  palette,
}: {
  slot: SlotDefinition
  value: ReturnType<typeof useCompositionStore.getState>['slotValues'][string] | undefined
  error: SlotValidationError | undefined
  palette?: HexColor[]
}) {
  switch (slot.type) {
    case 'text':
      return (
        <TextSlotEditor
          slot={slot}
          value={value?.type === 'text' ? value.value : ''}
          error={error}
        />
      )
    case 'image':
      return (
        <ImageSlotEditor
          slot={slot}
          value={value?.type === 'image' ? value : undefined}
          error={error}
        />
      )
    case 'choice':
      return (
        <ChoiceSlotEditor
          slot={slot}
          value={value?.type === 'choice' ? value.value : ''}
          error={error}
        />
      )
    case 'color':
      return (
        <ColorSlotEditor
          slot={slot}
          value={value?.type === 'color' ? value.hex : ''}
          error={error}
          palette={palette}
        />
      )
  }
}
