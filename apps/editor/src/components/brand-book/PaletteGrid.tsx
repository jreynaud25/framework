import type { PaletteEntry } from '@framework/types'
import { contrastTextFor } from './contrast'

/**
 * Palette grid: each card IS the color (4:5 ratio), name + hex on top
 * with auto-contrast foreground. Click-to-copy ready for V2.
 */
export function PaletteGrid({ palette }: { palette: ReadonlyArray<PaletteEntry> }) {
  return (
    <div className="fw-bb__color-grid">
      {palette.map((p, i) => {
        const fg = contrastTextFor(p.hex)
        return (
          <div
            key={`${p.name}-${i}`}
            className="fw-bb__color-card"
            style={{ background: p.hex, color: fg }}
          >
            <span className="name">{p.name}</span>
            <span className="hex">{p.hex.toUpperCase()}</span>
          </div>
        )
      })}
    </div>
  )
}
