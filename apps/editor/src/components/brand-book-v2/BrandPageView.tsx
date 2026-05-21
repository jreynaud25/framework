import type { BrandPage } from '@framework/types'
import { BlockRenderer } from './BlockRenderer'

/**
 * Renders a single brand-book page: iterate its blocks in order, dispatch
 * each to BlockRenderer. The container width and spacing are styled in
 * fw-bbook__page; individual blocks set their own internal spacing.
 */
export function BrandPageView({ page }: { page: BrandPage }) {
  return (
    <article className="fw-bbook__page">
      {page.blocks.length === 0 ? (
        <div className="fw-bbook__page-empty">
          <h2>{page.title}</h2>
          <p>This page is empty. Add blocks from the designer to fill it in.</p>
        </div>
      ) : (
        page.blocks.map((block) => (
          <div
            key={block.id}
            className="fw-bbook__block"
            style={block.bottomGap !== undefined ? { marginBottom: block.bottomGap } : undefined}
            data-block-id={block.id}
            data-block-kind={block.kind}
          >
            <BlockRenderer block={block} />
          </div>
        ))
      )}
    </article>
  )
}
