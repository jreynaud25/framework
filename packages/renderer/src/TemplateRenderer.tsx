import * as React from 'react'
import type {
  BrandTokens,
  Format,
  FrameNode,
  ImageNode,
  LayoutDirection,
  LayoutNode,
  LogoNode,
  ShapeNode,
  Sizing,
  SlotValues,
  TextNode,
} from '@framework/types'
import { applyTextConstraints } from './constraints'
import {
  formatToDimensions,
  paletteHex,
  resolveBoxStyle,
  resolveColor,
  resolveTextStyle,
  type FormatDimensions,
} from './resolve'

export type ImageResolver = (r2KeyOrSlot: string) => string

export interface TemplateRendererProps {
  layout: LayoutNode
  tokens: BrandTokens
  slotValues: SlotValues
  format: Format
  /** Convert an R2 key (default image OR slot value) to a public URL. */
  imageResolver: ImageResolver
  /** Override base size for the format (default 1080). */
  baseSize?: number
  /**
   * Render mode: 'preview' (browser) renders absolute-positioned children
   * relative to the parent's intrinsic format size; 'export' (Satori at edge)
   * is identical but does not need pointer events.
   */
  mode?: 'preview' | 'export'
}

/**
 * Pure renderer: zero network. Interprets layout_schema + slot_values into
 * a React tree styled with brand tokens. Used by:
 *   - Brand Hub previews
 *   - Editor live preview (<50ms target — no network in the keystroke loop)
 *   - Satori at edge for PNG/SVG export
 */
export function TemplateRenderer({
  layout,
  tokens,
  slotValues,
  format,
  imageResolver,
  baseSize = 1080,
  mode = 'preview',
}: TemplateRendererProps): React.ReactElement {
  // Prefer the root frame's intrinsic Figma dimensions when present — that's
  // what the designer actually drew. Fall back to the format-derived size
  // for legacy payloads that don't carry width/height on the root.
  const intrinsic = readIntrinsicDims(layout)
  const dims = intrinsic ?? formatToDimensions(format, baseSize)
  // Resolve the canvas-level background — slot:background takes precedence
  // over the brand's semantic.bg so the brand client can recolor the canvas
  // from a palette swatch.
  const slotBg = slotValues['background']
  const bg =
    slotBg?.type === 'color'
      ? slotBg.hex
      : (tokens.colors.semantic?.bg ?? '#ffffff')
  return (
    <div
      data-framework-root
      style={{
        width: dims.width,
        height: dims.height,
        position: 'relative',
        overflow: 'hidden',
        background: bg,
      }}
    >
      <NodeRenderer
        node={layout}
        tokens={tokens}
        slotValues={slotValues}
        imageResolver={imageResolver}
        dims={dims}
        mode={mode}
        parentMode={undefined}
        isRoot
      />
    </div>
  )
}

interface NodeRendererProps {
  node: LayoutNode
  tokens: BrandTokens
  slotValues: SlotValues
  imageResolver: ImageResolver
  dims: FormatDimensions
  mode: 'preview' | 'export'
  /** Parent's autolayout direction — drives main vs cross axis mapping. */
  parentMode: LayoutDirection | undefined
  /** Root node fills the canvas regardless of its own sizing. */
  isRoot?: boolean
}

function NodeRenderer(props: NodeRendererProps): React.ReactElement | null {
  switch (props.node.type) {
    case 'frame':
      return <FrameRenderer {...props} node={props.node} />
    case 'text':
      return <TextRenderer {...props} node={props.node} />
    case 'image':
      return <ImageRenderer {...props} node={props.node} />
    case 'shape':
      return <ShapeRenderer {...props} node={props.node} />
    case 'logo':
      return <LogoRenderer {...props} node={props.node} />
  }
}

/**
 * Read the canonical canvas size out of the root layout node. The plugin
 * extractor sets `style.width` / `style.height` on the root frame to the
 * actual Figma frame dimensions; we honor that 1:1 so the browser canvas
 * matches what the designer drew.
 */
function readIntrinsicDims(node: LayoutNode): FormatDimensions | null {
  if (node.type !== 'frame') return null
  const w = node.style?.width
  const h = node.style?.height
  if (typeof w !== 'number' || typeof h !== 'number') return null
  if (w <= 0 || h <= 0) return null
  return { width: w, height: h }
}

