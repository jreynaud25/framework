import type {
  BrandTokens,
  Format,
  LayoutNode,
  SlotSchema,
  TypographyEntry,
} from '@framework/types'

export interface SelectionSummary {
  count: number
  frames: Array<{ id: string; name: string; w: number; h: number }>
}

export interface ExtractTokensResult {
  tokens: BrandTokens
  warnings: string[]
}

export interface TemplateVariant {
  format: Format
  label?: string
  canvas: { width: number; height: number }
  layout: LayoutNode
  figmaNodeId: string
}

export interface ExtractTemplateResult {
  name: string
  slug: string
  figmaFileKey: string
  figmaNodeId: string
  formats: Format[]
  canvas: { width: number; height: number }
  layoutSchema: LayoutNode
  variants: TemplateVariant[]
  slotSchema: SlotSchema
  warnings: string[]
}

export type AssetKind = 'logo' | 'photo' | 'pattern' | 'icon'
export type LogoVariant = 'primary' | 'wordmark' | 'symbol' | 'monochrome' | 'inverted'

export interface ExtractedAsset {
  kind: AssetKind
  variant?: string
  label: string
  dataUrl: string
  width: number
  height: number
}

/**
 * Where a selected frame is heading. Designer chooses one per frame in
 * the plugin UI; the sandbox extracts in the right shape and the UI
 * dispatches to the right API endpoint.
 */
export type Destination =
  | { kind: 'logo'; variant: LogoVariant }
  | { kind: 'photo' }
  | { kind: 'pattern' }
  | { kind: 'icon' }
  | { kind: 'color'; name?: string }
  | { kind: 'typography'; role: string }
  | { kind: 'template' }
  | { kind: 'ignore' }

export type DestinationKind = Destination['kind']

export interface FrameHints {
  isText: boolean
  isSolidRect: boolean
  hasImageFill: boolean
  hasSlots: boolean
  size: { w: number; h: number }
}

/**
 * Per-frame classification carried back to the UI. `suggested` is the
 * plugin's best guess; designer can override via dropdown before pushing.
 */
export interface FrameClassification {
  id: string
  name: string
  width: number
  height: number
  suggested: Destination
  hints: FrameHints
}

export interface ClassifyResult {
  frames: FrameClassification[]
}

/**
 * Result of one destination-driven push request. Each bucket goes to its
 * own API endpoint: assets → /assets, colors+typography → /tokens,
 * templateResult → /templates.
 */
export interface PushBundle {
  assets: ExtractedAsset[]
  colors: Array<{ name: string; hex: string }>
  typography: Array<{ role: string; entry: TypographyEntry }>
  templateResult?: ExtractTemplateResult
  warnings: string[]
}

/** UI → sandbox. */
export type UIMessage =
  | { type: 'request-selection-summary' }
  | { type: 'request-classify-selection' }
  | { type: 'request-extract-tokens' }
  | { type: 'request-extract-template'; payload: { name: string } }
  | {
      type: 'request-push-bundle'
      payload: {
        name: string
        destinations: Array<{ id: string; destination: Destination }>
      }
    }
  | { type: 'close'; payload?: { message?: string } }

/** Sandbox → UI. */
export type PluginMessage =
  | { type: 'selection-summary'; payload: SelectionSummary }
  | { type: 'classify-result'; payload: ClassifyResult }
  | { type: 'extract-tokens-result'; payload: ExtractTokensResult }
  | { type: 'extract-template-result'; payload: ExtractTemplateResult }
  | { type: 'push-bundle-result'; payload: PushBundle }
  | { type: 'error'; payload: { message: string } }
