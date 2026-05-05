import 'server-only'
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

function dimsFor(format: Format, base = FORMAT_BASE): Dims {
  const [w, h] = format.split(':').map(Number) as [number, number]
  if (!w || !h || w === h) return { width: base, height: base }
  if (w > h) return { width: base, height: Math.round((base * h) / w) }
  return { width: Math.round((base * w) / h), height: base }
}

/**
 * Server-side render path for PNG/SVG export.
 *
 * Satori only understands flexbox + a small subset of CSS, and it can't run
 * arbitrary React components. We therefore can't reuse <TemplateRenderer>
 * directly — it relies on raw `<div>` style props that Satori does support,
 * but also on `<img>` elements which Satori needs as data URLs or fetched
 * URLs. So we walk the same `LayoutNode` shape into a Satori-friendly tree.
 */
export async function renderTemplateToSvg(args: RenderArgs): Promise<string> {
  const dims = dimsFor(args.format, args.baseSize ?? FORMAT_BASE)
  const tree = walk(args.layout, args)
  return await satori(
    {
      type: 'div',
      props: {
        style: {
          width: dims.width,
          height: dims.height,
          display: 'flex',
          flexDirection: 'column',
          background: args.tokens.colors.semantic?.bg ?? '#ffffff',
          position: 'relative',
        },
        children: tree,
      },
    },
    {
      width: dims.width,
      height: dims.height,
      fonts: args.fonts,
    },
  )
}

interface SatoriEl {
  type: string
  props: Record<string, unknown> & { children?: unknown }
}

function walk(node: LayoutNode, args: RenderArgs): SatoriEl | null {
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

function frameEl(node: FrameNode, args: RenderArgs): SatoriEl {
  const padding = normalizePadding(node.layout.padding)
  const flexStyle: Record<string, unknown> =
    node.layout.mode === 'absolute'
      ? { position: 'relative' }
      : {
          display: 'flex',
          flexDirection: node.layout.mode === 'horizontal' ? 'row' : 'column',
          gap: node.layout.gap ?? 0,
          alignItems: alignToFlex(node.layout.align),
          justifyContent: justifyToFlex(node.layout.justify),
        }

  return {
    type: 'div',
    props: {
      style: {
        ...resolveBoxStyle(node.style, args.tokens),
        ...flexStyle,
        paddingTop: padding[0],
        paddingRight: padding[1],
        paddingBottom: padding[2],
        paddingLeft: padding[3],
        width: node.style?.width ?? '100%',
        height: node.style?.height ?? '100%',
      },
      children: node.children
        .map((c) => walk(c, args))
        .filter((c): c is SatoriEl => c !== null),
    },
  }
}

function textEl(node: TextNode, args: RenderArgs): SatoriEl {
  const slot = node.slotKey ? args.slotValues[node.slotKey] : undefined
  const text = slot?.type === 'text' ? slot.value : (node.defaultText ?? '')
  const styleEntry = node.style.tokenRef ? args.tokens.typography[node.style.tokenRef] : undefined
  const fontSize = node.style.fontSize ?? styleEntry?.scale[0] ?? 16
  const fontWeight = node.style.fontWeight ?? styleEntry?.defaultWeight ?? 400
  const lineHeight = node.style.lineHeight ?? styleEntry?.lineHeight ?? 1.2
  const color = resolveColor(node.style.color, args.tokens) ?? args.tokens.colors.semantic?.fg ?? '#000000'

  return {
    type: 'div',
    props: {
      style: {
        fontFamily: styleEntry?.fontFamily ?? 'Inter',
        fontSize,
        fontWeight,
        lineHeight,
        letterSpacing: node.style.letterSpacing ?? styleEntry?.letterSpacing ?? 0,
        color,
        textAlign: node.style.align,
        textTransform: node.style.textTransform,
        fontStyle: node.style.fontStyle,
        display: 'flex',
      },
      children: text,
    },
  }
}

function imageEl(node: ImageNode, args: RenderArgs): SatoriEl {
  const slot = node.slotKey ? args.slotValues[node.slotKey] : undefined
  const r2Key = slot?.type === 'image' ? (slot.treatedR2Key ?? slot.r2Key) : node.defaultR2Key
  if (!r2Key) {
    return {
      type: 'div',
      props: {
        style: {
          ...resolveBoxStyle(node.style, args.tokens),
          background: '#0001',
        },
      },
    }
  }
  return {
    type: 'img',
    props: {
      src: args.imageResolver(r2Key),
      width: node.style.width,
      height: node.style.height,
      style: {
        ...resolveBoxStyle(node.style, args.tokens),
        objectFit: node.style.fit ?? 'cover',
        borderRadius: node.style.radius ?? node.style.borderRadius,
      },
    },
  }
}

function shapeEl(node: ShapeNode, args: RenderArgs): SatoriEl {
  const radius =
    node.shape === 'circle' ? '9999px' : node.style.borderRadius
  return {
    type: 'div',
    props: {
      style: {
        ...resolveBoxStyle(node.style, args.tokens),
        borderRadius: radius,
      },
    },
  }
}

function logoEl(node: LogoNode, args: RenderArgs): SatoriEl | null {
  const logo = args.tokens.logos.find((l) => l.variant === node.logoVariant) ?? args.tokens.logos[0]
  if (!logo) return null
  return {
    type: 'img',
    props: {
      src: args.imageResolver(logo.r2Key),
      width: node.style?.width,
      height: node.style?.height,
      style: { objectFit: 'contain' },
    },
  }
}

function resolveColor(ref: string | undefined, tokens: BrandTokens): string | undefined {
  if (!ref) return undefined
  if (ref.startsWith('#')) return ref
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
): Record<string, unknown> {
  if (!style) return {}
  const out: Record<string, unknown> = {}
  if (style.width !== undefined) out.width = style.width
  if (style.height !== undefined) out.height = style.height
  if (style.background) {
    const bg = resolveColor(style.background as string, tokens)
    if (bg) out.background = bg
  }
  if (style.borderRadius !== undefined) out.borderRadius = style.borderRadius
  if (style.opacity !== undefined) out.opacity = style.opacity
  return out
}

function alignToFlex(a: FrameNode['layout']['align']): string {
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

function justifyToFlex(a: FrameNode['layout']['justify']): string {
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
