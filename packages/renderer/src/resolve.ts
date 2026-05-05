import type {
  BoxStyle,
  BrandTokens,
  Format,
  HexColor,
  TextStyle,
  TypographyEntry,
} from '@framework/types'

export interface FormatDimensions {
  width: number
  height: number
}

const FORMAT_BASE = 1080

export function formatToDimensions(format: Format, base = FORMAT_BASE): FormatDimensions {
  const [w, h] = format.split(':').map(Number) as [number, number]
  if (!w || !h) return { width: base, height: base }
  if (w === h) return { width: base, height: base }
  if (w > h) return { width: base, height: Math.round((base * h) / w) }
  return { width: Math.round((base * w) / h), height: base }
}

/**
 * Resolve a color reference. Accepts:
 *   - hex: '#FF0033'
 *   - token reference: 'colors.primary' | 'colors.semantic.bg' | 'colors.palette.brand-red'
 *   - css name fallthrough
 */
export function resolveColor(ref: string | undefined, tokens: BrandTokens): string | undefined {
  if (!ref) return undefined
  if (ref.startsWith('#')) return ref
  if (!ref.startsWith('colors.')) return ref

  const path = ref.split('.').slice(1)
  const [first, second] = path

  if (first === 'primary') return tokens.colors.primary
  if (first === 'semantic' && second) {
    return tokens.colors.semantic?.[second]
  }
  if (first === 'palette' && second) {
    const entry = tokens.colors.palette.find((p) => p.name === second)
    return entry?.hex
  }
  return undefined
}

export function resolveTextStyle(
  style: TextStyle,
  tokens: BrandTokens,
): {
  fontFamily?: string
  fontWeight: number
  fontSize: number
  lineHeight: number
  letterSpacing: number
  color: string
  textAlign: TextStyle['align']
  textTransform: TextStyle['textTransform']
  fontStyle: TextStyle['fontStyle']
  WebkitLineClamp?: number
  display?: string
  WebkitBoxOrient?: 'vertical'
  overflow?: 'hidden'
} {
  const tokenEntry: TypographyEntry | undefined = style.tokenRef
    ? tokens.typography[style.tokenRef]
    : undefined

  const fontSize = style.fontSize ?? tokenEntry?.scale[0] ?? 16
  const fontWeight = style.fontWeight ?? tokenEntry?.defaultWeight ?? 400
  const lineHeight = style.lineHeight ?? tokenEntry?.lineHeight ?? 1.2
  const letterSpacing = style.letterSpacing ?? tokenEntry?.letterSpacing ?? 0
  const color = resolveColor(style.color, tokens) ?? tokens.colors.semantic?.fg ?? '#000000'

  const base = {
    fontFamily: tokenEntry?.fontFamily,
    fontWeight,
    fontSize,
    lineHeight,
    letterSpacing,
    color,
    textAlign: style.align,
    textTransform: style.textTransform,
    fontStyle: style.fontStyle,
  }

  if (style.lineClamp && style.lineClamp > 0) {
    return {
      ...base,
      display: '-webkit-box',
      WebkitLineClamp: style.lineClamp,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    }
  }
  return base
}

export function resolveBoxStyle(style: BoxStyle | undefined, tokens: BrandTokens): React.CSSProperties {
  if (!style) return {}
  const out: React.CSSProperties = {}
  if (style.width !== undefined) out.width = style.width
  if (style.height !== undefined) out.height = style.height
  if (style.background) {
    const bg = resolveColor(style.background, tokens)
    if (bg) out.background = bg
  }
  if (style.borderRadius !== undefined) out.borderRadius = style.borderRadius
  if (style.border) {
    const c = resolveColor(style.border.color, tokens) ?? style.border.color
    out.border = `${style.border.width}px ${style.border.style ?? 'solid'} ${c}`
  }
  if (style.shadow) out.boxShadow = style.shadow
  if (style.opacity !== undefined) out.opacity = style.opacity
  if (style.rotation !== undefined) out.transform = `rotate(${style.rotation}deg)`
  if (style.position) {
    out.position = 'absolute'
    out.left = style.position.x
    out.top = style.position.y
  }
  return out
}

/** Pick a hex from the brand palette by name; fall back to primary. */
export function paletteHex(tokens: BrandTokens, name: string | undefined): HexColor {
  if (name) {
    const found = tokens.colors.palette.find((p) => p.name === name)
    if (found) return found.hex
  }
  return tokens.colors.primary
}
