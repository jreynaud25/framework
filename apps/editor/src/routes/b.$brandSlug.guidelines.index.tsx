import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useBrandBookContext } from '@/components/brand-book-v2/brandBookContext'

export const Route = createFileRoute('/b/$brandSlug/guidelines/')({
  component: GuidelinesIndex,
})

/**
 * /b/<slug>/guidelines renders the first visible top-level page. We do
 * the redirect client-side so the context (already fetched in the parent
 * layout) is the source of truth — the server has no concept of "first
 * page" beyond order.
 */
function GuidelinesIndex() {
  const { brandSlug } = Route.useParams()
  const { book, designerEnabled } = useBrandBookContext()
  const navigate = useNavigate()

  useEffect(() => {
    const first = book.pages
      .filter((p) => !p.parentId && (designerEnabled || !p.hidden))
      .sort((a, b) => a.order - b.order)[0]
    if (!first) return
    void navigate({
      to: '/b/$brandSlug/guidelines/$pageSlug',
      params: { brandSlug, pageSlug: first.slug },
      search: designerEnabled ? { designer: '1' as const } : undefined,
      replace: true,
    })
  }, [book, brandSlug, designerEnabled, navigate])

  return <div className="text-[12px] text-[var(--muted)]">Loading…</div>
}
