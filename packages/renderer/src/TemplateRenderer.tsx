import * as React from 'react'
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
  const dims = formatToDimensions(format, baseSize)
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

function FrameRenderer({
  node,
  tokens,
  slotValues,
  imageResolver,
  dims,
  mode,
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
        width: node.style?.width ?? '100%',
        height: node.style?.height ?? '100%',
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
        />
      ))}
    </div>
  )
}

function TextRenderer({
  node,
  tokens,
  slotValues,
}: NodeRendererProps & { node: TextNode }): React.ReactElement {
  const slotValue = node.slotKey ? slotValues[node.slotKey] : undefined
  const text =
    slotValue?.type === 'text'
      ? slotValue.value
      : (node.defaultText ?? '')

  const baseStyle = resolveTextStyle(node.style, tokens)
  const fontSize = applyTextConstraints(text, baseStyle.fontSize, node.constraints)

  return (
    <div data-framework-id={node.id} style={{ ...baseStyle, fontSize }}>
      {text}
    </div>
  )
}

function ImageRenderer({
  node,
  tokens,
  slotValues,
  imageResolver,
}: NodeRendererProps & { node: ImageNode }): React.ReactElement | null {
  const slotValue = node.slotKey ? slotValues[node.slotKey] : undefined
  const r2Key =
    slotValue?.type === 'image'
      ? (slotValue.treatedR2Key ?? slotValue.r2Key)
      : node.defaultR2Key

  if (!r2Key) {
    return (
      <div
        data-framework-id={node.id}
        style={{
          ...resolveBoxStyle(node.style, tokens),
          background: '#0001',
        }}
      />
    )
  }

  const url = imageResolver(r2Key)
  return (
    <img
      data-framework-id={node.id}
      src={url}
      alt=""
      style={{
        ...resolveBoxStyle(node.style, tokens),
        objectFit: node.style.fit ?? 'cover',
        borderRadius: node.style.radius ?? node.style.borderRadius,
      }}
    />
  )
}

function ShapeRenderer({
  node,
  tokens,
}: NodeRendererProps & { node: ShapeNode }): React.ReactElement {
  if (node.shape === 'path' && node.d) {
    return (
      <svg
        data-framework-id={node.id}
        style={resolveBoxStyle(node.style, tokens)}
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
      style={{ ...resolveBoxStyle(node.style, tokens), borderRadius: radius }}
    />
  )
}

function LogoRenderer({
  node,
  tokens,
  imageResolver,
}: NodeRendererProps & { node: LogoNode }): React.ReactElement | null {
  const logo = tokens.logos.find((l) => l.variant === node.logoVariant) ?? tokens.logos[0]
  if (!logo) return null
  const url = imageResolver(logo.r2Key)
  return (
    <img
      data-framework-id={node.id}
      src={url}
      alt={logo.name}
      style={{
        ...resolveBoxStyle(node.style, tokens),
        objectFit: 'contain',
        background: paletteHex(tokens, undefined) === logo.allowedBackgrounds[0] ? undefined : undefined,
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
