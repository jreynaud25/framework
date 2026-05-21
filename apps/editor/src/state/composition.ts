import { create } from 'zustand'
import type { ColorSlotSource, Fill, Format, SlotValues } from '@framework/types'

export interface DesignerMark {
  nodeId: string
  slotKey: string
  type: 'text' | 'image' | 'color'
  defaultValue?: string
  label: string
  /** For color marks: which sources the client can pick from. */
  allowedSources?: ColorSlotSource[]
  /** For image marks: how the image fills the frame. Client can drag to
   *  reposition the crop when fit = cover. */
  imageFit?: 'cover' | 'contain'
}

interface CompositionState {
  format: Format
  slotValues: SlotValues
  designerMode: boolean
  marks: Record<string, DesignerMark>
  /** User-renameable per-format labels. Keyed by Format string. */
  formatLabels: Record<string, string>
  /** Designer-renamed slot labels. Keyed by slotKey. */
  slotLabelOverrides: Record<string, string>
  /** Designer-renamed template name (null = use original). */
  templateNameOverride: string | null
  /** Slot keys hidden from the client view + filtered out on Publish. */
  excludedSlotKeys: string[]
  /** Family names known to be missing in the document. */
  missingFonts: string[]

  /** Designer-mode block selection — set when designer clicks a frame/shape. */
  selectedNodeId: string | null
  /** Designer-applied fill overrides per layout node. Replaces node.style.fills. */
  blockFillOverrides: Record<string, Fill[]>
  /** Designer-applied translate offsets per layout node (drag-to-position). */
  blockOffsets: Record<string, { x: number; y: number }>
  /** Designer-added custom swatches in addition to brand palette. */
  designerSwatches: string[]

  /** Designer-overridden constraints on existing slots (keyed by slot key).
   *  Applied on top of the original schema; baked in on Publish. */
  slotConfigOverrides: Record<string, { allowedSources?: ColorSlotSource[]; fit?: 'cover' | 'contain' }>

  /** Designer-chosen order for the sidebar slot list. Keyed by slot key. */
  slotOrder: string[]

  /** ID of the SavedComposition currently being edited (null = unsaved). */
  currentCompositionId: string | null

  setFormat: (f: Format) => void
  setSlot: (key: string, value: SlotValues[string]) => void
  setText: (key: string, value: string) => void
  hydrate: (init: {
    format: Format
    slotValues: SlotValues
    formatLabels?: Record<string, string>
    slotLabelOverrides?: Record<string, string>
    templateNameOverride?: string | null
    excludedSlotKeys?: string[]
    blockFillOverrides?: Record<string, Fill[]>
    designerSwatches?: string[]
  }) => void

  setDesignerMode: (on: boolean) => void
  toggleMark: (mark: DesignerMark) => void
  removeMark: (slotKey: string) => void
  clearMarks: () => void
  setFormatLabel: (format: string, label: string) => void
  setSlotLabel: (slotKey: string, label: string) => void
  setTemplateName: (name: string | null) => void
  excludeSlot: (slotKey: string) => void
  unexcludeSlot: (slotKey: string) => void
  setMissingFonts: (families: string[]) => void

  setSelectedNode: (id: string | null) => void
  setBlockFill: (nodeId: string, fills: Fill[] | null) => void
  setBlockOffset: (nodeId: string, offset: { x: number; y: number } | null) => void
  addDesignerSwatch: (color: string) => void
  removeDesignerSwatch: (color: string) => void
  setCurrentCompositionId: (id: string | null) => void
  updateMark: (nodeId: string, patch: Partial<DesignerMark>) => void
  setSlotConfig: (slotKey: string, patch: { allowedSources?: ColorSlotSource[]; fit?: 'cover' | 'contain' }) => void
  setSlotOrder: (order: string[]) => void
}

