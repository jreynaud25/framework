import type { ImageSlotDefinition, SlotValue } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'
import { useState } from 'react'
import { SlotLabel } from '../SlotLabel'

interface Props {
  slot: ImageSlotDefinition
  value: Extract<SlotValue, { type: 'image' }> | undefined
  error: SlotValidationError | undefined
}

/**
 * Image slot row — split UI by mode.
 *
 * - Designer → fit toggle (Cover / Contain). Writes slotConfigOverrides.
 * - Client   → uploader + thumbnail. Client can drag the actual image on
 *              the canvas to reposition the crop when fit = cover.
 */
export function ImageSlotEditor({ slot, value, error }: Props) {
  const designerMode = useCompositionStore((s) => s.designerMode)
  if (designerMode) return <DesignerImageRow slot={slot} />
  return <ClientImageRow slot={slot} value={value} error={error} />
}

function DesignerImageRow({ slot }: { slot: ImageSlotDefinition }) {
  const setSlotConfig = useCompositionStore((s) => s.setSlotConfig)
  const overrides = useCompositionStore((s) => s.slotConfigOverrides)
  const fit = overrides[slot.key]?.fit ?? slot.constraints.fit ?? 'cover'
  return (
    <div className="fw-row">
      <SlotLabel slotKey={slot.key} label={slot.label} />
      <div className="fw-row__value">
        <button
          type="button"
          className="fw-chip"
          data-active={fit === 'cover'}
          onClick={() => setSlotConfig(slot.key, { fit: 'cover' })}
          title="Image fills the frame, may crop. Client can drag to reposition."
        >
          Cover
        </button>
        <button
          type="button"
          className="fw-chip"
          data-active={fit === 'contain'}
          onClick={() => setSlotConfig(slot.key, { fit: 'contain' })}
          title="Whole image visible, letterboxed if needed."
        >
          Contain
        </button>
      </div>
    </div>
  )
}

function ClientImageRow({
  slot,
  value,
  error,
}: {
  slot: ImageSlotDefinition
  value: Extract<SlotValue, { type: 'image' }> | undefined
  error: SlotValidationError | undefined
}) {
  const setSlot = useCompositionStore((s) => s.setSlot)
  const [isOver, setOver] = useState(false)
  const [previewName, setPreviewName] = useState<string | null>(null)

  async function ingest(file: File) {
    setPreviewName(file.name)
    const dataUrl = await fileToDataUrl(file)
    setSlot(slot.key, { type: 'image', r2Key: dataUrl as never })
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  const hasImage = value?.r2Key !== undefined

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const file = e.dataTransfer.files[0]
          if (file) void ingest(file)
        }}
        className="fw-row cursor-pointer"
        style={{ background: isOver ? 'var(--bg-2)' : undefined }}
      >
        <SlotLabel slotKey={slot.key} label={slot.label} />
        <div className="fw-row__value">
          {hasImage ? (
            <img
              src={value!.r2Key}
              alt=""
              className="h-5 w-5 rounded object-cover border border-[var(--line)]"
            />
          ) : null}
          <span className="text-[var(--muted)] text-[11px]">
            {previewName ?? (hasImage ? 'Uploaded' : 'Upload')}
          </span>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void ingest(file)
            e.target.value = ''
          }}
        />
      </label>
      {error ? <div className="text-[10px] text-[var(--danger)]">{error.message}</div> : null}
    </div>
  )
}
