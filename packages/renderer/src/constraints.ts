import type {
  ImageSlotDefinition,
  SlotDefinition,
  SlotSchema,
  SlotValues,
  TextSlotDefinition,
} from '@framework/types'

export interface SlotValidationError {
  slotKey: string
  reason: 'required' | 'maxChars' | 'minChars' | 'maxBytes' | 'aspectRatio' | 'paletteOnly' | 'optionMismatch'
  message: string
}

export function validateSlotValues(schema: SlotSchema, values: SlotValues): SlotValidationError[] {
  const errors: SlotValidationError[] = []

  for (const slot of schema) {
    const value = values[slot.key]
    if (!value) {
      if (isRequired(slot)) {
        errors.push({
          slotKey: slot.key,
          reason: 'required',
          message: `${slot.label} is required`,
        })
      }
      continue
    }

    switch (slot.type) {
      case 'text':
        if (value.type !== 'text') break
        validateText(slot, value.value, errors)
        break
      case 'image':
        if (value.type !== 'image') break
        validateImage(slot, value, errors)
        break
      case 'choice':
        if (value.type !== 'choice') break
        if (!slot.options.some((o) => o.value === value.value)) {
          errors.push({
            slotKey: slot.key,
            reason: 'optionMismatch',
            message: `${slot.label}: '${value.value}' is not an allowed option`,
          })
        }
        break
      case 'color':
        // palette-only enforcement happens upstream where the palette is in scope.
        break
    }
  }
  return errors
}

function isRequired(slot: SlotDefinition): boolean {
  if (slot.type === 'text' || slot.type === 'image') {
    return slot.constraints.required ?? slot.required ?? false
  }
  return slot.required ?? false
}

function validateText(slot: TextSlotDefinition, value: string, errors: SlotValidationError[]): void {
  const { maxChars, minChars } = slot.constraints
  if (maxChars !== undefined && value.length > maxChars) {
    errors.push({
      slotKey: slot.key,
      reason: 'maxChars',
      message: `${slot.label}: ${value.length}/${maxChars} characters`,
    })
  }
  if (minChars !== undefined && value.length < minChars) {
    errors.push({
      slotKey: slot.key,
      reason: 'minChars',
      message: `${slot.label}: needs at least ${minChars} characters`,
    })
  }
}

function validateImage(
  slot: ImageSlotDefinition,
  value: { type: 'image'; r2Key: string },
  errors: SlotValidationError[],
): void {
  if (!value.r2Key) {
    errors.push({
      slotKey: slot.key,
      reason: 'required',
      message: `${slot.label}: image is missing`,
    })
  }
  // byte / aspect-ratio enforcement happens at upload time when we have the bytes.
}

/**
 * Apply auto-shrink: pick a fontSize that keeps text under maxChars-derived
 * width budget. Used by TemplateRenderer when constraints.autoShrink is true.
 */
export function applyTextConstraints(
  text: string,
  baseFontSize: number,
  constraints?: { maxChars?: number; minFontSize?: number; autoShrink?: boolean },
): number {
  if (!constraints?.autoShrink) return baseFontSize
  const max = constraints.maxChars
  const minFontSize = constraints.minFontSize ?? Math.max(8, baseFontSize * 0.5)
  if (!max || text.length <= max) return baseFontSize

  const ratio = max / text.length
  const shrunk = Math.round(baseFontSize * ratio)
  return Math.max(minFontSize, shrunk)
}
