import { useRef } from 'react'
import type { ColorSlotDefinition, ColorSlotSource, HexColor } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'
import { SlotLabel } from '../SlotLabel'

interface Props {
  slot: ColorSlotDefinition
  value: string
  error: SlotValidationError | undefined
  palette?: HexColor[]
}

/**
 * Color slot row. Two distinct UIs:
 *
 * - Designer mode → row shows allowed-source TOGGLES (brand/custom/free).
 *   This is the typology config — what the client gets to pick from. Writes
 *   to `slotConfigOverrides[slot.key]`.
 *
 * - Client mode → row shows the actual swatches for the sources the
 *   designer allowed. Writes to `slotValues[slot.key]`.
 */
export function ColorSlotEditor({ slot, value, error, palette }: Props) {
  const designerMode = useCompositionStore((s) => s.designerMode)
  if (designerMode) {
    return <DesignerColorRow slot={slot} />
  }
  return <ClientColorRow slot={slot} value={value} error={error} palette={palette} />
}

function DesignerColorRow({ slot }: { slot: ColorSlotDefinition }) {
  const setSlotConfig = useCompositionStore((s) => s.setSlotConfig)
  const overrides = useCompositionStore((s) => s.slotConfigOverrides)

  const sources: ColorSlotSource[] =
    overrides[slot.key]?.allowedSources ??
    slot.constraints.allowedSources ??
    (slot.constraints.paletteOnly ? ['brand'] : ['brand', 'custom', 'free'])

  function toggleSource(src: ColorSlotSource) {
    const next = sources.includes(src) ? sources.filter((s) => s !== src) : [...sources, src]
    // Keep canonical order.
    const ordered = (['brand', 'custom', 'free'] as ColorSlotSource[]).filter((s) => next.includes(s))
    setSlotConfig(slot.key, { allowedSources: ordered })
  }

  return (
    <div className="fw-row">
      <SlotLabel slotKey={slot.key} label={slot.label} />
      <div className="fw-row__value">
        {(['brand', 'custom', 'free'] as ColorSlotSource[]).map((src) => (
          <button
            key={src}
            type="button"
            className="fw-chip"
            data-active={sources.includes(src)}
            onClick={() => toggleSource(src)}
            title={
              src === 'brand'
                ? 'Brand palette only'
                : src === 'custom'
                  ? 'Designer custom colors'
                  : 'Any color (free picker)'
            }
          >
            {src === 'brand' ? 'Brand' : src === 'custom' ? 'Custom' : 'Free'}
          </button>
        ))}
      </div>
    </div>
  )
}

function ClientColorRow({
  slot,
  value,
  error,
  palette,
}: {
  slot: ColorSlotDefinition
  value: string
  error: SlotValidationError | undefined
  palette?: HexColor[]
}) {
  const setSlot = useCompositionStore((s) => s.setSlot)
  const designerSwatches = useCompositionStore((s) => s.designerSwatches)
  const freeInputRef = useRef<HTMLInputElement>(null)

  const allowed: ColorSlotSource[] =
    slot.constraints.allowedSources ??
    (slot.constraints.paletteOnly ? ['brand'] : ['brand', 'custom', 'free'])

  function pick(hex: string) {
    setSlot(slot.key, { type: 'color', hex: hex as HexColor })
  }

  return (
    <div>
      <div className="fw-row">
        <SlotLabel slotKey={slot.key} label={slot.label} />
        <div className="fw-row__value flex flex-wrap justify-end gap-1.5">
          {allowed.includes('brand') &&
            (palette ?? []).map((hex) => (
              <button
                key={`brand-${hex}`}
                type="button"
                onClick={() => pick(hex)}
                aria-label={hex}
                className="fw-swatch"
                style={{
                  background: hex,
                  outline: value.toLowerCase() === hex.toLowerCase() ? '2px solid var(--fg)' : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}

          {allowed.includes('custom') &&
            designerSwatches.map((hex) => (
              <button
                key={`custom-${hex}`}
                type="button"
                onClick={() => pick(hex)}
                aria-label={hex}
                className="fw-swatch"
                style={{
                  background: hex,
                  outline: value.toLowerCase() === hex.toLowerCase() ? '2px solid var(--fg)' : 'none',
                  outlineOffset: '2px',
                  borderStyle: 'dashed',
                }}
                title={`Designer custom · ${hex}`}
              />
            ))}

          {allowed.includes('free') ? (
            <>
              <button
                type="button"
                className="fw-swatch fw-swatch--add"
                onClick={() => freeInputRef.current?.click()}
                title="Pick any color"
              >
                +
              </button>
              <input
                ref={freeInputRef}
                type="color"
                value={value || slot.default || '#000000'}
                onChange={(e) => pick(e.target.value)}
                className="hidden"
              />
            </>
          ) : null}
        </div>
      </div>
      {error ? <div className="text-[10px] text-[var(--danger)]">{error.message}</div> : null}
    </div>
  )
}
