import { create } from 'zustand'
import type {
  BrandTokens,
  Format,
  HexColor,
  LayoutNode,
  SlotSchema,
  SlotValues,
} from '@framework/types'

export interface EditorProject {
  templateId: string
  templateName: string
  brandName: string
  layout: LayoutNode
  tokens: BrandTokens
  slotSchema: SlotSchema
  initialSlotValues: SlotValues
  formats: Format[]
}

interface EditorState {
  project: EditorProject | null
  format: Format
  slotValues: SlotValues
  setProject: (project: EditorProject) => void
  setFormat: (format: Format) => void
  setText: (slotKey: string, text: string) => void
  setChoice: (slotKey: string, value: string) => void
  setColor: (slotKey: string, hex: HexColor) => void
  setImage: (slotKey: string, r2Key: string, treatedR2Key?: string) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  project: null,
  format: '1:1',
  slotValues: {},
  setProject: (project) =>
    set({
      project,
      format: project.formats[0] ?? '1:1',
      slotValues: project.initialSlotValues,
    }),
  setFormat: (format) => set({ format }),
  setText: (slotKey, text) =>
    set((s) => ({
      slotValues: { ...s.slotValues, [slotKey]: { type: 'text', value: text } },
    })),
  setChoice: (slotKey, value) =>
    set((s) => ({
      slotValues: { ...s.slotValues, [slotKey]: { type: 'choice', value } },
    })),
  setColor: (slotKey, hex) =>
    set((s) => ({
      slotValues: { ...s.slotValues, [slotKey]: { type: 'color', hex } },
    })),
  setImage: (slotKey, r2Key, treatedR2Key) =>
    set((s) => ({
      slotValues: {
        ...s.slotValues,
        [slotKey]: { type: 'image', r2Key: r2Key as never, treatedR2Key: treatedR2Key as never },
      },
    })),
}))
