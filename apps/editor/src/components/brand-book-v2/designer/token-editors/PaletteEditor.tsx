import { useCallback } from 'react'
import type { HexColor, PaletteEntry } from '@framework/types'
import { useBrandBookContext } from '../../brandBookContext'

/**
 * Inline editor for `tokens.colors.palette`. Each row = one PaletteEntry
 * (name + hex). Changes PATCH the whole palette array (server replaces
 * arrays); designer sees the brand book repaint instantly because tokens
 * live in BrandBookContext and every block re-renders.
 */
export function PaletteEditor() {
  const { tokens, patchTokens } = useBrandBookContext()

  const writePalette = useCallback(
    (next: PaletteEntry[]) => {
      void patchTokens({
        colors: {
          primary: tokens.colors.primary,
          palette: next,
          semantic: tokens.colors.semantic,
        },
      })
    },
    [patchTokens, tokens.colors],
  )

  const updateOne = (i: number, patch: Partial<PaletteEntry>) => {
    writePalette(tokens.colors.palette.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  const remove = (i: number) => {
    if (!confirm(`Remove "${tokens.colors.palette[i]?.name}"?`)) return
    writePalette(tokens.colors.palette.filter((_, idx) => idx !== i))
  }
  const add = () => {
    const n = tokens.colors.palette.length + 1
    writePalette([
      ...tokens.colors.palette,
      { name: `color-${n}`, hex: '#888888' as HexColor },
    ])
  }

  return (
    <div className="fw-bbook-edit__tokens">
      <div className="fw-bbook-edit__tokens-head">
        <span>Brand palette</span>
        <span className="fw-bbook-edit__tokens-tag">shared · {tokens.colors.palette.length}</span>
      </div>
      <div className="fw-bbook-edit__tokens-list">
        {tokens.colors.palette.map((color, i) => (
          <div key={i} className="fw-bbook-edit__tokens-row">
            <input
              type="color"
              value={color.hex}
              onChange={(e) => updateOne(i, { hex: e.target.value as HexColor })}
              className="fw-bbook-edit__tokens-color"
              title="Pick color"
            />
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={color.name}
              onChange={(e) => updateOne(i, { name: e.target.value })}
              placeholder="name"
              style={{ flex: 1 }}
            />
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={color.hex}
              onChange={(e) => {
                const v = e.target.value.trim()
                if (/^#[0-9a-fA-F]{3,8}$/.test(v) || v === '') {
                  updateOne(i, { hex: (v || '#000000') as HexColor })
                }
              }}
              placeholder="#000000"
              style={{ width: 96 }}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              title="Remove color"
              className="fw-bbook-edit__tokens-rm"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="fw-bbook-edit__list-add" onClick={add}>
        + add color
      </button>
    </div>
  )
}
