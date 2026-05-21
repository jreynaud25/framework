import { createFileRoute } from '@tanstack/react-router'
import { BrandLayout } from '@/components/BrandLayout'

export interface BrandHubSearch {
  designer?: '1'
}

export const Route = createFileRoute('/b/$brandSlug')({
  validateSearch: (raw: Record<string, unknown>): BrandHubSearch => ({
    designer: String(raw.designer) === '1' ? '1' : undefined,
  }),
  component: BrandLayoutRoute,
})

function BrandLayoutRoute() {
  const { brandSlug } = Route.useParams()
  const search = Route.useSearch()
  return <BrandLayout brandSlug={brandSlug} designerEnabled={search.designer === '1'} />
}
