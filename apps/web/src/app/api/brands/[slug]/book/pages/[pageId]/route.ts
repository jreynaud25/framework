import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { Block, BrandPage } from '@framework/types'
import {
  deleteBrandBookPage,
  getBrandBook,
  updateBrandBookPage,
} from '@/server/brand-book-store'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ slug: string; pageId: string }>
}

const PatchBody = z.object({
  title: z.string().min(1).max(80).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(64)
    .optional(),
  subtitle: z.string().max(280).optional(),
  icon: z.string().max(32).optional(),
  hidden: z.boolean().optional(),
  blocks: z.array(z.unknown()).optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().optional(),
})

/**
 * GET /api/brands/[slug]/book/pages/[pageId]
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug, pageId } = await params
  const book = getBrandBook(slug)
  if (!book) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  const page = book.pages.find((p) => p.id === pageId)
  if (!page) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  return cors(NextResponse.json(page))
}

/**
 * PATCH /api/brands/[slug]/book/pages/[pageId]
 *
 * Any subset of page fields. Touching a page strips its `isAuto` flag so
 * the scaffold regenerator skips it.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { slug, pageId } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'invalid_json' }, { status: 400 }))
  }
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    return cors(
      NextResponse.json(
        { error: 'invalid_payload', issues: parsed.error.issues },
        { status: 422 },
      ),
    )
  }
  const updated = updateBrandBookPage(slug, pageId, {
    ...parsed.data,
    blocks: parsed.data.blocks as Block[] | undefined,
  } as Partial<BrandPage>)
  if (!updated) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  return cors(NextResponse.json(updated))
}

/**
 * DELETE /api/brands/[slug]/book/pages/[pageId]
 *
 * Cascades to direct children.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { slug, pageId } = await params
  const ok = deleteBrandBookPage(slug, pageId)
  if (!ok) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  return cors(new NextResponse(null, { status: 204 }))
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

function cors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'content-type')
  return res
}
