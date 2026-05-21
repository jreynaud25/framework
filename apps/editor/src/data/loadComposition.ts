import type {
  BrandTokens,
  Format,
  LayoutNode,
  SlotSchema,
  SlotValues,
} from '@framework/types'
import { demoTemplate } from './demoTemplate'

export interface TemplateVariant {
  format: Format
  label?: string
  canvas: { width: number; height: number }
  layout: LayoutNode
  figmaNodeId: string
}

export type TemplateStatus = 'draft' | 'published' | 'archived'

export interface CompositionPayload {
  compositionId: string
  templateName: string
  templateSlug: string
  brandSlug: string
  format: Format
  formats: Format[]
  /** One layout per format. If empty, fall back to top-level `layout`. */
  variants?: TemplateVariant[]
  canvas?: { width: number; height: number }
  layout: LayoutNode
  slotSchema: SlotSchema
  slotValues: SlotValues
  tokens: BrandTokens
  imageBaseUrl: string
  status?: TemplateStatus
  publishedAt?: string
  archivedAt?: string
}

/**
 * Loads a composition payload for the route `/c/<id>?brand=<slug>`.
 *
 * Flow:
 *   1. Hit GET /api/templates/<brand>/<id> (proxied to apps/web in dev).
 *   2. If the template hasn't been pushed yet (404) or the network fails,
 *      fall back to the baked-in demoTemplate so the editor stays usable
 *      without any backend running.
 *
 * The `brand` MUST be passed in by the route loader (via TanStack's
 * `loaderDeps`). Reading the URL directly via URLSearchParams sees the raw
 * TanStack JSON-encoded value (e.g. `"maison-lumiere"` with quotes), which
 * leads to 404s and the wrong template being shown.
 */
export async function loadCompositionById(
  id: string,
  opts: { brand?: string } = {},
): Promise<CompositionPayload> {
  const brandSlug = opts.brand && opts.brand.trim() ? opts.brand : '3070'

  const live = await tryFetchLive(brandSlug, id)
  if (live) return live

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

async function tryFetchLive(
  brandSlug: string,
  templateSlug: string,
): Promise<CompositionPayload | null> {
  if (typeof window === 'undefined') return null
  try {
    const res = await fetch(
      `/api/templates/${encodeURIComponent(brandSlug)}/${encodeURIComponent(templateSlug)}`,
      { headers: { accept: 'application/json' } },
    )
    if (!res.ok) return null
    const data = (await res.json()) as CompositionPayload
    return data
  } catch (err) {
    console.warn('[editor] live composition fetch failed, falling back to demo', err)
    return null
  }
}

function prettify(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
