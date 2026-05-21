import { useCallback } from 'react'
import type { Block } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'

/**
 * Block CRUD on the current book. Each operation:
 *   1. Computes the next blocks array for the target page
 *   2. PATCHes the page (server returns the canonical version)
 *   3. Context updates from the response — no double-render mismatch
 *
 * The renderer reads `book.pages` so changes propagate naturally.
 */
export function useBlockOps() {
  const { book, patchPage, setSelection } = useBrandBookContext()

  const updateBlock = useCallback(
    async (pageId: string, blockId: string, patch: Partial<Block>) => {
      const page = book.pages.find((p) => p.id === pageId)
      if (!page) return
      const nextBlocks = page.blocks.map((b) =>
        // Spread patch; isAuto stripped because designer touched it.
        b.id === blockId ? ({ ...b, ...patch, id: b.id, kind: b.kind, isAuto: false } as Block) : b,
      )
      await patchPage(pageId, { blocks: nextBlocks })
    },
    [book, patchPage],
  )

  const addBlock = useCallback(
    async (pageId: string, block: Block, atIndex?: number) => {
      const page = book.pages.find((p) => p.id === pageId)
      if (!page) return
      const next = [...page.blocks]
      const idx = atIndex !== undefined ? atIndex : next.length
      next.splice(idx, 0, block)
      await patchPage(pageId, { blocks: next })
      setSelection({ pageId, blockId: block.id })
    },
    [book, patchPage, setSelection],
  )

  const deleteBlock = useCallback(
    async (pageId: string, blockId: string) => {
      const page = book.pages.find((p) => p.id === pageId)
      if (!page) return
      const next = page.blocks.filter((b) => b.id !== blockId)
      await patchPage(pageId, { blocks: next })
      setSelection({ pageId, blockId: null })
    },
    [book, patchPage, setSelection],
  )

  const duplicateBlock = useCallback(
    async (pageId: string, blockId: string) => {
      const page = book.pages.find((p) => p.id === pageId)
      if (!page) return
      const idx = page.blocks.findIndex((b) => b.id === blockId)
      if (idx === -1) return
      const original = page.blocks[idx]!
      const clone: Block = {
        ...original,
        id: `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        isAuto: false,
      }
      const next = [...page.blocks]
      next.splice(idx + 1, 0, clone)
      await patchPage(pageId, { blocks: next })
      setSelection({ pageId, blockId: clone.id })
    },
    [book, patchPage, setSelection],
  )

  const moveBlock = useCallback(
    async (pageId: string, blockId: string, direction: 'up' | 'down') => {
      const page = book.pages.find((p) => p.id === pageId)
      if (!page) return
      const idx = page.blocks.findIndex((b) => b.id === blockId)
      if (idx === -1) return
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= page.blocks.length) return
      const next = [...page.blocks]
      const tmp = next[idx]!
      next[idx] = next[target]!
      next[target] = tmp
      await patchPage(pageId, { blocks: next })
    },
    [book, patchPage],
  )

  /**
   * Move a block to an explicit index. Used by drag-and-drop reorder.
   * `toIndex` is the destination position in the FINAL array (after the
   * source has been removed). Pass the visual insertion index — this
   * helper handles the "subtract one if moving down" adjustment.
   */
  const moveBlockTo = useCallback(
    async (pageId: string, blockId: string, toIndex: number) => {
      const page = book.pages.find((p) => p.id === pageId)
      if (!page) return
      const fromIdx = page.blocks.findIndex((b) => b.id === blockId)
      if (fromIdx === -1) return
      // Clamp to valid range and adjust for self-removal when moving down.
      let target = Math.max(0, Math.min(toIndex, page.blocks.length))
      if (fromIdx < target) target -= 1
      if (target === fromIdx) return
      const next = [...page.blocks]
      const [moved] = next.splice(fromIdx, 1)
      if (moved) next.splice(target, 0, moved)
      await patchPage(pageId, { blocks: next })
    },
    [book, patchPage],
  )

  return { updateBlock, addBlock, deleteBlock, duplicateBlock, moveBlock, moveBlockTo }
}
