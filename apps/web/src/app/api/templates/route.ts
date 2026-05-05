import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { revalidateTemplate } from '@/server/revalidate'

/**
 * POST /api/templates
 *
 * Receives a template version pushed from the Figma generator plugin.
 * Body: { brandSlug, name, slug, figmaFileKey, figmaNodeId, formatConstraints,
 *         layoutSchema, slotSchema, sourceFigmaExport }
 *
 * Phase 1 (week 5–6) wires this through to `templates` + `template_versions`.
 */
const PostBody = z.object({
  brandSlug: z.string(),
  name: z.string(),
  slug: z.string(),
  figmaFileKey: z.string(),
  figmaNodeId: z.string(),
  formatConstraints: z.object({ formats: z.array(z.string()) }).passthrough(),
  layoutSchema: z.unknown(),
  slotSchema: z.array(z.unknown()),
  sourceFigmaExport: z.unknown().optional(),
})

export const runtime = 'edge'

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

  // TODO(week 5–6): persist to templates + template_versions.

  try {
    revalidateTemplate(parsed.data.brandSlug, parsed.data.slug)
  } catch (err) {
    console.warn('[templates] revalidate failed', err)
  }

  return NextResponse.json(
    {
      accepted: true,
      brandSlug: parsed.data.brandSlug,
      templateSlug: parsed.data.slug,
      versionNumber: null,
      revalidated: true,
    },
    { status: 202 },
  )
}
