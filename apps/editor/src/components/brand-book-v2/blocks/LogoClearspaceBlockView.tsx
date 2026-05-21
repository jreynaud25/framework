import type { LogoClearspaceBlock } from '@framework/types'
import { useBrandBookContext, findAsset } from '../brandBookContext'

/**
 * Clearspace diagram. Draws the logo at a fixed size and shows a dashed
 * outline at clearspace * height around it, annotated with corner ticks
 * to suggest measurement. Inspired by Vevo's "½ width of O" style.
 */
export function LogoClearspaceBlockView({ block }: { block: LogoClearspaceBlock }) {
  const { assets } = useBrandBookContext()
  const logo = findAsset(assets, block.logoAssetId) ?? assets.find((a) => a.kind === 'logo')
  const cs = block.clearspaceX ?? 1.0
  if (!logo) return <div className="fw-bbook__empty">No logo to diagram.</div>
  // Logo is rendered at 140px max height; clearspace pad ratio applied.
  const logoH = 140
  const padding = Math.round(logoH * cs)

  return (
    <div className="fw-bbook__clearspace">
      <div className="fw-bbook__clearspace-zone" style={{ padding }}>
        <img src={logo.dataUrl} alt="logo" style={{ maxHeight: logoH }} />
      </div>
      <div className="fw-bbook__clearspace-annot">
        <span>X = {cs} × logo height</span>
        <span>clearspace on all sides</span>
      </div>
    </div>
  )
}
