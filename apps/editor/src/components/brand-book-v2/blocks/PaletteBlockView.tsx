import type { PaletteBlock, PaletteEntry } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { contrastTextFor } from '../../brand-book/contrast'

function hexToRgb(hex: string): string {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return ''
  return `${r} · ${g} · ${b}`
}

function cmykStr(c: { c: number; m: number; y: number; k: number }): string {
  return `${c.c} · ${c.m} · ${c.y} · ${c.k}`
}

/**
 * Palette grid. Each card is the color itself (square, large), with name +
 * hex overlaid in auto-contrast text. Optional secondary specs (RGB, CMYK,
 * Pantone, usage) hide as a fine print below the hex.
 */
export function PaletteBlockView({ block }: { block: PaletteBlock }) {
  const { tokens } = useBrandBookContext()
  const fields = block.showFields ?? ['hex']
  const palette: PaletteEntry[] = tokens.colors.palette.filter(
    (p) => !block.includeNames || block.includeNames.includes(p.name),
  )
  const cols = block.columns ?? 3
  return (
    <div
      className="fw-bbook__palette"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {palette.map((p, i) => {
        const fg = contrastTextFor(p.hex)
        return (
          <div key={`${p.name}-${i}`} className="fw-bbook__palette-card" style={{ background: p.hex, color: fg }}>
            <div className="fw-bbook__palette-card-name">{p.name}</div>
            <div className="fw-bbook__palette-card-specs">
              {fields.includes('hex') ? <span>{p.hex.toUpperCase()}</span> : null}
              {fields.includes('rgb') ? <span>RGB {hexToRgb(p.hex)}</span> : null}
              {fields.includes('cmyk') && p.cmyk ? <span>CMYK {cmykStr(p.cmyk)}</span> : null}
              {fields.includes('pantone') && p.pantone ? <span>PMS {p.pantone}</span> : null}
              {fields.includes('usage') && p.usage ? <span>{p.usage}</span> : null}
            </div>
          </div>
        )
      })}
      {palette.length === 0 ? (
        <div className="fw-bbook__empty">No palette colors yet — push tokens from Figma or edit them on the Color page.</div>
      ) : null}
    </div>
  )
}
