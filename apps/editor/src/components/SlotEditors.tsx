import type { SlotDefinition, SlotSchema } from '@framework/types'
import type { SlotValidationError } from '@framework/renderer'
import { useCompositionStore } from '@/state/composition'
import { TextSlotEditor } from './slots/TextSlotEditor'
import { ImageSlotEditor } from './slots/ImageSlotEditor'
import { ChoiceSlotEditor } from './slots/ChoiceSlotEditor'
import { ColorSlotEditor } from './slots/ColorSlotEditor'

interface Props {
  schema: SlotSchema
  errors: SlotValidationError[]
}

export function SlotEditors({ schema, errors }: Props) {
  const slotValues = useCompositionStore((s) => s.slotValues)
  const errorMap = new Map(errors.map((e) => [e.slotKey, e]))

  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-widest text-[var(--muted)]">Content</div>
      {schema.map((slot) => (
        <SlotEditor
          key={slot.key}
          slot={slot}
          value={slotValues[slot.key]}
          error={errorMap.get(slot.key)}
        />
      ))}
    </div>
  )
}

function SlotEditor({
  slot,
  value,
  error,
}: {
  slot: SlotDefinition
  value: ReturnType<typeof useCompositionStore.getState>['slotValues'][string]
  error: SlotValidationError | undefined
}) {
  switch (slot.type) {
    case 'text':
      return <TextSlotEditor slot={slot} value={value?.type === 'text' ? value.value : ''} error={error} />
    case 'image':
      return <ImageSlotEditor slot={slot} value={value?.type === 'image' ? value : undefined} error={error} />
    case 'choice':
      return <ChoiceSlotEditor slot={slot} value={value?.type === 'choice' ? value.value : ''} error={error} />
    case 'color':
      return <ColorSlotEditor slot={slot} value={value?.type === 'color' ? value.hex : ''} error={error} />
  }
}
