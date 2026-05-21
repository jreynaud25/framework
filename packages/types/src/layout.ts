import type { HexColor, LogoVariant } from './tokens'
import type { R2Key } from './ids'

export type LayoutDirection = 'horizontal' | 'vertical' | 'absolute'
export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
export type Justify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
export type Fit = 'cover' | 'contain' | 'fill'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

/**
 * Figma autolayout sizing per axis. Mirrors `layoutSizingHorizontal` /
 * `layoutSizingVertical` from the Figma API:
 *   'fixed' → explicit width/height in px (use BoxStyle.width / .height)
 *   'hug'   → size to children (default for new autolayout frames)
 *   'fill'  → take all remaining space on the parent's axis
 */
export type Sizing = 'fixed' | 'hug' | 'fill'

/**
 * A single stop in a Figma gradient. `position` is 0..1; `color` is hex or
 * 'rgba(...)' so opacity can travel inside it.
 */
export interface GradientStop {
  position: number
  color: string
}

/**
 * A fill stack mirrors Figma's `fills` array: bottom-to-top compositing.
 * - solid: a single hex/rgba color
 * - linear-gradient: angle in degrees + stops
 * - radial-gradient: stops (center is implicit 50% 50%)
 * - image: r2Key for hosted images, or figmaImageHash as transitional ref
 */
export type Fill =
  | { type: 'solid'; color: string; opacity?: number }
  | { type: 'linear-gradient'; angle: number; stops: GradientStop[]; opacity?: number }
  | { type: 'radial-gradient'; stops: GradientStop[]; opacity?: number }
  | { type: 'image'; r2Key?: R2Key; figmaImageHash?: string; fit?: Fit; opacity?: number }

/**
 * A border drawn around the node. Figma supports `inside`/`outside`/`center`
 * stroke alignment; CSS only supports inside by default — for `outside` we
 * emit a box-shadow instead.
 */
export interface Stroke {
  color: string
  weight: number
  position: 'inside' | 'outside' | 'center'
  dashes?: number[]
  style?: 'solid' | 'dashed' | 'dotted'
}

/** Per-corner radii. When all four are equal you can use the legacy `borderRadius`. */
export interface CornerRadii {
  tl: number
  tr: number
  br: number
  bl: number
}

/**
 * Effects: shadows + blurs. Mirrors Figma's `effects` array (top-down order).
 * - drop-shadow / inner-shadow → CSS box-shadow [inset]
 * - layer-blur → CSS filter: blur()
 * - background-blur → CSS backdrop-filter: blur()
 */
export type Effect =
  | { type: 'drop-shadow'; x: number; y: number; blur: number; spread: number; color: string }
  | { type: 'inner-shadow'; x: number; y: number; blur: number; spread: number; color: string }
  | { type: 'layer-blur'; radius: number }
  | { type: 'background-blur'; radius: number }

export interface BoxStyle {
  width?: number | string
  height?: number | string
  /** Legacy single-color background. New extractor populates `fills` instead. */
  background?: HexColor | string
  /** Ordered fill stack (bottom→top). Takes precedence over `background`. */
  fills?: Fill[]
  /** Legacy uniform corner radius. Use `cornerRadii` for per-corner. */
  borderRadius?: number
  cornerRadii?: CornerRadii
  /** Legacy single border. New extractor populates `strokes` instead. */
  border?: { width: number; color: HexColor | string; style?: 'solid' | 'dashed' | 'dotted' }
  strokes?: Stroke[]
  /** Legacy single shadow string. New extractor populates `effects` instead. */
  shadow?: string
  effects?: Effect[]
  opacity?: number
  rotation?: number
  /** absolute-positioning offsets when the parent layout mode is 'absolute' */
  position?: { x: number; y: number }
  /** Designer-applied drag offset (CSS `transform: translate`). Composes with
   *  rotation. Used for free-positioning in designer mode without disturbing
   *  the auto-layout flow. Values are in canvas px (intrinsic units). */
  offset?: { x: number; y: number }
}

export interface TextStyle {
  /** typography token role from BrandTokens.typography (e.g. 'heading') */
  tokenRef?: string
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  lineHeight?: number
  /** color hex OR token reference like 'colors.primary' */
  color?: string
  align?: TextAlign
  lineClamp?: number
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  fontStyle?: 'normal' | 'italic'
}

export interface ImageStyle extends BoxStyle {
  fit?: Fit
  aspectRatio?: number
  radius?: number
}

export interface TextConstraints {
  maxChars?: number
  minFontSize?: number
  autoShrink?: boolean
}

export interface FrameNode {
  type: 'frame'
  id: string
  /** Figma autolayout sizing for this node along its parent's axis. */
  sizingH?: Sizing
  sizingV?: Sizing
  layout: {
    mode: LayoutDirection
    gap?: number
    padding?: [number, number, number, number] | number
    align?: Align
    justify?: Justify
    /** Figma's primaryAxisSizingMode/counterAxisSizingMode raw values, kept
     *  for forensics — the renderer reads sizingH/sizingV instead. */
    primarySizing?: 'fixed' | 'auto'
    counterSizing?: 'fixed' | 'auto'
  }
  style?: BoxStyle
  children: LayoutNode[]
}

export interface TextNode {
  type: 'text'
  id: string
  sizingH?: Sizing
  sizingV?: Sizing
  slotKey?: string
  defaultText?: string
  style: TextStyle
  constraints?: TextConstraints
}

export interface ImageNode {
  type: 'image'
  id: string
  sizingH?: Sizing
  sizingV?: Sizing
  slotKey?: string
  defaultR2Key?: R2Key
  style: ImageStyle
}

export interface ShapeNode {
  type: 'shape'
  id: string
  sizingH?: Sizing
  sizingV?: Sizing
  shape: 'rect' | 'circle' | 'path'
  /** SVG path data when shape === 'path' */
  d?: string
  style: BoxStyle
}

export interface LogoNode {
  type: 'logo'
  id: string
  sizingH?: Sizing
  sizingV?: Sizing
  logoVariant: LogoVariant
  style?: BoxStyle
}

export type LayoutNode = FrameNode | TextNode | ImageNode | ShapeNode | LogoNode

/** Discriminator helper. */
export const isFrame = (n: LayoutNode): n is FrameNode => n.type === 'frame'
export const isText = (n: LayoutNode): n is TextNode => n.type === 'text'
export const isImage = (n: LayoutNode): n is ImageNode => n.type === 'image'
export const isShape = (n: LayoutNode): n is ShapeNode => n.type === 'shape'
export const isLogo = (n: LayoutNode): n is LogoNode => n.type === 'logo'
