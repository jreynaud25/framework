import type {
  CornerRadii,
  Effect as FwEffect,
  Fill as FwFill,
  Format,
  FrameNode as FwFrameNode,
  GradientStop,
  ImageNode as FwImageNode,
  LayoutNode,
  ShapeNode as FwShapeNode,
  Sizing,
  SlotDefinition,
  SlotSchema,
  Stroke as FwStroke,
  TextNode as FwTextNode,
} from '@framework/types'
import type { ExtractTemplateResult } from '../types'
import { rgbToHex, slugify } from '../util'

interface Sized {
  sizingH?: Sizing
  sizingV?: Sizing
}

/**
 * Compile selected Figma frames into a Framework template.
 *
 * The canonical (first) selected frame becomes the layout schema. Other
 * selected siblings only contribute their format suffix (e.g. `/9:16`) so
 * we know which alternate canvas sizes are available.
 *
 * Conventions (BRIEF §10.4 / Concept Scene 1):
 *   - `lock/` prefix → not editable, no slot emitted
 *   - `slot/<key>` prefix → emits an editable slot under <key>
 *   - `logo/<variant>` prefix → emits a LogoNode tied to a brand logo variant
 *   - Frame name suffix `1:1`, `9:16`, `16:9`, etc. → declared format
 *
 * Visual fidelity: we capture strokes, effects (shadows + blurs), gradient
 * fills, per-corner radii, opacity, rotation, vector paths. The renderer
 * translates these to CSS / SVG.
 */
/**
 * Multi-frame state passed through the walker so slot keys stay consistent
 * across variants — same layer name in two frames → same slot key → edits
 * propagate.
 */
interface WalkerCtx {
  slotMap: Map<string, SlotDefinition>
  /** layerName (lowercased, trimmed) → assigned slotKey. */
  nameToKey: Map<string, string>
  warnings: string[]
  /** If true, emit implicit slots for every text/image (multi-frame mode). */
  implicitSlots: boolean
}

export async function extractTemplate(name: string): Promise<ExtractTemplateResult> {
  const warnings: string[] = []
  const selection = figma.currentPage.selection.filter(
    (n): n is FrameNode | ComponentNode =>
      n.type === 'FRAME' || n.type === 'COMPONENT',
  )
  if (selection.length === 0) {
    throw new Error('Select at least one frame to push as a template.')
  }

  const ctx: WalkerCtx = {
    slotMap: new Map(),
    nameToKey: new Map(),
    warnings,
    implicitSlots: selection.length > 1, // share slots across multi-frame pushes
  }

  const variants: import('../types').TemplateVariant[] = []
  for (const node of selection) {
    const format = parseFormat(node.name) ?? inferFormatFromAspect(node.width, node.height)
    const layout = walkNode(node, ctx)
    variants.push({
      format,
      label: undefined,
      canvas: { width: Math.round(node.width), height: Math.round(node.height) },
      layout,
      figmaNodeId: node.id,
    })
  }

  const canonical = selection[0]!
  const formats = dedupeFormats(variants.map((v) => v.format))

  return {
    name: name || canonical.name.split('/')[0]!,
    slug: slugify(name || canonical.name.split('/')[0]!),
    figmaFileKey: figma.fileKey ?? 'unknown',
    figmaNodeId: canonical.id,
    formats,
    canvas: variants[0]!.canvas,
    layoutSchema: variants[0]!.layout,
    variants,
    slotSchema: Array.from(ctx.slotMap.values()) as SlotSchema,
    warnings,
  }
}

function dedupeFormats(formats: Format[]): Format[] {
  return Array.from(new Set(formats))
}

function parseFormat(name: string): Format | null {
  const m = name.match(/(\d+:\d+)$/)
  if (!m) return null
  return m[1] as Format
}