/**
 * Translate Figma sizing (FIXED / HUG / FILL) on each axis into CSS.
 * The mapping depends on the *parent's* layout mode (which axis is main).
 *
 *   parentMode = horizontal: H is main, V is cross
 *   parentMode = vertical:   V is main, H is cross
 *
 *   fill on main  → flex: '1 1 0%' (grow to fill, ignore intrinsic)
 *   fill on cross → alignSelf: stretch
 *   hug           → auto (let content size the box)
 *   fixed         → explicit px
 *
 * If sizingH / sizingV is undefined (legacy pre-sizing payloads), fall back
 * to the previous behavior: explicit width when present, else 100% (which
 * matches the old "fill parent" default).
 */
function sizingStyle(
  node: { sizingH?: Sizing; sizingV?: Sizing },
  intrinsic: { width?: number | string; height?: number | string },
  parentMode: LayoutDirection | undefined,
  isRoot: boolean,
): React.CSSProperties {
  // Root frame always fills the canvas the TemplateRenderer set up.
  if (isRoot) return { width: '100%', height: '100%' }

  const sH = node.sizingH
  const sV = node.sizingV
  const W = intrinsic.width
  const H = intrinsic.height
  const out: React.CSSProperties = {}

  // ---- Horizontal ----
  if (sH === 'fixed') {
    if (W !== undefined) out.width = W
  } else if (sH === 'fill') {
    if (parentMode === 'horizontal') {
      out.flex = '1 1 0%'
      out.minWidth = 0
    } else if (parentMode === 'vertical') {
      out.alignSelf = 'stretch'
    } else {
      out.width = '100%'
    }
  } else if (sH === 'hug') {
    out.width = 'auto'
  } else {
    // legacy: explicit width if present, else fill parent
    out.width = W ?? '100%'
  }

  // ---- Vertical ----
  if (sV === 'fixed') {
    if (H !== undefined) out.height = H
  } else if (sV === 'fill') {
    if (parentMode === 'vertical') {
      out.flex = '1 1 0%'
      out.minHeight = 0
    } else if (parentMode === 'horizontal') {
      out.alignSelf = 'stretch'
    } else {
      out.height = '100%'
    }
  } else if (sV === 'hug') {
    out.height = 'auto'
  } else {
    out.height = H ?? '100%'
  }

  return out
}

function FrameRenderer({
  node,
  tokens,
  slotValues,
  imageResolver,
  dims,
  mode,
  parentMode,
  isRoot,
}: NodeRendererProps & { node: FrameNode }): React.ReactElement {
  const { layout } = node
  const padding = normalizePadding(layout.padding)
  const flexStyle: React.CSSProperties = (() => {
    if (layout.mode === 'absolute') {
      return { position: 'relative' }
    }
    return {
      display: 'flex',
      flexDirection: layout.mode === 'horizontal' ? 'row' : 'column',
      gap: layout.gap ?? 0,
      alignItems: alignToFlex(layout.align),
      justifyContent: justifyToFlex(layout.justify),
    }
  })()

  const sizing = sizingStyle(
    node,
    { width: node.style?.width, height: node.style?.height },
    parentMode,
    !!isRoot,
  )

  return (
    <div
      data-framework-id={node.id}
      style={{
        ...resolveBoxStyle(node.style, tokens, slotValues),
        ...flexStyle,
        paddingTop: padding[0],
        paddingRight: padding[1],
        paddingBottom: padding[2],
        paddingLeft: padding[3],
        ...sizing,
      }}
    >
      {node.children.map((child) => (
        <NodeRenderer
          key={child.id}
          node={child}
          tokens={tokens}
          slotValues={slotValues}
          imageResolver={imageResolver}
          dims={dims}
          mode={mode}
          parentMode={layout.mode}
        />
      ))}
    </div>
  )
}

