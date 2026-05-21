import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import type { LogoToken, LogoVariant } from '@framework/types'
import {
  type AssetKind,
  listBrandAssets,
  saveBrandAsset,
} from '@/server/brand-assets-store'
import { getPushedBrandTokens, patchPushedBrandTokens } from '@/server/brand-tokens-store'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ slug: string }>
}

const KNOWN_LOGO_VARIANTS: ReadonlyArray<LogoVariant> = [
  'primary',
  'wordmark',
  'symbol',
  'monochrome',
  'inverted',
]

const AssetSchema = z.object({
  kind: z.enum(['logo', 'photo', 'pattern', 'icon']),
  variant: z.string().optional(),
  label: z.string().min(1),
  dataUrl: z.string().min(10),
  width: z.number().optional(),
  height: z.number().optional(),
  source: z.enum(['plugin', 'editor']).optional(),
})

const PostBody = z.object({
  assets: z.array(AssetSchema).min(1),
})

/**
 * POST /api/brands/[slug]/assets
 *
 * Batch upload of brand assets. Each asset = { kind, variant?, label,
 * dataUrl, width?, height? }. Side effect: for `kind: 'logo'`, also sync
 * `tokens.logos` so the renderer can resolve logos via imageResolver.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'invalid_json' }, { status: 400 }))
  }
  const parsed = PostBody.safeParse(body)
  if (!parsed.success) {
    return cors(
      NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 422 }),
    )
  }

  const saved = parsed.data.assets.map((a) =>
    saveBrandAsset({
      brandSlug: slug,
      kind: a.kind as AssetKind,
      variant: a.variant,
      label: a.label,
      dataUrl: a.dataUrl,
      width: a.width,
      height: a.height,
      source: a.source ?? 'plugin',
    }),
  )

  // Logo side-effect: keep tokens.logos in sync so the renderer (and the
  // future brand book LogoGallery) can find them through the standard
  // tokens path.
  const newLogos = saved.filter((a) => a.kind === 'logo')
  if (newLogos.length > 0) {
    const current = getPushedBrandTokens(slug)
    const existingLogos = current?.tokens.logos ?? []
    const replacedVariants = new Set(
      newLogos.map((a) => normalizeLogoVariant(a.variant)),
    )
    const kept = existingLogos.filter((l) => !replacedVariants.has(l.variant))
    const added: LogoToken[] = newLogos.map((a) => ({
      name: a.label,
      variant: normalizeLogoVariant(a.variant),
      // V1: store the data URL as the r2Key. imageResolver passes through
      // data: / blob: / http(s):// keys unchanged, so this just works.
      r2Key: a.dataUrl as never,
      clearSpaceMultiplier: 0.5,
      minSizePx: 48,
      allowedBackgrounds: ['*'],
    }))
    patchPushedBrandTokens(slug, { logos: [...kept, ...added] })
  }

  return cors(NextResponse.json({ assets: saved }, { status: 201 }))
}

/** GET /api/brands/[slug]/assets?kind=logo|photo|pattern|icon */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const kindParam = req.nextUrl.searchParams.get('kind') as AssetKind | null
  return cors(NextResponse.json({ assets: listBrandAssets(slug, kindParam ?? undefined) }))
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

/** Map any string variant onto one of the 5 known LogoVariant enum values. */
function normalizeLogoVariant(raw: string | undefined): LogoVariant {
  if (!raw) return 'primary'
  const lc = raw.toLowerCase().replace(/[^a-z]/g, '')
  for (const v of KNOWN_LOGO_VARIANTS) {
    if (lc === v) return v
  }
  // Common aliases
  if (lc === 'main' || lc === 'logo') return 'primary'
  if (lc === 'mark') return 'symbol'
  if (lc === 'mono' || lc === 'black' || lc === 'white') return 'monochrome'
  if (lc === 'reverse') return 'inverted'
  return 'primary'
}

function cors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'content-type')
  return res
}
