import type {
  Format,
  FrameNode as FwFrameNode,
  ImageNode as FwImageNode,
  LayoutNode,
  ShapeNode as FwShapeNode,
  SlotDefinition,
  SlotSchema,
  TextNode as FwTextNode,
} from '@framework/types'
import type { ExtractTemplateResult } from '../types'
import { rgbToHex, slugify } from '../util'

/**
 * Compile selected Figma frames into a Framework template.
 *
 * Conventions (BRIEF §10.4 / Concept Scene 1):
 *   - One selection containing one or more sibling frames named `<base>/<format>`
 *     where format is e.g. `1:1`, `9:16`, `16:9`. We emit the first format's
 *     layout as the canonical schema and record the available formats.
 *   - Layer name prefix `lock/` → not editable (no slotKey emitted)
 *   - Layer name prefix `slot/<key>` → emits a slot with that key; falls back
 *     to slug(name) if no explicit key
 *   - Layer name prefix `logo/<variant>` → LogoNode
 *
 * No Figma access tokens are required at runtime — the plugin runs inside
 * Figma already.
 */
export async function extractTemplate(name: string): Promise<ExtractTemplateResult> {
  const warnings: string[] = []
  const selection = figma.currentPage.selection.filter(
    (n): n is FrameNode | ComponentNode =>
      n.type === 'FRAME' || n.type === 'COMPONENT',
  )
  if (selection.length === 0) {
    throw new Error('Select at least one frame to push as a template.')
  }

  const formats: Format[] = []
  for (const node of selection) {
    const f = parseFormat(node.name)
    if (f) formats.push(f)
  }
  if (formats.length === 0) {
    warnings.push('No format suffix in frame names — defaulting to 1:1.')
    formats.push('1:1')
  }

  const canonical = selection[0]!
  const slotMap = new Map<string, SlotDefinition>()
  const layout = walkNode(canonical, slotMap, warnings)

  return {
    name: name || canonical.name.split('/')[0]!,
    slug: slugify(name || canonical.name.split('/')[0]!),
    figmaFileKey: figma.fileKey ?? 'unknown',
    figmaNodeId: canonical.id,
    formats: dedupeFormats(formats),
    layoutSchema: layout,
    slotSchema: Array.from(slotMap.values()) as SlotSchema,
    warnings,
  }
}

function dedupeFormats(formats: Format[]): Format[] {
  return Array.from(new Set(formats))
}

function parseFormat(name: string): Format | null {
  const m = name.match(/(\d+:\d+)$/)
  if (!m) return null
  const v = m[1] as Format
  return v
}

function walkNode(node: SceneNode, slots: Map<string, SlotDefinition>, warnings: string[]): LayoutNode {
  if (node.type === 'TEXT') return walkText(node, slots)
  if (isImageNode(node)) return walkImage(node, slots)
  if (/^logo[/-]/i.test(node.name)) return walkLogo(node)
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'GROUP')
    return walkFrame(node as FrameNode | ComponentNode | InstanceNode | GroupNode, slots, warnings)
  return walkShape(node)
}

function walkFrame(
  node: FrameNode | ComponentNode | InstanceNode | GroupNode,
  slots: Map<string, SlotDefinition>,
  warnings: string[],
): FwFrameNode {
  const auto = 'layoutMode' in node ? node.layoutMode : 'NONE'
  const mode: FwFrameNode['layout']['mode'] =
    auto === 'HORIZONTAL' ? 'horizontal' : auto === 'VERTICAL' ? 'vertical' : 'absolute'

  const padding =
    'paddingTop' in node
      ? ([node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft] as [
          number,
          number,
          number,
          number,
        ])
      : undefined
  const gap = 'itemSpacing' in node ? node.itemSpacing : undefined

  return {
    type: 'frame',
    id: node.id,
    layout: {
      mode,
      gap,
      padding,
      align: alignFromFigma('counterAxisAlignItems' in node ? node.counterAxisAlignItems : undefined),
      justify: justifyFromFigma('primaryAxisAlignItems' in node ? node.primaryAxisAlignItems : undefined),
    },
    style: {
      width: node.width,
      height: node.height,
      background: bgFromFigma(node),
      borderRadius: 'cornerRadius' in node && typeof node.cornerRadius === 'number' ? node.cornerRadius : undefined,
    },
    children: node.children.map((c) => walkNode(c, slots, warnings)),
  }
}

function walkText(node: TextNode, slots: Map<string, SlotDefinition>): FwTextNode {
  const slotKey = parseSlotKey(node.name)
  if (slotKey) {
    if (!slots.has(slotKey)) {
      slots.set(slotKey, {
        type: 'text',
        key: slotKey,
        label: humanize(slotKey),
        constraints: { maxChars: estimateMaxChars(node), required: false },
        default: typeof node.characters === 'string' ? node.characters : undefined,
      })
    }
  }
  const fill = solidFill(node.fills as readonly Paint[])
  return {
    type: 'text',
    id: node.id,
    slotKey,
    defaultText: node.characters,
    style: {
      tokenRef: roleFromTextNode(node),
      fontSize: typeof node.fontSize === 'number' ? node.fontSize : undefined,
      fontWeight: fontWeightFromName(node.fontName),
      letterSpacing: ls(node.letterSpacing),
      lineHeight: lh(node.lineHeight),
      color: fill,
      align: textAlignFromFigma(node.textAlignHorizontal),
    },
    constraints: {
      maxChars: estimateMaxChars(node),
      autoShrink: node.textAutoResize === 'NONE',
    },
  }
}

