import { useState } from 'react'
import type { BrandTokens, ImageryTokens } from '@framework/types'

interface Props {
  tokens: BrandTokens
  onPatch: (patch: Partial<BrandTokens>) => Promise<void>
  readOnly?: boolean
}

const EMPTY: ImageryTokens = { dos: [], donts: [] }

/**
 * Editor for the brand's photography / imagery direction. Two simple lists:
 * Do's and Don'ts. Each is a Markdown-free, plain-text item add-as-you-type.
 */
export function ImagerySection({ tokens, onPatch, readOnly }: Props) {
  const imagery: ImageryTokens = tokens.imagery ?? EMPTY

  async function patchImagery(part: Partial<ImageryTokens>): Promise<void> {
    await onPatch({ imagery: { ...imagery, ...part } })
  }

  return (
    <section className="space-y-6">
      <h2 className="text-[16px] font-medium">Imagery</h2>

      <ListField
        label="Do"
        hint="What good brand imagery looks like"
        values={imagery.dos}
        readOnly={readOnly}
        onChange={(dos) => void patchImagery({ dos })}
      />

      <ListField
        label="Don't"
        hint="What to avoid in brand imagery"
        values={imagery.donts}
        readOnly={readOnly}
        onChange={(donts) => void patchImagery({ donts })}
        danger
      />
    </section>
  )
}

function ListField({
  label,
  hint,
  values,
  readOnly,
  onChange,
  danger,
}: {
  label: string
  hint?: string
  values: string[]
  readOnly?: boolean
  onChange: (next: string[]) => void
  danger?: boolean
}) {
  const [input, setInput] = useState('')

  function add(): void {
    const v = input.trim()
    if (!v) return
    onChange([...values, v])
    setInput('')
  }

  function update(i: number, next: string): void {
    const arr = values.slice()
    arr[i] = next
    onChange(arr)
  }

  function remove(i: number): void {
    onChange(values.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">{label}</div>
      {hint ? <div className="text-[10px] text-[var(--muted)]">{hint}</div> : null}
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={`${i}-${v.slice(0, 8)}`} className="group flex items-center gap-2">
            <span
              className="inline-block shrink-0 rounded-full text-[10px] font-medium"
              style={{
                width: 18,
                height: 18,
                lineHeight: '18px',
                textAlign: 'center',
                background: danger ? 'rgba(255,92,92,0.2)' : 'rgba(110,231,183,0.2)',
                color: danger ? 'var(--danger)' : 'var(--highlight)',
              }}
            >
              {danger ? '✕' : '✓'}
            </span>
            <input
              defaultValue={v}
              disabled={readOnly}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== v) {
                  update(i, e.target.value.trim())
                } else if (!e.target.value.trim()) {
                  remove(i)
                }
              }}
              className="fw-input fw-input--text"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="fw-row__delete opacity-0 group-hover:opacity-100"
                aria-label="Remove"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <span
              className="inline-block shrink-0 rounded-full text-[10px]"
              style={{
                width: 18,
                height: 18,
                background: 'transparent',
                border: '1px dashed var(--line-2)',
              }}
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add()
                }
              }}
              onBlur={add}
              placeholder="Add an item — Enter to save"
              className="fw-input fw-input--text"
            />
          </div>
        )}
      </div>
    </div>
  )
}
