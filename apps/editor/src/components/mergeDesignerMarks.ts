import type {
  ColorSlotSource,
  Fill,
  HexColor,
  LayoutNode,
  SlotDefinition,
  SlotSchema,
  SlotValues,
} from '@framework/types'
import type { DesignerMark } from '@/state/composition'

function asHex(v: string | undefined): HexColor | undefined {
  if (!v) return undefined
  return /^#[0-9A-Fa-f]{3,8}$/.test(v) ? (v as HexColor) : undefined
}

/**
 * Walk a layout tree and find a node by id. Returns null if absent.
 */
export function findNode(node: LayoutNode, id: string): LayoutNode | null {
  if (node.id === id) return node
  if (node.type === 'frame') {
    for (const c of node.children) {
      const hit = findNode(c, id)
      if (hit) return hit
    }
  }
  return null
}

/**
 * Build the merged layout for rendering / publishing: for every designer
 * mark, inject `slotKey` on the matching text/image node, or
 * `style.background: slot:<key>` for color marks on frames/shapes.
 *
 * Returns a *new* tree — original is untouched.
 */
export function mergeLayoutWithMarks(
  layout: LayoutNode,
  marks: Record<string, DesignerMark>,
): LayoutNode {
  function walk(n: LayoutNode): LayoutNode {
    const mark = marks[n.id]
    if (n.type === 'frame') {
      const next = { ...n, children: n.children.map(walk) }
      if (mark && mark.type === 'color') {
        next.style = { ...(n.style ?? {}), background: `slot:${mark.slotKey}` }
      }
      return next
    }
    if (n.type === 'text' && mark && mark.type === 'text') {
      return { ...n, slotKey: mark.slotKey }
    }
    if (n.type === 'image' && mark && mark.type === 'image') {
      return { ...n, slotKey: mark.slotKey }
    }
    if (n.type === 'shape' && mark && mark.type === 'color') {
      return { ...n, style: { ...n.style, background: `slot:${mark.slotKey}` } }
    }
    return n
  }
  return walk(layout)
}

/**
 * Apply designer-mode label overrides to a slot schema. Pure: returns a new
 * array with `label` swapped for any key found in `overrides`. Used to
 * surface renamed labels to the sidebar AND to bake them into the schema
 * shipped on Publish.
 */
export function applyLabelOverrides(
  schema: SlotSchema,
  overrides: Record<string, string> | undefined,
): SlotSchema {
  if (!overrides || Object.keys(overrides).length === 0) return schema
  return schema.map((slot) =>
    overrides[slot.key] ? ({ ...slot, label: overrides[slot.key]! } as typeof slot) : slot,
  )
}

/** Drop slot definitions whose key is in `excluded`. */
export function filterExcludedSlots(schema: SlotSchema, excluded: string[]): SlotSchema {
  if (excluded.length === 0) return schema
  const set = new Set(excluded)
  return schema.filter((s) => !set.has(s.key))
}

/**
 * Apply designer-set constraint overrides (allowedSources for color slots,
 * fit for image slots) onto matching slot defs.
 */
export function applyConstraintOverrides(
  schema: SlotSchema,
  overrides: Record<string, { allowedSources?: ColorSlotSource[]; fit?: 'cover' | 'contain' }>,
): SlotSchema {
  if (Object.keys(overrides).length === 0) return schema
  return schema.map((slot) => {
    const o = overrides[slot.key]
    if (!o) return slot
    if (slot.type === 'color' && o.allowedSources) {
      return { ...slot, constraints: { ...slot.constraints, allowedSources: o.allowedSources } }
    }
    if (slot.type === 'image' && o.fit) {
      return { ...slot, constraints: { ...slot.constraints, fit: o.fit } }
    }
    return slot
  })
}

/**
 * Reorder a schema by an explicit list of slot keys. Keys not in `order`
 * keep their original positions appended at the end. Pure.
 */
export function applySlotOrder(schema: SlotSchema, order: string[]): SlotSchema {
  if (order.length === 0) return schema
  const indexed = new Map(schema.map((s) => [s.key, s]))
  const result: SlotSchema = []
  for (const key of order) {
    const s = indexed.get(key)
    if (s) {
      result.push(s)
      indexed.delete(key)
    }
  }
  // Append any leftover slots (newer than the order list) in original order.
  for (const s of schema) if (indexed.has(s.key)) result.push(s)
  return result
}