export const useCompositionStore = create<CompositionState>((set) => ({
  format: '1:1',
  slotValues: {},
  designerMode: false,
  marks: {},
  formatLabels: {},
  slotLabelOverrides: {},
  templateNameOverride: null,
  excludedSlotKeys: [],
  missingFonts: [],
  selectedNodeId: null,
  blockFillOverrides: {},
  blockOffsets: {},
  designerSwatches: [],
  slotConfigOverrides: {},
  slotOrder: [],
  currentCompositionId: null,

  setFormat: (f) => set({ format: f }),
  setSlot: (key, value) =>
    set((s) => ({ slotValues: { ...s.slotValues, [key]: value } })),
  setText: (key, value) =>
    set((s) => ({ slotValues: { ...s.slotValues, [key]: { type: 'text', value } } })),
  hydrate: (init) =>
    set({
      format: init.format,
      slotValues: init.slotValues,
      marks: {},
      designerMode: false,
      formatLabels: init.formatLabels ?? {},
      slotLabelOverrides: init.slotLabelOverrides ?? {},
      templateNameOverride: init.templateNameOverride ?? null,
      excludedSlotKeys: init.excludedSlotKeys ?? [],
      blockFillOverrides: init.blockFillOverrides ?? {},
      designerSwatches: init.designerSwatches ?? [],
      selectedNodeId: null,
      currentCompositionId: null,
    }),

  setDesignerMode: (on) => set({ designerMode: on, selectedNodeId: on ? null : null }),
  toggleMark: (mark) =>
    set((s) => {
      const next = { ...s.marks }
      if (next[mark.nodeId]) delete next[mark.nodeId]
      else next[mark.nodeId] = mark
      return { marks: next }
    }),
  removeMark: (slotKey) =>
    set((s) => {
      const next = { ...s.marks }
      for (const [nodeId, m] of Object.entries(next)) {
        if (m.slotKey === slotKey) delete next[nodeId]
      }
      return { marks: next }
    }),
  clearMarks: () => set({ marks: {} }),
  setFormatLabel: (format, label) =>
    set((s) => ({ formatLabels: { ...s.formatLabels, [format]: label } })),
  setSlotLabel: (slotKey, label) =>
    set((s) => {
      const next = { ...s.slotLabelOverrides }
      const trimmed = label.trim()
      if (trimmed) next[slotKey] = trimmed
      else delete next[slotKey]
      return { slotLabelOverrides: next }
    }),
  setTemplateName: (name) => set({ templateNameOverride: name && name.trim() ? name.trim() : null }),
  excludeSlot: (slotKey) =>
    set((s) => (s.excludedSlotKeys.includes(slotKey) ? s : { excludedSlotKeys: [...s.excludedSlotKeys, slotKey] })),
  unexcludeSlot: (slotKey) =>
    set((s) => ({ excludedSlotKeys: s.excludedSlotKeys.filter((k) => k !== slotKey) })),
  setMissingFonts: (families) => set({ missingFonts: families }),

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setBlockFill: (nodeId, fills) =>
    set((s) => {
      const next = { ...s.blockFillOverrides }
      if (fills === null || fills.length === 0) delete next[nodeId]
      else next[nodeId] = fills
      return { blockFillOverrides: next }
    }),
  setBlockOffset: (nodeId, offset) =>
    set((s) => {
      const next = { ...s.blockOffsets }
      if (offset === null || (offset.x === 0 && offset.y === 0)) delete next[nodeId]
      else next[nodeId] = offset
      return { blockOffsets: next }
    }),
  addDesignerSwatch: (color) =>
    set((s) => (s.designerSwatches.includes(color) ? s : { designerSwatches: [...s.designerSwatches, color] })),
  removeDesignerSwatch: (color) =>
    set((s) => ({ designerSwatches: s.designerSwatches.filter((c) => c !== color) })),
  setCurrentCompositionId: (id) => set({ currentCompositionId: id }),
  updateMark: (nodeId, patch) =>
    set((s) => {
      const existing = s.marks[nodeId]
      if (!existing) return s
      return { marks: { ...s.marks, [nodeId]: { ...existing, ...patch } } }
    }),
  setSlotConfig: (slotKey, patch) =>
    set((s) => ({ slotConfigOverrides: { ...s.slotConfigOverrides, [slotKey]: { ...s.slotConfigOverrides[slotKey], ...patch } } })),
  setSlotOrder: (order) => set({ slotOrder: order }),
}))
