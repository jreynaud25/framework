import 'server-only'
import type { Format, LayoutNode, SlotSchema } from '@framework/types'

/**
 * Pushed-template store.
 *
 * Dev mode: in-memory Map pinned on globalThis so it survives Next.js HMR
 * reloads inside a single `next dev` process. A full restart wipes it.
 *
 * Prod mode (TODO week 5–6): replace the body of `savePushedTemplate` and
 * `getPushedTemplate` with Drizzle writes/reads against `templates` +
 * `template_versions`. The route layer above doesn't change.
 */

export interface TemplateVariant {
  format: Format
  label?: string
  canvas: { width: number; height: number }
  layout: LayoutNode
  figmaNodeId: string
}

export type TemplateStatus = 'draft' | 'published' | 'archived'

export interface PushedTemplate {
  brandSlug: string
  templateSlug: string
  name: string
  versionNumber: number
  figmaFileKey: string
  figmaNodeId: string
  formats: Format[]
  canvas?: { width: number; height: number }
  /** One layout per format. If absent (legacy push), use `layout`. */
  variants?: TemplateVariant[]
  layout: LayoutNode
  slotSchema: SlotSchema
  sourceFigmaExport?: unknown
  pushedAt: string
  /** Publication status. Defaults to 'published' on read for legacy records. */
  status?: TemplateStatus
  publishedAt?: string
  archivedAt?: string
}

interface StoreState {
  templates: Map<string, PushedTemplate>
  versionCounters: Map<string, number>
}

declare global {
  // eslint-disable-next-line no-var
  var __frameworkTemplateStore: StoreState | undefined
}

function state(): StoreState {
  if (!globalThis.__frameworkTemplateStore) {
    globalThis.__frameworkTemplateStore = {
      templates: new Map(),
      versionCounters: new Map(),
    }
  }
  return globalThis.__frameworkTemplateStore
}

const keyOf = (brandSlug: string, templateSlug: string) => `${brandSlug}/${templateSlug}`

export interface SaveTemplateInput {
  brandSlug: string
  templateSlug: string
  name: string
  figmaFileKey: string
  figmaNodeId: string
  formats: Format[]
  canvas?: { width: number; height: number }
  variants?: TemplateVariant[]
  layout: LayoutNode
  slotSchema: SlotSchema
  sourceFigmaExport?: unknown
  status?: TemplateStatus
}

export function savePushedTemplate(input: SaveTemplateInput): PushedTemplate {
  const s = state()
  const k = keyOf(input.brandSlug, input.templateSlug)
  const next = (s.versionCounters.get(k) ?? 0) + 1
  s.versionCounters.set(k, next)
  const now = new Date().toISOString()
  const status: TemplateStatus = input.status ?? 'draft'
  const record: PushedTemplate = {
    ...input,
    versionNumber: next,
    pushedAt: now,
    status,
    publishedAt: status === 'published' ? now : undefined,
    archivedAt: undefined,
  }
  s.templates.set(k, record)
  return record
}

/** Patch the status of an existing template — no new version is created. */
export function setTemplateStatus(
  brandSlug: string,
  templateSlug: string,
  status: TemplateStatus,
): PushedTemplate | null {
  const k = keyOf(brandSlug, templateSlug)
  const existing = state().templates.get(k)
  if (!existing) return null
  const now = new Date().toISOString()
  const next: PushedTemplate = {
    ...existing,
    status,
    publishedAt: status === 'published' ? now : existing.publishedAt,
    archivedAt: status === 'archived' ? now : existing.archivedAt,
  }
  state().templates.set(k, next)
  return next
}

export function getPushedTemplate(brandSlug: string, templateSlug: string): PushedTemplate | null {
  const found = state().templates.get(keyOf(brandSlug, templateSlug))
  if (!found) return null
  // Legacy records without status default to published.
  if (!found.status) return { ...found, status: 'published' }
  return found
}

export function listPushedTemplates(brandSlug: string): PushedTemplate[] {
  return Array.from(state().templates.values())
    .filter((t) => t.brandSlug === brandSlug)
    .map((t) => (t.status ? t : { ...t, status: 'published' as const }))
}
