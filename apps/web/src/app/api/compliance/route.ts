import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { runComplianceCheck } from '@/server/compliance'
import { mockBrandBySlug } from '@/server/mock-brands'
import { sampleLayoutFor } from '@/server/render/sampleLayout'

/**
 * POST /api/compliance
 *
 * Body: { brandSlug, templateSlug, format, slotValues }
 *
 * Returns a ComplianceReport. Calls the LLM only when ANTHROPIC_API_KEY is
 * set; otherwise falls back to deterministic pre-checks for dev.
 */
const PostBody = z.object({
  brandSlug: z.string(),
  templateSlug: z.string(),
  format: z.string(),
  slotValues: z.record(z.string(), z.unknown()).default({}),
  context: z.string().optional(),
})

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = PostBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 422 })
  }

  const brand = mockBrandBySlug(parsed.data.brandSlug)
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  const template = sampleLayoutFor(parsed.data.templateSlug)
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const report = await runComplianceCheck({
    brandName: brand.name,
    tokens: brand.tokens,
    layout: template.layout,
    slotValues: parsed.data.slotValues as never,
    format: parsed.data.format,
    context: parsed.data.context,
  })

  return NextResponse.json(report)
}
