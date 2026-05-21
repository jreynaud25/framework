import type { MediaLibraryBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

const ASPECT_RATIOS: Record<string, string> = {
  '1:1': '1 / 1',
  '4:3': '4 / 3',
  '16:9': '16 / 9',
}

const KIND_LABELS: Record<MediaLibraryBlock['filter'], string> = {
  all: 'All assets',
  logo: 'Logos',
  photo: 'Photography',
  pattern: 'Patterns',
  icon: 'Icons',
}

/**
 * Auto-aggregating gallery. Filters the brand's assets by kind and lays
 * them out as a grid. Designer drops this block onto a page once; future
 * pushes from Figma show up here automatically — no manual wiring per
 * asset.
 */
export function MediaLibraryBlockView({ block }: { block: MediaLibraryBlock }) {
  const { assets } = useBrandBookContext()
  const items =
    block.filter === 'all' ? assets : assets.filter((a) => a.kind === block.filter)
  const cols = block.columns ?? 3
  const aspect = block.aspect && block.aspect !== 'auto' ? ASPECT_RATIOS[block.aspect] : undefined
  const showLabels = block.showLabels ?? true

  if (items.length === 0) {
    return (
      <div className="fw-bbook__empty">
        No {KIND_LABELS[block.filter].toLowerCase()} yet — push from Figma plugin or upload from a
        block's asset picker.
      </div>
    )
  }
  return (
    <div className="fw-bbook__media">
      <div className="fw-bbook__media-head">
        <span>{KIND_LABELS[block.filter]}</span>
        <span className="fw-bbook__media-count">{items.length}</span>
      </div>
      <div
        className="fw-bbook__media-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {items.map((a) => (
          <figure key={a.id} className="fw-bbook__media-cell" style={{ aspectRatio: aspect }}>
            <img src={a.dataUrl} alt={a.label} />
            {showLabels ? (
              <figcaption>
                <span>{a.label}</span>
                {a.variant ? <span className="fw-bbook__media-variant">{a.variant}</span> : null}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  )
}
