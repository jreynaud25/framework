import type { BrandTokens, HexColor } from '@framework/types'

interface Props {
  tokens: BrandTokens
  onPatch: (patch: Partial<BrandTokens>) => Promise<void>
  readOnly?: boolean
}

/**
 * Edit a brand's colors:
 *   - primary (the canonical brand color, syncs back to BrandRecord)
 *   - palette: named colors (designer adds/renames/edits/removes)
 *   - semantic: bg / fg / accent
 *
 * Each change PATCHes the server. Optimistic local state lives in the
 * parent (BrandIdentity) since one mutation can ripple multiple fields.
 */
export function ColorsSection({ tokens, onPatch, readOnly }: Props) {
  const colors = tokens.colors

  async function patchColors(part: Partial<typeof colors>): Promise<void> {
    await onPatch({ colors: { ...colors, ...part } })
  }

  async function setPrimary(hex: string): Promise<void> {
    await patchColors({ primary: hex as HexColor })
  }

  async function setSemantic(key: 'bg' | 'fg' | 'accent', hex: string): Promise<void> {
    await patchColors({
      semantic: { ...(colors.semantic ?? {}), [key]: hex as HexColor },
    })
  }

  async function addPaletteColor(): Promise<void> {
    const name = `Color ${colors.palette.length + 1}`
    const hex = '#888888' as HexColor
    await patchColors({ palette: [...colors.palette, { name, hex }] })
  }

  async function updatePaletteColor(
    i: number,
    change: Partial<{ name: string; hex: string }>,
  ): Promise<void> {
    const next = colors.palette.map((p, idx) =>
      idx === i ? { ...p, ...change, hex: (change.hex ?? p.hex) as HexColor } : p,
    )
    await patchColors({ palette: next })
  }

  async function removePaletteColor(i: number): Promise<void> {
    const next = colors.palette.filter((_, idx) => idx !== i)
    await patchColors({ palette: next })
  }

  return (
    <section className="space-y-8">
      <h2 className="text-[16px] font-medium">Colors</h2>

      {/* Primary */}
      <div className="space-y-3">
        <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">Primary</div>
        <ColorRow value={colors.primary} onChange={setPrimary} readOnly={readOnly} />
      </div>

      {/* Palette */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">Palette</div>
          {!readOnly && (
            <button type="button" className="fw-btn" onClick={() => void addPaletteColor()}>
              + Add color
            </button>
          )}
        </div>
        {colors.palette.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)]">
            No palette colors. Add one above.
          </div>
        ) : (
          <div className="space-y-2">
            {colors.palette.map((p, i) => (
              <div key={i} className="group flex items-center gap-3">
                <input
                  type="color"
                  value={p.hex}
                  disabled={readOnly}
                  onChange={(e) => void updatePaletteColor(i, { hex: e.target.value })}
                  className="fw-swatch fw-swatch--lg shrink-0"
                  style={{ background: p.hex, padding: 0 }}
                />
                <input
                  type="text"
                  defaultValue={p.name}
                  disabled={readOnly}
                  onBlur={(e) => {
                    if (e.target.value !== p.name) {
                      void updatePaletteColor(i, { name: e.target.value })
                    }
                  }}
                  className="fw-input fw-input--text"
                />
                <span
                  className="text-[10px] text-[var(--muted)] shrink-0"
                  style={{ fontVariantNumeric: 'tabular-nums', width: 72, textAlign: 'right' }}
                >
                  {p.hex.toUpperCase()}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => void removePaletteColor(i)}
                    className="fw-row__delete opacity-0 group-hover:opacity-100"
                    title="Remove color"
                    aria-label="Remove color"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Semantic */}
      <div className="space-y-3">
        <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">Semantic</div>
        <div className="space-y-2">
          {(['bg', 'fg', 'accent'] as const).map((key) => {
            const labelMap = { bg: 'Background', fg: 'Foreground', accent: 'Accent' }
            const current = colors.semantic?.[key]
            return (
              <div key={key} className="flex items-center gap-3">
                <span style={{ width: 110, fontSize: 12, color: 'var(--fg-2)' }}>
                  {labelMap[key]}
                </span>
                <ColorRow
                  value={current ?? '#000000'}
                  onChange={(hex) => void setSemantic(key, hex)}
                  readOnly={readOnly}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ColorRow({
  value,
  onChange,
  readOnly,
}: {
  value: string
  onChange: (hex: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="fw-swatch fw-swatch--lg"
        style={{ background: value, padding: 0 }}
      />
      <span
        className="text-[11px] text-[var(--muted)]"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value.toUpperCase()}
      </span>
    </div>
  )
}