/**
 * Apply designer's block-level fill overrides to the layout. Walks the tree
 * and replaces `style.fills` (and clears `style.background` to avoid the
 * legacy fallback) on any node whose id appears in `overrides`.
 */
export function applyBlockFillOverrides(
  layout: LayoutNode,
  overrides: Record<string, Fill[]>,
): LayoutNode {
  if (Object.keys(overrides).length === 0) return layout
  function walk(n: LayoutNode): LayoutNode {
    const fills = overrides[n.id]
    if (n.type === 'frame') {
      const next = { ...n, children: n.children.map(walk) }
      if (fills) {
        next.style = { ...(n.style ?? {}), fills, background: undefined }
      }
      return next
    }
    if (fills && (n.type === 'shape' || n.type === 'image' || n.type === 'logo')) {
      return { ...n, style: { ...(n.style ?? {}), fills, background: undefined } } as LayoutNode
    }
    return n
  }
  return walk(layout)
}

/** Apply designer drag offsets as `style.offset` on each matching node. */
export function applyBlockOffsets(
  layout: LayoutNode,
  offsets: Record<string, { x: number; y: number }>,
): LayoutNode {
  if (Object.keys(offsets).length === 0) return layout
  function walk(n: LayoutNode): LayoutNode {
    const off = offsets[n.id]
    if (n.type === 'frame') {
      const next = { ...n, children: n.children.map(walk) }
      if (off) next.style = { ...(n.style ?? {}), offset: off }
      return next
    }
    if (off && (n.type === 'text' || n.type === 'image' || n.type === 'shape' || n.type === 'logo')) {
      return { ...n, style: { ...(n.style ?? {}), offset: off } } as LayoutNode
    }
    return n
  }
  return walk(layout)
}

/**
 * Merge designer marks into the slotSchema. Skips marks whose slotKey
 * already exists in the schema (treat the existing entry as authoritative).
 */
export function mergeSchemaWithMarks(
  schema: SlotSchema,
  marks: Record<string, DesignerMark>,
): SlotSchema {
  const existing = new Set(schema.map((s) => s.key))
  const additions: SlotDefinition[] = []
  for (const m of Object.values(marks)) {
    if (existing.has(m.slotKey)) continue
    if (m.type === 'text') {
      additions.push({
        type: 'text',
        key: m.slotKey,
        label: m.label,
        constraints: { maxChars: m.defaultValue ? Math.max(40, m.defaultValue.length * 2) : 80, required: false },
        default: m.defaultValue,
      })
    } else if (m.type === 'image') {
      additions.push({
        type: 'image',
        key: m.slotKey,
        label: m.label,
        constraints: { fit: m.imageFit ?? 'cover' },
      })
    } else if (m.type === 'color') {
      additions.push({
        type: 'color',
        key: m.slotKey,
        label: m.label,
        constraints: {
          allowedSources: m.allowedSources ?? ['brand', 'custom', 'free'],
        },
        default: asHex(m.defaultValue),
      })
    }
  }
  return [...schema, ...additions]
}

/**
 * Seed slotValues with defaults from designer marks so the right-sidebar
 * editors show the marked element's current text/color immediately.
 */
export function mergeValuesWithMarks(
  values: SlotValues,
  marks: Record<string, DesignerMark>,
): SlotValues {
  const next: SlotValues = { ...values }
  for (const m of Object.values(marks)) {
    if (next[m.slotKey] !== undefined) continue
    if (m.type === 'text' && m.defaultValue !== undefined) {
      next[m.slotKey] = { type: 'text', value: m.defaultValue }
    } else if (m.type === 'color') {
      const hex = asHex(m.defaultValue)
      if (hex) next[m.slotKey] = { type: 'color', hex }
    }
  }
  return next
}

/** Generate a slot key from a label / default text. */
export function generateSlotKey(label: string, type: 'text' | 'image' | 'color', existing: Set<string>, nodeId: string): string {
  const base =
    type === 'text' && label
      ? label
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 32)
      : `${type}-${nodeId.replace(/[^a-z0-9]/gi, '').slice(0, 6).toLowerCase()}`
  if (!base) return `${type}-${nodeId.slice(0, 6)}`
  let candidate = base
  let i = 2
  while (existing.has(candidate)) {
    candidate = `${base}-${i++}`
  }
  return candidate
}
