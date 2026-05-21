import { useCallback } from 'react'
import type { BrandPage } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
// (kept the BrandPage import — used by reorderPages params below)

/**
 * Page CRUD on the current book. Pages are persisted through the brand
 * book API; each operation refreshes the book to keep client + server in
 * sync. The "isAuto" flag is stripped on any user edit.
 */
export function usePageOps() {
  const { brandSlug, reloadBook } = useBrandBookContext()

  const createPage = useCallback(
    async (input: {
      title: string
      slug?: string
      subtitle?: string
      parentId?: string | null
    }): Promise<BrandPage | null> => {
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandSlug)}/book/pages`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        },
      )
      if (!res.ok) {
        console.error('[brand-book] create page failed', res.status)
        return null
      }
      const page = (await res.json()) as BrandPage
      await reloadBook()
      return page
    },
    [brandSlug, reloadBook],
  )

  const updatePage = useCallback(
    async (pageId: string, patch: Partial<BrandPage>) => {
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandSlug)}/book/pages/${encodeURIComponent(pageId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        },
      )
      if (!res.ok) {
        console.error('[brand-book] update page failed', res.status)
        return
      }
      await reloadBook()
    },
    [brandSlug, reloadBook],
  )

  const deletePage = useCallback(
    async (pageId: string): Promise<boolean> => {
      const res = await fetch(
        `/api/brands/${encodeURIComponent(brandSlug)}/book/pages/${encodeURIComponent(pageId)}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        console.error('[brand-book] delete page failed', res.status)
        return false
      }
      await reloadBook()
      return true
    },
    [brandSlug, reloadBook],
  )

  /**
   * Reorder pages within a sibling group (same parentId). Updates each
   * sibling's `order` to its new position, then PATCHes the whole book.
   */
  const reorderPages = useCallback(
    async (params: {
      parentId: string | null
      orderedSiblings: BrandPage[]
      bookPages: BrandPage[]
    }) => {
      const { parentId, orderedSiblings, bookPages } = params
      const siblingIds = new Set(orderedSiblings.map((p) => p.id))
      const others = bookPages.filter(
        (p) => (p.parentId ?? null) !== parentId || !siblingIds.has(p.id),
      )
      const reordered = orderedSiblings.map((p, i) => ({ ...p, order: i }))
      const allPages = [...others, ...reordered]
      const res = await fetch(`/api/brands/${encodeURIComponent(brandSlug)}/book`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pages: allPages }),
      })
      if (!res.ok) {
        console.error('[brand-book] reorder failed', res.status)
        return
      }
      await reloadBook()
    },
    [brandSlug, reloadBook],
  )

  return { createPage, updatePage, deletePage, reorderPages }
}
