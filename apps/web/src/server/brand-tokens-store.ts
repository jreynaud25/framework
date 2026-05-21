import 'server-only'
import type { BrandTokens, HexColor } from '@framework/types'

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

/**
 * Minimal default tokens — used at brand creation and as a fallback when
 * no tokens have been pushed yet. Designer can edit from the guidelines UI.
 */
export function defaultBrandTokens(primaryColor: string = '#0a0a0a'): BrandTokens {
  const p = primaryColor as HexColor
  return {
    colors: {
      primary: p,
      palette: [
        { name: 'primary', hex: p },
        { name: 'ink', hex: '#0a0a0a' },
        { name: 'paper', hex: '#fafaf7' },
      ],
      semantic: { bg: '#ffffff', fg: '#0a0a0a', accent: p },
    },
    typography: {
      display: {
        fontFamily: 'Inter',
        fontTokenKey: 'display',
        weights: [400, 700, 900],
        defaultWeight: 700,
        scale: [96, 72, 56, 40],
        lineHeight: 1.05,
      },
      heading: {
        fontFamily: 'Inter',
        fontTokenKey: 'heading',
        weights: [400, 600, 700],
        defaultWeight: 600,
        scale: [40, 32, 24, 20],
        lineHeight: 1.1,
      },
      body: {
        fontFamily: 'Inter',
        fontTokenKey: 'body',
        weights: [400, 500],
        defaultWeight: 400,
        scale: [16, 14],
        lineHeight: 1.5,
      },
    },
    spacing: { unit: 8, scale: [4, 8, 16, 24, 32, 48, 64, 96, 128] },
    logos: [],
  }
}

/**
 * Recursive partial-merge for BrandTokens. Arrays = replace, objects =
 * merge, primitives = replace. Keeps unedited sections intact while letting
 * the editor patch just `colors.primary` or `typography.body.fontFamily`.
 */
function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || patch === undefined) return base
  if (typeof patch !== 'object' || Array.isArray(patch)) return patch as T
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const k of Object.keys(patch as Record<string, unknown>)) {
    const v = (patch as Record<string, unknown>)[k]
    if (v === undefined) continue
    out[k] = deepMerge(out[k], v)
  }
  return out as T
}

/**
 * Patch the current tokens for a brand. Creates a baseline (default tokens
 * with the brand's primaryColor) if none exists yet, then deep-merges the
 * patch and bumps the version.
 */
export function patchPushedBrandTokens(
  brandSlug: string,
  patch: Partial<BrandTokens>,
  fallbackPrimaryColor?: string,
): PushedBrandTokens {
  const current = getPushedBrandTokens(brandSlug)
  const baseline: BrandTokens = current?.tokens ?? defaultBrandTokens(fallbackPrimaryColor)
  const next = deepMerge(baseline, patch)
  return savePushedBrandTokens({
    brandSlug,
    sourceFigmaFileKey: current?.sourceFigmaFileKey ?? 'editor-edit',
    tokens: next,
  })
}