function TextRenderer({
  node,
  tokens,
  slotValues,
  parentMode,
}: NodeRendererProps & { node: TextNode }): React.ReactElement {
  const slotValue = node.slotKey ? slotValues[node.slotKey] : undefined
  const text =
    slotValue?.type === 'text'
      ? slotValue.value
      : (node.defaultText ?? '')

  const baseStyle = resolveTextStyle(node.style, tokens)
  const fontSize = applyTextConstraints(text, baseStyle.fontSize, node.constraints)

  // Text doesn't carry width/height in TextStyle; sizing only matters for
  // fill (across cross-axis we may want stretch) — fixed/hug let the text
  // size itself naturally.
  const sizing = sizingStyle(node, {}, parentMode, false)

  return (
    <div data-framework-id={node.id} style={{ ...baseStyle, fontSize, ...sizing }}>
      {text}
    </div>
  )
}

function ImageRenderer({
  node,
  tokens,
  slotValues,
  imageResolver,
  parentMode,
}: NodeRendererProps & { node: ImageNode }): React.ReactElement | null {
  const slotValue = node.slotKey ? slotValues[node.slotKey] : undefined
  const r2Key =
    slotValue?.type === 'image'
      ? (slotValue.treatedR2Key ?? slotValue.r2Key)
      : node.defaultR2Key

  const sizing = sizingStyle(
    node,
    { width: node.style.width, height: node.style.height },
    parentMode,
    false,
  )

  if (!r2Key) {
    return (
      <div
        data-framework-id={node.id}
        style={{
          ...resolveBoxStyle(node.style, tokens),
          background: '#0001',
          ...sizing,
        }}
      />
    )
  }

  // objectPosition lets the client pan the cropped image when fit=cover.
  // Stored as 0..100 percent on each axis; default = 50/50 (center).
  const op = slotValue?.type === 'image' ? slotValue.objectPosition : undefined
  const objectPosition = op ? `${op.x}% ${op.y}%` : '50% 50%'

  const url = imageResolver(r2Key)
  return (
    <img
      data-framework-id={node.id}
      src={url}
      alt=""
      style={{
        ...resolveBoxStyle(node.style, tokens),
        objectFit: node.style.fit ?? 'cover',
        objectPosition,
        borderRadius: node.style.radius ?? node.style.borderRadius,
        ...sizing,
      }}
    />
  )
}

function ShapeRenderer({
  node,
  tokens,
  parentMode,
}: NodeRendererProps & { node: ShapeNode }): React.ReactElement {
  const sizing = sizingStyle(
    node,
    { width: node.style.width, height: node.style.height },
    parentMode,
    false,
  )
  if (node.shape === 'path' && node.d) {
    return (
      <svg
        data-framework-id={node.id}
        style={{ ...resolveBoxStyle(node.style, tokens), ...sizing }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <path d={node.d} fill={resolveColor(node.style.background, tokens) ?? 'currentColor'} />
      </svg>
    )
  }
  const radius = node.shape === 'circle' ? '9999px' : node.style.borderRadius
  return (
    <div
      data-framework-id={node.id}
      style={{ ...resolveBoxStyle(node.style, tokens), borderRadius: radius, ...sizing }}
    />
  )
}

function LogoRenderer({
  node,
  tokens,
  imageResolver,
  parentMode,
}: NodeRendererProps & { node: LogoNode }): React.ReactElement | null {
  const logo = tokens.logos.find((l) => l.variant === node.logoVariant) ?? tokens.logos[0]
  if (!logo) return null
  const url = imageResolver(logo.r2Key)
  const sizing = sizingStyle(
    node,
    { width: node.style?.width, height: node.style?.height },
    parentMode,
    false,
  )
  return (
    <img
      data-framework-id={node.id}
      src={url}
      alt={logo.name}
      style={{
        ...resolveBoxStyle(node.style, tokens),
        objectFit: 'contain',
        background: paletteHex(tokens, undefined) === logo.allowedBackgrounds[0] ? undefined : undefined,
        ...sizing,
      }}
    />
  )
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
    case 'start':
    default:
      return 'flex-start'
  }
}

function justifyToFlex(j: FrameNode['layout']['justify']): React.CSSProperties['justifyContent'] {
  switch (j) {
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
    case 'start':
    default:
      return 'flex-start'
  }
}

function normalizePadding(p: FrameNode['layout']['padding']): [number, number, number, number] {
  if (p === undefined) return [0, 0, 0, 0]
  if (typeof p === 'number') return [p, p, p, p]
  return p
}
