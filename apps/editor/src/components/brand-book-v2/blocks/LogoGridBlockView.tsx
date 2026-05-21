import type { BlockBgRef, HexColor, LogoGridBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { contrastTextFor } from '../../brand-book/contrast'

function resolveBg(ref: BlockBgRef, tokens: { colors: { primary: HexColor; semantic?: { bg?: HexColor; fg?: HexColor; accent?: HexColor } } }): string {
  if (ref === 'primary') return tokens.colors.primary
  if (ref === 'bg') return tokens.colors.semantic?.bg ?? '#ffffff'
  if (ref === 'fg') return tokens.colors.semantic?.fg ?? '#0a0a0a'
  if (ref === 'accent') return tokens.colors.semantic?.accent ?? tokens.colors.primary
  return ref
}

/**
 * Logo specimens across multiple bg / variant combinations. Default: show
 * the first logo on bg, fg, and primary backgrounds. If logo variants are
 * specified (and uploaded), each variant gets its own row.
 */
export function LogoGridBlockView({ block }: { block: LogoGridBlock }) {
  const { tokens, assets } = useBrandBookContext()
  const logos = assets.filter((a) => a.kind === 'logo')
  const variantsToShow = block.variants ?? Array.from(new Set(logos.map((l) => l.variant ?? 'primary')))
  const bgs = block.bgs ?? ['bg', 'fg', 'primary']

  if (logos.length === 0) {
    return <div className="fw-bbook__empty">Upload logos from the plugin (layer name `logo/primary`, `logo/wordmark`, …).</div>
  }

  return (
    <div className="fw-bbook__logo-matrix">
      {variantsToShow.map((variant) => {
        const logo = logos.find((l) => (l.variant ?? 'primary') === variant) ?? logos[0]!
        return (
          <div key={variant} className="fw-bbook__logo-matrix-row">
            <div className="fw-bbook__logo-matrix-label">{variant}</div>
            <div className="fw-bbook__logo-matrix-cells">
              {bgs.map((b, i) => {
                const bg = resolveBg(b, tokens)
                return (
                  <div key={i} className="fw-bbook__logo-matrix-cell" style={{ background: bg, color: contrastTextFor(bg) }}>
                    <img src={logo.dataUrl} alt={logo.label} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
