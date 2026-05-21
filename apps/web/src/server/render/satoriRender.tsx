import 'server-only'
import * as React from 'react'
import satori from 'satori'
import type {
  BrandTokens,
  Format,
  FrameNode,
  ImageNode,
  LayoutNode,
  LogoNode,
  ShapeNode,
  SlotValues,
  TextNode,
} from '@framework/types'

interface RenderArgs {
  layout: LayoutNode
  tokens: BrandTokens
  slotValues: SlotValues
  format: Format
  baseSize?: number
  fonts: SatoriFont[]
  imageResolver: (r2Key: string) => string
}

export interface SatoriFont {
  name: string
  data: ArrayBuffer
  weight: number
  style: 'normal' | 'italic'
}

interface Dims {
  width: number
  height: number
}

const FORMAT_BASE = 1080
const DEFAULT_FONT_FAMILY = 'Inter'

function dimsFor(format: Format, base = FORMAT_BASE): Dims {
  const [w, h] = format.split(':').map(Number) as [number, number]
  if (!w || !h || w === h) return { width: base, height: base }
  if (w > h) return { width: base, height: Math.round((base * h) / w) }
  return { width: Math.round((base * w) / h), height: base }
}

/**
 * Server-side render path for PNG/SVG export.
 *
 * Satori only understands flexbox + a small subset of CSS. We walk the
 * shared LayoutNode shape into React elements built with createElement
 * so Satori's element-shape checks pass (`$$typeof`, `key`, etc).
 */
export async function renderTemplateToSvg(args: RenderArgs): Promise<string> {
  const dims = dimsFor(args.format, args.baseSize ?? FORMAT_BASE)
  const root = React.createElement(
    'div',
    {
      style: {
        width: dims.width,
        height: dims.height,
        display: 'flex',
        flexDirection: 'column',
        background: args.tokens.colors.semantic?.bg ?? '#ffffff',
        position: 'relative',
        fontFamily: DEFAULT_FONT_FAMILY,
      },
    },
    walk(args.layout, args),
  )
  try {
    return await satori(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      root as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { width: dims.width, height: dims.height, fonts: args.fonts as any },
    )
  } catch (err) {
    console.warn('[satori] render failed, returning placeholder', err)
    return placeholderSvg(dims, args.tokens.colors.semantic?.bg ?? '#0a0a0a')
  }
}

function placeholderSvg(dims: Dims, bg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dims.width} ${dims.height}" width="${dims.width}" height="${dims.height}"><rect width="100%" height="100%" fill="${bg}"/></svg>`
}

function walk(node: LayoutNode, args: RenderArgs): React.ReactElement | null {
  switch (node.type) {
    case 'frame':
      return frameEl(node, args)
    case 'text':
      return textEl(node, args)
    case 'image':
      return imageEl(node, args)
    case 'shape':
      return shapeEl(node, args)
    case 'logo':
      return logoEl(node, args)
  }
}

function frameEl(node: FrameNode, args: RenderArgs): React.ReactElement {
  const padding = normalizePadding(node.layout.padding)
  const flexStyle: React.CSSProperties =
    node.layout.mode === 'absolute'
      ? { position: 'relative' }
      : {
          display: 'flex',
          flexDirection: node.layout.mode === 'horizontal' ? 'row' : 'column',
          gap: node.layout.gap ?? 0,
          alignItems: alignToFlex(node.layout.align),
          justifyContent: justifyToFlex(node.layout.justify),
        }

  const children = node.children
    .map((c) => walk(c, args))
    .filter((c): c is React.ReactElement => c !== null)
    .map((el, i) => React.cloneElement(el, { key: `${node.id}-${i}` }))

  const style: Record<string, unknown> = stripUndefined({
    ...resolveBoxStyle(node.style, args.tokens, args.slotValues),
    ...flexStyle,
    paddingTop: padding[0],
    paddingRight: padding[1],
    paddingBottom: padding[2],
    paddingLeft: padding[3],
    width: node.style?.width ?? '100%',
    height: node.style?.height ?? '100%',
  })

  return React.createElement('div', { key: node.id, style }, ...children)
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k]
  }
  return out
}

