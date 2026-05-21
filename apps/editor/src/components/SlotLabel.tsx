import { useEffect, useRef, useState } from 'react'
import { useCompositionStore } from '@/state/composition'

interface Props {
  slotKey: string
  label: string
  /** If provided, renders as a <label htmlFor=…> when NOT editing — so clicking
   *  the (read-only) label still focuses the associated input. */
  htmlFor?: string
}

/**
 * Slot label cell. Read-only in client mode; click-to-rename in designer mode.
 *
 * Why an inline element switch (label/button/input) instead of always an input:
 * a label with `htmlFor` is the correct semantics for client mode (clicking
 * focuses the bound input). When the designer wants to rename, we replace it
 * with a button → on click, swap to an input. Cleanest a11y at every step.
 */
export function SlotLabel({ slotKey, label, htmlFor }: Props) {
  const designerMode = useCompositionStore((s) => s.designerMode)
  const setSlotLabel = useCompositionStore((s) => s.setSlotLabel)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync from props whenever the canonical label changes (e.g. payload reload).
  useEffect(() => setDraft(label), [label])
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  if (!designerMode) {
    return (
      <label className="fw-row__label" htmlFor={htmlFor}>
        {label}
      </label>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setSlotLabel(slotKey, draft)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
          else if (e.key === 'Escape') {
            setDraft(label)
            setEditing(false)
          }
        }}
        className="fw-row__label fw-label--editing"
      />
    )
  }

  return (
    <button
      type="button"
      className="fw-row__label fw-label--editable"
      onClick={() => setEditing(true)}
      title="Click to rename"
    >
      {label}
    </button>
  )
}
