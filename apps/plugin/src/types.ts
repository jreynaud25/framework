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

export interface ExtractTemplateResult {
  name: string
  slug: string
  figmaFileKey: string
  figmaNodeId: string
  formats: Format[]
  layoutSchema: LayoutNode
  slotSchema: SlotSchema
  warnings: string[]
}

/** Messages from the UI iframe → sandbox code. */
export type UIMessage =
  | { type: 'request-selection-summary' }
  | { type: 'request-extract-tokens' }
  | { type: 'request-extract-template'; payload: { name: string } }
  | { type: 'close'; payload?: { message?: string } }

/** Messages from the sandbox code → UI iframe. */
export type PluginMessage =
  | { type: 'selection-summary'; payload: SelectionSummary }
  | { type: 'extract-tokens-result'; payload: ExtractTokensResult }
  | { type: 'extract-template-result'; payload: ExtractTemplateResult }
  | { type: 'error'; payload: { message: string } }
