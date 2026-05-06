import type { R2Key } from './ids'

export type HexColor = `#${string}`

export interface PaletteEntry {
  name: string
  hex: HexColor
  cmyk?: { c: number; m: number; y: number; k: number }
  pantone?: string
  usage?: string
}

export interface ColorTokens {
  primary: HexColor
  palette: PaletteEntry[]
  semantic?: {
    bg?: HexColor
    fg?: HexColor
    accent?: HexColor
    muted?: HexColor
    danger?: HexColor
    [k: string]: HexColor | undefined
  }
}

export type TypographyRole = 'heading' | 'body' | 'mono' | 'display' | 'caption' | (string & {})

export interface TypographyEntry {
  fontFamily: string
  /** key into brand_fonts.token_key — what we resolve at render time */
  fontTokenKey: string
  weights: number[]
  defaultWeight: number
  /** modular type scale, in px or rem-resolved px */
  scale: number[]
  lineHeight: number
  letterSpacing?: number
}

export type TypographyTokens = Partial<Record<TypographyRole, TypographyEntry>> & {
  body: TypographyEntry
}

export interface SpacingTokens {
  unit: number
  scale: number[]
}

export type LogoVariant = 'primary' | 'wordmark' | 'symbol' | 'monochrome' | 'inverted'

export interface LogoToken {
  name: string
  variant: LogoVariant
  r2Key: R2Key
  /** clear-space = N × logo height */
  clearSpaceMultiplier: number
  minSizePx: number
  /** allowed background hexes; '*' means any */
  allowedBackgrounds: (HexColor | '*')[]
}

export interface MotionTokens {
  durations: { fast: number; base: number; slow: number }
  easings: { default: string; emphasized: string }
  principles: string[]
}

export interface VoiceTokens {
  tone: string[]
  vocabulary: { preferred: string[]; avoid: string[] }
  forbidden: string[]
}

export interface ImageryTokens {
  dos: string[]
  donts: string[]
  colorGrade?: { lutR2Key: R2Key; description: string }
}

export type RuleSeverity = 'info' | 'warn' | 'error'

export interface CustomRule {
  id: string
  description: string
  severity: RuleSeverity
  /** dotted-path or pseudo-selector that the rule scopes to */
  appliesTo: string
}

export interface BrandTokens {
  colors: ColorTokens
  typography: TypographyTokens
  spacing: SpacingTokens
  logos: LogoToken[]
  motion?: MotionTokens
  voice?: VoiceTokens
  imagery?: ImageryTokens
  customRules?: CustomRule[]
}
