import 'server-only'
import type { BrandTokens, Format } from '@framework/types'
import { mockBrandBySlug } from './mock-brands'

export interface BrandLoaded {
  id: string
  slug: string
  name: string
  industry?: string
  websiteUrl?: string
  tokens: BrandTokens
  templates: Array<{
    id: string
    name: string
    slug: string
    thumbnailUrl: string
    formats: Format[]
    isNew: boolean
  }>
}

/**
 * Load a brand for hub rendering.
 *
 * Until the database is provisioned and seeded (week 1 of the 100-day plan),
 * we serve a mock from `mock-brands.ts`. Replace with a Drizzle query once
 * Supabase is wired up. Mock data lives behind this single function so the
 * swap is one-line.
 */
export async function loadBrandBySlug(slug: string): Promise<BrandLoaded | null> {
  // TODO: replace with `db.query.organizations.findFirst({ where: eq(organizations.slug, slug), … })`
  return mockBrandBySlug(slug)
}
