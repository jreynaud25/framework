import type {
  BrandTokens,
  Format,
  LayoutNode,
  SlotSchema,
  SlotValues,
} from '@framework/types'
import { demoTemplate } from './demoTemplate'

export interface CompositionPayload {
  compositionId: string
  templateName: string
  format: Format
  formats: Format[]
  layout: LayoutNode
  slotSchema: SlotSchema
  slotValues: SlotValues
  tokens: BrandTokens
  imageBaseUrl: string
}

/**
 * In production this hits `apps/web` for a signed payload combining
 * composition + template_version + brand_token_version. For now we serve a
 * baked-in demo so the editor is testable end-to-end without the backend.
 */
export async function loadCompositionById(id: string): Promise<CompositionPayload> {
  return {
    compositionId: id,
    templateName: 'Spring Drop',
    format: '1:1',
    formats: ['1:1', '9:16', '16:9'],
    layout: demoTemplate.layout,
    slotSchema: demoTemplate.slotSchema,
    slotValues: demoTemplate.defaultValues,
    tokens: demoTemplate.tokens,
    imageBaseUrl: 'https://cdn.frame-work.app',
  }
}
