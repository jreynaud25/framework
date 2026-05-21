import { useEffect, useRef } from 'react'
import type { TextSlotDefinition } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'
import { SlotLabel } from '../SlotLabel'

interface Props {
  slot: TextSlotDefinition
  value: string
  error: SlotValidationError | undefined
}

/**
 * Text slot editor — uses the stacked layout AND an auto-grow textarea so
 * that no matter how long the text is, the designer/client can see every
 * character. On focus we select-all so the full content is immediately
 * visible (and editable as a unit).
 */
export function TextSlotEditor({ slot, value, error }: Props) {
  const setText = useCompositionStore((s) => s.setText)
  const max = slot.constraints.maxChars
  const hard = max && value.length > max
  const ref = useRef<HTMLTextAreaElement>(null)

  // Auto-resize whenever the value changes so the textarea always shows the
  // entire content without scrollbars.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <div className="fw-stack">
      <div className="fw-stack__head">
        <SlotLabel slotKey={slot.key} label={slot.label} htmlFor={`slot-${slot.key}`} />
        {max ? (
          <span
            className={
              'text-[10px] shrink-0 ' +
              (hard ? 'text-[var(--danger)]' : 'text-[var(--muted)]')
            }
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value.length}/{max}
          </span>
        ) : null}
      </div>
      <textarea
        ref={ref}
        id={`slot-${slot.key}`}
        rows={1}
        value={value}
        onChange={(e) => setText(slot.key, e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        placeholder={slot.default ?? slot.label}
        spellCheck={false}
        className="fw-input fw-input--text fw-input--textarea"
        style={{ resize: 'none', overflow: 'hidden' }}
      />
      {error ? <div className="text-[10px] text-[var(--danger)]">{error.message}</div> : null}
    </div>
  )
}
