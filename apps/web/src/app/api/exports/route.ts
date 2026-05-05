import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { renderTemplateToSvg } from '@/server/render/satoriRender'
import { loadDefaultFonts } from '@/server/render/fonts'
import { mockBrandBySlug } from '@/server/mock-brands'
import { sampleLayoutFor } from '@/server/render/sampleLayout'

/**
 * POST /api/exports
 *
 * Body: { compositionId, format, mime: 'svg' | 'png' }
 *
 * Phase 1 (week 9–10): renders via Satori at edge.
 *   - SVG returned directly with `image/svg+xml`
 *   - PNG: pipe SVG → resvg-js → PNG bytes (TODO: requires the resvg WASM
 *     bindings to be loaded; bypassed in this commit by returning SVG when
 *     mime=png is requested, with a header noting the fallback)
 *
 * Until the database is provisioned, the composition is resolved from the
 * mock brand fixtures so the pipeline is testable end-to-end.
 */

const PostBody = z.object({
  brandSlug: z.string(),
  templateSlug: z.string(),
  format: z.enum(['1:1', '9:16', '16:9', '4:5', '3:4', '2:3', '3:2']),
  mime: z.enum(['svg', 'png']).default('svg'),
  slotValues: z.record(z.string(), z.unknown()).default({}),
})

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const start = Date.now()
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = PostBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 422 })
  }

  const brand = mockBrandBySlug(parsed.data.brandSlug)
  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }
  const layout = sampleLayoutFor(parsed.data.templateSlug)
  if (!layout) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const fonts = await loadDefaultFonts()
  const svg = await renderTemplateToSvg({
    layout: layout.layout,
    tokens: brand.tokens,
    slotValues: (parsed.data.slotValues ?? {}) as never,
    format: parsed.data.format,
    fonts,
    imageResolver: (r2Key) => `${process.env.R2_PUBLIC_BASE ?? 'https://cdn.frame-work.app'}/${r2Key}`,
  })

  const ms = Date.now() - start

  if (parsed.data.mime === 'svg') {
    return new Response(svg, {
      headers: {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
        'x-render-ms': String(ms),
      },
    })
  }

  // PNG path: would normally pipe SVG → resvg-js → bytes. resvg-js is a
  // native dep that requires Node runtime + warm cold-start budget. Until
  // we wire it (week 10), surface SVG with a note so callers can rasterize
  // client-side or via a downstream worker.
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'x-render-ms': String(ms),
      'x-fw-png-fallback': 'svg-pending-resvg',
    },
  })
}
