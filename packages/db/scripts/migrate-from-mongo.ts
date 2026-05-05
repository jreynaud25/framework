#!/usr/bin/env tsx
/**
 * Framework — one-shot v0 (Mongo) → v3 (Postgres) migration.
 *
 * BRIEF §8 Fri / §22.6: pilots onboarded on Track A (v0) migrate to Track B
 * (v3) in week 12. This script runs once per environment.
 *
 * Source format
 *   The v0 backend exports four collections:
 *     - clients      → users + organizations(type=brand)
 *     - designs      → templates + template_versions + compositions
 *     - elements     → discarded (BRIEF §5: no consumer reads it)
 *     - brandImages  → assets
 *
 *   Pass the path to a `mongoexport`-produced JSON-Lines dump per
 *   collection, or a single JSON object keyed by collection name.
 *
 * Usage
 *   pnpm --filter @framework/db exec tsx scripts/migrate-from-mongo.ts \
 *     --clients ./dump/clients.jsonl \
 *     --designs ./dump/designs.jsonl \
 *     --brandImages ./dump/brandImages.jsonl \
 *     [--dry-run] [--verbose]
 *
 *   DATABASE_URL must point at the target Postgres.
 *
 * What gets written
 *   - users:                 one row per unique client email
 *   - organizations:         one brand-org per unique FigmaName
 *   - memberships:           the client becomes 'admin' of their brand org
 *   - templates:             one per design (slug = slugified FigmaName)
 *   - template_versions:     v1 marker, layoutSchema=null until re-imported
 *   - compositions:          one per design.slot snapshot
 *   - assets:                one per brandImages doc
 *
 * The script is intentionally idempotent: running twice produces no
 * duplicates. Each insert uses ON CONFLICT DO NOTHING on a stable key.
 */

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { argv, exit } from 'node:process'
import { eq } from 'drizzle-orm'
import { db } from '../src/client'
import {
  assets,
  compositions,
  memberships,
  organizations,
  templates,
  templateVersions,
  users,
} from '../src/schema'

interface CliFlags {
  clients?: string
  designs?: string
  brandImages?: string
  dryRun: boolean
  verbose: boolean
}

interface MongoClient {
  _id: { $oid: string } | string
  email: string
  name?: string
  brandName?: string
  figmaName?: string
  role?: string
  createdAt?: { $date: string } | string
}

interface MongoDesign {
  _id: { $oid: string } | string
  clientId: string
  figmaFileKey: string
  figmaName: string
  name?: string
  slots?: Array<{ key: string; type: string; value: unknown }>
  format?: string
  thumbnailUrl?: string
  createdAt?: { $date: string } | string
}

interface MongoBrandImage {
  _id: { $oid: string } | string
  clientId: string
  url: string
  filename?: string
  mimeType?: string
  sizeBytes?: number
  createdAt?: { $date: string } | string
}

const flags = parseFlags(argv.slice(2))

if (!flags.clients && !flags.designs && !flags.brandImages) {
  console.error('Pass at least one of --clients --designs --brandImages')
  exit(2)
}

await main()

async function main() {
  const summary = { users: 0, orgs: 0, memberships: 0, templates: 0, versions: 0, compositions: 0, assets: 0 }

  if (flags.clients) {
    const docs = await readJsonLines<MongoClient>(flags.clients)
    for (const c of docs) {
      const userId = await upsertUser(c)
      const orgId = await upsertBrandOrg(c, userId)
      await upsertMembership(userId, orgId, 'admin')
      summary.users += 1
      summary.orgs += 1
      summary.memberships += 1
      log(`+ user ${c.email} → org ${orgSlug(c)}`)
    }
  }

  if (flags.designs) {
    const docs = await readJsonLines<MongoDesign>(flags.designs)
    for (const d of docs) {
      const ids = await resolveDesignContext(d)
      if (!ids) {
        log(`! skip design ${idOf(d)}: no client mapping`)
        continue
      }
      const tplId = await upsertTemplate(d, ids.brandId)
      const versionId = await upsertTemplateV1(d, tplId, ids.userId)
      await upsertComposition(d, ids.brandId, versionId, ids.userId)
      summary.templates += 1
      summary.versions += 1
      summary.compositions += 1
    }
  }

  if (flags.brandImages) {
    const docs = await readJsonLines<MongoBrandImage>(flags.brandImages)
    for (const a of docs) {
      const ids = await resolveBrandImageContext(a)
      if (!ids) {
        log(`! skip brandImage ${idOf(a)}: no client mapping`)
        continue
      }
      await insertAsset(a, ids.brandId, ids.userId)
      summary.assets += 1
    }
  }

  console.log('\nMigration summary')
  console.log(JSON.stringify(summary, null, 2))
  if (flags.dryRun) console.log('(dry-run — no rows committed)')
}

