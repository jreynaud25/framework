import type { ImageGridBlock } from '@framework/types'
import { useBrandBookContext, findAsset } from '../brandBookContext'

const ASPECT_RATIOS: Record<string, string> = {
  '1:1': '1 / 1',
  '4:3': '4 / 3',
  '16:9': '16 / 9',
  '3:4': '3 / 4',
}

export function ImageGridBlockView({ block }: { block: ImageGridBlock }) {
  const { assets } = useBrandBookContext()
  const cols = block.columns ?? 3
  const aspect = block.aspect && block.aspect !== 'auto' ? ASPECT_RATIOS[block.aspect] : undefined
  const items = block.assetIds.map((id) => findAsset(assets, id)).filter(Boolean) as NonNullable<ReturnType<typeof findAsset>>[]
  if (items.length === 0) {
    return <div className="fw-bbook__empty">No images yet — add some from the designer.</div>
  }
  return (
    <div
      className="fw-bbook__image-grid"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map((a) => (
        <div key={a.id} className="fw-bbook__image-grid-cell" style={{ aspectRatio: aspect }}>
          <img src={a.dataUrl} alt={a.label} />
        </div>
      ))}
    </div>
  )
}
