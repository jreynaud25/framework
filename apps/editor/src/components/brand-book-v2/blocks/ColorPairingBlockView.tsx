import type { BlockBgRef, ColorPairingBlock, HexColor } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { contrastTextFor } from '../../brand-book/contrast'

function resolveColor(
  ref: BlockBgRef,
  tokens: { colors: { primary: HexColor; semantic?: { bg?: HexColor; fg?: HexColor; accent?: HexColor } } },
): string {
  switch (ref) {
    case 'primary':
      return tokens.colors.primary
    case 'bg':
      return tokens.colors.semantic?.bg ?? '#ffffff'
    case 'fg':
      return tokens.colors.semantic?.fg ?? '#0a0a0a'
    case 'accent':
      return tokens.colors.semantic?.accent ?? tokens.colors.primary
    default:
      return ref
  }
}

/**
 * Approved fg-on-bg combinations. Defaults to the four most common Vevo
 * pairings (white-on-primary, black-on-primary, primary-on-bg, primary-on-fg).
 * Each cell renders a sample headline so the reader sees the contrast.
 */
export function ColorPairingBlockView({ block }: { block: ColorPairingBlock }) {
  const { tokens } = useBrandBookContext()
  const pairings =
    block.pairings ??
    ([
      { fg: 'bg', bg: 'primary', label: 'Surface on Primary' },
      { fg: 'fg', bg: 'primary', label: 'Ink on Primary' },
      { fg: 'primary', bg: 'bg', label: 'Primary on Surface' },
      { fg: 'primary', bg: 'fg', label: 'Primary on Ink' },
    ] as const)

  return (
    <div className="fw-bbook__pairing">
      {pairings.map((p, i) => {
        const bg = resolveColor(p.bg, tokens)
        const fg = resolveColor(p.fg, tokens)
        return (
          <div key={i} className="fw-bbook__pairing-card" style={{ background: bg, color: fg }}>
            <span className="fw-bbook__pairing-sample" style={{ fontFamily: tokens.typography.heading?.fontFamily ?? 'inherit' }}>
              Aa
            </span>
            <span
              className="fw-bbook__pairing-label"
              style={{ color: contrastTextFor(bg), opacity: 0.6 }}
            >
              {p.label ?? `${String(p.fg)} on ${String(p.bg)}`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
