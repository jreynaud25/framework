import type { HexColor, TypographyRole } from './tokens'

/**
 * Brand book = the designer-authored, multi-page documentation surface for
 * a brand. Pages contain ordered blocks. Some blocks are "auto" — they
 * resolve their content from the brand's tokens / assets at render time; the
 * rest are purely-local content (free text, uploaded images, do-don't lists).
 *
 * The shape lives in @framework/types because both the Next.js server
 * (storage + API) and the TanStack-routed editor (rendering + editing) need
 * to share it.
 */

export type BlockKind =
  // structure
  | 'hero'
  | 'section'
  | 'divider'
  | 'spacer'
  | 'related'
  | 'callout'
  // text
  | 'text'
  | 'heading'
  | 'table'
  // color
  | 'palette'
  | 'colorCard'
  | 'colorPairing'
  | 'tintScale'
  // logo
  | 'logoSpecimen'
  | 'logoGrid'
  | 'logoClearspace'
  | 'logoMisuse'
  | 'logoPlacement'
  // type
  | 'typeSpecimen'
  | 'typeScale'
  | 'characterSet'
  // imagery
  | 'image'
  | 'imageGrid'
  | 'doDontGrid'
  // voice
  | 'toneChips'
  | 'vocabulary'
  | 'copyExamples'
  // pattern
  | 'patternGrid'
  // resources
  | 'downloads'
  // media library (auto-aggregates assets by kind)
  | 'mediaLibrary'
  // free
  | 'embed'

export type BlockBgRef = HexColor | 'primary' | 'bg' | 'fg' | 'accent'

interface BaseBlock {
  id: string
  kind: BlockKind
  /** Optional anchor name for TOC blocks (sections). Defaults to slugified title. */
  anchor?: string
  /** Per-block bottom spacing override (default 96px). */
  bottomGap?: number
  /** True if the block was inserted by the scaffold and is still untouched. */
  isAuto?: boolean
}

export interface HeroBlock extends BaseBlock {
  kind: 'hero'
  title: string
  subtitle?: string
  bgKind: 'primary' | 'color' | 'image' | 'none'
  bgColor?: HexColor
  bgAssetId?: string
  height?: 'sm' | 'md' | 'lg'
  align?: 'left' | 'center'
}

export interface SectionBlock extends BaseBlock {
  kind: 'section'
  title: string
  subtitle?: string
}

export interface TextBlock extends BaseBlock {
  kind: 'text'
  markdown: string
  width?: 'narrow' | 'wide'
}

export interface HeadingBlock extends BaseBlock {
  kind: 'heading'
  text: string
  level: 2 | 3 | 4
}

export interface DividerBlock extends BaseBlock {
  kind: 'divider'
  style?: 'line' | 'space'
}

export interface SpacerBlock extends BaseBlock {
  kind: 'spacer'
  height?: number
}

export interface CalloutBlock extends BaseBlock {
  kind: 'callout'
  tone: 'info' | 'do' | 'dont' | 'warn'
  title?: string
  body: string
}

export interface RelatedLinksBlock extends BaseBlock {
  kind: 'related'
  links: { label: string; pageSlug: string }[]
}

export interface TableBlock extends BaseBlock {
  kind: 'table'
  rows: { key: string; value: string }[]
}

export interface PaletteBlock extends BaseBlock {
  kind: 'palette'
  /** null/undefined = render the full palette; otherwise filter by these names */
  includeNames?: string[]
  columns?: 2 | 3 | 4 | 5
  showFields?: ('hex' | 'rgb' | 'cmyk' | 'pantone' | 'usage')[]
}

export interface ColorCardBlock extends BaseBlock {
  kind: 'colorCard'
  /** Resolves to a PaletteEntry; if absent, inlineHex/inlineName are used. */
  paletteName?: string
  inlineHex?: HexColor
  inlineName?: string
  showFields?: ('hex' | 'rgb' | 'cmyk' | 'pantone' | 'usage')[]
}

export interface ColorPairingBlock extends BaseBlock {
  kind: 'colorPairing'
  pairings?: { fg: BlockBgRef; bg: BlockBgRef; label?: string }[]
}

export interface TintScaleBlock extends BaseBlock {
  kind: 'tintScale'
  paletteName?: string
  stops?: number[]
  mode?: 'opacity' | 'tint'
}

export interface LogoSpecimenBlock extends BaseBlock {
  kind: 'logoSpecimen'
  logoAssetId?: string
  bg?: BlockBgRef
  showClearspace?: boolean
  height?: number
}

export interface LogoGridBlock extends BaseBlock {
  kind: 'logoGrid'
  /** Variant filter; if absent, show all available */
  variants?: string[]
  bgs?: BlockBgRef[]
}

