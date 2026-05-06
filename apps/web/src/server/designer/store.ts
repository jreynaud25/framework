import 'server-only'
import type { SlotDefinition } from '@framework/types'

/**
 * In-memory designer-side store.
 *
 * Until Postgres is wired, designer actions (edit slot config, reply to a
 * comment, delete a template) mutate this module. Module-scope state
 * persists across requests in the same Next.js dev / Worker instance —
 * good enough for demoing the UI flows. Real persistence lands when the
 * Drizzle inserts in /api/* go live.
 *
 * Import paths into this module are server-only.
 */

export interface TemplateRecord {
  id: string
  brandSlug: string
  brandName: string
  slug: string
  name: string
  isNew: boolean
  formats: string[]
  publishedAt: string
  /** Editable surface — what the brand client can change. */
  slots: SlotDefinition[]
  /** Pinned client comments + replies. */
  comments: Comment[]
  /** Soft-delete; hidden from grids when true. */
  deleted: boolean
}

export interface Comment {
  id: string
  authorName: string
  authorRole: 'admin' | 'editor'
  brandSlug: string
  body: string
  pinnedToSlotKey?: string
  status: 'open' | 'addressed' | 'wontfix'
  createdAt: string
  replies: CommentReply[]
}

export interface CommentReply {
  id: string
  authorName: string
  authorRole: 'designer' | 'admin' | 'editor'
  body: string
  createdAt: string
}

/** ---------------- seed ---------------- */

function nowIso(daysAgo = 0): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString()
}

const SEED: TemplateRecord[] = [
  {
    id: 'tpl-spring-drop',
    brandSlug: '3070',
    brandName: '30 70 Agency',
    slug: 'spring-drop',
    name: 'Spring Drop',
    isNew: true,
    formats: ['1:1', '9:16', '16:9'],
    publishedAt: nowIso(2),
    slots: [
      {
        type: 'text',
        key: 'kicker',
        label: 'Kicker',
        constraints: { maxChars: 24, required: false },
        default: 'COLLECTION',
      },
      {
        type: 'text',
        key: 'title',
        label: 'Title',
        constraints: { maxChars: 40, required: true },
        default: 'SPRING DROP 2026',
      },
      {
        type: 'text',
        key: 'date',
        label: 'Date',
        constraints: { maxChars: 32, required: false },
        default: 'April 12 — 21',
      },
      {
        type: 'text',
        key: 'venue',
        label: 'Venue',
        constraints: { maxChars: 24, required: false },
        default: 'PARIS',
      },
      {
        type: 'color',
        key: 'accent',
        label: 'Accent color',
        constraints: { paletteOnly: true },
        default: '#FF0033',
      },
    ],
    comments: [
      {
        id: 'c-1',
        authorName: 'Sara · 30 70 Agency',
        authorRole: 'admin',
        brandSlug: '3070',
        body: 'The date feels too heavy — can it drop a weight?',
        pinnedToSlotKey: 'date',
        status: 'open',
        createdAt: nowIso(1),
        replies: [],
      },
      {
        id: 'c-2',
        authorName: 'Pablo · 30 70 Agency',
        authorRole: 'editor',
        brandSlug: '3070',
        body: 'Could the kicker allow more characters? "EARLY ACCESS DROP" doesn\'t fit.',
        pinnedToSlotKey: 'kicker',
        status: 'open',
        createdAt: nowIso(0),
        replies: [],
      },
    ],
    deleted: false,
  },
  {
    id: 'tpl-lookbook',
    brandSlug: '3070',
    brandName: '30 70 Agency',
    slug: 'lookbook-cover',
    name: 'Lookbook Cover',
    isNew: false,
    formats: ['1:1', '4:5'],
    publishedAt: nowIso(14),
    slots: [
      {
        type: 'text',
        key: 'title',
        label: 'Title',
        constraints: { maxChars: 32, required: true },
      },
      {
        type: 'image',
        key: 'cover',
        label: 'Cover image',
        constraints: { aspectRatio: 4 / 5, required: true },
      },
    ],
    comments: [],
    deleted: false,
  },
]

const STORE = new Map<string, TemplateRecord>(SEED.map((t) => [t.id, t]))

/** ---------------- accessors ---------------- */

export function listTemplatesForDesigner(): TemplateRecord[] {
  return [...STORE.values()].filter((t) => !t.deleted).sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  )
}

export function getTemplate(brandSlug: string, templateSlug: string): TemplateRecord | undefined {
  for (const t of STORE.values()) {
    if (t.brandSlug === brandSlug && t.slug === templateSlug && !t.deleted) return t
  }
  return undefined
}

export function updateSlots(
  brandSlug: string,
  templateSlug: string,
  slots: SlotDefinition[],
): TemplateRecord | undefined {
  const tpl = getTemplate(brandSlug, templateSlug)
  if (!tpl) return undefined
  tpl.slots = slots
  return tpl
}

export function softDeleteTemplate(brandSlug: string, templateSlug: string): boolean {
  const tpl = getTemplate(brandSlug, templateSlug)
  if (!tpl) return false
  tpl.deleted = true
  return true
}

export function addCommentReply(
  brandSlug: string,
  templateSlug: string,
  commentId: string,
  reply: { authorName: string; body: string },
): boolean {
  const tpl = getTemplate(brandSlug, templateSlug)
  if (!tpl) return false
  const c = tpl.comments.find((x) => x.id === commentId)
  if (!c) return false
  c.replies.push({
    id: `r-${Date.now()}`,
    authorName: reply.authorName,
    authorRole: 'designer',
    body: reply.body,
    createdAt: new Date().toISOString(),
  })
  return true
}

export function setCommentStatus(
  brandSlug: string,
  templateSlug: string,
  commentId: string,
  status: Comment['status'],
): boolean {
  const tpl = getTemplate(brandSlug, templateSlug)
  if (!tpl) return false
  const c = tpl.comments.find((x) => x.id === commentId)
  if (!c) return false
  c.status = status
  return true
}

export function totalOpenCommentsForBrand(brandSlug: string): number {
  let n = 0
  for (const t of STORE.values()) {
    if (t.brandSlug !== brandSlug || t.deleted) continue
    n += t.comments.filter((c) => c.status === 'open').length
  }
  return n
}

export function totalOpenCommentsForTemplate(templateId: string): number {
  const t = STORE.get(templateId)
  if (!t || t.deleted) return 0
  return t.comments.filter((c) => c.status === 'open').length
}
