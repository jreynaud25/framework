import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { BrandTokens } from '@framework/types'
import {
  defaultBrandTokens,
  getPushedBrandTokens,
  patchPushedBrandTokens,
} from '@/server/brand-tokens-store'
import { getBrand, updateBrand } from '@/server/brand-store'
import { loadBrandBySlug } from '@/server/brand'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/brands/[slug]/tokens
 *
 * Returns the brand's current tokens. Source of truth ladder:
 *   1. pushed tokens (from Figma plugin or editor edits)
 *   2. mock brand (V1: only '3070')
 *   3. fresh default (uses BrandRecord.primaryColor if available)
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const pushed = getPushedBrandTokens(slug)
  if (pushed) {
    return cors(
      NextResponse.json({ tokens: pushed.tokens, versionNumber: pushed.versionNumber }),
    )
  }
  const mock = await loadBrandBySlug(slug)
  if (mock?.tokens) {
    return cors(NextResponse.json({ tokens: mock.tokens, versionNumber: 1 }))
  }
  const brand = getBrand(slug)
  return cors(
    NextResponse.json({
      tokens: defaultBrandTokens(brand?.primaryColor),
      versionNumber: 0,
    }),
  )
}

/**
 * PATCH /api/brands/[slug]/tokens
 *
 * Partial update. Body is a `Partial<BrandTokens>` — deep-merged into the
 * current tokens. Bumps version. If `colors.primary` changes, also syncs
 * `BrandRecord.primaryColor` so the dashboard card swatch stays aligned.
 */
const PatchBody = z.object({
  colors: z.unknown().optional(),
  typography: z.unknown().optional(),
  spacing: z.unknown().optional(),
  logos: z.unknown().optional(),
  motion: z.unknown().optional(),
  voice: z.unknown().optional(),
  imagery: z.unknown().optional(),
  customRules: z.unknown().optional(),
})

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

  const brand = getBrand(slug)
  const updated = patchPushedBrandTokens(
    slug,
    parsed.data as Partial<BrandTokens>,
    brand?.primaryColor,
  )

  // Sync BrandRecord.primaryColor → keep the dashboard card in sync.
  const newPrimary = (parsed.data as { colors?: { primary?: string } }).colors?.primary
  if (newPrimary && typeof newPrimary === 'string') {
    updateBrand(slug, { primaryColor: newPrimary })
  }

  return cors(
    NextResponse.json({ tokens: updated.tokens, versionNumber: updated.versionNumber }),
  )
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
