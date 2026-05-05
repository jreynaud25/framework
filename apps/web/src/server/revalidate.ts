import 'server-only'
import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Per BRIEF §3 / §7 wk 3: Brand Hub uses ISR with on-publish revalidation.
 *
 * We tag every fetched brand fixture with `brand:{slug}` and per-template
 * thumbnails with `template:{brandSlug}/{templateSlug}`. Token publish
 * invalidates the brand tag; template publish invalidates the template tag.
 */

export function revalidateBrand(brandSlug: string): void {
  revalidateTag(brandTag(brandSlug))
  // Best-effort path revalidation. Subdomain pages live under the same root
  // path; the host-based middleware reroutes per-tenant.
  revalidatePath('/', 'page')
}

export function revalidateTemplate(brandSlug: string, templateSlug: string): void {
  revalidateTag(templateTag(brandSlug, templateSlug))
  revalidateTag(brandTag(brandSlug))
}

export const brandTag = (slug: string) => `brand:${slug}`
export const templateTag = (brandSlug: string, templateSlug: string) =>
  `template:${brandSlug}/${templateSlug}`