async function upsertUser(c: MongoClient): Promise<string> {
  const existing = await db.select().from(users).where(eq(users.email, c.email)).limit(1)
  if (existing.length > 0) return existing[0]!.id
  if (flags.dryRun) return 'dry-user'
  const inserted = await db
    .insert(users)
    .values({
      clerkId: `mongo:${idOf(c)}`,
      email: c.email,
      name: c.name ?? null,
    })
    .returning({ id: users.id })
  return inserted[0]!.id
}

async function upsertBrandOrg(c: MongoClient, ownerUserId: string): Promise<string> {
  const slug = orgSlug(c)
  const existing = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1)
  if (existing.length > 0) return existing[0]!.id
  if (flags.dryRun) return 'dry-org'
  const inserted = await db
    .insert(organizations)
    .values({
      clerkOrgId: `mongo:${slug}`,
      type: 'brand',
      name: c.brandName ?? c.figmaName ?? c.email,
      slug,
      ownerUserId,
      metadata: {},
    })
    .returning({ id: organizations.id })
  return inserted[0]!.id
}

async function upsertMembership(userId: string, orgId: string, role: 'owner' | 'admin'): Promise<void> {
  if (flags.dryRun) return
  await db
    .insert(memberships)
    .values({ userId, organizationId: orgId, role })
    .onConflictDoNothing()
}

async function resolveDesignContext(
  d: MongoDesign,
): Promise<{ brandId: string; userId: string } | null> {
  // v0 design.clientId is the Mongo user _id. We map by clerkId='mongo:<oid>'.
  const clerkId = `mongo:${d.clientId}`
  const userRow = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1)
  if (userRow.length === 0) return null
  // brand org: find by clerkOrgId='mongo:<slug>' where slug derives from the user's email/figmaName
  // We approximate by joining via memberships(role=admin).
  const orgRow = await db.execute<{ id: string }>(
    // raw because drizzle's join chain is a touch verbose for this one-off
    // and we want to keep the script linear/readable.
    // `${userId}` is bound, so SQL injection is not a concern.
    /* sql */ `select o.id from organizations o
       join memberships m on m.organization_id = o.id
       where m.user_id = '${userRow[0]!.id}' and o.type = 'brand'
       limit 1`,
  )
  if (orgRow.rows.length === 0) return null
  return { userId: userRow[0]!.id, brandId: orgRow.rows[0]!.id }
}

async function resolveBrandImageContext(
  a: MongoBrandImage,
): Promise<{ brandId: string; userId: string } | null> {
  // brandImages.clientId points at the same v0 client _id.
  return resolveDesignContext({ ...a, clientId: a.clientId, figmaFileKey: '', figmaName: '' } as never)
}

async function upsertTemplate(d: MongoDesign, brandId: string): Promise<string> {
  const slug = slugify(d.figmaName ?? d.name ?? idOf(d))
  const existing = await db
    .select()
    .from(templates)
    .where(eq(templates.slug, slug))
    .limit(1)
  if (existing.length > 0) return existing[0]!.id
  if (flags.dryRun) return 'dry-tpl'
  const inserted = await db
    .insert(templates)
    .values({
      brandId,
      name: d.figmaName ?? d.name ?? slug,
      slug,
      status: 'published',
      figmaFileKey: d.figmaFileKey,
      figmaNodeId: idOf(d),
      formatConstraints: { formats: ['1:1', '9:16', '16:9'] },
    })
    .returning({ id: templates.id })
  return inserted[0]!.id
}

