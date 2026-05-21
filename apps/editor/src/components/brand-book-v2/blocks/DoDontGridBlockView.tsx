import type { DoDontGridBlock } from '@framework/types'
import { useBrandBookContext, findAsset } from '../brandBookContext'

/**
 * Side-by-side Do / Don't comparison cards. Each cell has its image + a
 * marker (✓/✕) + caption. The marker color is hard-coded to greens/reds
 * but discreet — Vevo keeps the chrome subtle so the imagery does the work.
 */
export function DoDontGridBlockView({ block }: { block: DoDontGridBlock }) {
  const { assets, tokens } = useBrandBookContext()
  const cols = block.columns ?? 2
  return (
    <div
      className="fw-bbook__dodont"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {block.items.map((item, i) => {
        const a = findAsset(assets, item.assetId)
        return (
          <div key={i} className={`fw-bbook__dodont-cell is-${item.kind}`}>
            <div className="fw-bbook__dodont-tile" style={{ background: tokens.colors.semantic?.bg ?? '#f5f5f4' }}>
              {a ? (
                <img src={a.dataUrl} alt={item.caption} />
              ) : (
                <span className="fw-bbook__empty">no image</span>
              )}
              <span className={`fw-bbook__dodont-marker is-${item.kind}`}>
                {item.kind === 'do' ? '✓' : '✕'}
              </span>
            </div>
            <span className="fw-bbook__dodont-label">{item.caption}</span>
          </div>
        )
      })}
    </div>
  )
}
