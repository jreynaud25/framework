import type {
  BrandTokens,
  HexColor,
  LogoToken,
  PaletteEntry,
  TypographyEntry,
  TypographyTokens,
} from '@framework/types'
import type { ExtractTokensResult } from '../types'
import { rgbToHex, slugify } from '../util'

/**
 * Walk Figma local color + text styles to produce BrandTokens.
 * Logos are inferred from frames whose names start with "logo/" — by
 * convention BRIEF §5 expects logos to be uploaded and tracked separately,
 * so here we emit token references the backend can later attach R2 keys to.
 */
export async function extractBrandTokens(): Promise<ExtractTokensResult> {
  const warnings: string[] = []

  await figma.loadAllPagesAsync().catch(() => {
    /* documentAccess is dynamic-page, so loadAll is required */
  })

  const palette = await extractPalette(warnings)
  const typography = await extractTypography(warnings)
  const logos = await extractLogos(warnings)

  const primary = palette.find((p) => /primary|brand/i.test(p.usage ?? p.name))?.hex ?? palette[0]?.hex ?? '#000000'

  const tokens: BrandTokens = {
    colors: {
      primary: primary as HexColor,
      palette,
      semantic: deriveSemantic(palette),
    },
    typography,
    spacing: { unit: 8, scale: [4, 8, 16, 24, 32, 48, 64, 96, 128] },
    logos,
  }

  return { tokens, warnings }
}

async function extractPalette(warnings: string[]): Promise<PaletteEntry[]> {
  const styles = await figma.getLocalPaintStylesAsync()
  if (styles.length === 0) {
    warnings.push('No local paint styles found. Define brand colors as paint styles in Figma.')
  }
  const palette: PaletteEntry[] = []
  for (const style of styles) {
    const paint = style.paints[0]
    if (!paint || paint.type !== 'SOLID') continue
    const hex = rgbToHex(paint.color, paint.opacity ?? 1) as HexColor
    palette.push({ name: slugify(style.name), hex, usage: deriveUsage(style.name) })
  }
  return palette
}

async function extractTypography(warnings: string[]): Promise<TypographyTokens> {
  const styles = await figma.getLocalTextStylesAsync()
  if (styles.length === 0) {
    warnings.push('No local text styles found. Define heading/body/etc. as text styles in Figma.')
  }
  const grouped: Record<string, TextStyle[]> = {}
  for (const style of styles) {
    const role = roleForTextStyle(style.name)
    if (!grouped[role]) grouped[role] = []
    grouped[role].push(style)
  }

  const typography: TypographyTokens = {} as TypographyTokens
  for (const [role, list] of Object.entries(grouped)) {
    const sizes = list.map((s) => s.fontSize).sort((a, b) => b - a)
    const weights = uniq(list.map((s) => fontWeight(s.fontName)))
    const family = list[0]?.fontName.family ?? 'Inter'
    const lineHeight = lineHeightToNumber(list[0]?.lineHeight) ?? 1.2
    const letterSpacing = letterSpacingToPx(list[0]?.letterSpacing)
    const entry: TypographyEntry = {
      fontFamily: family,
      fontTokenKey: role,
      weights,
      defaultWeight: weights.includes(400) ? 400 : (weights[0] ?? 400),
      scale: sizes,
      lineHeight,
      letterSpacing,
    }
    typography[role] = entry
  }

  if (Object.keys(typography).length === 0) {
    typography.body = {
      fontFamily: 'Inter',
      fontTokenKey: 'body',
      weights: [400],
      defaultWeight: 400,
      scale: [16],
      lineHeight: 1.5,
    }
  }

  return typography
}

async function extractLogos(warnings: string[]): Promise<LogoToken[]> {
  const logos: LogoToken[] = []
  for (const page of figma.root.children) {
    await page.loadAsync()
    for (const node of page.children) {
      if (node.type !== 'FRAME' && node.type !== 'COMPONENT') continue
      if (!/^logo[/-]/i.test(node.name)) continue
      const variant = parseLogoVariant(node.name)
      logos.push({
        name: node.name,
        variant,
        // R2 key assigned by the backend after upload of an exported PNG/SVG.
        r2Key: `pending:${node.id}` as never,
        clearSpaceMultiplier: 0.5,
        minSizePx: 48,
        allowedBackgrounds: ['*'],
      })
    }
  }
  if (logos.length === 0) {
    warnings.push("No frames named 'logo/<variant>' found. Add a 'logo/wordmark' frame.")
  }
  return logos
}

function deriveUsage(name: string): string | undefined {
  const lower = name.toLowerCase()
  if (lower.includes('primary') || lower.includes('brand')) return 'primary'
  if (lower.includes('bg') || lower.includes('background')) return 'background'
  if (lower.includes('fg') || lower.includes('foreground') || lower.includes('text'))
    return 'foreground'
  if (lower.includes('accent')) return 'accent'
  return undefined
}

function deriveSemantic(palette: PaletteEntry[]): {
  bg?: HexColor
  fg?: HexColor
  accent?: HexColor
} {
  return {
    bg: palette.find((p) => p.usage === 'background')?.hex,
    fg: palette.find((p) => p.usage === 'foreground')?.hex,
    accent: palette.find((p) => p.usage === 'accent')?.hex,
  }
}

function roleForTextStyle(name: string): string {
  const lower = name.toLowerCase()
  if (/(display|hero)/.test(lower)) return 'display'
  if (/(heading|title|h\d)/.test(lower)) return 'heading'
  if (/(caption|small|footnote)/.test(lower)) return 'caption'
  if (/(mono|code)/.test(lower)) return 'mono'
  if (/(label|tag|kicker)/.test(lower)) return 'label'
  return 'body'
}

function fontWeight(name: FontName): number {
  const s = name.style.toLowerCase()
  if (s.includes('thin')) return 100
  if (s.includes('extralight') || s.includes('ultralight')) return 200
  if (s.includes('light')) return 300
  if (s.includes('regular') || s === 'normal') return 400
  if (s.includes('medium')) return 500
  if (s.includes('semibold') || s.includes('demibold')) return 600
  if (s.includes('bold')) return 700
  if (s.includes('extrabold') || s.includes('ultrabold')) return 800
  if (s.includes('black') || s.includes('heavy')) return 900
  return 400
}

function lineHeightToNumber(lh: TextStyle['lineHeight'] | undefined): number | undefined {
  if (!lh) return undefined
  if (lh.unit === 'PERCENT') return lh.value / 100
  if (lh.unit === 'PIXELS') return lh.value
  return undefined
}

function letterSpacingToPx(ls: TextStyle['letterSpacing'] | undefined): number | undefined {
  if (!ls) return undefined
  if (ls.unit === 'PIXELS') return ls.value
  if (ls.unit === 'PERCENT') return ls.value / 100
  return undefined
}

function parseLogoVariant(name: string): LogoToken['variant'] {
  const part = name.split(/[/-]/)[1]?.toLowerCase() ?? 'primary'
  if (['primary', 'wordmark', 'symbol', 'monochrome', 'inverted'].includes(part))
    return part as LogoToken['variant']
  return 'primary'
}

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs))
}
