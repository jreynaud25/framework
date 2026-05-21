import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { BrandPage } from '@framework/types'
import {
  ensureBrandBook,
  getBrandBook,
  replaceBrandBookPages,
} from '@/server/brand-book-store'
import {
  defaultBrandTokens,
  getPushedBrandTokens,
} from '@/server/brand-tokens-store'
import { listBrandAssets } from '@/server/brand-assets-store'
import { getBrand } from '@/server/brand-store'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/brands/[slug]/book
 *
 * Returns the brand book; scaffolds from current tokens + assets on first
 * access so a brand always has a baseline book available.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const tokens =
    getPushedBrandTokens(slug)?.tokens ??
    defaultBrandTokens(getBrand(slug)?.primaryColor)
  const assets = listBrandAssets(slug)
  const book = ensureBrandBook(slug, tokens, assets)
  return cors(NextResponse.json(book))
}

/**
 * PATCH /api/brands/[slug]/book
 *
 * Bulk replace the pages array (used for reorder / nest / mass operations).
 * Page ids must already exist — to add a new page, POST to
 * /api/brands/[slug]/book/pages first.
 */
const BulkPatchBody = z.object({
  pages: z.array(z.unknown()),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'invalid_json' }, { status: 400 }))
  }
  const parsed = BulkPatchBody.safeParse(body)
  if (!parsed.success) {
    return cors(
      NextResponse.json(
        { error: 'invalid_payload', issues: parsed.error.issues },
        { status: 422 },
      ),
    )
  }
  const book = getBrandBook(slug)
  if (!book) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  const next = replaceBrandBookPages(slug, parsed.data.pages as BrandPage[])
  return cors(NextResponse.json(next))
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

function cors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'content-type')
  return res
}