function inferFormatFromAspect(w: number, h: number): Format {
  if (Math.abs(w - h) < 1) return '1:1'
  if (w > h) {
    if (Math.abs(w / h - 16 / 9) < 0.05) return '16:9'
    if (Math.abs(w / h - 3 / 2) < 0.05) return '3:2'
    return '16:9'
  }
  if (Math.abs(h / w - 16 / 9) < 0.05) return '9:16'
  if (Math.abs(h / w - 4 / 3) < 0.05) return '3:4'
  if (Math.abs(h / w - 5 / 4) < 0.05) return '4:5'
  if (Math.abs(h / w - 3 / 2) < 0.05) return '2:3'
  return '9:16'
}

// ---------- Sizing (HUG / FILL / FIXED) ----------

function readSizing(node: SceneNode): Sized {
  const out: Sized = {}
  if ('layoutSizingHorizontal' in node) {
    const v = (node as { layoutSizingHorizontal?: string }).layoutSizingHorizontal
    if (v === 'HUG') out.sizingH = 'hug'
    else if (v === 'FILL') out.sizingH = 'fill'
    else if (v === 'FIXED') out.sizingH = 'fixed'
  }
  if ('layoutSizingVertical' in node) {
    const v = (node as { layoutSizingVertical?: string }).layoutSizingVertical
    if (v === 'HUG') out.sizingV = 'hug'
    else if (v === 'FILL') out.sizingV = 'fill'
    else if (v === 'FIXED') out.sizingV = 'fixed'
  }
  return out
}

// ---------- Walker ----------

function walkNode(node: SceneNode, ctx: WalkerCtx): LayoutNode {
  if (node.type === 'TEXT') return walkText(node, ctx)
  if (/^logo[/-]/i.test(node.name)) return walkLogo(node)
  if (isImageNode(node)) return walkImage(node, ctx)
  if (isVectorish(node)) return walkVector(node)
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'GROUP') {
    return walkFrame(node as FrameNode | ComponentNode | InstanceNode | GroupNode, ctx)
  }
  return walkShape(node)
}

function walkFrame(
  node: FrameNode | ComponentNode | InstanceNode | GroupNode,
  ctx: WalkerCtx,
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
  const sized = readSizing(node)

  const primarySizing =
    'primaryAxisSizingMode' in node
      ? node.primaryAxisSizingMode === 'AUTO'
        ? 'auto'
        : 'fixed'
      : undefined
  const counterSizing =
    'counterAxisSizingMode' in node
      ? node.counterAxisSizingMode === 'AUTO'
        ? 'auto'
        : 'fixed'
      : undefined

  return {
    type: 'frame',
    id: node.id,
    ...sized,
    layout: {
      mode,
      gap,
      padding,
      align: alignFromFigma('counterAxisAlignItems' in node ? node.counterAxisAlignItems : undefined),
      justify: justifyFromFigma('primaryAxisAlignItems' in node ? node.primaryAxisAlignItems : undefined),
      primarySizing,
      counterSizing,
    },
    style: buildBoxStyle(node, { defaultBgFromBackgrounds: true }),
    children: node.children.map((c) => walkNode(c, ctx)),
  }
}

function walkText(node: TextNode, ctx: WalkerCtx): FwTextNode {
  const explicit = parseSlotKey(node.name)
  const slotKey = explicit ?? (ctx.implicitSlots ? unifyKey(node.name, ctx, 'text') : undefined)
  if (slotKey && !ctx.slotMap.has(slotKey)) {
    ctx.slotMap.set(slotKey, {
      type: 'text',
      key: slotKey,
      label: humanize(slotKey),
      constraints: { maxChars: estimateMaxChars(node), required: false },
      default: typeof node.characters === 'string' ? node.characters : undefined,
    })
  }
  const fill = solidFillColor(node.fills as readonly Paint[])
  const sized = readSizing(node)
  return {
    type: 'text',
    id: node.id,
    ...sized,
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
      textTransform: textCaseToTransform(
        'textCase' in node && typeof node.textCase === 'string' ? node.textCase : undefined,
      ),
      fontStyle: node.fontName !== figma.mixed && /italic/i.test(node.fontName.style) ? 'italic' : 'normal',
    },
    constraints: {
      maxChars: estimateMaxChars(node),
      autoShrink: node.textAutoResize === 'NONE',
    },
  }
}

