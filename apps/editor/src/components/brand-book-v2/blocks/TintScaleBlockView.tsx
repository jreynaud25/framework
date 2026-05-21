import type { HexColor, TintScaleBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

function mixWithWhite(hex: string, pct: number): string {
  // pct 100 = full color, 0 = white. We mix per channel.
  let h = hex.replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const k = pct / 100
  const mr = Math.round(r * k + 255 * (1 - k))
  const mg = Math.round(g * k + 255 * (1 - k))
  const mb = Math.round(b * k + 255 * (1 - k))
  return `rgb(${mr}, ${mg}, ${mb})`
}

/**
 * Tint scale — a row of swatches from light to full intensity for one
 * palette color. `mode: 'opacity'` uses CSS opacity over the page bg
 * (matches Vevo's "secondary tones"); `mode: 'tint'` mixes with white.
 */
export function TintScaleBlockView({ block }: { block: TintScaleBlock }) {
  const { tokens } = useBrandBookContext()
  const entry = block.paletteName
    ? tokens.colors.palette.find((p) => p.name === block.paletteName)
    : null
  const hex = (entry?.hex ?? tokens.colors.primary) as HexColor
  const stops = block.stops ?? [100, 75, 50, 25]
  const mode = block.mode ?? 'opacity'

  return (
    <div className="fw-bbook__tint-row">
      {stops.map((pct, i) => (
        <div
          key={i}
          className="fw-bbook__tint-cell"
          style={
            mode === 'opacity'
              ? { background: hex, opacity: pct / 100 }
              : { background: mixWithWhite(hex, pct) }
          }
        >
          <span className="fw-bbook__tint-label">{pct}%</span>
        </div>
      ))}
    </div>
  )
}
