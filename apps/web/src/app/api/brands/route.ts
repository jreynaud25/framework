import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createBrand, listBrands } from '@/server/brand-store'

export const runtime = 'nodejs'

const PostBody = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters / numbers / hyphens only'),
  industry: z.enum(['fashion', 'luxury', 'hospitality', 'other']).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{3,8}$/).optional(),
  clientEmail: z.string().email().optional(),
})

/** GET /api/brands — lists all brands (V1, no auth). */
export async function GET() {
  return cors(NextResponse.json({ brands: listBrands() }))
}

/** POST /api/brands — create a new brand. */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'invalid_json' }, { status: 400 }))
  }
  const parsed = PostBody.safeParse(body)
  if (!parsed.success) {
    return cors(
      NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 422 }),
    )
  }
  try {
    const brand = createBrand(parsed.data)
    return cors(NextResponse.json(brand, { status: 201 }))
  } catch (err) {
    if (err instanceof Error && err.message === 'slug_taken') {
      return cors(NextResponse.json({ error: 'slug_taken' }, { status: 409 }))
    }
    return cors(NextResponse.json({ error: 'unknown' }, { status: 500 }))
  }
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

function cors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'content-type')
  return res
}