function walkImage(node: SceneNode & { fills?: readonly Paint[] }, slots: Map<string, SlotDefinition>): FwImageNode {
  const slotKey = parseSlotKey(node.name)
  if (slotKey && !slots.has(slotKey)) {
    slots.set(slotKey, {
      type: 'image',
      key: slotKey,
      label: humanize(slotKey),
      constraints: {
        aspectRatio: node.width && node.height ? node.width / node.height : undefined,
      },
    })
  }
  return {
    type: 'image',
    id: node.id,
    slotKey,
    style: {
      width: node.width,
      height: node.height,
      fit: 'cover',
      borderRadius:
        'cornerRadius' in node && typeof node.cornerRadius === 'number' ? node.cornerRadius : undefined,
    },
  }
}

function walkLogo(node: SceneNode): LayoutNode {
  const variant = (node.name.split(/[/-]/)[1] ?? 'primary') as
    | 'primary'
    | 'wordmark'
    | 'symbol'
    | 'monochrome'
    | 'inverted'
  return {
    type: 'logo',
    id: node.id,
    logoVariant: variant,
    style: { width: node.width, height: node.height },
  }
}

function walkShape(node: SceneNode): FwShapeNode {
  const isCircle = node.type === 'ELLIPSE'
  return {
    type: 'shape',
    id: node.id,
    shape: isCircle ? 'circle' : 'rect',
    style: {
      width: node.width,
      height: node.height,
      background: 'fills' in node ? solidFill(node.fills as readonly Paint[]) : undefined,
      borderRadius:
        'cornerRadius' in node && typeof node.cornerRadius === 'number' ? node.cornerRadius : undefined,
    },
  }
}

function isImageNode(node: SceneNode): node is SceneNode & { fills?: readonly Paint[] } {
  if (!('fills' in node)) return false
  const fills = node.fills as readonly Paint[]
  return fills.some((f) => f.type === 'IMAGE')
}

function solidFill(fills: readonly Paint[]): string | undefined {
  for (const f of fills) {
    if (f.type === 'SOLID') return rgbToHex(f.color, f.opacity ?? 1)
  }
  return undefined
}

function bgFromFigma(node: SceneNode): string | undefined {
  const bg = ('backgrounds' in node ? node.backgrounds : undefined) ??
    ('fills' in node ? node.fills : undefined)
  if (!bg || typeof bg === 'symbol') return undefined
  return solidFill(bg as readonly Paint[])
}

function parseSlotKey(name: string): string | undefined {
  const lock = /^lock[/-]/i.test(name)
  if (lock) return undefined
  const match = name.match(/^slot[/-]([\w-]+)/i)
  if (match) return match[1]
  // Implicit slot for any unprefixed text/image. Use slugified name.
  return undefined
}

function humanize(key: string): string {
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function estimateMaxChars(node: TextNode): number | undefined {
  if (!node.characters) return undefined
  // Soft cap = current length + 50% headroom, rounded up to next 10.
  const cur = node.characters.length
  return Math.ceil((cur * 1.5) / 10) * 10
}

function alignFromFigma(a: string | undefined): FwFrameNode['layout']['align'] {
  switch (a) {
    case 'CENTER':
      return 'center'
    case 'MAX':
      return 'end'
    case 'BASELINE':
      return 'baseline'
    case 'MIN':
    default:
      return 'start'
  }
}

function justifyFromFigma(a: string | undefined): FwFrameNode['layout']['justify'] {
  switch (a) {
    case 'CENTER':
      return 'center'
    case 'MAX':
      return 'end'
    case 'SPACE_BETWEEN':
      return 'space-between'
    case 'MIN':
    default:
      return 'start'
  }
}

function textAlignFromFigma(a: TextNode['textAlignHorizontal']): FwTextNode['style']['align'] {
  switch (a) {
    case 'CENTER':
      return 'center'
    case 'RIGHT':
      return 'right'
    case 'JUSTIFIED':
      return 'justify'
    case 'LEFT':
    default:
      return 'left'
  }
}

function fontWeightFromName(fn: TextNode['fontName']): number | undefined {
  if (typeof fn === 'symbol') return undefined
  const s = fn.style.toLowerCase()
  if (s.includes('thin')) return 100
  if (s.includes('extralight')) return 200
  if (s.includes('light')) return 300
  if (s.includes('regular')) return 400
  if (s.includes('medium')) return 500
  if (s.includes('semibold')) return 600
  if (s.includes('bold')) return 700
  if (s.includes('black')) return 900
  return 400
}

function lh(value: TextNode['lineHeight']): number | undefined {
  if (typeof value === 'symbol') return undefined
  if (value.unit === 'PIXELS') return value.value
  if (value.unit === 'PERCENT') return value.value / 100
  return undefined
}

function ls(value: TextNode['letterSpacing']): number | undefined {
  if (typeof value === 'symbol') return undefined
  if (value.unit === 'PIXELS') return value.value
  if (value.unit === 'PERCENT') return value.value / 100
  return undefined
}

function roleFromTextNode(node: TextNode): string | undefined {
  if (typeof node.textStyleId === 'string' && node.textStyleId) {
    const style = figma.getStyleById(node.textStyleId)
    if (style) {
      return roleForName(style.name)
    }
  }
  return undefined
}

function roleForName(n: string): string {
  const lower = n.toLowerCase()
  if (/(display|hero)/.test(lower)) return 'display'
  if (/(heading|title|h\d)/.test(lower)) return 'heading'
  if (/(caption|small)/.test(lower)) return 'caption'
  if (/(mono|code)/.test(lower)) return 'mono'
  return 'body'
}
