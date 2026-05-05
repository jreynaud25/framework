import type { ImageSlotDefinition, SlotValue } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'
import { useState } from 'react'

interface Props {
  slot: ImageSlotDefinition
  value: Extract<SlotValue, { type: 'image' }> | undefined
  error: SlotValidationError | undefined
}

export function ImageSlotEditor({ slot, value, error }: Props) {
  const setSlot = useCompositionStore((s) => s.setSlot)
  const [isOver, setOver] = useState(false)

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const r2Key = `local:${file.name}` as never
    setSlot(slot.key, { type: 'image', r2Key })
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={
        'block cursor-pointer rounded-md border border-dashed p-4 text-center text-xs transition-colors ' +
        (isOver ? 'border-[var(--fg)] bg-[var(--line)]' : 'border-[var(--line)]')
      }
    >
      <div className="text-sm">{slot.label}</div>
      <div className="mt-1 text-[var(--muted)]">
        {value?.r2Key ? <span className="font-mono">{value.r2Key}</span> : 'Drop an image, or click to upload'}
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const r2Key = `local:${file.name}` as never
          setSlot(slot.key, { type: 'image', r2Key })
        }}
      />
      {error ? <div className="mt-1 text-[11px] text-red-400">{error.message}</div> : null}
    </label>
  )
}
