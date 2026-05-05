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
  }
  default?: { r2Key: R2Key }
}

export interface ChoiceSlotDefinition extends BaseSlotDefinition {
  type: 'choice'
  options: Array<{ value: string; label: string }>
  default?: string
}

export interface ColorSlotDefinition extends BaseSlotDefinition {
  type: 'color'
  constraints: { paletteOnly?: boolean }
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
  | { type: 'image'; r2Key: R2Key; treatedR2Key?: R2Key }
  | { type: 'choice'; value: string }
  | { type: 'color'; hex: HexColor }

export type SlotValues = Record<string, SlotValue>
