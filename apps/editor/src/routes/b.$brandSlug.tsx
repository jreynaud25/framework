import { createFileRoute } from '@tanstack/react-router'
import { BrandHub } from '@/components/BrandHub'

export interface BrandHubSearch {
  designer?: '1'
}

export const Route = createFileRoute('/b/$brandSlug')({
  validateSearch: (raw: Record<string, unknown>): BrandHubSearch => ({
    // Lenient — handles both '1' (string, TanStack JSON-encoded) and 1
    // (number, JSON.parse'd from a bare URL like ?designer=1).
    designer: String(raw.designer) === '1' ? '1' : undefined,
  }),
  component: BrandHubRoute,
})

function BrandHubRoute() {
  const { brandSlug } = Route.useParams()
  const search = Route.useSearch()
  return <BrandHub brandSlug={brandSlug} designerEnabled={search.designer === '1'} />
}
