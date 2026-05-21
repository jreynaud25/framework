import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { revalidateTemplate } from '@/server/revalidate'
import { listPushedTemplates, savePushedTemplate } from '@/server/template-store'
import { ensureBrandExists, updateBrand } from '@/server/brand-store'
import { sendBrandInvite } from '@/server/email'
import type { Format, LayoutNode, SlotSchema } from '@framework/types'

/**
 * POST /api/templates
 *
 * Receives a template version pushed from the Figma generator plugin.
 * Persists into the in-memory dev store (template-store.ts); replace with
 * Drizzle inserts into `templates` + `template_versions` when DB is wired
 * (week 5–6 of the 100-day plan).
 */
/**
 * Accept the plugin's actual payload shape (formats at top level), with
 * optional `formatConstraints` for forward compatibility with the DB
 * column of the same name.
 */
const VariantSchema = z.object({
  format: z.string(),
  label: z.string().optional(),
  canvas: z.object({ width: z.number(), height: z.number() }),
  layout: z.unknown(),
  figmaNodeId: z.string(),
})

const PostBody = z.object({
  brandSlug: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  figmaFileKey: z.string(),
  figmaNodeId: z.string(),
  formats: z.array(z.string()).optional(),
  formatConstraints: z.object({ formats: z.array(z.string()) }).passthrough().optional(),
  canvas: z.object({ width: z.number(), height: z.number() }).optional(),
  variants: z.array(VariantSchema).optional(),
  layoutSchema: z.unknown(),
  slotSchema: z.array(z.unknown()),
  sourceFigmaExport: z.unknown().optional(),
  warnings: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
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

  const formats = (parsed.data.formats ?? parsed.data.formatConstraints?.formats ?? ['1:1']) as Format[]
  const variants = parsed.data.variants?.map((v) => ({
    format: v.format as Format,
    label: v.label,
    canvas: v.canvas,
    layout: v.layout as LayoutNode,
    figmaNodeId: v.figmaNodeId,
  }))

  // Make sure a brand record exists for this slug (auto-create on legacy /
  // unknown pushes). Captures the "we just gained a brand" moment so the
  // dashboard reflects every brand the user has content for.
  const brand = ensureBrandExists(parsed.data.brandSlug, { name: parsed.data.brandSlug })

  const saved = savePushedTemplate({
    brandSlug: parsed.data.brandSlug,
    templateSlug: parsed.data.slug,
    name: parsed.data.name,
    figmaFileKey: parsed.data.figmaFileKey,
    figmaNodeId: parsed.data.figmaNodeId,
    formats,
    canvas: parsed.data.canvas,
    variants,
    layout: parsed.data.layoutSchema as LayoutNode,
    slotSchema: parsed.data.slotSchema as SlotSchema,
    sourceFigmaExport: parsed.data.sourceFigmaExport,
    status: parsed.data.status,
  })

  // First-push email notification: only if the brand has a client email AND
  // we haven't already sent the invite. Idempotent — subsequent pushes don't
  // spam the client. Designer name is a placeholder until auth lands.
  if (brand.clientEmail && !brand.inviteSentAt) {
    const appBase = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
    try {
      sendBrandInvite({
        to: brand.clientEmail,
        brandName: brand.name,
        brandSlug: brand.slug,
        designerName: 'Your designer',
        firstTemplateName: saved.name,
        appUrl: `${appBase}/b/${brand.slug}`,
      })
      updateBrand(brand.slug, { inviteSentAt: new Date().toISOString() })
    } catch (err) {
      console.warn('[brand-invite] failed to send', err)
    }
  }

  try {
    revalidateTemplate(parsed.data.brandSlug, parsed.data.slug)
  } catch (err) {
    console.warn('[templates] revalidate failed', err)
  }

  return cors(
    NextResponse.json(
      {
        accepted: true,
        brandSlug: saved.brandSlug,
        templateSlug: saved.templateSlug,
        versionNumber: saved.versionNumber,
        editorUrl: `/c/${saved.templateSlug}?brand=${saved.brandSlug}`,
        revalidated: true,
      },
      { status: 202 },
    ),
  )
}

/**
 * GET /api/templates?brand=<slug>&status=<filter>
 *
 * Lists templates pushed for the given brand. `status` is comma-separated:
 *   - missing / 'published' → only published (default — client view)
 *   - 'all'                  → published + drafts + archived (designer view)
 *   - 'archived'             → archived only
 *   - 'published,archived'   → arbitrary combo
 */
export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get('brand')
  if (!brand) {
    return cors(NextResponse.json({ error: 'brand_required' }, { status: 400 }))
  }
  const statusParam = req.nextUrl.searchParams.get('status')
  const wanted = parseStatusFilter(statusParam)

  const templates = listPushedTemplates(brand)
    .filter((t) => wanted.has(t.status ?? 'published'))
    .map((t) => ({
      templateSlug: t.templateSlug,
      name: t.name,
      formats: t.formats,
      versionNumber: t.versionNumber,
      pushedAt: t.pushedAt,
      canvas: t.canvas,
      figmaNodeId: t.figmaNodeId,
      status: t.status ?? 'published',
      publishedAt: t.publishedAt,
      archivedAt: t.archivedAt,
    }))
  return cors(NextResponse.json({ brand, templates }))
}

function parseStatusFilter(param: string | null): Set<string> {
  if (!param) return new Set(['published'])
  if (param === 'all') return new Set(['draft', 'published', 'archived'])
  return new Set(param.split(',').map((s) => s.trim()).filter(Boolean))
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

function cors(res: NextResponse): NextResponse {
  // Dev: editor on :3001 calls web on :3000. Prod: editor + web share an
  // origin via subdomain routing so this is a no-op.
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'content-type')
  return res
}