function walkImage(node: SceneNode & { fills?: readonly Paint[] }, ctx: WalkerCtx): FwImageNode {
  const explicit = parseSlotKey(node.name)
  const slotKey = explicit ?? (ctx.implicitSlots ? unifyKey(node.name, ctx, 'image') : undefined)
  if (slotKey && !ctx.slotMap.has(slotKey)) {
    ctx.slotMap.set(slotKey, {
      type: 'image',
      key: slotKey,
      label: humanize(slotKey),
      constraints: {
        aspectRatio: node.width && node.height ? node.width / node.height : undefined,
      },
    })
  }
  const sized = readSizing(node)
  // Capture the image hash so a future R2 upload step can resolve it.
  const imgFill = (node.fills as readonly Paint[] | undefined)?.find((p) => p.type === 'IMAGE')
  return {
    type: 'image',
    id: node.id,
    ...sized,
    slotKey,
    style: {
      ...buildBoxStyle(node, { defaultBgFromBackgrounds: false }),
      width: node.width,
      height: node.height,
      fit: imageFitFromFigma(imgFill?.scaleMode),
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
    ...readSizing(node),
    logoVariant: variant,
    style: { width: node.width, height: node.height },
  }
}

/**
 * Walk an arbitrary vector / boolean / star / polygon → emit a path-shaped
 * ShapeNode with the SVG `d` so the renderer can replay the geometry.
 */
function walkVector(node: SceneNode): FwShapeNode {
  const sized = readSizing(node)
  const paths =
    'fillGeometry' in node && Array.isArray(node.fillGeometry)
      ? (node.fillGeometry as readonly { data: string }[]).map((p) => p.data)
      : 'vectorPaths' in node && Array.isArray((node as unknown as { vectorPaths?: readonly { data: string }[] }).vectorPaths)
        ? ((node as unknown as { vectorPaths: readonly { data: string }[] }).vectorPaths).map((p) => p.data)
        : []
  return {
    type: 'shape',
    id: node.id,
    ...sized,
    shape: 'path',
    d: paths.join(' ') || undefined,
    style: {
      ...buildBoxStyle(node, { defaultBgFromBackgrounds: false }),
      width: node.width,
      height: node.height,
    },
  }
}

function walkShape(node: SceneNode): FwShapeNode {
  const isCircle = node.type === 'ELLIPSE'
  const sized = readSizing(node)
  return {
    type: 'shape',
    id: node.id,
    ...sized,
    shape: isCircle ? 'circle' : 'rect',
    style: {
      ...buildBoxStyle(node, { defaultBgFromBackgrounds: false }),
      width: node.width,
      height: node.height,
    },
  }
}

// ---------- Visual style: fills, strokes, effects, radii, opacity, rotation ----------

function buildBoxStyle(
  node: SceneNode,
  opts: { defaultBgFromBackgrounds: boolean },
): import('@framework/types').BoxStyle {
  const style: import('@framework/types').BoxStyle = {
    width: 'width' in node ? node.width : undefined,
    height: 'height' in node ? node.height : undefined,
  }

  // Fills
  const fills = readFills(node)
  if (fills.length > 0) {
    style.fills = fills
    // Legacy field: first solid color (for renderers that haven't been
    // upgraded to consume `fills` yet).
    const firstSolid = fills.find((f) => f.type === 'solid')
    if (firstSolid?.type === 'solid') style.background = firstSolid.color
  } else if (opts.defaultBgFromBackgrounds) {
    const fallback = bgFromFigma(node)
    if (fallback) style.background = fallback
  }

  // Strokes
  const strokes = readStrokes(node)
  if (strokes.length > 0) {
    style.strokes = strokes
    // Legacy single-border field for back-compat
    const s0 = strokes[0]!
    style.border = {
      width: s0.weight,
      color: s0.color,
      style: s0.style ?? 'solid',
    }
  }

  // Corner radii — try per-corner first, fall back to uniform
  const radii = readCornerRadii(node)
  if (radii) {
    style.cornerRadii = radii
    if (radii.tl === radii.tr && radii.tr === radii.br && radii.br === radii.bl) {
      style.borderRadius = radii.tl
    }
  } else if ('cornerRadius' in node && typeof (node as { cornerRadius?: unknown }).cornerRadius === 'number') {
    style.borderRadius = (node as { cornerRadius: number }).cornerRadius
  }

  // Effects
  const effects = readEffects(node)
  if (effects.length > 0) {
    style.effects = effects
  }

  // Opacity (< 1 only — Figma defaults to 1)
  if ('opacity' in node && typeof node.opacity === 'number' && node.opacity < 1) {
    style.opacity = node.opacity
  }

  // Rotation
  if ('rotation' in node && typeof node.rotation === 'number' && Math.abs(node.rotation) > 0.01) {
    style.rotation = node.rotation
  }

  return style
}

function readFills(node: SceneNode): FwFill[] {
  if (!('fills' in node)) return []
  const fills = node.fills
  if (typeof fills === 'symbol' || !Array.isArray(fills)) return []
  const out: FwFill[] = []
  for (const paint of fills as readonly Paint[]) {
    if (!paint.visible && paint.visible !== undefined) continue
    const op = paint.opacity ?? 1
    if (paint.type === 'SOLID') {
      out.push({ type: 'solid', color: rgbToHex(paint.color, op), opacity: op < 1 ? op : undefined })
    } else if (paint.type === 'GRADIENT_LINEAR') {
      out.push({
        type: 'linear-gradient',
        angle: angleFromTransform(paint.gradientTransform),
        stops: gradientStops(paint.gradientStops, op),
        opacity: op < 1 ? op : undefined,
      })
    } else if (paint.type === 'GRADIENT_RADIAL') {
      out.push({
        type: 'radial-gradient',
        stops: gradientStops(paint.gradientStops, op),
        opacity: op < 1 ? op : undefined,
      })
    } else if (paint.type === 'IMAGE') {
      out.push({
        type: 'image',
        figmaImageHash: paint.imageHash ?? undefined,
        fit: imageFitFromFigma(paint.scaleMode),
        opacity: op < 1 ? op : undefined,
      })
    }
    // GRADIENT_ANGULAR / GRADIENT_DIAMOND / VIDEO are intentionally skipped:
    // no clean CSS analog, would need SVG.
  }
  return out
}

function gradientStops(stops: readonly ColorStop[], paintOpacity: number): GradientStop[] {
  return stops.map((s) => ({
    position: s.position,
    color: rgbToHex(
      { r: s.color.r, g: s.color.g, b: s.color.b },
      (s.color.a ?? 1) * paintOpacity,
    ),
  }))
}

/**
 * Figma's gradient transform is a 2x3 affine matrix mapping a unit gradient
 * (start (0,0) → end (1,0)) into the node's local space. Recover the angle
 * (in CSS degrees, where 0deg points up). For non-axis-aligned gradients
 * this is an approximation that's correct for most designer-authored fills.
 */
function angleFromTransform(transform: Transform): number {
  // The gradient direction is the first column of the inverse transform
  // applied to (1, 0). Equivalent to: angle = atan2(m10, m00).
  const m00 = transform[0][0]
  const m10 = transform[1][0]
  // CSS angle: 0deg = up, increasing clockwise. Figma's gradient angle is
  // measured from the +x axis, increasing clockwise too — convert by +90°.
  const rad = Math.atan2(m10, m00)
  const deg = (rad * 180) / Math.PI + 90
  return Math.round(deg)
}

function readStrokes(node: SceneNode): FwStroke[] {
  if (!('strokes' in node)) return []
  const strokes = node.strokes
  if (typeof strokes === 'symbol' || !Array.isArray(strokes)) return []
  if (strokes.length === 0) return []
  const weight =
    'strokeWeight' in node && typeof node.strokeWeight === 'number' ? node.strokeWeight : 1
  const align =
    'strokeAlign' in node && typeof node.strokeAlign === 'string'
      ? (node.strokeAlign === 'OUTSIDE'
          ? 'outside'
          : node.strokeAlign === 'CENTER'
            ? 'center'
            : 'inside')
      : 'inside'
  const dashesRaw =
    'dashPattern' in node && Array.isArray((node as { dashPattern?: readonly number[] }).dashPattern)
      ? (node as { dashPattern: readonly number[] }).dashPattern
      : undefined
  const dashes = dashesRaw ? Array.from(dashesRaw) : undefined
  const out: FwStroke[] = []
  for (const paint of strokes as readonly Paint[]) {
    if (paint.visible === false) continue
    if (paint.type !== 'SOLID') continue
    out.push({
      color: rgbToHex(paint.color, paint.opacity ?? 1),
      weight,
      position: align,
      dashes: dashes && dashes.length > 0 ? dashes : undefined,
      style: dashes && dashes.length > 0 ? 'dashed' : 'solid',
    })
  }
  return out
}

function readCornerRadii(node: SceneNode): CornerRadii | null {
  if (!('topLeftRadius' in node)) return null
  const tl = (node as { topLeftRadius?: number }).topLeftRadius
  const tr = (node as { topRightRadius?: number }).topRightRadius
  const br = (node as { bottomRightRadius?: number }).bottomRightRadius
  const bl = (node as { bottomLeftRadius?: number }).bottomLeftRadius
  if (
    typeof tl !== 'number' ||
    typeof tr !== 'number' ||
    typeof br !== 'number' ||
    typeof bl !== 'number'
  )
    return null
  if (tl === 0 && tr === 0 && br === 0 && bl === 0) return null
  return { tl, tr, br, bl }
}

function readEffects(node: SceneNode): FwEffect[] {
  if (!('effects' in node)) return []
  const effects = node.effects
  if (typeof effects === 'symbol' || !Array.isArray(effects)) return []
  const out: FwEffect[] = []
  for (const eff of effects as readonly Effect[]) {
    if (eff.visible === false) continue
    if (eff.type === 'DROP_SHADOW') {
      out.push({
        type: 'drop-shadow',
        x: eff.offset.x,
        y: eff.offset.y,
        blur: eff.radius,
        spread: 'spread' in eff && typeof eff.spread === 'number' ? eff.spread : 0,
        color: rgbToHex(
          { r: eff.color.r, g: eff.color.g, b: eff.color.b },
          eff.color.a ?? 1,
        ),
      })
    } else if (eff.type === 'INNER_SHADOW') {
      out.push({
        type: 'inner-shadow',
        x: eff.offset.x,
        y: eff.offset.y,
        blur: eff.radius,
        spread: 'spread' in eff && typeof eff.spread === 'number' ? eff.spread : 0,
        color: rgbToHex(
          { r: eff.color.r, g: eff.color.g, b: eff.color.b },
          eff.color.a ?? 1,
        ),
      })
    } else if (eff.type === 'LAYER_BLUR') {
      out.push({ type: 'layer-blur', radius: eff.radius })
    } else if (eff.type === 'BACKGROUND_BLUR') {
      out.push({ type: 'background-blur', radius: eff.radius })
    }
  }
  return out
}

// ---------- Type guards & helpers ----------

function isImageNode(node: SceneNode): node is SceneNode & { fills?: readonly Paint[] } {
  if (!('fills' in node)) return false
  const fills = node.fills
  if (typeof fills === 'symbol' || !Array.isArray(fills)) return false
  // A frame with an IMAGE fill should stay a frame (it has children) unless
  // it's a plain rectangle with no children, in which case treat as image.
  const hasImage = (fills as readonly Paint[]).some((f) => f.type === 'IMAGE')
  if (!hasImage) return false
  if (node.type === 'RECTANGLE') return true
  if ('children' in node && (node as { children: readonly unknown[] }).children.length === 0) return true
  return false
}

function isVectorish(node: SceneNode): boolean {
  return (
    node.type === 'VECTOR' ||
    node.type === 'BOOLEAN_OPERATION' ||
    node.type === 'STAR' ||
    node.type === 'POLYGON' ||
    node.type === 'LINE'
  )
}

function solidFillColor(fills: readonly Paint[] | unknown): string | undefined {
  if (!Array.isArray(fills)) return undefined
  for (const f of fills as readonly Paint[]) {
    if (f.visible === false) continue
    if (f.type === 'SOLID') return rgbToHex(f.color, f.opacity ?? 1)
  }
  return undefined
}

function bgFromFigma(node: SceneNode): string | undefined {
  const raw =
    'backgrounds' in node
      ? (node as { backgrounds?: readonly Paint[] | symbol }).backgrounds
      : 'fills' in node
        ? (node as { fills?: readonly Paint[] | symbol }).fills
        : undefined
  if (!raw || typeof raw === 'symbol') return undefined
  return solidFillColor(raw as readonly Paint[])
}

function imageFitFromFigma(scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE' | undefined): 'cover' | 'contain' | 'fill' {
  if (scaleMode === 'FIT') return 'contain'
  if (scaleMode === 'FILL') return 'cover'
  if (scaleMode === 'CROP') return 'cover'
  return 'cover'
}

function parseSlotKey(name: string): string | undefined {
  if (/^lock[/-]/i.test(name)) return undefined
  const match = name.match(/^slot[/-]([\w-]+)/i)
  if (match) return match[1]
  return undefined
}

/**
 * Generate a stable slot key from a layer name, unified across all variants:
 * same layer name in two frames → same key → editing once propagates to all.
 * Locked layers (`lock/...`) never get an implicit slot.
 */
function unifyKey(layerName: string, ctx: WalkerCtx, kind: 'text' | 'image'): string | undefined {
  if (/^lock[/-]/i.test(layerName)) return undefined
  const norm = layerName.trim().toLowerCase()
  const existing = ctx.nameToKey.get(norm)
  if (existing) return existing
  const slug = slugify(layerName)
  let candidate = slug || kind
  let i = 2
  const taken = new Set(ctx.nameToKey.values())
  while (taken.has(candidate)) {
    candidate = `${slug || kind}-${i++}`
  }
  ctx.nameToKey.set(norm, candidate)
  return candidate
}

function humanize(key: string): string {
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function estimateMaxChars(node: TextNode): number | undefined {
  if (!node.characters) return undefined
  const cur = node.characters.length
  return Math.ceil((cur * 1.5) / 10) * 10
}

function alignFromFigma(a: string | undefined): FwFrameNode['layout']['align'] {
  switch (a) {
    case 'CENTER': return 'center'
    case 'MAX': return 'end'
    case 'BASELINE': return 'baseline'
    case 'MIN':
    default: return 'start'
  }
}

function justifyFromFigma(a: string | undefined): FwFrameNode['layout']['justify'] {
  switch (a) {
    case 'CENTER': return 'center'
    case 'MAX': return 'end'
    case 'SPACE_BETWEEN': return 'space-between'
    case 'MIN':
    default: return 'start'
  }
}

function textAlignFromFigma(a: TextNode['textAlignHorizontal']): FwTextNode['style']['align'] {
  switch (a) {
    case 'CENTER': return 'center'
    case 'RIGHT': return 'right'
    case 'JUSTIFIED': return 'justify'
    case 'LEFT':
    default: return 'left'
  }
}

function textCaseToTransform(textCase: string | undefined): FwTextNode['style']['textTransform'] {
  switch (textCase) {
    case 'UPPER': return 'uppercase'
    case 'LOWER': return 'lowercase'
    case 'TITLE': return 'capitalize'
    case 'ORIGINAL':
    default: return 'none'
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
