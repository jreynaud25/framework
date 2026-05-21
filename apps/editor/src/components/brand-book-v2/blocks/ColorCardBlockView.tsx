import type { ColorCardBlock, HexColor } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { contrastTextFor } from '../../brand-book/contrast'

/**
 * A single color cell — used inside content where one color needs more
 * emphasis (e.g. "the brand red"). Larger than the palette grid cards,
 * with the full spec list rendered.
 */
export function ColorCardBlockView({ block }: { block: ColorCardBlock }) {
  const { tokens } = useBrandBookContext()
  const entry = block.paletteName
    ? tokens.colors.palette.find((p) => p.name === block.paletteName)
    : null
  const hex = (entry?.hex ?? block.inlineHex ?? tokens.colors.primary) as HexColor
  const name = entry?.name ?? block.inlineName ?? 'Color'
  const fg = contrastTextFor(hex)

  return (
    <div className="fw-bbook__color-card-large" style={{ background: hex, color: fg }}>
      <div>
        <div className="fw-bbook__color-card-large-name">{name}</div>
        <div className="fw-bbook__color-card-large-hex">{hex.toUpperCase()}</div>
      </div>
      {entry?.usage ? <p className="fw-bbook__color-card-large-usage">{entry.usage}</p> : null}
    </div>
  )
}
