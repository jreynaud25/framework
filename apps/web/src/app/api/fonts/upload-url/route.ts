import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

/**
 * POST /api/fonts/upload-url
 *
 * Returns a presigned R2 PUT URL for the browser to upload a self-hosted
 * font file directly. This skips the Vercel function entirely — the font
 * never touches our compute (BRIEF §14.2 verdict on Cloudinary: skip the
 * Express server entirely with pre-signed direct browser uploads).
 *
 * Phase 1 wires this up to AWS S3 SDK pointed at R2's S3 endpoint. For now
 * we return a stub so the UI can be designed and form-validated.
 */
const Body = z.object({
  brandSlug: z.string(),
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
})

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

  const safe = parsed.data.filename.replace(/[^\w.-]+/g, '-')
  const r2Key = `brands/${parsed.data.brandSlug}/fonts/${Date.now()}-${safe}`

  // TODO(week 4): use @aws-sdk/s3-request-presigner against the R2 S3 endpoint
  //  return { uploadUrl, r2Key, headers, expiresInSec }.
  return NextResponse.json({
    uploadUrl: null,
    r2Key,
    expiresInSec: 600,
    note: 'presigned URL pending R2 wiring (week 4)',
  })
}
