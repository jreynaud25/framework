import type { HexColor, LogoVariant } from './tokens'
import type { R2Key } from './ids'

export type LayoutDirection = 'horizontal' | 'vertical' | 'absolute'
export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline'
export type Justify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
export type Fit = 'cover' | 'contain' | 'fill'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export interface BoxStyle {
  width?: number | string
  height?: number | string
  background?: HexColor | string
  borderRadius?: number
  border?: { width: number; color: HexColor | string; style?: 'solid' | 'dashed' | 'dotted' }
  shadow?: string
  opacity?: number
  rotation?: number
  /** absolute-positioning offsets when the parent layout mode is 'absolute' */
  position?: { x: number; y: number }
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
  layout: {
    mode: LayoutDirection
    gap?: number
    padding?: [number, number, number, number] | number
    align?: Align
    justify?: Justify
  }
  style?: BoxStyle
  children: LayoutNode[]
}

export interface TextNode {
  type: 'text'
  id: string
  slotKey?: string
  defaultText?: string
  style: TextStyle
  constraints?: TextConstraints
}

export interface ImageNode {
  type: 'image'
  id: string
  slotKey?: string
  defaultR2Key?: R2Key
  style: ImageStyle
}

export interface ShapeNode {
  type: 'shape'
  id: string
  shape: 'rect' | 'circle' | 'path'
  /** SVG path data when shape === 'path' */
  d?: string
  style: BoxStyle
}

export interface LogoNode {
  type: 'logo'
  id: string
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
