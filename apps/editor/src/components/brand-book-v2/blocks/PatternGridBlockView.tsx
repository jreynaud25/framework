import type { PatternGridBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

export function PatternGridBlockView({ block }: { block: PatternGridBlock }) {
  const { assets } = useBrandBookContext()
  const all = assets.filter((a) => a.kind === 'pattern')
  const items = block.assetIds ? all.filter((a) => block.assetIds!.includes(a.id)) : all
  if (items.length === 0) {
    return <div className="fw-bbook__empty">No patterns yet.</div>
  }
  return (
    <div className="fw-bbook__pattern-grid">
      {items.map((a) => (
        <div key={a.id} className="fw-bbook__pattern-cell">
          <img src={a.dataUrl} alt={a.label} />
        </div>
      ))}
    </div>
  )
}
