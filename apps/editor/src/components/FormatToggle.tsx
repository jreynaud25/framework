import type { Format } from '@framework/types'
import { useCompositionStore } from '@/state/composition'

interface Props {
  formats: Format[]
}

export function FormatToggle({ formats }: Props) {
  const format = useCompositionStore((s) => s.format)
  const setFormat = useCompositionStore((s) => s.setFormat)

  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-[var(--muted)]">Format</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {formats.map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={
              'rounded-full border px-3 py-1 text-xs transition-colors ' +
              (f === format
                ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                : 'border-[var(--line)] hover:bg-[var(--line)]')
            }
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  )
}
