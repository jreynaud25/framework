import type { BrandAsset } from './types'

/**
 * Pattern showcase. Each tile is square — the pattern appears within its
 * native aspect, no repeating (just a preview). V2 could add a tile-repeat
 * mode toggle if useful.
 */
export function PatternsSection({ patterns }: { patterns: ReadonlyArray<BrandAsset> }) {
  return (
    <div className="fw-bb__pattern-grid">
      {patterns.map((p) => (
        <div key={p.id} className="fw-bb__pattern-card" title={p.variant ?? p.label}>
          <img src={p.dataUrl} alt={p.label} loading="lazy" />
        </div>
      ))}
    </div>
  )
}
