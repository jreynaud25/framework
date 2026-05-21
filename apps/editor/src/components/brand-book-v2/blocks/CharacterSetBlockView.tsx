import type { CharacterSetBlock, TypographyEntry } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const NUM = '0123456789'

/**
 * Glyph wall for one role. Letters are rendered at a uniform fixed size
 * laid out as a tight grid — the goal is a quick sense of the typeface's
 * proportions and personality (Vevo's "character set" page).
 */
export function CharacterSetBlockView({ block }: { block: CharacterSetBlock }) {
  const { tokens } = useBrandBookContext()
  const entry = (tokens.typography as Record<string, TypographyEntry | undefined>)[block.role]
  if (!entry) return <div className="fw-bbook__empty">No typography entry for "{block.role}".</div>

  const set = block.set ?? 'all'
  const chars =
    set === 'upper' ? UPPER.split('')
    : set === 'lower' ? LOWER.split('')
    : set === 'numerals' ? NUM.split('')
    : [...UPPER, ' ', ...LOWER, ' ', ...NUM]

  return (
    <div
      className="fw-bbook__charset"
      style={{
        fontFamily: entry.fontFamily,
        fontWeight: entry.defaultWeight,
      }}
    >
      {chars.map((c, i) =>
        c === ' ' ? <div key={i} className="fw-bbook__charset-sep" /> : (
          <span key={i} className="fw-bbook__charset-glyph">
            {c}
          </span>
        ),
      )}
    </div>
  )
}
