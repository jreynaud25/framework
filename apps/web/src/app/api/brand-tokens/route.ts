import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { revalidateBrand } from '@/server/revalidate'
import { savePushedBrandTokens } from '@/server/brand-tokens-store'
import type { BrandTokens } from '@framework/types'

/**
 * POST /api/brand-tokens
 *
 * Receives a brand token version pushed from the Figma generator plugin.
 * Phase 1 (week 2) wires this through to `brand_token_versions`. For now we
 * validate the payload shape and ack — the plugin can develop against it
 * before the database is provisioned.
 */
const PaletteEntrySchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6,8}$/),
  cmyk: z.object({ c: z.number(), m: z.number(), y: z.number(), k: z.number() }).optional(),
  pantone: z.string().optional(),
  usage: z.string().optional(),
})

const TypographyEntrySchema = z.object({
  fontFamily: z.string(),
  fontTokenKey: z.string(),
  weights: z.array(z.number()),
  defaultWeight: z.number(),
  scale: z.array(z.number()),
  lineHeight: z.number(),
  letterSpacing: z.number().optional(),
})

const BrandTokensSchema = z.object({
  colors: z.object({
    primary: z.string(),
    palette: z.array(PaletteEntrySchema),
    semantic: z.record(z.string(), z.string()).optional(),
  }),
  typography: z.record(z.string(), TypographyEntrySchema),
  spacing: z.object({ unit: z.number(), scale: z.array(z.number()) }),
  logos: z.array(
    z.object({
      name: z.string(),
      variant: z.string(),
      r2Key: z.string(),
      clearSpaceMultiplier: z.number(),
      minSizePx: z.number(),
      allowedBackgrounds: z.array(z.string()),
    }),
  ),
  motion: z.unknown().optional(),
  voice: z.unknown().optional(),
  imagery: z.unknown().optional(),
  customRules: z.unknown().optional(),
})

const PostBody = z.object({
  brandSlug: z.string(),
  sourceFigmaFileKey: z.string(),
  tokens: BrandTokensSchema,
})

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
  }

  const parsed = PostBody.safeParse(body)
  if (!parsed.success) {
    return cors(
      NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 422 }),
    )
  }

  // TODO(week 2): authenticate (Clerk), authorize (linked studio), audit_log.
  const saved = savePushedBrandTokens({
    brandSlug: parsed.data.brandSlug,
    sourceFigmaFileKey: parsed.data.sourceFigmaFileKey,
    tokens: parsed.data.tokens as BrandTokens,
  })

  // ISR: punch the cached brand hub so the new tokens render on next request.
  try {
    revalidateBrand(parsed.data.brandSlug)
  } catch (err) {
    console.warn('[brand-tokens] revalidate failed', err)
  }

  return cors(
    NextResponse.json(
      {
        accepted: true,
        brandSlug: saved.brandSlug,
        versionNumber: saved.versionNumber,
        revalidated: true,
      },
      { status: 202 },
    ),
  )
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
