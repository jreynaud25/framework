import { NextResponse, type NextRequest } from 'next/server'
import { Resvg } from '@resvg/resvg-js'
import { z } from 'zod'
import { renderTemplateToSvg } from '@/server/render/satoriRender'
import { loadDefaultFonts } from '@/server/render/fonts'
import { mockBrandBySlug } from '@/server/mock-brands'
import { sampleLayoutFor } from '@/server/render/sampleLayout'

/**
 * POST /api/exports
 *
 * Body: { brandSlug, templateSlug, format, mime: 'svg' | 'png', slotValues, scale? }
 *
 * Phase 1 (week 9–10): renders via Satori at edge.
 *   - SVG returned directly with `image/svg+xml`
 *   - PNG: pipe SVG → @resvg/resvg-js → PNG bytes
 *
 * Until the database is provisioned, the composition is resolved from the
 * mock brand fixtures so the pipeline is testable end-to-end.
 */

const PostBody = z.object({
  brandSlug: z.string(),
  templateSlug: z.string(),
  format: z.enum(['1:1', '9:16', '16:9', '4:5', '3:4', '2:3', '3:2']),
  mime: z.enum(['svg', 'png']).default('svg'),
  scale: z.number().min(1).max(4).default(2),
  slotValues: z.record(z.string(), z.unknown()).default({}),
})

export const runtime = 'nodejs'
export const maxDuration = 30

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

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
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  const layout = sampleLayoutFor(parsed.data.templateSlug)
  if (!layout) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const fonts = await loadDefaultFonts()
  const svg = await renderTemplateToSvg({
    layout: layout.layout,
    tokens: brand.tokens,
    slotValues: (parsed.data.slotValues ?? {}) as never,
    format: parsed.data.format,
    fonts,
    imageResolver: (r2Key) =>
      `${process.env.R2_PUBLIC_BASE ?? 'https://cdn.frame-work.app'}/${r2Key}`,
  })

  if (parsed.data.mime === 'svg') {
    return new Response(svg, {
      headers: {
        ...CORS_HEADERS,
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
        'x-render-ms': String(Date.now() - start),
        'content-disposition': contentDisposition(parsed.data, 'svg'),
      },
    })
  }

  // PNG: rasterize the SVG with resvg-js at the requested scale.
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: parsed.data.scale },
    background: 'rgba(255, 255, 255, 0)',
    font: { loadSystemFonts: false },
  })
  const png = resvg.render().asPng()
  return new Response(png as unknown as BodyInit, {
    headers: {
      ...CORS_HEADERS,
      'content-type': 'image/png',
      'cache-control': 'public, max-age=300',
      'x-render-ms': String(Date.now() - start),
      'content-disposition': contentDisposition(parsed.data, 'png'),
    },
  })
}

function contentDisposition(
  body: { brandSlug: string; templateSlug: string; format: string },
  ext: 'svg' | 'png',
): string {
  const fileName = `${body.brandSlug}-${body.templateSlug}-${body.format.replace(':', 'x')}.${ext}`
  return `inline; filename="${fileName}"`
}
