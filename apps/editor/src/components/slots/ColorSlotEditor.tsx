import type { ColorSlotDefinition, HexColor } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'

interface Props {
  slot: ColorSlotDefinition
  value: string
  error: SlotValidationError | undefined
  /** Brand palette swatches when paletteOnly is true; passed via props for now. */
  palette?: HexColor[]
}

export function ColorSlotEditor({ slot, value, error, palette }: Props) {
  const setSlot = useCompositionStore((s) => s.setSlot)

  if (slot.constraints.paletteOnly && palette?.length) {
    return (
      <div>
        <div className="text-sm">{slot.label}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {palette.map((hex) => (
            <button
              key={hex}
              onClick={() => setSlot(slot.key, { type: 'color', hex })}
              aria-label={hex}
              className={
                'h-7 w-7 rounded-full border ' +
                (value === hex ? 'border-[var(--fg)]' : 'border-[var(--line)]')
              }
              style={{ background: hex }}
            />
          ))}
        </div>
        {error ? <div className="mt-1 text-[11px] text-red-400">{error.message}</div> : null}
      </div>
    )
  }

  return (
    <label className="block">
      <span className="text-sm">{slot.label}</span>
      <input
        type="color"
        value={value || slot.default || '#000000'}
        onChange={(e) => setSlot(slot.key, { type: 'color', hex: e.target.value as HexColor })}
        className="mt-1.5 h-9 w-full rounded border border-[var(--line)] bg-transparent"
      />
      {error ? <div className="mt-1 text-[11px] text-red-400">{error.message}</div> : null}
    </label>
  )
}
