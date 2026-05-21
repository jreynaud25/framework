import type { SectionBlock } from '@framework/types'

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Anchor + visual divider for a sub-section. Reuses the same eyebrow type
 * style as Vevo's section headers (small, tracked, uppercase).
 */
export function SectionBlockView({ block }: { block: SectionBlock }) {
  const anchor = block.anchor ?? slugify(block.title)
  return (
    <div className="fw-bbook__section-head" id={anchor}>
      <h2 className="fw-bbook__eyebrow">{block.title}</h2>
      {block.subtitle ? <p className="fw-bbook__subtitle">{block.subtitle}</p> : null}
    </div>
  )
}
