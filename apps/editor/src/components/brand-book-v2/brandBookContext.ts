import { createContext, useContext } from 'react'
import type { BrandBook, BrandPage, BrandTokens } from '@framework/types'
import type { BrandAsset } from '../brand-book/types'

/**
 * Shared state for the V2 brand book. Loaded once at the guidelines layout
 * level and made available to every page renderer and block component via
 * this context — saves N requests when navigating between pages.
 */

export interface BrandBookSelection {
  pageId: string | null
  blockId: string | null
}

export interface BrandBookContextValue {
  book: BrandBook
  tokens: BrandTokens
  assets: BrandAsset[]
  brandSlug: string
  designerEnabled: boolean
  /** Currently-selected page + block in designer mode (null if nothing). */
  selection: BrandBookSelection
  setSelection: (next: BrandBookSelection) => void
  /** Refetches the book — call after a mutation that the editor performed. */
  reloadBook: () => Promise<void>
  /** Patch a single page (PATCH /api/.../pages/[id]); updates context. */
  patchPage: (pageId: string, patch: Partial<BrandPage>) => Promise<void>
  /**
   * Patch the brand's tokens (palette / typography / voice / imagery / etc.).
   * The PATCH endpoint deep-merges and returns the canonical tokens — the
   * context is updated from the response so every block re-renders.
   */
  patchTokens: (delta: Partial<BrandTokens>) => Promise<void>
  /** Refetch assets — call after upload / delete. */
  reloadAssets: () => Promise<void>
}

export const BrandBookContext = createContext<BrandBookContextValue | null>(null)

export function useBrandBookContext(): BrandBookContextValue {
  const ctx = useContext(BrandBookContext)
  if (!ctx) {
    throw new Error('useBrandBookContext must be used inside <BrandBookLayout>')
  }
  return ctx
}

/**
 * Find an asset by id (with safe fallback). Lookup keyed by id is used by
 * many block renderers (logoSpecimen, imageGrid, etc.).
 */
export function findAsset(
  assets: BrandAsset[],
  id: string | undefined,
): BrandAsset | null {
  if (!id) return null
  return assets.find((a) => a.id === id) ?? null
}
