import { useState } from 'react'
import type { BrandPage } from '@framework/types'
import { BlockRenderer } from './BlockRenderer'
import { useBrandBookContext } from './brandBookContext'
import { CurrentPageContext } from './currentPageContext'
import { BlockFrame } from './designer/BlockFrame'
import { BlockLibrary } from './designer/BlockLibrary'
import { useBlockOps } from './designer/useBlockOps'
import { PageOutline } from './PageOutline'

/**
 * Renders a single brand-book page: iterates blocks in order. In designer
 * mode each block is wrapped in BlockFrame (hover toolbar + click-to-
 * select). An "Add first block" affordance appears on empty pages and an
 * "Add block at end" appears below the last block.
 */
export function BrandPageView({ page }: { page: BrandPage }) {
  const { designerEnabled } = useBrandBookContext()
  const ops = useBlockOps()
  const [emptyLibraryOpen, setEmptyLibraryOpen] = useState(false)

  if (page.blocks.length === 0) {
    return (
      <article className="fw-bbook__page">
        <div className="fw-bbook__page-empty">
          <h2>{page.title}</h2>
          <p>This page is empty.</p>
          {designerEnabled ? (
            <>
              <button
                type="button"
                className="fw-bbook-edit__cta"
                onClick={() => setEmptyLibraryOpen(true)}
              >
                + Add first block
              </button>
              {emptyLibraryOpen ? (
                <BlockLibrary
                  onClose={() => setEmptyLibraryOpen(false)}
                  onPick={(b) => {
                    setEmptyLibraryOpen(false)
                    void ops.addBlock(page.id, b, 0)
                  }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </article>
    )
  }

  return (
    <CurrentPageContext.Provider value={{ pageId: page.id }}>
      <article className="fw-bbook__page">
        {!designerEnabled ? <PageOutline page={page} /> : null}
        {page.blocks.map((block, i) =>
          designerEnabled ? (
            <BlockFrame key={block.id} pageId={page.id} block={block} index={i} total={page.blocks.length}>
              <div
                className="fw-bbook__block"
                style={block.bottomGap !== undefined ? { marginBottom: block.bottomGap } : undefined}
                data-block-id={block.id}
                data-block-kind={block.kind}
              >
                <BlockRenderer block={block} />
              </div>
            </BlockFrame>
          ) : (
            <div
              key={block.id}
              className="fw-bbook__block"
              style={block.bottomGap !== undefined ? { marginBottom: block.bottomGap } : undefined}
              data-block-id={block.id}
              data-block-kind={block.kind}
            >
              <BlockRenderer block={block} />
            </div>
          ),
        )}
      </article>
    </CurrentPageContext.Provider>
  )
}
