import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router'
import { useBrandBookContext } from '@/components/brand-book-v2/brandBookContext'
import { BrandPageView } from '@/components/brand-book-v2/BrandPageView'

export const Route = createFileRoute('/b/$brandSlug/guidelines/$pageSlug')({
  component: PageRoute,
})

/**
 * Top-level page. If a child route is matched (nested page), we let the
 * child render via <Outlet />; otherwise we render this page's blocks.
 * This lets /guidelines/logo and /guidelines/logo/clearspace both work
 * with shared parent context.
 */
function PageRoute() {
  const { pageSlug } = Route.useParams()
  const { book, designerEnabled } = useBrandBookContext()
  const children = useChildMatches()

  const page = book.pages.find((p) => !p.parentId && p.slug === pageSlug)
  if (!page) return <div className="fw-bbook__empty">Page not found.</div>
  if (page.hidden && !designerEnabled) {
    return <div className="fw-bbook__empty">This page is hidden.</div>
  }

  // If we have a child route match, render the child via Outlet (nested
  // page) — but the layout still shows our top-level sidebar from the
  // parent /guidelines route.
  if (children.length > 0) {
    return <Outlet />
  }

  return <BrandPageView page={page} />
}
