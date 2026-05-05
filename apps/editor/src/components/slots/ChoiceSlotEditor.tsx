import type { ChoiceSlotDefinition } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'

interface Props {
  slot: ChoiceSlotDefinition
  value: string
  error: SlotValidationError | undefined
}

export function ChoiceSlotEditor({ slot, value, error }: Props) {
  const setSlot = useCompositionStore((s) => s.setSlot)
  return (
    <label className="block">
      <span className="text-sm">{slot.label}</span>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {slot.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSlot(slot.key, { type: 'choice', value: opt.value })}
            className={
              'rounded-full border px-3 py-1 text-xs ' +
              (value === opt.value
                ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                : 'border-[var(--line)] hover:bg-[var(--line)]')
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error ? <div className="mt-1 text-[11px] text-red-400">{error.message}</div> : null}
    </label>
  )
}
