import type { TypeScaleBlock, TypographyEntry } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

/**
 * Tabular scale: derives default rows from tokens.typography (one row per
 * role × scale step) unless block.rows is explicit. Each row is its own
 * sample line so the reader sees the relative sizes side by side.
 */
export function TypeScaleBlockView({ block }: { block: TypeScaleBlock }) {
  const { tokens } = useBrandBookContext()
  const rows =
    block.rows ??
    Object.entries(tokens.typography as Record<string, TypographyEntry | undefined>).flatMap(([role, entry]) =>
      entry
        ? entry.scale.slice(0, 2).map((px, i) => ({
            label: i === 0 ? role : `${role} sm`,
            px,
            leading: Math.round(px * entry.lineHeight),
            tracking: entry.letterSpacing ?? 0,
          }))
        : [],
    )
  return (
    <div className="fw-bbook__scale">
      {rows.map((r, i) => (
        <div key={i} className="fw-bbook__scale-row">
          <div className="fw-bbook__scale-meta">
            <span className="fw-bbook__scale-label">{r.label}</span>
            <span>{r.px}px</span>
            <span>lh {r.leading}</span>
            <span>ls {r.tracking}</span>
          </div>
          <div
            className="fw-bbook__scale-sample"
            style={{
              fontSize: r.px,
              lineHeight: `${r.leading}px`,
              letterSpacing: r.tracking,
              fontFamily: tokens.typography.body.fontFamily,
            }}
          >
            Aa
          </div>
        </div>
      ))}
    </div>
  )
}
