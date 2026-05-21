import { useEffect, useRef, useState } from 'react'
import type { Format } from '@framework/types'
import { useCompositionStore } from '@/state/composition'

interface Props {
  formats: Format[]
  /** key used to persist user-renamed labels in localStorage */
  storageKey?: string
}

/**
 * Format selector with renamable labels. Double-click a chip → inline rename.
 * Renames live in the store (formatLabels) and are persisted to localStorage
 * scoped by storageKey so reloads stick.
 */
export function FormatToggle({ formats, storageKey }: Props) {
  const format = useCompositionStore((s) => s.format)
  const setFormat = useCompositionStore((s) => s.setFormat)
  const labels = useCompositionStore((s) => s.formatLabels)
  const setFormatLabel = useCompositionStore((s) => s.setFormatLabel)
  const [editing, setEditing] = useState<string | null>(null)

  // Persist labels to localStorage so the rename survives reloads.
  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(`framework.labels.${storageKey}`, JSON.stringify(labels))
    } catch {
      /* ignore */
    }
  }, [labels, storageKey])

  return (
    <div className="space-y-2">
      <div className="fw-section">Format</div>
      <div className="flex flex-wrap gap-1">
        {formats.map((f) => {
          const label = labels[f] ?? f
          const isActive = f === format
          if (editing === f) {
            return (
              <RenameChip
                key={f}
                initial={label}
                onCommit={(next) => {
                  setFormatLabel(f, next.trim() || f)
                  setEditing(null)
                }}
                onCancel={() => setEditing(null)}
              />
            )
          }
          return (
            <button
              key={f}
              className="fw-chip"
              data-active={isActive}
              onClick={() => setFormat(f)}
              onDoubleClick={() => setEditing(f)}
              title="Double-click to rename"
            >
              <span>{label}</span>
              {label !== f ? <span className="text-[9px] opacity-60">{f}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RenameChip({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string
  onCommit: (v: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initial)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(value)
        else if (e.key === 'Escape') onCancel()
      }}
      className="fw-chip outline-none"
      style={{ minWidth: 80 }}
    />
  )
}
