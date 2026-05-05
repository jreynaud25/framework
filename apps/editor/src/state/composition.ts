import { create } from 'zustand'
import type { Format, SlotValues } from '@framework/types'

interface CompositionState {
  format: Format
  slotValues: SlotValues
  setFormat: (f: Format) => void
  setSlot: (key: string, value: SlotValues[string]) => void
  setText: (key: string, value: string) => void
  hydrate: (init: { format: Format; slotValues: SlotValues }) => void
}

export const useCompositionStore = create<CompositionState>((set) => ({
  format: '1:1',
  slotValues: {},
  setFormat: (f) => set({ format: f }),
  setSlot: (key, value) =>
    set((s) => ({ slotValues: { ...s.slotValues, [key]: value } })),
  setText: (key, value) =>
    set((s) => ({ slotValues: { ...s.slotValues, [key]: { type: 'text', value } } })),
  hydrate: ({ format, slotValues }) => set({ format, slotValues }),
}))
