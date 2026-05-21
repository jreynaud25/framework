import { createFileRoute } from '@tanstack/react-router'
import { BrandBookLayout } from '@/components/brand-book-v2/BrandBookLayout'

export interface BrandHubSearch {
  designer?: '1'
}

/**
 * Top-level brand surface. There is no separate header chrome; the
 * BrandBookLayout owns the sidebar + main grid for both the templates
 * view and the brand-book pages.
 */
export const Route = createFileRoute('/b/$brandSlug')({
  validateSearch: (raw: Record<string, unknown>): BrandHubSearch => ({
    designer: String(raw.designer) === '1' ? '1' : undefined,
  }),
  component: BrandRoute,
})

function BrandRoute() {
  const { brandSlug } = Route.useParams()
  const search = Route.useSearch()
  return <BrandBookLayout brandSlug={brandSlug} designerEnabled={search.designer === '1'} />
}
