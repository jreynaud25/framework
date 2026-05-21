import type { ImageBlock } from '@framework/types'
import { useBrandBookContext, findAsset } from '../brandBookContext'

const ASPECT_RATIOS: Record<string, string> = {
  '1:1': '1 / 1',
  '4:3': '4 / 3',
  '16:9': '16 / 9',
  '3:4': '3 / 4',
  '9:16': '9 / 16',
}

export function ImageBlockView({ block }: { block: ImageBlock }) {
  const { assets } = useBrandBookContext()
  const asset = findAsset(assets, block.assetId)
  const src = asset?.dataUrl ?? block.url
  if (!src) return <div className="fw-bbook__empty">No image selected.</div>
  return (
    <figure
      className="fw-bbook__image"
      style={{ aspectRatio: block.aspect && block.aspect !== 'auto' ? ASPECT_RATIOS[block.aspect] : undefined }}
    >
      <img src={src} alt={block.caption ?? ''} style={{ objectFit: block.fit ?? 'cover' }} />
      {block.caption ? <figcaption>{block.caption}</figcaption> : null}
    </figure>
  )
}
