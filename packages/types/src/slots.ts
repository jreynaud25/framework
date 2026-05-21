import type { HexColor } from './tokens'
import type { R2Key } from './ids'

export interface BaseSlotDefinition {
  key: string
  label: string
  description?: string
  required?: boolean
}

export interface TextSlotDefinition extends BaseSlotDefinition {
  type: 'text'
  constraints: {
    maxChars?: number
    minChars?: number
    multiline?: boolean
    required?: boolean
  }
  default?: string
}

export interface ImageSlotDefinition extends BaseSlotDefinition {
  type: 'image'
  constraints: {
    maxBytes?: number
    aspectRatio?: number
    minWidth?: number
    minHeight?: number
    required?: boolean
    /** Designer-set fit mode. 'cover' = fills container, may crop, client can
     *  drag to reposition the visible portion. 'contain' = whole image visible,
     *  letterboxed. Defaults to 'cover'. */
    fit?: 'cover' | 'contain'
  }
  default?: { r2Key: R2Key }
}

export interface ChoiceSlotDefinition extends BaseSlotDefinition {
  type: 'choice'
  options: Array<{ value: string; label: string }>
  default?: string
}

export type ColorSlotSource = 'brand' | 'custom' | 'free'

export interface ColorSlotDefinition extends BaseSlotDefinition {
  type: 'color'
  constraints: {
    /** Legacy: when true, client can only pick from the brand palette.
     *  Use `allowedSources` for finer control. */
    paletteOnly?: boolean
    /** Designer-configured sources the client is allowed to pick from.
     *  When undefined, falls back to: paletteOnly ? ['brand'] : ['brand','custom','free']. */
    allowedSources?: ColorSlotSource[]
  }
  default?: HexColor
}

export type SlotDefinition =
  | TextSlotDefinition
  | ImageSlotDefinition
  | ChoiceSlotDefinition
  | ColorSlotDefinition

export type SlotSchema = SlotDefinition[]

/** A user-supplied value for a single slot. */
export type SlotValue =
  | { type: 'text'; value: string }
  | {
      type: 'image'
      r2Key: R2Key
      treatedR2Key?: R2Key
      /** CSS object-position (0..100 percent), set when the client drags to
       *  reposition the crop. Only relevant when the slot's `fit` is 'cover'. */
      objectPosition?: { x: number; y: number }
    }
  | { type: 'choice'; value: string }
  | { type: 'color'; hex: HexColor }

export type SlotValues = Record<string, SlotValue>
