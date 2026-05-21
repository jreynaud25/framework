import type {
  BrandTokens,
  Format,
  LayoutNode,
  SlotSchema,
} from '@framework/types'

export interface SelectionSummary {
  count: number
  frames: Array<{ id: string; name: string; w: number; h: number }>
}

export interface ExtractTokensResult {
  tokens: BrandTokens
  warnings: string[]
}

/**
 * One frame the designer selected. Multiple variants = multiple formats
 * sharing the same content (slot keys are unified by layer name across all
 * variants so editing once propagates everywhere).
 */
export interface TemplateVariant {
  format: Format
  /** Optional human-readable label (renamable in the editor). */
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
  /** Intrinsic pixel size of the canonical (first selected) frame. */
  canvas: { width: number; height: number }
  layoutSchema: LayoutNode
  /** One entry per selected frame. variants[0] = canonical = layoutSchema. */
  variants: TemplateVariant[]
  slotSchema: SlotSchema
  warnings: string[]
}

export type AssetKind = 'logo' | 'photo' | 'pattern' | 'icon'

export interface ExtractedAsset {
  kind: AssetKind
  variant?: string
  label: string
  /** Data URL: data:image/svg+xml;base64,... or data:image/png;base64,... */
  dataUrl: string
  width: number
  height: number
}

/**
 * One push from the plugin can mix templates and assets (logos, photos…).
 * The sandbox classifies each selected node and returns both buckets.
 * The UI fires the right HTTP POSTs in parallel.
 */
export interface ExtractMixedResult {
  templateResult?: ExtractTemplateResult
  assets: ExtractedAsset[]
  warnings: string[]
}

/** Messages from the UI iframe → sandbox code. */
export type UIMessage =
  | { type: 'request-selection-summary' }
  | { type: 'request-extract-tokens' }
  | { type: 'request-extract-template'; payload: { name: string } }
  | { type: 'request-extract-mixed'; payload: { name: string } }
  | { type: 'close'; payload?: { message?: string } }

/** Messages from the sandbox code → UI iframe. */
export type PluginMessage =
  | { type: 'selection-summary'; payload: SelectionSummary }
  | { type: 'extract-tokens-result'; payload: ExtractTokensResult }
  | { type: 'extract-template-result'; payload: ExtractTemplateResult }
  | { type: 'extract-mixed-result'; payload: ExtractMixedResult }
  | { type: 'error'; payload: { message: string } }
