import { NextResponse, type NextRequest } from 'next/server'
import { deleteBrandAsset, getBrandAsset } from '@/server/brand-assets-store'
import { getPushedBrandTokens, patchPushedBrandTokens } from '@/server/brand-tokens-store'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ slug: string; id: string }>
}

/** DELETE /api/brands/[slug]/assets/[id] — remove a brand asset. */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { slug, id } = await params
  const asset = getBrandAsset(id)
  if (!asset || asset.brandSlug !== slug) {
    return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  }
  deleteBrandAsset(id)

  // For logos, also remove from tokens.logos to keep the renderer in sync.
  if (asset.kind === 'logo' && asset.variant) {
    const current = getPushedBrandTokens(slug)
    if (current) {
      const filtered = current.tokens.logos.filter((l) => l.variant !== asset.variant)
      patchPushedBrandTokens(slug, { logos: filtered })
    }
  }

  return cors(new NextResponse(null, { status: 204 }))
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

function cors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'content-type')
  return res
}
