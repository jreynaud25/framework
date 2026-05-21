import { createFileRoute } from '@tanstack/react-router'
import { BrandIdentity } from '@/components/BrandIdentity'
import { BrandBook } from '@/components/brand-book/BrandBook'
import { useBrandContext } from '@/components/brandContext'

export const Route = createFileRoute('/b/$brandSlug/guidelines')({
  component: GuidelinesRoute,
})

/**
 * The guidelines URL serves two faces of the same data:
 *   - designer (`?designer=1`)  → BrandIdentity editor (palette CRUD, typo)
 *   - client    (no flag)       → BrandBook auto-rendered, themed, polished
 * Both pull from /api/brands/[slug]/tokens, so an edit on the designer
 * side is immediately reflected when the client reloads.
 */
function GuidelinesRoute() {
  const { designerEnabled } = useBrandContext()
  return designerEnabled ? <BrandIdentity /> : <BrandBook />
}
