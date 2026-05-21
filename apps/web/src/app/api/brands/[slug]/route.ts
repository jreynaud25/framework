import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { deleteBrand, getBrand, updateBrand } from '@/server/brand-store'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ slug: string }>
}

const PatchBody = z.object({
  name: z.string().min(2).optional(),
  industry: z.enum(['fashion', 'luxury', 'hospitality', 'other']).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{3,8}$/).optional(),
  clientEmail: z.string().email().nullish(),
})

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const brand = getBrand(slug)
  if (!brand) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  return cors(NextResponse.json(brand))
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'invalid_json' }, { status: 400 }))
  }
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    return cors(
      NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 422 }),
    )
  }
  const updated = updateBrand(slug, {
    name: parsed.data.name,
    industry: parsed.data.industry,
    primaryColor: parsed.data.primaryColor,
    clientEmail: parsed.data.clientEmail ?? undefined,
  })
  if (!updated) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  return cors(NextResponse.json(updated))
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const ok = deleteBrand(slug)
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