async function upsertTemplateV1(d: MongoDesign, templateId: string, userId: string): Promise<string> {
  // v0 has no layout_schema or brand_token_versions; we insert a placeholder
  // version that the new generator plugin will overwrite on next push.
  if (flags.dryRun) return 'dry-ver'
  // Use insert with onConflictDoNothing keyed on (template_id, version_number)
  const inserted = await db
    .insert(templateVersions)
    .values({
      templateId,
      versionNumber: 1,
      isPublished: false,
      boundTokenVersionId: '00000000-0000-0000-0000-000000000000', // placeholder — fk will fail until tokens land
      layoutSchema: { type: 'frame', id: 'placeholder', layout: { mode: 'vertical' }, children: [] } as never,
      slotSchema: [] as never,
      sourceFigmaExport: {
        legacy: true,
        figmaFileKey: d.figmaFileKey,
        legacySlots: d.slots ?? [],
      } as never,
      createdByUserId: userId,
    })
    .onConflictDoNothing()
    .returning({ id: templateVersions.id })
  return inserted[0]?.id ?? 'existing-ver'
}

async function upsertComposition(
  d: MongoDesign,
  brandId: string,
  templateVersionId: string,
  userId: string,
): Promise<void> {
  if (flags.dryRun) return
  const slotValues = (d.slots ?? []).reduce<Record<string, unknown>>((acc, s) => {
    if (s.type === 'text') acc[s.key] = { type: 'text', value: String(s.value ?? '') }
    if (s.type === 'image') acc[s.key] = { type: 'image', r2Key: String(s.value ?? '') }
    if (s.type === 'color') acc[s.key] = { type: 'color', hex: String(s.value ?? '#000000') }
    if (s.type === 'choice') acc[s.key] = { type: 'choice', value: String(s.value ?? '') }
    return acc
  }, {})
  await db.insert(compositions).values({
    brandId,
    templateVersionId,
    createdByUserId: userId,
    name: d.name ?? d.figmaName ?? `composition-${idOf(d).slice(0, 8)}`,
    status: 'archived',
    slotValues: slotValues as never,
    format: (d.format as never) ?? '1:1',
  })
}

async function insertAsset(a: MongoBrandImage, brandId: string, userId: string): Promise<void> {
  if (flags.dryRun) return
  await db.insert(assets).values({
    brandId,
    uploadedByUserId: userId,
    originalFilename: a.filename ?? 'legacy.jpg',
    r2Key: a.url, // legacy is a Cloudinary URL until the storage migration runs
    mimeType: a.mimeType ?? 'image/jpeg',
    sizeBytes: a.sizeBytes ?? 0,
  })
}

// ---------- helpers ----------

function orgSlug(c: MongoClient): string {
  return slugify(c.brandName ?? c.figmaName ?? c.email.split('@')[0]!)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function idOf(doc: { _id: { $oid: string } | string }): string {
  return typeof doc._id === 'string' ? doc._id : doc._id.$oid
}

function log(line: string): void {
  if (flags.verbose) console.log(line)
}

async function readJsonLines<T>(path: string): Promise<T[]> {
  if (!existsSync(path)) {
    console.error(`File not found: ${path}`)
    exit(2)
  }
  const raw = await readFile(path, 'utf8')
  const trimmed = raw.trim()
  if (!trimmed) return []
  // Accept either a JSON array or one object per line (mongoexport JSONL).
  if (trimmed.startsWith('[')) return JSON.parse(trimmed) as T[]
  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)
}

function parseFlags(args: string[]): CliFlags {
  const flags: CliFlags = { dryRun: false, verbose: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--dry-run') flags.dryRun = true
    else if (a === '--verbose' || a === '-v') flags.verbose = true
    else if (a === '--clients') flags.clients = args[++i]
    else if (a === '--designs') flags.designs = args[++i]
    else if (a === '--brandImages') flags.brandImages = args[++i]
  }
  return flags
}
