import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

/**
 * POST /api/fonts
 *
 * Upload + register a brand font. Three sources, three legal flows
 * (BRIEF §3.3):
 *
 *   - 'google'      — name + weights, no upload, no attestation
 *   - 'adobe'       — kitId + projectId, no upload, no attestation
 *   - 'self_hosted' — woff2 upload + click-through license attestation
 *                     written to font_license_attestations
 *
 * For 'self_hosted' the body includes the attestation block. We log:
 *   attestation_text, license_pdf_r2_key, font_file_hash, ip, user_agent.
 * Liability sits with the attesting admin.
 */

const VariantSchema = z.object({
  weight: z.number(),
  style: z.enum(['normal', 'italic']),
  r2Key: z.string(),
  fileSize: z.number(),
  format: z.enum(['woff2', 'woff', 'ttf', 'otf']),
  fontFileHash: z.string(),
})

const Body = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('google'),
    brandSlug: z.string(),
    tokenKey: z.string(),
    familyName: z.string(),
    weights: z.array(z.number()).min(1),
  }),
  z.object({
    source: z.literal('adobe'),
    brandSlug: z.string(),
    tokenKey: z.string(),
    familyName: z.string(),
    kitId: z.string(),
    projectId: z.string(),
  }),
  z.object({
    source: z.literal('self_hosted'),
    brandSlug: z.string(),
    tokenKey: z.string(),
    familyName: z.string(),
    variants: z.array(VariantSchema).min(1),
    attestation: z.object({
      text: z.string().min(20),
      licensePdfR2Key: z.string().optional(),
    }),
  }),
])

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 422 })
  }

  // TODO(week 4): authenticate (admin of brand), insert into brand_fonts.
  // If self_hosted, append a row in font_license_attestations:
  //   { brand_font_id, attested_by_user_id, attestation_text,
  //     license_pdf_r2_key, font_file_hash, ip_address, user_agent,
  //     attested_at }
  if (parsed.data.source === 'self_hosted') {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null
    const ua = req.headers.get('user-agent') ?? null
    console.log('[fonts] attestation logged', {
      brandSlug: parsed.data.brandSlug,
      tokenKey: parsed.data.tokenKey,
      familyName: parsed.data.familyName,
      attestationLength: parsed.data.attestation.text.length,
      ip,
      ua,
    })
  }

  return NextResponse.json({ accepted: true, source: parsed.data.source }, { status: 202 })
}
