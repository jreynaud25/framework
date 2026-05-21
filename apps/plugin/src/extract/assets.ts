import type { AssetKind, Destination, ExtractedAsset } from '../types'

/**
 * Parse a Figma layer name to detect what kind of brand asset it represents.
 * Convention:
 *   logo/<variant>      → kind: 'logo', variant: 'primary' (etc.)
 *   photo/<name>        → kind: 'photo', variant: <name>
 *   pattern/<name>      → kind: 'pattern', variant: <name>
 *   icon/<name>         → kind: 'icon', variant: <name>
 *
 * Returns null if the name doesn't match — the node will be treated as a
 * template instead. Kept for backwards compat with legacy push paths; the
 * new destination-driven flow uses classify.ts instead.
 */
export function parseAssetKind(
  name: string,
): { kind: AssetKind; variant?: string } | null {
  const m = name.toLowerCase().match(/^(logo|photo|pattern|icon)[\/\-](.+)$/)
  if (!m) return null
  const kind = m[1] as AssetKind
  const rest = m[2]!.split(/[\/\-\s]/)[0]
  const variant = rest && rest.length > 0 ? rest : undefined
  return { kind, variant }
}

/**
 * Legacy export — used by request-extract-mixed. Wraps the destination-
 * driven exportAssetForDestination by parsing the layer name first.
 */
export async function extractAssetFromNode(
  node: SceneNode,
): Promise<ExtractedAsset | null> {
  const parsed = parseAssetKind(node.name)
  if (!parsed) return null
  const dest: Destination =
    parsed.kind === 'logo'
      ? { kind: 'logo', variant: (parsed.variant as never) ?? 'primary' }
      : ({ kind: parsed.kind } as Destination)
  return exportAssetForDestination(node, dest, parsed.variant)
}

/**
 * Export a node into a data URL given the chosen destination kind:
 *   - logo → SVG (PNG fallback if Figma rejects SVG)
 *   - photo/pattern/icon → PNG at sensible resolution
 *
 * The `variantOverride` lets the caller hint a sub-variant (e.g. "wordmark"
 * for a logo, or just the source layer-name suffix for assets that don't
 * have an enum-bound variant).
 */
export async function exportAssetForDestination(
  node: SceneNode,
  destination: Destination,
  variantOverride?: string,
): Promise<ExtractedAsset | null> {
  if (
    destination.kind !== 'logo' &&
    destination.kind !== 'photo' &&
    destination.kind !== 'pattern' &&
    destination.kind !== 'icon'
  ) {
    return null
  }
  const width = 'width' in node ? Math.round(node.width) : 0
  const height = 'height' in node ? Math.round(node.height) : 0
  const exportable = node as SceneNode & {
    exportAsync: (settings: ExportSettings) => Promise<Uint8Array>
  }

  if (destination.kind === 'logo') {
    try {
      const svgBytes = await exportable.exportAsync({ format: 'SVG' })
      return {
        kind: 'logo',
        variant: destination.variant,
        label: node.name,
        dataUrl: `data:image/svg+xml;base64,${bytesToBase64(svgBytes)}`,
        width,
        height,
      }
    } catch {
      const pngBytes = await exportable.exportAsync({
        format: 'PNG',
        constraint: { type: 'WIDTH', value: 1024 },
      })
      return {
        kind: 'logo',
        variant: destination.variant,
        label: node.name,
        dataUrl: `data:image/png;base64,${bytesToBase64(pngBytes)}`,
        width,
        height,
      }
    }
  }

  // photo / pattern / icon → PNG at sensible resolution
  const targetWidth = destination.kind === 'photo' ? 2000 : 1024
  const pngBytes = await exportable.exportAsync({
    format: 'PNG',
    constraint: { type: 'WIDTH', value: targetWidth },
  })
  return {
    kind: destination.kind,
    variant: variantOverride,
    label: node.name,
    dataUrl: `data:image/png;base64,${bytesToBase64(pngBytes)}`,
    width,
    height,
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}
