import type { AssetKind, ExtractedAsset } from '../types'

/**
 * Parse a Figma layer name to detect what kind of brand asset it represents.
 * Convention:
 *   logo/<variant>      → kind: 'logo', variant: 'primary' (etc.)
 *   photo/<name>        → kind: 'photo', variant: <name>
 *   pattern/<name>      → kind: 'pattern', variant: <name>
 *   icon/<name>         → kind: 'icon', variant: <name>
 *
 * Returns null if the name doesn't match — the node will be treated as a
 * template instead.
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
 * Export a Figma node into a data URL.
 *   - logos prefer SVG (scalable, small)
 *   - photo/pattern/icon use PNG
 *
 * SVG fallbacks to PNG if Figma rejects the export (e.g. complex effects).
 */
export async function extractAssetFromNode(
  node: SceneNode,
): Promise<ExtractedAsset | null> {
  const parsed = parseAssetKind(node.name)
  if (!parsed) return null

  const width = 'width' in node ? Math.round(node.width) : 0
  const height = 'height' in node ? Math.round(node.height) : 0

  if (parsed.kind === 'logo') {
    try {
      const svgBytes = await node.exportAsync({ format: 'SVG' })
      return {
        kind: 'logo',
        variant: parsed.variant ?? 'primary',
        label: node.name,
        dataUrl: `data:image/svg+xml;base64,${bytesToBase64(svgBytes)}`,
        width,
        height,
      }
    } catch {
      // Some nodes (e.g. ones with complex effects) can't export SVG.
      // Fallback to a high-res PNG so the logo still appears.
      const pngBytes = await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'WIDTH', value: 1024 },
      })
      return {
        kind: 'logo',
        variant: parsed.variant ?? 'primary',
        label: node.name,
        dataUrl: `data:image/png;base64,${bytesToBase64(pngBytes)}`,
        width,
        height,
      }
    }
  }

  // photo / pattern / icon → PNG at sensible resolution.
  const targetWidth = parsed.kind === 'photo' ? 2000 : 1024
  const pngBytes = await node.exportAsync({
    format: 'PNG',
    constraint: { type: 'WIDTH', value: targetWidth },
  })
  return {
    kind: parsed.kind,
    variant: parsed.variant,
    label: node.name,
    dataUrl: `data:image/png;base64,${bytesToBase64(pngBytes)}`,
    width,
    height,
  }
}

/**
 * Convert a Uint8Array of binary bytes into a base64 string. Loop avoids
 * the "call stack exceeded" issue with `String.fromCharCode(...bytes)` on
 * large arrays.
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}
