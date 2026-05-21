import type { LogoMisuseBlock } from '@framework/types'
import { useBrandBookContext, findAsset } from '../brandBookContext'

/**
 * Grid of misuse examples. Each cell shows a small image (or a placeholder
 * tile) with the misuse label below — Vevo-style "✕ do not …" cards.
 */
export function LogoMisuseBlockView({ block }: { block: LogoMisuseBlock }) {
  const { assets, tokens } = useBrandBookContext()
  const cols = block.columns ?? 2
  return (
    <div
      className="fw-bbook__misuse"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {block.items.map((item, i) => {
        const img = findAsset(assets, item.imageAssetId)
        return (
          <div key={i} className="fw-bbook__misuse-cell">
            <div className="fw-bbook__misuse-tile" style={{ background: tokens.colors.semantic?.bg ?? '#f5f5f4' }}>
              {img ? (
                <img src={img.dataUrl} alt={item.label} />
              ) : (
                <span className="fw-bbook__misuse-placeholder">no image</span>
              )}
              <span className="fw-bbook__misuse-x" aria-hidden>
                ✕
              </span>
            </div>
            <span className="fw-bbook__misuse-label">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
