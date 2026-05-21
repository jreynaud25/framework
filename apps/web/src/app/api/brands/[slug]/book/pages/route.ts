import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { Block } from '@framework/types'
import { createBrandBookPage, getBrandBook } from '@/server/brand-book-store'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ slug: string }>
}

const CreateBody = z.object({
  parentId: z.string().nullable().optional(),
  title: z.string().min(1).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'must be lowercase, digits, dashes')
    .max(64)
    .optional(),
  subtitle: z.string().max(280).optional(),
  blocks: z.array(z.unknown()).optional(),
})

/**
 * POST /api/brands/[slug]/book/pages
 *
 * Create a new page. parentId can nest one level (the renderer caps at 1).
 * If `blocks` is omitted, the page starts blank; designer adds blocks via
 * subsequent PATCH calls.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'invalid_json' }, { status: 400 }))
  }
  const parsed = CreateBody.safeParse(body)
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
  const page = createBrandBookPage(slug, {
    parentId: parsed.data.parentId ?? null,
    title: parsed.data.title,
    slug: parsed.data.slug,
    subtitle: parsed.data.subtitle,
    blocks: parsed.data.blocks as Block[] | undefined,
  })
  return cors(NextResponse.json(page, { status: 201 }))
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

function cors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'content-type')
  return res
}
