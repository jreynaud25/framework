import type { TypographyEntry } from '@framework/types'

interface Props {
  role: string
  entry: TypographyEntry
}

/**
 * One typography role rendered at its largest scale. Shows role name +
 * meta (font, weight, line height) above a generous sample line in the
 * actual face / weight / size.
 */
export function TypeSpecimen({ role, entry }: Props) {
  const largestScale = entry.scale[0] ?? 32
  // Cap so the page stays usable on smaller screens.
  const renderSize = Math.min(largestScale, 120)
  return (
    <div className="fw-bb__type-specimen">
      <div className="fw-bb__type-specimen-meta">
        <span>{role}</span>
        <span>{entry.fontFamily}</span>
        <span>w{entry.defaultWeight}</span>
        <span>{entry.scale.join(' / ')}px</span>
        <span>lh {entry.lineHeight}</span>
      </div>
      <div
        className="fw-bb__type-specimen-sample"
        style={{
          fontFamily: entry.fontFamily,
          fontWeight: entry.defaultWeight,
          fontSize: renderSize,
          lineHeight: entry.lineHeight,
          letterSpacing: entry.letterSpacing ?? 0,
        }}
      >
        The quick brown fox jumps over the lazy dog
      </div>
    </div>
  )
}
