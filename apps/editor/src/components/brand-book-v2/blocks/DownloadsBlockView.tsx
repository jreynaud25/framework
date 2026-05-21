import type { DownloadsBlock } from '@framework/types'
import { useBrandBookContext, findAsset } from '../brandBookContext'

/**
 * Resource list. If block.items is empty, auto-derives a "logo pack"
 * entry per uploaded logo + a "fonts" entry per typography role with a
 * unique fontFamily. Each row links to the asset's dataUrl (download
 * via browser save-as).
 */
export function DownloadsBlockView({ block }: { block: DownloadsBlock }) {
  const { assets, tokens } = useBrandBookContext()
  const items = block.items ?? autoItems(assets, tokens)
  if (items.length === 0) {
    return <div className="fw-bbook__empty">No downloads yet. Upload logos and fonts to populate this section.</div>
  }
  return (
    <ul className="fw-bbook__downloads">
      {items.map((item, i) => {
        const asset = findAsset(assets, item.assetId)
        const href = asset?.dataUrl ?? item.url
        return (
          <li key={i} className="fw-bbook__downloads-row">
            <div>
              <span className="fw-bbook__downloads-label">{item.label}</span>
              {item.format ? <span className="fw-bbook__downloads-format">{item.format}</span> : null}
            </div>
            {href ? (
              <a className="fw-bbook__downloads-link" href={href} download>
                Download
              </a>
            ) : (
              <span className="fw-bbook__downloads-missing">unavailable</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

type AutoItem = { label: string; assetId?: string; url?: string; format?: string }

function autoItems(
  assets: ReturnType<typeof useBrandBookContext>['assets'],
  tokens: ReturnType<typeof useBrandBookContext>['tokens'],
): AutoItem[] {
  const logoItems: AutoItem[] = assets
    .filter((a) => a.kind === 'logo')
    .map((a) => ({
      label: `Logo · ${a.variant ?? 'primary'}`,
      assetId: a.id,
      format: a.dataUrl.startsWith('data:image/svg') ? 'SVG' : 'PNG',
    }))
  const fonts = Array.from(
    new Set(Object.values(tokens.typography).map((t) => t?.fontFamily).filter(Boolean) as string[]),
  )
  const fontItems: AutoItem[] = fonts.map((f) => ({ label: `Font · ${f}` }))
  return [...logoItems, ...fontItems]
}
