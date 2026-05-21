import type { BrandAsset } from './types'

/**
 * Editorial-feeling mosaic of brand photography. Each tile = one asset
 * pushed from Figma with a layer name `photo/<label>`. Label fades in
 * over the bottom of the image with a soft drop shadow.
 */
export function PhotoGrid({ photos }: { photos: ReadonlyArray<BrandAsset> }) {
  return (
    <div className="fw-bb__photo-grid">
      {photos.map((p) => (
        <figure key={p.id} className="fw-bb__photo-card">
          <img src={p.dataUrl} alt={p.label} loading="lazy" />
          {p.variant ? <figcaption className="fw-bb__photo-card__label">{p.variant}</figcaption> : null}
        </figure>
      ))}
    </div>
  )
}
