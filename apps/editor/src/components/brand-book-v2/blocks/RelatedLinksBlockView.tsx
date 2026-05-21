import { Link } from '@tanstack/react-router'
import type { RelatedLinksBlock } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

export function RelatedLinksBlockView({ block }: { block: RelatedLinksBlock }) {
  const { brandSlug, designerEnabled } = useBrandBookContext()
  if (block.links.length === 0) return null
  const search = designerEnabled ? { designer: '1' as const } : undefined
  return (
    <div className="fw-bbook__related">
      <span className="fw-bbook__related-label">Related</span>
      <ul>
        {block.links.map((link, i) => (
          <li key={i}>
            <Link
              to="/b/$brandSlug/guidelines/$pageSlug"
              params={{ brandSlug, pageSlug: link.pageSlug }}
              search={search}
            >
              → {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
