import { createFileRoute } from '@tanstack/react-router'
import { BrandBookLayout } from '@/components/brand-book-v2/BrandBookLayout'

/**
 * Layout for /b/<slug>/guidelines. Renders the left page tree + outlet
 * for the active page (index, $pageSlug, or $pageSlug/$childSlug). The
 * book + tokens + assets fetch happens here once and is shared via
 * BrandBookContext.
 */
export const Route = createFileRoute('/b/$brandSlug/guidelines')({
  component: BrandBookLayout,
})
