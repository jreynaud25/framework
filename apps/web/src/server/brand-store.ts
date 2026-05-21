import 'server-only'

export type BrandIndustry = 'fashion' | 'luxury' | 'hospitality' | 'other'

export interface BrandRecord {
  id: string
  slug: string
  name: string
  industry?: BrandIndustry
  primaryColor?: string
  /** Email of the brand contact; receives one invite on the first template push. */
  clientEmail?: string
  /** ISO timestamp of when the invite email went out (one-shot). */
  inviteSentAt?: string
  /** Designer who owns this brand. V1 placeholder = 'default-designer'. */
  ownerUserId: string
  createdAt: string
  updatedAt: string
}

interface StoreState {
  brands: Map<string, BrandRecord>
}

declare global {
  // eslint-disable-next-line no-var
  var __frameworkBrandStore: StoreState | undefined
}

function state(): StoreState {
  if (!globalThis.__frameworkBrandStore) {
    const initial: StoreState = { brands: new Map() }
    // Seed the known mock brand so the dashboard reflects it and existing
    // templates pushed to "3070" stay aligned.
    initial.brands.set('3070', {
      id: 'brand_3070',
      slug: '3070',
      name: '30 70 Agency',
      industry: 'fashion',
      primaryColor: '#FF0033',
      ownerUserId: 'default-designer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    globalThis.__frameworkBrandStore = initial
  }
  return globalThis.__frameworkBrandStore!
}

function newId(): string {
  return `brand_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export interface CreateBrandInput {
  slug: string
  name: string
  industry?: BrandIndustry
  primaryColor?: string
  clientEmail?: string
  ownerUserId?: string
}

export function createBrand(input: CreateBrandInput): BrandRecord {
  const s = state()
  if (s.brands.has(input.slug)) throw new Error('slug_taken')
  const now = new Date().toISOString()
  const record: BrandRecord = {
    id: newId(),
    slug: input.slug,
    name: input.name,
    industry: input.industry,
    primaryColor: input.primaryColor,
    clientEmail: input.clientEmail,
    ownerUserId: input.ownerUserId ?? 'default-designer',
    createdAt: now,
    updatedAt: now,
  }
  s.brands.set(input.slug, record)
  return record
}

export function getBrand(slug: string): BrandRecord | null {
  return state().brands.get(slug) ?? null
}

export function listBrands(ownerUserId?: string): BrandRecord[] {
  const all = Array.from(state().brands.values())
  return ownerUserId ? all.filter((b) => b.ownerUserId === ownerUserId) : all
}

export function updateBrand(
  slug: string,
  patch: Partial<Omit<BrandRecord, 'id' | 'slug' | 'createdAt' | 'ownerUserId'>>,
): BrandRecord | null {
  const existing = state().brands.get(slug)
  if (!existing) return null
  const updated: BrandRecord = { ...existing, ...patch, updatedAt: new Date().toISOString() }
  state().brands.set(slug, updated)
  return updated
}

export function deleteBrand(slug: string): boolean {
  return state().brands.delete(slug)
}

/**
 * Auto-create a brand record if a template is pushed to a slug we don't
 * have a record for. Keeps the legacy / curl-test flow working.
 */
export function ensureBrandExists(slug: string, opts?: { ownerUserId?: string; name?: string }): BrandRecord {
  const existing = getBrand(slug)
  if (existing) return existing
  return createBrand({
    slug,
    name: opts?.name ?? slug,
    ownerUserId: opts?.ownerUserId,
  })
}
