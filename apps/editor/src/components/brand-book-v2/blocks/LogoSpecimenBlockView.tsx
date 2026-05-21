import type { BlockBgRef, HexColor, LogoSpecimenBlock } from '@framework/types'
import { useBrandBookContext, findAsset } from '../brandBookContext'
import { contrastTextFor } from '../../brand-book/contrast'

function resolveBg(ref: BlockBgRef | undefined, tokens: { colors: { primary: HexColor; semantic?: { bg?: HexColor; fg?: HexColor; accent?: HexColor } } }): string {
  if (!ref) return tokens.colors.semantic?.bg ?? '#ffffff'
  if (ref === 'primary') return tokens.colors.primary
  if (ref === 'bg') return tokens.colors.semantic?.bg ?? '#ffffff'
  if (ref === 'fg') return tokens.colors.semantic?.fg ?? '#0a0a0a'
  if (ref === 'accent') return tokens.colors.semantic?.accent ?? tokens.colors.primary
  return ref
}

/**
 * Single logo specimen — large card with the logo centered on a chosen
 * background. If `showClearspace` is on, draws an outlined zone equal to
 * the logo's clearspace multiplier around the asset.
 */
export function LogoSpecimenBlockView({ block }: { block: LogoSpecimenBlock }) {
  const { tokens, assets } = useBrandBookContext()
  // Logo source: explicit asset, else first asset[kind=logo], else first
  // declared token logo (legacy r2Key).
  const asset =
    findAsset(assets, block.logoAssetId) ??
    assets.find((a) => a.kind === 'logo') ??
    null
  const tokenLogo = tokens.logos[0]
  const src = asset?.dataUrl ?? (tokenLogo?.r2Key ? String(tokenLogo.r2Key) : null)
  const bg = resolveBg(block.bg, tokens)
  const fg = contrastTextFor(bg)
  const height = block.height ?? 140

  return (
    <div className="fw-bbook__logo-specimen" style={{ background: bg, color: fg }}>
      {src ? (
        <img src={src} alt="brand logo" style={{ maxHeight: height }} />
      ) : (
        <span className="fw-bbook__empty">No logo uploaded yet.</span>
      )}
      {block.showClearspace && src ? (
        <div className="fw-bbook__logo-clearspace-overlay" aria-hidden />
      ) : null}
    </div>
  )
}
