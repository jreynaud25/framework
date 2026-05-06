import type {
  BrandTokens,
  Format,
  LayoutNode,
  SlotSchema,
  SlotValues,
} from '@framework/types'
import { demoTemplate } from './demoTemplate'

export interface CompositionPayload {
  compositionId: string
  templateName: string
  templateSlug: string
  brandSlug: string
  format: Format
  formats: Format[]
  layout: LayoutNode
  slotSchema: SlotSchema
  slotValues: SlotValues
  tokens: BrandTokens
  imageBaseUrl: string
}

/**
 * In production this hits `apps/web` for a signed payload combining
 * composition + template_version + brand_token_version. For now we serve a
 * baked-in demo so the editor is testable end-to-end without the backend.
 *
 * The route param `id` doubles as the template slug for the demo flow:
 *   /c/spring-drop  →  templateSlug='spring-drop', brandSlug='3070'
 *
 * Optional `?brand=<slug>` overrides the default brand. Used by the
 * Brand Hub Templates section to keep the brand context across the hop
 * to the editor.
 */
export async function loadCompositionById(id: string): Promise<CompositionPayload> {
  const brandSlug =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('brand') ?? '3070'
      : '3070'
  return {
    compositionId: id,
    templateName: prettify(id),
    templateSlug: id,
    brandSlug,
    format: '1:1',
    formats: ['1:1', '9:16', '16:9'],
    layout: demoTemplate.layout,
    slotSchema: demoTemplate.slotSchema,
    slotValues: demoTemplate.defaultValues,
    tokens: demoTemplate.tokens,
    imageBaseUrl: 'https://cdn.frame-work.app',
  }
}

function prettify(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
