import { useState } from 'react'
import type { BrandTokens, VoiceTokens } from '@framework/types'

interface Props {
  tokens: BrandTokens
  onPatch: (patch: Partial<BrandTokens>) => Promise<void>
  readOnly?: boolean
}

const EMPTY: VoiceTokens = {
  tone: [],
  vocabulary: { preferred: [], avoid: [] },
  forbidden: [],
}

/**
 * Editor for brand voice & tone: tones chips, preferred / avoid word lists,
 * forbidden words. All three lists are edited via a chip-add input pattern
 * (type word + Enter to add, click × to remove).
 */
export function VoiceSection({ tokens, onPatch, readOnly }: Props) {
  const voice: VoiceTokens = tokens.voice ?? EMPTY

  async function patchVoice(part: Partial<VoiceTokens>): Promise<void> {
    await onPatch({ voice: { ...voice, ...part } })
  }

  return (
    <section className="space-y-6">
      <h2 className="text-[16px] font-medium">Voice & tone</h2>

      <ChipsField
        label="Tone"
        hint="How the brand sounds in writing (e.g. confident, spare, warm)"
        values={voice.tone}
        readOnly={readOnly}
        onChange={(tone) => void patchVoice({ tone })}
      />

      <ChipsField
        label="Preferred vocabulary"
        hint="Words and phrases to use"
        values={voice.vocabulary.preferred}
        readOnly={readOnly}
        onChange={(preferred) =>
          void patchVoice({ vocabulary: { ...voice.vocabulary, preferred } })
        }
      />

      <ChipsField
        label="Avoid"
        hint="Words and phrases to steer away from"
        values={voice.vocabulary.avoid}
        readOnly={readOnly}
        onChange={(avoid) =>
          void patchVoice({ vocabulary: { ...voice.vocabulary, avoid } })
        }
      />

      <ChipsField
        label="Forbidden"
        hint="Words that should never appear (compliance / brand safety)"
        values={voice.forbidden}
        readOnly={readOnly}
        onChange={(forbidden) => void patchVoice({ forbidden })}
        danger
      />
    </section>
  )
}

function ChipsField({
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
    if (values.includes(v)) {
      setInput('')
      return
    }
    onChange([...values, v])
    setInput('')
  }

  function remove(i: number): void {
    onChange(values.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">{label}</div>
      {hint ? <div className="text-[10px] text-[var(--muted)]">{hint}</div> : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="fw-chip group"
            style={{
              background: danger ? 'rgba(255, 92, 92, 0.12)' : undefined,
              color: danger ? 'var(--danger)' : undefined,
            }}
          >
            {v}
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-1 opacity-50 hover:opacity-100"
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              } else if (e.key === 'Backspace' && input === '' && values.length > 0) {
                remove(values.length - 1)
              }
            }}
            onBlur={add}
            placeholder="Type + Enter…"
            className="fw-input fw-input--text"
            style={{ flex: '1 0 120px', minWidth: 100 }}
          />
        )}
      </div>
    </div>
  )
}
