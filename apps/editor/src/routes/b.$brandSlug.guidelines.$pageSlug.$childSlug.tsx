import { createFileRoute } from '@tanstack/react-router'
import { useBrandBookContext } from '@/components/brand-book-v2/brandBookContext'
import { BrandPageView } from '@/components/brand-book-v2/BrandPageView'

export const Route = createFileRoute('/b/$brandSlug/guidelines/$pageSlug/$childSlug')({
  component: ChildPageRoute,
})

/**
 * Nested page (one level deep, max). Looks up the page by parent's id +
 * child slug. The renderer is the same as the top-level page route — only
 * the lookup differs.
 */
function ChildPageRoute() {
  const { pageSlug, childSlug } = Route.useParams()
  const { book, designerEnabled } = useBrandBookContext()
  const parent = book.pages.find((p) => !p.parentId && p.slug === pageSlug)
  if (!parent) return <div className="fw-bbook__empty">Parent page not found.</div>
  const page = book.pages.find((p) => p.parentId === parent.id && p.slug === childSlug)
  if (!page) return <div className="fw-bbook__empty">Page not found.</div>
  if (page.hidden && !designerEnabled) {
    return <div className="fw-bbook__empty">This page is hidden.</div>
  }
  return <BrandPageView page={page} />
}