function textEl(node: TextNode, args: RenderArgs): React.ReactElement {
  const slot = node.slotKey ? args.slotValues[node.slotKey] : undefined
  const text = (slot?.type === 'text' ? slot.value : node.defaultText) ?? ''
  const styleEntry = node.style.tokenRef ? args.tokens.typography[node.style.tokenRef] : undefined
  const fontSize = node.style.fontSize ?? styleEntry?.scale[0] ?? 16
  const fontWeight = node.style.fontWeight ?? styleEntry?.defaultWeight ?? 400
  const lineHeight = node.style.lineHeight ?? styleEntry?.lineHeight ?? 1.2
  const color =
    resolveColor(node.style.color, args.tokens, args.slotValues) ??
    args.tokens.colors.semantic?.fg ??
    '#000000'

  // Satori chokes on `undefined` CSS values (it calls `.trim()` while
  // parsing). Build the style object with only defined props.
  const style: Record<string, unknown> = {
    fontFamily: styleEntry?.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing: node.style.letterSpacing ?? styleEntry?.letterSpacing ?? 0,
    color,
    display: 'flex',
  }
  if (node.style.align) style.textAlign = node.style.align
  if (node.style.textTransform) style.textTransform = node.style.textTransform
  if (node.style.fontStyle) style.fontStyle = node.style.fontStyle

  return React.createElement('div', { key: node.id, style }, text)
}

function imageEl(node: ImageNode, args: RenderArgs): React.ReactElement {
  const slot = node.slotKey ? args.slotValues[node.slotKey] : undefined
  const r2Key = slot?.type === 'image' ? (slot.treatedR2Key ?? slot.r2Key) : node.defaultR2Key
  if (!r2Key) {
    return React.createElement('div', {
      key: node.id,
      style: {
        ...resolveBoxStyle(node.style, args.tokens),
        background: '#0001',
      },
    })
  }
  return React.createElement('img', {
    key: node.id,
    src: args.imageResolver(r2Key),
    width: node.style.width,
    height: node.style.height,
    style: {
      ...resolveBoxStyle(node.style, args.tokens),
      objectFit: node.style.fit ?? 'cover',
      borderRadius: node.style.radius ?? node.style.borderRadius,
    },
  })
}

function shapeEl(node: ShapeNode, args: RenderArgs): React.ReactElement {
  const radius = node.shape === 'circle' ? '9999px' : node.style.borderRadius
  return React.createElement('div', {
    key: node.id,
    style: {
      ...resolveBoxStyle(node.style, args.tokens),
      borderRadius: radius,
    },
  })
}

function logoEl(node: LogoNode, args: RenderArgs): React.ReactElement | null {
  const logo = args.tokens.logos.find((l) => l.variant === node.logoVariant) ?? args.tokens.logos[0]
  if (!logo) return null
  return React.createElement('img', {
    key: node.id,
    src: args.imageResolver(logo.r2Key),
    width: node.style?.width,
    height: node.style?.height,
    style: { objectFit: 'contain' },
  })
}

function resolveColor(
  ref: string | undefined,
  tokens: BrandTokens,
  slotValues?: SlotValues,
): string | undefined {
  if (!ref) return undefined
  if (ref.startsWith('#')) return ref
  if (ref.startsWith('slot:') && slotValues) {
    const v = slotValues[ref.slice(5)]
    if (v?.type === 'color') return v.hex
    return undefined
  }
  if (!ref.startsWith('colors.')) return ref
  const [first, second] = ref.split('.').slice(1)
  if (first === 'primary') return tokens.colors.primary
  if (first === 'semantic' && second) return tokens.colors.semantic?.[second]
  if (first === 'palette' && second) return tokens.colors.palette.find((p) => p.name === second)?.hex
  return undefined
}

function resolveBoxStyle(
  style: FrameNode['style'] | undefined,
  tokens: BrandTokens,
  slotValues?: SlotValues,
): React.CSSProperties {
  if (!style) return {}
  const out: React.CSSProperties = {}
  if (style.width !== undefined) out.width = style.width
  if (style.height !== undefined) out.height = style.height
  if (style.background) {
    const bg = resolveColor(style.background as string, tokens, slotValues)
    if (bg) out.background = bg
  }
  if (style.borderRadius !== undefined) out.borderRadius = style.borderRadius
  if (style.opacity !== undefined) out.opacity = style.opacity
  return out
}

function alignToFlex(a: FrameNode['layout']['align']): React.CSSProperties['alignItems'] {
  switch (a) {
    case 'center':
      return 'center'
    case 'end':
      return 'flex-end'
    case 'stretch':
      return 'stretch'
    case 'baseline':
      return 'baseline'
    default:
      return 'flex-start'
  }
}

function justifyToFlex(a: FrameNode['layout']['justify']): React.CSSProperties['justifyContent'] {
  switch (a) {
    case 'center':
      return 'center'
    case 'end':
      return 'flex-end'
    case 'space-between':
      return 'space-between'
    case 'space-around':
      return 'space-around'
    case 'space-evenly':
      return 'space-evenly'
    default:
      return 'flex-start'
  }
}

function normalizePadding(p: FrameNode['layout']['padding']): [number, number, number, number] {
  if (p === undefined) return [0, 0, 0, 0]
  if (typeof p === 'number') return [p, p, p, p]
  return p
}
