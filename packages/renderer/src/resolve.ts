import type {
  BoxStyle,
  BrandTokens,
  CornerRadii,
  Effect,
  Fill,
  Format,
  GradientStop,
  HexColor,
  SlotValues,
  Stroke,
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
 *   - slot reference: 'slot:background' — looks up slotValues[key].hex
 *   - css name fallthrough
 */
export function resolveColor(
  ref: string | undefined,
  tokens: BrandTokens,
  slotValues?: SlotValues,
): string | undefined {
  if (!ref) return undefined
  if (ref.startsWith('#')) return ref
  if (ref.startsWith('slot:') && slotValues) {
    const key = ref.slice(5)
    const v = slotValues[key]
    if (v?.type === 'color') return v.hex
    return undefined
  }
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

export function resolveBoxStyle(
  style: BoxStyle | undefined,
  tokens: BrandTokens,
  slotValues?: SlotValues,
): React.CSSProperties {
  if (!style) return {}
  const out: React.CSSProperties = {}
  if (style.width !== undefined) out.width = style.width
  if (style.height !== undefined) out.height = style.height

  // Background: new `fills` stack takes precedence over legacy `background`.
  if (style.fills && style.fills.length > 0) {
    Object.assign(out, fillsToCss(style.fills, tokens, slotValues))
  } else if (style.background) {
    const bg = resolveColor(style.background, tokens, slotValues)
    if (bg) out.background = bg
  }

  // Corners: per-corner takes precedence
  if (style.cornerRadii) {
    out.borderRadius = cornersToCss(style.cornerRadii)
  } else if (style.borderRadius !== undefined) {
    out.borderRadius = style.borderRadius
  }

  // Strokes
  const boxShadows: string[] = []
  if (style.strokes && style.strokes.length > 0) {
    const borderApplied = applyStrokes(style.strokes, out, boxShadows, tokens, slotValues)
    if (!borderApplied && style.border) {
      const c = resolveColor(style.border.color, tokens, slotValues) ?? style.border.color
      out.border = `${style.border.width}px ${style.border.style ?? 'solid'} ${c}`
    }
  } else if (style.border) {
    const c = resolveColor(style.border.color, tokens, slotValues) ?? style.border.color
    out.border = `${style.border.width}px ${style.border.style ?? 'solid'} ${c}`
  }

  // Effects: shadows stack into box-shadow, blurs into filter / backdrop-filter
  const filters: string[] = []
  const backdropFilters: string[] = []
  if (style.effects && style.effects.length > 0) {
    for (const e of style.effects) {
      if (e.type === 'drop-shadow') {
        boxShadows.push(`${e.x}px ${e.y}px ${e.blur}px ${e.spread}px ${e.color}`)
      } else if (e.type === 'inner-shadow') {
        boxShadows.push(`inset ${e.x}px ${e.y}px ${e.blur}px ${e.spread}px ${e.color}`)
      } else if (e.type === 'layer-blur') {
        filters.push(`blur(${e.radius}px)`)
      } else if (e.type === 'background-blur') {
        backdropFilters.push(`blur(${e.radius}px)`)
      }
    }
  }

  if (boxShadows.length > 0) {
    out.boxShadow = (out.boxShadow ? out.boxShadow + ', ' : '') + boxShadows.join(', ')
  } else if (style.shadow) {
    out.boxShadow = style.shadow
  }
  if (filters.length > 0) out.filter = filters.join(' ')
  if (backdropFilters.length > 0) {
    out.backdropFilter = backdropFilters.join(' ')
    // Safari
    ;(out as React.CSSProperties & { WebkitBackdropFilter?: string }).WebkitBackdropFilter =
      backdropFilters.join(' ')
  }

  if (style.opacity !== undefined) out.opacity = style.opacity

  // Compose transform: translate (designer drag offset) + rotate.
  const transforms: string[] = []
  if (style.offset && (style.offset.x !== 0 || style.offset.y !== 0)) {
    transforms.push(`translate(${style.offset.x}px, ${style.offset.y}px)`)
  }
  if (style.rotation !== undefined && style.rotation !== 0) {
    transforms.push(`rotate(${style.rotation}deg)`)
  }
  if (transforms.length > 0) out.transform = transforms.join(' ')

  if (style.position) {
    out.position = 'absolute'
    out.left = style.position.x
    out.top = style.position.y
  }
  return out
}

function fillsToCss(
  fills: Fill[],
  tokens: BrandTokens,
  slotValues?: SlotValues,
): React.CSSProperties {
  // Figma renders fills bottom→top. CSS background shorthand stacks
  // top→bottom, so reverse. Solid colors become degenerate gradients so they
  // can layer below image/gradient fills above them.
  const layers: string[] = []
  let solidBase: string | undefined

  for (const fill of fills) {
    if (fill.type === 'solid') {
      const c = resolveColor(fill.color, tokens, slotValues) ?? fill.color
      // The bottom-most opaque solid becomes background-color; further
      // solids stack as degenerate gradients so semi-transparent layering
      // works.
      if (solidBase === undefined) solidBase = c
      else layers.push(`linear-gradient(${c}, ${c})`)
    } else if (fill.type === 'linear-gradient') {
      layers.push(`linear-gradient(${fill.angle}deg, ${stopsToCss(fill.stops, tokens, slotValues)})`)
    } else if (fill.type === 'radial-gradient') {
      layers.push(`radial-gradient(circle, ${stopsToCss(fill.stops, tokens, slotValues)})`)
    } else if (fill.type === 'image') {
      // Without a hosted URL we can't render the image; emit a hint via a
      // subtle striped placeholder so the designer sees something.
      // The renderer that owns ImageNode/ImageResolver is the right place
      // for fully-resolved image fills.
      layers.push(
        `repeating-linear-gradient(45deg, rgba(0,0,0,.04) 0 8px, rgba(0,0,0,.08) 8px 16px)`,
      )
    }
  }

  // Reverse so the first declared fill ends up on top — matches Figma's
  // visual order if the extractor preserved index order bottom→top (which
  // it does).
  const out: React.CSSProperties = {}
  if (layers.length > 0) {
    out.backgroundImage = layers.reverse().join(', ')
  }
  if (solidBase !== undefined) out.backgroundColor = solidBase
  return out
}

function stopsToCss(
  stops: GradientStop[],
  tokens: BrandTokens,
  slotValues?: SlotValues,
): string {
  return stops
    .map((s) => `${resolveColor(s.color, tokens, slotValues) ?? s.color} ${Math.round(s.position * 100)}%`)
    .join(', ')
}

function cornersToCss(r: CornerRadii): string {
  return `${r.tl}px ${r.tr}px ${r.br}px ${r.bl}px`
}

/**
 * Apply strokes. CSS `border` is single-color/width and renders inside the
 * box (eats into content area). Figma supports inside/center/outside:
 *   - inside / center → emit CSS border (inside; visually close to center)
 *   - outside         → emit an inset-free box-shadow ring (no layout shift)
 *
 * Returns true if any stroke was applied via `border:` (so the caller knows
 * not to apply a legacy border too).
 */
function applyStrokes(
  strokes: Stroke[],
  out: React.CSSProperties,
  boxShadows: string[],
  tokens: BrandTokens,
  slotValues?: SlotValues,
): boolean {
  let appliedBorder = false
  for (const s of strokes) {
    const color = resolveColor(s.color, tokens, slotValues) ?? s.color
    if (s.position === 'outside') {
      boxShadows.push(`0 0 0 ${s.weight}px ${color}`)
    } else {
      if (!appliedBorder) {
        out.border = `${s.weight}px ${s.style ?? 'solid'} ${color}`
        // Box-sizing border-box is the document default we set in the
        // renderer root, so the border doesn't change layout for inside/center.
        out.boxSizing = 'border-box'
        appliedBorder = true
      } else {
        // Multiple strokes are rare; stack additional ones as outside rings.
        boxShadows.push(`0 0 0 ${s.weight}px ${color}`)
      }
    }
  }
  return appliedBorder
}

/** Pick a hex from the brand palette by name; fall back to primary. */
export function paletteHex(tokens: BrandTokens, name: string | undefined): HexColor {
  if (name) {
    const found = tokens.colors.palette.find((p) => p.name === name)
    if (found) return found.hex
  }
  return tokens.colors.primary
}
