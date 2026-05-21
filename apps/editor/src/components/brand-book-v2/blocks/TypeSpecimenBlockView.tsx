import type { TypeSpecimenBlock, TypographyEntry } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

/**
 * One typography role rendered large with meta. The role's first scale
 * size is used (capped at 120px); sampleText overrides the default
 * "Aa Bb Cc" line.
 */
export function TypeSpecimenBlockView({ block }: { block: TypeSpecimenBlock }) {
  const { tokens } = useBrandBookContext()
  const entry = (tokens.typography as Record<string, TypographyEntry | undefined>)[block.role]
  if (!entry) {
    return <div className="fw-bbook__empty">No typography entry for role "{block.role}".</div>
  }
  const size = block.sizePx ?? Math.min(entry.scale[0] ?? 56, 120)
  const sample = block.sampleText ?? 'The quick brown fox jumps over the lazy dog'

  return (
    <div className="fw-bbook__type-specimen">
      <div className="fw-bbook__type-specimen-meta">
        <span>{block.role}</span>
        <span>{entry.fontFamily}</span>
        <span>w{entry.defaultWeight}</span>
        <span>{entry.scale.join(' / ')}px</span>
        <span>lh {entry.lineHeight}</span>
      </div>
      <div
        className="fw-bbook__type-specimen-sample"
        style={{
          fontFamily: entry.fontFamily,
          fontWeight: entry.defaultWeight,
          fontSize: size,
          lineHeight: entry.lineHeight,
          letterSpacing: entry.letterSpacing ?? 0,
        }}
      >
        {sample}
      </div>
    </div>
  )
}