export interface LogoClearspaceBlock extends BaseBlock {
  kind: 'logoClearspace'
  logoAssetId?: string
  /** Clear-space multiplier (logo height units); default 1.0 */
  clearspaceX?: number
}

export interface LogoMisuseBlock extends BaseBlock {
  kind: 'logoMisuse'
  items: { imageAssetId?: string; label: string }[]
  columns?: 2 | 3 | 4
}

export interface LogoPlacementBlock extends BaseBlock {
  kind: 'logoPlacement'
  positions?: ('tl' | 'tr' | 'bl' | 'br' | 'c')[]
}

export interface TypeSpecimenBlock extends BaseBlock {
  kind: 'typeSpecimen'
  role: TypographyRole | string
  sampleText?: string
  sizePx?: number
}

export interface TypeScaleBlock extends BaseBlock {
  kind: 'typeScale'
  /** Rows; if absent, derived from tokens.typography */
  rows?: { label: string; px: number; leading: number; tracking: number }[]
}

export interface CharacterSetBlock extends BaseBlock {
  kind: 'characterSet'
  role: TypographyRole | string
  set?: 'upper' | 'lower' | 'numerals' | 'all'
}

export interface ImageBlock extends BaseBlock {
  kind: 'image'
  assetId?: string
  url?: string
  caption?: string
  fit?: 'cover' | 'contain'
  aspect?: '1:1' | '4:3' | '16:9' | '3:4' | '9:16' | 'auto'
}

export interface ImageGridBlock extends BaseBlock {
  kind: 'imageGrid'
  assetIds: string[]
  columns?: 2 | 3 | 4
  aspect?: '1:1' | '4:3' | '16:9' | '3:4' | 'auto'
}

export interface DoDontGridBlock extends BaseBlock {
  kind: 'doDontGrid'
  items: { assetId?: string; caption: string; kind: 'do' | 'dont' }[]
  columns?: 2 | 3 | 4
}

export interface ToneChipsBlock extends BaseBlock {
  kind: 'toneChips'
  chips?: string[]
}

export interface VocabularyBlock extends BaseBlock {
  kind: 'vocabulary'
  preferred?: string[]
  avoid?: string[]
}

export interface CopyExamplesBlock extends BaseBlock {
  kind: 'copyExamples'
  pairs: { before: string; after: string }[]
}

export interface PatternGridBlock extends BaseBlock {
  kind: 'patternGrid'
  assetIds?: string[]
}

export interface DownloadsBlock extends BaseBlock {
  kind: 'downloads'
  items?: { label: string; assetId?: string; url?: string; format?: string }[]
}

export interface EmbedBlock extends BaseBlock {
  kind: 'embed'
  html: string
  height?: number
}

/**
 * Auto-aggregating gallery of brand assets by kind. Designer adds it once
 * on (e.g.) the Photography page; every push from Figma into that kind
 * shows up here without manual wiring.
 */
export interface MediaLibraryBlock extends BaseBlock {
  kind: 'mediaLibrary'
  filter: 'logo' | 'photo' | 'pattern' | 'icon' | 'all'
  columns?: 2 | 3 | 4 | 5
  aspect?: '1:1' | '4:3' | '16:9' | 'auto'
  showLabels?: boolean
}

export type Block =
  | HeroBlock
  | SectionBlock
  | TextBlock
  | HeadingBlock
  | DividerBlock
  | SpacerBlock
  | CalloutBlock
  | RelatedLinksBlock
  | TableBlock
  | PaletteBlock
  | ColorCardBlock
  | ColorPairingBlock
  | TintScaleBlock
  | LogoSpecimenBlock
  | LogoGridBlock
  | LogoClearspaceBlock
  | LogoMisuseBlock
  | LogoPlacementBlock
  | TypeSpecimenBlock
  | TypeScaleBlock
  | CharacterSetBlock
  | ImageBlock
  | ImageGridBlock
  | DoDontGridBlock
  | ToneChipsBlock
  | VocabularyBlock
  | CopyExamplesBlock
  | PatternGridBlock
  | DownloadsBlock
  | MediaLibraryBlock
  | EmbedBlock

export interface BrandPage {
  id: string
  parentId: string | null
  slug: string
  title: string
  subtitle?: string
  icon?: string
  blocks: Block[]
  order: number
  hidden?: boolean
  isAuto?: boolean
  createdAt: string
  updatedAt: string
}

export interface BrandBook {
  brandSlug: string
  pages: BrandPage[]
  versionNumber: number
  updatedAt: string
}

/**
 * Resolves the full URL path of a page (parent/child) given the full page
 * list. Pages always render below /b/<brand>/guidelines/<full-path>.
 */
export function pageFullPath(page: BrandPage, allPages: BrandPage[]): string {
  if (!page.parentId) return page.slug
  const parent = allPages.find((p) => p.id === page.parentId)
  return parent ? `${parent.slug}/${page.slug}` : page.slug
}
