import 'server-only'
import type {
  Block,
  BrandBook,
  BrandPage,
  BrandTokens,
} from '@framework/types'
import type { BrandAsset } from './brand-assets-store'

/**
 * Brand-book store. Parallel to brand-tokens-store / brand-assets-store.
 *
 * V1 storage: in-memory + globalThis-pinned, one BrandBook per brand. Each
 * PATCH bumps versionNumber. The shape is defined in @framework/types so
 * client renderers can share it.
 */

interface StoreState {
  byBrand: Map<string, BrandBook>
}

declare global {
  // eslint-disable-next-line no-var
  var __frameworkBrandBookStore: StoreState | undefined
}

function state(): StoreState {
  if (!globalThis.__frameworkBrandBookStore) {
    globalThis.__frameworkBrandBookStore = { byBrand: new Map() }
  }
  return globalThis.__frameworkBrandBookStore
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

export function getBrandBook(brandSlug: string): BrandBook | null {
  return state().byBrand.get(brandSlug) ?? null
}

export function saveBrandBook(book: BrandBook): BrandBook {
  state().byBrand.set(book.brandSlug, book)
  return book
}

/**
 * Replace the whole pages array (used for reorder/nest operations). Bumps
 * versionNumber. Caller-supplied page ids must already exist; new pages
 * should go through createPage().
 */
export function replaceBrandBookPages(brandSlug: string, pages: BrandPage[]): BrandBook | null {
  const existing = getBrandBook(brandSlug)
  if (!existing) return null
  const next: BrandBook = {
    ...existing,
    pages,
    versionNumber: existing.versionNumber + 1,
    updatedAt: nowIso(),
  }
  return saveBrandBook(next)
}

export interface CreatePageInput {
  parentId?: string | null
  title: string
  slug?: string
  subtitle?: string
  blocks?: Block[]
  hidden?: boolean
}

export function createBrandBookPage(brandSlug: string, input: CreatePageInput): BrandPage | null {
  const book = getBrandBook(brandSlug)
  if (!book) return null
  const slug = input.slug ?? slugify(input.title)
  const order =
    book.pages
      .filter((p) => (p.parentId ?? null) === (input.parentId ?? null))
      .reduce((max, p) => Math.max(max, p.order), -1) + 1
  const page: BrandPage = {
    id: newId('page'),
    parentId: input.parentId ?? null,
    slug,
    title: input.title,
    subtitle: input.subtitle,
    blocks: input.blocks ?? [],
    order,
    hidden: input.hidden,
    isAuto: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  book.pages.push(page)
  book.versionNumber += 1
  book.updatedAt = nowIso()
  saveBrandBook(book)
  return page
}

export function updateBrandBookPage(
  brandSlug: string,
  pageId: string,
  patch: Partial<Omit<BrandPage, 'id' | 'createdAt'>>,
): BrandPage | null {
  const book = getBrandBook(brandSlug)
  if (!book) return null
  const idx = book.pages.findIndex((p) => p.id === pageId)
  if (idx === -1) return null
  const current = book.pages[idx]!
  // Touching a page strips isAuto so the scaffold regenerator skips it.
  const next: BrandPage = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    parentId: patch.parentId === undefined ? current.parentId : patch.parentId,
    isAuto: patch.isAuto ?? false,
    updatedAt: nowIso(),
  }
  book.pages[idx] = next
  book.versionNumber += 1
  book.updatedAt = nowIso()
  saveBrandBook(book)
  return next
}

export function deleteBrandBookPage(brandSlug: string, pageId: string): boolean {
  const book = getBrandBook(brandSlug)
  if (!book) return false
  const before = book.pages.length
  // Cascade delete: drop the page and any direct children.
  book.pages = book.pages.filter((p) => p.id !== pageId && p.parentId !== pageId)
  if (book.pages.length === before) return false
  book.versionNumber += 1
  book.updatedAt = nowIso()
  saveBrandBook(book)
  return true
}

/**
 * Generates the default Vevo-inspired scaffold from the brand's current
 * tokens + assets. Each block is marked isAuto so the scaffold can be
 * regenerated later without clobbering designer-authored content.
 */
export function defaultBrandBook(
  brandSlug: string,
  tokens: BrandTokens,
  assets: BrandAsset[],
): BrandBook {
  const pages: BrandPage[] = []
  let order = 0

  const addPage = (
    title: string,
    slug: string,
    blocks: Block[],
    extras: Partial<BrandPage> = {},
  ): BrandPage => {
    const page: BrandPage = {
      id: newId('page'),
      parentId: extras.parentId ?? null,
      slug,
      title,
      subtitle: extras.subtitle,
      blocks,
      order: extras.parentId
        ? (pages.filter((p) => p.parentId === extras.parentId).length)
        : order++,
      hidden: extras.hidden,
      isAuto: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    pages.push(page)
    return page
  }

  // ── 1. Overview ──────────────────────────────────────────────────────
  addPage('Overview', 'overview', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: brandSlug,
      subtitle: 'Brand guidelines',
      bgKind: 'primary',
      height: 'lg',
      align: 'left',
    }),
    autoBlock<'text'>({
      kind: 'text',
      width: 'narrow',
      markdown:
        'These guidelines exist to keep the brand consistent across every touchpoint — from social posts to print collateral. Each section can be customized; tokens edited here propagate to every template.',
    }),
    autoBlock<'related'>({
      kind: 'related',
      links: [
        { label: 'Logo', pageSlug: 'logo' },
        { label: 'Color', pageSlug: 'color' },
        { label: 'Typography', pageSlug: 'typography' },
      ],
    }),
  ])

  // ── 2. Logo ─────────────────────────────────────────────────────────
  const logoPage = addPage('Logo', 'logo', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Logo',
      subtitle:
        'One of our most recognizable elements. Consistent placement, clearspace and color treatment keep it iconic.',
      bgKind: 'primary',
      height: 'md',
      align: 'left',
    }),
    autoBlock<'section'>({ kind: 'section', title: 'Overview' }),
    autoBlock<'text'>({
      kind: 'text',
      width: 'narrow',
      markdown:
        'The wordmark is the official stamp of the brand. The geometric letterforms give the mark an expert sensibility that is ownable and sets the brand apart.',
    }),
    autoBlock<'logoSpecimen'>({
      kind: 'logoSpecimen',
      bg: 'bg',
      height: 120,
    }),
  ])

  addPage('Clearspace', 'clearspace', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Clearspace',
      subtitle:
        'When applying the logo, ensure enough space from margins and other elements.',
      bgKind: 'none',
      height: 'sm',
      align: 'left',
    }),
    autoBlock<'logoClearspace'>({ kind: 'logoClearspace', clearspaceX: 1.0 }),
  ], { parentId: logoPage.id })

  addPage('Scalability', 'scalability', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Scalability',
      subtitle: 'The logo was tested at various sizes; minimum size for legibility is 10px.',
      bgKind: 'none',
      height: 'sm',
      align: 'left',
    }),
    autoBlock<'text'>({
      kind: 'text',
      width: 'narrow',
      markdown:
        'Never reproduce the logo below the minimum size. At smaller scales, increased clearspace compensates for reduced legibility.',
    }),
  ], { parentId: logoPage.id })

  addPage('Color options', 'color-options', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Color options',
      subtitle:
        'Use the logo with black, white, and colors from the core palette. Always ensure contrast.',
      bgKind: 'none',
      height: 'sm',
      align: 'left',
    }),
    autoBlock<'logoGrid'>({
      kind: 'logoGrid',
      bgs: ['bg', 'fg', 'primary'],
    }),
  ], { parentId: logoPage.id })

  addPage('Misuse', 'misuse', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Logo misuse',
      subtitle:
        'It is important that the logo remains consistent. Do not reinterpret, modify or embellish.',
      bgKind: 'none',
      height: 'sm',
      align: 'left',
    }),
    autoBlock<'logoMisuse'>({
      kind: 'logoMisuse',
      columns: 2,
      items: [
        { label: 'Do not apply a stroke' },
        { label: 'Do not apply a drop shadow' },
        { label: 'Do not tilt or angle' },
        { label: 'Do not distort or warp' },
      ],
    }),
  ], { parentId: logoPage.id })

  addPage('Placement', 'placement', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Logo placement',
      subtitle:
        'The logo should always be placed in one of the standard positions — simple, consistent, flexible.',
      bgKind: 'none',
      height: 'sm',
      align: 'left',
    }),
    autoBlock<'logoPlacement'>({
      kind: 'logoPlacement',
      positions: ['tl', 'tr', 'bl', 'br', 'c'],
    }),
  ], { parentId: logoPage.id })

  // ── 3. Color ────────────────────────────────────────────────────────
  const colorPage = addPage('Color', 'color', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Color',
      subtitle:
        'Coupled with the layout system, the palette supports a wide range of content.',
      bgKind: 'primary',
      height: 'md',
      align: 'left',
    }),
    autoBlock<'section'>({
      kind: 'section',
      title: 'Core palette',
      subtitle:
        'Each color is paired with full specs — HEX, RGB, and (optionally) CMYK / Pantone.',
    }),
    autoBlock<'palette'>({
      kind: 'palette',
      columns: 3,
      showFields: ['hex'],
    }),
  ])

  addPage('Pairings', 'pairings', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Pairings',
      subtitle:
        'Approved combinations when overlaying typography or the logo on color and image.',
      bgKind: 'none',
      height: 'sm',
      align: 'left',
    }),
    autoBlock<'colorPairing'>({ kind: 'colorPairing' }),
  ], { parentId: colorPage.id })

  addPage('Tints & opacity', 'tints', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Tints & opacity',
      subtitle: 'Hierarchy through tint reduction or opacity.',
      bgKind: 'none',
      height: 'sm',
      align: 'left',
    }),
    autoBlock<'tintScale'>({
      kind: 'tintScale',
      paletteName: tokens.colors.palette[0]?.name ?? 'primary',
      stops: [100, 75, 50, 25],
      mode: 'opacity',
    }),
  ], { parentId: colorPage.id })

  // ── 4. Typography ───────────────────────────────────────────────────
  const typePage = addPage('Typography', 'typography', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Typography',
      subtitle: 'Straightforward with a polished simplicity. Communicates clearly without ego.',
      bgKind: 'primary',
      height: 'md',
      align: 'left',
    }),
    autoBlock<'section'>({ kind: 'section', title: 'Typefaces' }),
    ...Object.keys(tokens.typography).map((role) =>
      autoBlock<'typeSpecimen'>({
        kind: 'typeSpecimen',
        role,
      }),
    ),
  ])

  addPage('Scale', 'scale', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Scale',
      subtitle: 'Three sizes maximum per composition. Each step a minimum of 50% larger than the previous.',
      bgKind: 'none',
      height: 'sm',
      align: 'left',
    }),
    autoBlock<'typeScale'>({ kind: 'typeScale' }),
  ], { parentId: typePage.id })

  addPage('Character set', 'character-set', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Character set',
      subtitle: 'Full glyph coverage for body and headline use.',
      bgKind: 'none',
      height: 'sm',
      align: 'left',
    }),
    autoBlock<'characterSet'>({ kind: 'characterSet', role: 'body', set: 'all' }),
  ], { parentId: typePage.id })

  // ── 5. Layout ───────────────────────────────────────────────────────
  addPage('Layout', 'layout', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Layout',
      subtitle:
        'A modular system that frames content and keeps compositions cohesive.',
      bgKind: 'primary',
      height: 'md',
      align: 'left',
    }),
    autoBlock<'section'>({ kind: 'section', title: 'Grid setup' }),
    autoBlock<'text'>({
      kind: 'text',
      width: 'narrow',
      markdown:
        'Use a 4-, 6-, or 8-column grid. Always align logo, type, image and graphics to the grid; spacing between elements equals the margins.',
    }),
    autoBlock<'section'>({ kind: 'section', title: 'Margins' }),
    autoBlock<'text'>({
      kind: 'text',
      width: 'narrow',
      markdown:
        'Margins are defined by the size and clearspace of the logo. Smaller logo = tighter margins; larger logo = wider margins.',
    }),
  ])

  // ── 6. Tone of Voice ────────────────────────────────────────────────
  const voicePage = addPage('Tone of voice', 'voice', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Tone of voice',
      subtitle: 'How the brand sounds — written and spoken.',
      bgKind: 'primary',
      height: 'md',
      align: 'left',
    }),
    autoBlock<'section'>({ kind: 'section', title: 'Tone' }),
    autoBlock<'toneChips'>({ kind: 'toneChips' }),
    autoBlock<'section'>({ kind: 'section', title: 'Vocabulary' }),
    autoBlock<'vocabulary'>({ kind: 'vocabulary' }),
  ])

  // ── 7. Photography ─────────────────────────────────────────────────
  const photoAssets = assets.filter((a) => a.kind === 'photo')
  addPage('Photography', 'photography', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Photography',
      subtitle: 'Photography puts the subject first — high resolution, clean composition.',
      bgKind: 'primary',
      height: 'md',
      align: 'left',
    }),
    ...(photoAssets.length > 0
      ? [
          autoBlock<'imageGrid'>({
            kind: 'imageGrid',
            assetIds: photoAssets.slice(0, 9).map((a) => a.id),
            columns: 3,
            aspect: '4:3',
          }),
        ]
      : [
          autoBlock<'callout'>({
            kind: 'callout',
            tone: 'info',
            title: 'No photography yet',
            body:
              'Push photos from the Figma plugin (layer name "photo/<name>") or upload them from the designer.',
          }),
        ]),
    autoBlock<'section'>({ kind: 'section', title: 'Direction' }),
    autoBlock<'callout'>({
      kind: 'callout',
      tone: 'do',
      body: 'Clean composition · subject front and center · high resolution.',
    }),
    autoBlock<'callout'>({
      kind: 'callout',
      tone: 'dont',
      body: 'Heavy filters · clutter behind the subject · low resolution crops.',
    }),
  ], { hidden: photoAssets.length === 0 })

  // ── 8. Pattern (only if assets exist) ───────────────────────────────
  const patternAssets = assets.filter((a) => a.kind === 'pattern')
  if (patternAssets.length > 0) {
    addPage('Pattern', 'pattern', [
      autoBlock<'hero'>({
        kind: 'hero',
        title: 'Pattern',
        subtitle: 'Tileable graphic motifs used across collateral.',
        bgKind: 'primary',
        height: 'md',
        align: 'left',
      }),
      autoBlock<'patternGrid'>({ kind: 'patternGrid' }),
    ])
  }

  // ── 9. Resources ────────────────────────────────────────────────────
  addPage('Resources', 'resources', [
    autoBlock<'hero'>({
      kind: 'hero',
      title: 'Resources',
      subtitle: 'Logo packs, fonts, and templates — everything you need.',
      bgKind: 'primary',
      height: 'md',
      align: 'left',
    }),
    autoBlock<'downloads'>({ kind: 'downloads' }),
  ])

  return {
    brandSlug,
    pages,
    versionNumber: 1,
    updatedAt: nowIso(),
  }
}

/**
 * Ensures a brand book exists for this brand, scaffolding from current
 * tokens + assets if it doesn't. Idempotent.
 */
export function ensureBrandBook(
  brandSlug: string,
  tokens: BrandTokens,
  assets: BrandAsset[],
): BrandBook {
  const existing = getBrandBook(brandSlug)
  if (existing) return existing
  const fresh = defaultBrandBook(brandSlug, tokens, assets)
  saveBrandBook(fresh)
  return fresh
}

// ── helpers ───────────────────────────────────────────────────────────

function autoBlock<K extends Block['kind']>(
  body: Omit<Extract<Block, { kind: K }>, 'id' | 'isAuto'>,
): Extract<Block, { kind: K }> {
  // Cast through unknown — the discriminated union makes TS unable to infer
  // that `body` exactly matches the variant for K; we trust the caller.
  return {
    ...(body as object),
    id: newId('blk'),
    isAuto: true,
  } as Extract<Block, { kind: K }>
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'page'
}
