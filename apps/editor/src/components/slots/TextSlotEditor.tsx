import type { TextSlotDefinition } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'

interface Props {
  slot: TextSlotDefinition
  value: string
  error: SlotValidationError | undefined
}

export function TextSlotEditor({ slot, value, error }: Props) {
  const setText = useCompositionStore((s) => s.setText)
  const max = slot.constraints.maxChars
  const ratio = max ? value.length / max : 0
  const warn = ratio > 0.9
  const hard = max && value.length > max

  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{slot.label}</span>
        {max ? (
          <span
            className={
              'font-mono text-[11px] tabular-nums ' +
              (hard ? 'text-red-400' : warn ? 'text-amber-400' : 'text-[var(--muted)]')
            }
          >
            {value.length}/{max}
          </span>
        ) : null}
      </div>
      {slot.constraints.multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => setText(slot.key, e.target.value)}
          className="mt-1.5 w-full resize-none rounded-md border border-[var(--line)] bg-transparent p-2 text-sm focus:border-[var(--fg)] focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setText(slot.key, e.target.value)}
          placeholder={slot.default ?? slot.label}
          className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-transparent p-2 text-sm focus:border-[var(--fg)] focus:outline-none"
        />
      )}
      {error ? <div className="mt-1 text-[11px] text-red-400">{error.message}</div> : null}
    </label>
  )
}
