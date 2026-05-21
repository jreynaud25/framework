import type { ChoiceSlotDefinition } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'
import { SlotLabel } from '../SlotLabel'

interface Props {
  slot: ChoiceSlotDefinition
  value: string
  error: SlotValidationError | undefined
}

export function ChoiceSlotEditor({ slot, value, error }: Props) {
  const setSlot = useCompositionStore((s) => s.setSlot)
  return (
    <div>
      <div className="fw-row">
        <SlotLabel slotKey={slot.key} label={slot.label} />
        <div className="fw-row__value flex flex-wrap justify-end gap-1">
          {slot.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSlot(slot.key, { type: 'choice', value: opt.value })}
              className="fw-chip"
              data-active={value === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {error ? <div className="text-[10px] text-[var(--danger)]">{error.message}</div> : null}
    </div>
  )
}
