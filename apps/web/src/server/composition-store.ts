import 'server-only'
import type { Format, SlotValues } from '@framework/types'

/**
 * Composition store: a client's saved snapshots of slot values against a
 * specific template + format. Created on Export PNG so the client builds an
 * exportable history they can re-open and modify later.
 *
 * Dev mode: globalThis-pinned Map so it survives HMR within one `next dev`
 * process. Prod: swap the body for Drizzle writes against a `compositions`
 * table — the route layer doesn't change.
 */

export interface SavedComposition {
  id: string
  brandSlug: string
  templateSlug: string
  format: Format
  slotValues: SlotValues
  /** Human-readable label — defaults to the most prominent text slot value. */
  name: string
  createdAt: string
  updatedAt: string
}

interface StoreState {
  byId: Map<string, SavedComposition>
}

declare global {
  // eslint-disable-next-line no-var
  var __frameworkCompositionStore: StoreState | undefined
}

function state(): StoreState {
  if (!globalThis.__frameworkCompositionStore) {
    globalThis.__frameworkCompositionStore = { byId: new Map() }
  }
  return globalThis.__frameworkCompositionStore
}

function newId(): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `comp_${t}_${r}`
}

/** Pick a name from slotValues — first non-empty text slot, else "Untitled". */
function nameFromSlotValues(slotValues: SlotValues): string {
  for (const value of Object.values(slotValues)) {
    if (value?.type === 'text' && typeof value.value === 'string') {
      const trimmed = value.value.trim()
      if (trimmed) return trimmed.length > 48 ? trimmed.slice(0, 48) + '…' : trimmed
    }
  }
  return 'Untitled'
}

export function saveComposition(input: {
  brandSlug: string
  templateSlug: string
  format: Format
  slotValues: SlotValues
  name?: string
}): SavedComposition {
  const now = new Date().toISOString()
  const record: SavedComposition = {
    id: newId(),
    brandSlug: input.brandSlug,
    templateSlug: input.templateSlug,
    format: input.format,
    slotValues: input.slotValues,
    name: input.name?.trim() || nameFromSlotValues(input.slotValues),
    createdAt: now,
    updatedAt: now,
  }
  state().byId.set(record.id, record)
  return record
}

export function updateComposition(
  id: string,
  patch: { slotValues?: SlotValues; format?: Format; name?: string },
): SavedComposition | null {
  const existing = state().byId.get(id)
  if (!existing) return null
  const next: SavedComposition = {
    ...existing,
    slotValues: patch.slotValues ?? existing.slotValues,
    format: patch.format ?? existing.format,
    name: patch.name?.trim() || (patch.slotValues ? nameFromSlotValues(patch.slotValues) : existing.name),
    updatedAt: new Date().toISOString(),
  }
  state().byId.set(id, next)
  return next
}

export function getComposition(id: string): SavedComposition | null {
  return state().byId.get(id) ?? null
}

export function listCompositionsForTemplate(brandSlug: string, templateSlug: string): SavedComposition[] {
  return Array.from(state().byId.values())
    .filter((c) => c.brandSlug === brandSlug && c.templateSlug === templateSlug)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function listCompositionsForBrand(brandSlug: string): SavedComposition[] {
  return Array.from(state().byId.values())
    .filter((c) => c.brandSlug === brandSlug)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function deleteComposition(id: string): boolean {
  return state().byId.delete(id)
}
