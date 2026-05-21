import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import {
  listCompositionsForBrand,
  listCompositionsForTemplate,
  saveComposition,
} from '@/server/composition-store'
import type { Format, SlotValues } from '@framework/types'

export const runtime = 'nodejs'

const PostBody = z.object({
  brandSlug: z.string().min(1),
  templateSlug: z.string().min(1),
  format: z.string().min(1),
  slotValues: z.record(z.string(), z.unknown()).default({}),
  name: z.string().optional(),
})

/**
 * POST /api/compositions
 * Create a new saved composition snapshot.
 */
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'invalid_json' }, { status: 400 }))
  }
  const parsed = PostBody.safeParse(body)
  if (!parsed.success) {
    return cors(NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 422 }))
  }
  const saved = saveComposition({
    brandSlug: parsed.data.brandSlug,
    templateSlug: parsed.data.templateSlug,
    format: parsed.data.format as Format,
    slotValues: parsed.data.slotValues as SlotValues,
    name: parsed.data.name,
  })
  return cors(NextResponse.json(saved, { status: 201 }))
}

/**
 * GET /api/compositions?brand=…&template=… — list for one template.
 * GET /api/compositions?brand=…              — list every composition for a brand.
 */
export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get('brand')
  const template = req.nextUrl.searchParams.get('template')
  if (!brand) {
    return cors(NextResponse.json({ error: 'brand_required' }, { status: 400 }))
  }
  const compositions = template
    ? listCompositionsForTemplate(brand, template)
    : listCompositionsForBrand(brand)
  return cors(NextResponse.json({ brand, template, compositions }))
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
