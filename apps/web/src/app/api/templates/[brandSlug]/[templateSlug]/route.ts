import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type {
  BrandTokens,
  Format,
  SlotDefinition,
  SlotSchema,
  SlotValues,
} from '@framework/types'
import { getPushedTemplate, setTemplateStatus, type TemplateStatus } from '@/server/template-store'
import { getPushedBrandTokens } from '@/server/brand-tokens-store'
import { loadBrandBySlug } from '@/server/brand'

/**
 * GET /api/templates/[brandSlug]/[templateSlug]
 *
 * Returns the JSON the editor needs to render a composition end-to-end:
 *   - layout + slotSchema       (from the latest pushed template version)
 *   - tokens                    (pushed brand-tokens > mock brand > default)
 *   - slotValues                (defaults derived from slotSchema)
 *   - format(s), names, etc.
 *
 * Shape mirrors `CompositionPayload` in apps/editor/src/data/loadComposition.ts
 * so the editor can `await res.json()` and consume it directly.
 */

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ brandSlug: string; templateSlug: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { brandSlug, templateSlug } = await params

  const pushed = getPushedTemplate(brandSlug, templateSlug)
  if (!pushed) {
    return cors(NextResponse.json({ error: 'template_not_found' }, { status: 404 }))
  }

  const tokens = await resolveTokens(brandSlug)
  const slotSchema = pushed.slotSchema
  const slotValues = defaultsFromSlotSchema(slotSchema)

  const payload = {
    compositionId: templateSlug,
    templateName: pushed.name,
    templateSlug: pushed.templateSlug,
    brandSlug: pushed.brandSlug,
    format: (pushed.formats[0] ?? '1:1') as Format,
    formats: pushed.formats,
    canvas: pushed.canvas,
    variants: pushed.variants,
    layout: pushed.layout,
    slotSchema,
    slotValues,
    tokens,
    imageBaseUrl: process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? 'https://cdn.frame-work.app',
    versionNumber: pushed.versionNumber,
    status: pushed.status ?? 'published',
    publishedAt: pushed.publishedAt,
    archivedAt: pushed.archivedAt,
  }

  return cors(NextResponse.json(payload))
}

/**
 * PATCH /api/templates/[brandSlug]/[templateSlug]
 * Body: { status: 'draft' | 'published' | 'archived' }
 *
 * Updates the status of the current version without creating a new one.
 * Used by the editor's dock Publish/Archive/Unarchive buttons.
 */
const PatchBody = z.object({
  status: z.enum(['draft', 'published', 'archived']),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { brandSlug, templateSlug } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'invalid_json' }, { status: 400 }))
  }
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    return cors(NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 422 }))
  }
  const updated = setTemplateStatus(brandSlug, templateSlug, parsed.data.status as TemplateStatus)
  if (!updated) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  return cors(NextResponse.json({
    brandSlug: updated.brandSlug,
    templateSlug: updated.templateSlug,
    status: updated.status,
    publishedAt: updated.publishedAt,
    archivedAt: updated.archivedAt,
  }))
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

async function resolveTokens(brandSlug: string): Promise<BrandTokens> {
  const pushedTokens = getPushedBrandTokens(brandSlug)
  if (pushedTokens) return pushedTokens.tokens

  const mock = await loadBrandBySlug(brandSlug)
  if (mock?.tokens) return mock.tokens

  return DEFAULT_TOKENS
}

function defaultsFromSlotSchema(schema: SlotSchema): SlotValues {
  const values: SlotValues = {}
  for (const slot of schema) {
    const v = defaultValueFor(slot)
    if (v) values[slot.key] = v
  }
  return values
}

function defaultValueFor(slot: SlotDefinition): SlotValues[string] | null {
  switch (slot.type) {
    case 'text':
      return slot.default !== undefined ? { type: 'text', value: slot.default } : null
    case 'color':
      return slot.default !== undefined ? { type: 'color', hex: slot.default } : null
    case 'choice':
      return slot.default !== undefined ? { type: 'choice', value: slot.default } : null
    case 'image':
      return slot.default !== undefined ? { type: 'image', r2Key: slot.default.r2Key } : null
  }
}

function cors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'content-type')
  return res
}

const DEFAULT_TOKENS: BrandTokens = {
  colors: {
    primary: '#000000',
    palette: [
      { name: 'ink', hex: '#0A0A0A' },
      { name: 'paper', hex: '#FAFAF7' },
    ],
    semantic: { bg: '#FAFAF7', fg: '#0A0A0A', accent: '#0A0A0A' },
  },
  typography: {
    display: {
      fontFamily: 'Inter',
      fontTokenKey: 'display',
      weights: [700, 900],
      defaultWeight: 700,
      scale: [96, 72, 56, 40],
      lineHeight: 1.05,
    },
    body: {
      fontFamily: 'Inter',
      fontTokenKey: 'body',
      weights: [400, 500],
      defaultWeight: 400,
      scale: [16, 14],
      lineHeight: 1.5,
    },
  },
  spacing: { unit: 8, scale: [4, 8, 16, 24, 32, 48, 64, 96] },
  logos: [],
}
