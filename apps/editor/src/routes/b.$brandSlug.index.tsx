import { createFileRoute } from '@tanstack/react-router'
import { TemplatesView } from '@/components/TemplatesView'

export const Route = createFileRoute('/b/$brandSlug/')({
  component: TemplatesRoute,
})

/**
 * Templates view, rendered inside the brand-book main column. The
 * BrandBookLayout's sidebar continues to show the page tree on the left;
 * clicking "Templates" in the sidebar footer lands here.
 */
function TemplatesRoute() {
  return (
    <div className="fw-bbook__page">
      <TemplatesView />
    </div>
  )
}
