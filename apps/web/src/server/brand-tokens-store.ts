import 'server-only'
import type { BrandTokens } from '@framework/types'

/**
 * Pushed brand-tokens store. Parallel to `template-store.ts`.
 *
 * Dev mode: globalThis-pinned Map so a single `next dev` session keeps the
 * tokens around across HMR. One entry per brand — newer pushes overwrite,
 * with version_number incrementing.
 *
 * Prod mode (TODO week 2): swap the body for Drizzle writes against
 * `brand_token_versions` (with `is_published=true` on the latest).
 */

export interface PushedBrandTokens {
  brandSlug: string
  versionNumber: number
  sourceFigmaFileKey: string
  tokens: BrandTokens
  pushedAt: string
}

interface StoreState {
  byBrand: Map<string, PushedBrandTokens>
  versionCounters: Map<string, number>
}

declare global {
  // eslint-disable-next-line no-var
  var __frameworkBrandTokensStore: StoreState | undefined
}

function state(): StoreState {
  if (!globalThis.__frameworkBrandTokensStore) {
    globalThis.__frameworkBrandTokensStore = {
      byBrand: new Map(),
      versionCounters: new Map(),
    }
  }
  return globalThis.__frameworkBrandTokensStore
}

export function savePushedBrandTokens(input: {
  brandSlug: string
  sourceFigmaFileKey: string
  tokens: BrandTokens
}): PushedBrandTokens {
  const s = state()
  const next = (s.versionCounters.get(input.brandSlug) ?? 0) + 1
  s.versionCounters.set(input.brandSlug, next)
  const record: PushedBrandTokens = {
    brandSlug: input.brandSlug,
    sourceFigmaFileKey: input.sourceFigmaFileKey,
    tokens: input.tokens,
    versionNumber: next,
    pushedAt: new Date().toISOString(),
  }
  s.byBrand.set(input.brandSlug, record)
  return record
}

export function getPushedBrandTokens(brandSlug: string): PushedBrandTokens | null {
  return state().byBrand.get(brandSlug) ?? null
}
