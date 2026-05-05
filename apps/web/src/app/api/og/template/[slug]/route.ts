import { type NextRequest } from 'next/server'
import { renderTemplateToSvg } from '@/server/render/satoriRender'
import { loadDefaultFonts } from '@/server/render/fonts'
import { mockBrandBySlug } from '@/server/mock-brands'
import { sampleLayoutFor } from '@/server/render/sampleLayout'

/**
 * GET /api/og/template/[slug]
 *
 * SVG thumbnail used by the Brand Hub template grid. Cached at edge with
 * a long TTL — when a designer pushes a new version we bump the URL via a
 * `?v=<version>` query param.
 */
export const runtime = 'nodejs'

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const url = new URL(req.url)
  const brandSlug = url.searchParams.get('brand') ?? '3070'
  const format = (url.searchParams.get('format') ?? '1:1') as '1:1' | '9:16' | '16:9'

  const brand = mockBrandBySlug(brandSlug)
  if (!brand) return new Response('Brand not found', { status: 404 })
  const layout = sampleLayoutFor(slug)
  if (!layout) return new Response('Template not found', { status: 404 })

  const fonts = await loadDefaultFonts()
  const svg = await renderTemplateToSvg({
    layout: layout.layout,
    tokens: brand.tokens,
    slotValues: {},
    format,
    fonts,
    imageResolver: (r2Key) =>
      `${process.env.R2_PUBLIC_BASE ?? 'https://cdn.frame-work.app'}/${r2Key}`,
  })

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=86400, stale-while-revalidate=86400',
    },
  })
}
