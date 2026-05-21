import type { HeroBlock } from '@framework/types'
import { useBrandBookContext, findAsset } from '../brandBookContext'
import { contrastTextFor } from '../../brand-book/contrast'

const HEIGHTS = { sm: 240, md: 360, lg: 480 } as const

/**
 * Full-content-width hero. Background is the brand primary by default;
 * can be a custom color, an asset image, or none (neutral surface). Text
 * color auto-adapts to bg luminance.
 */
export function HeroBlockView({ block }: { block: HeroBlock }) {
  const { tokens, assets } = useBrandBookContext()

  let bg: string | undefined
  let bgImage: string | undefined
  switch (block.bgKind) {
    case 'primary':
      bg = tokens.colors.primary
      break
    case 'color':
      bg = block.bgColor
      break
    case 'image':
      bgImage = findAsset(assets, block.bgAssetId)?.dataUrl
      bg = tokens.colors.semantic?.bg ?? '#ffffff'
      break
    case 'none':
    default:
      bg = tokens.colors.semantic?.bg ?? '#ffffff'
  }

  const fg = bg ? contrastTextFor(bg) : '#0a0a0a'
  const height = HEIGHTS[block.height ?? 'md']
  const headingFont = tokens.typography.heading?.fontFamily ?? tokens.typography.body.fontFamily

  return (
    <div
      className={`fw-bbook__hero ${block.align === 'center' ? 'is-center' : ''} ${
        block.bgKind === 'none' ? 'is-plain' : ''
      }`}
      style={{
        background: bgImage ? `center / cover no-repeat url(${bgImage}), ${bg}` : bg,
        color: fg,
        minHeight: height,
      }}
    >
      <div className="fw-bbook__hero-inner">
        <h1 style={{ fontFamily: headingFont }}>{block.title}</h1>
        {block.subtitle ? <p>{block.subtitle}</p> : null}
      </div>
    </div>
  )
}
