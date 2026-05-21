import 'server-only'

/**
 * Brand assets store. Holds the actual binary content (as data URLs in V1,
 * later as R2 keys) for things uploaded from Figma plugin or editor:
 * logos, photography, patterns, icons. Templates live in template-store;
 * brand tokens (colors / typography) in brand-tokens-store. This is the
 * third leg: visual assets associated with a brand.
 *
 * V1 storage: in-memory + globalThis-pinned. Each asset is replaced when a
 * new push targets the same `(brandSlug, kind, variant)` — no asset history.
 */

export type AssetKind = 'logo' | 'photo' | 'pattern' | 'icon'

export interface BrandAsset {
  id: string
  brandSlug: string
  kind: AssetKind
  variant?: string
  label: string
  /** V1: data URL (SVG or PNG base64). V2: r2 key + CDN URL. */
  dataUrl: string
  width?: number
  height?: number
  uploadedAt: string
  source: 'plugin' | 'editor'
}

interface StoreState {
  byId: Map<string, BrandAsset>
}

declare global {
  // eslint-disable-next-line no-var
  var __frameworkBrandAssetsStore: StoreState | undefined
}

function state(): StoreState {
  if (!globalThis.__frameworkBrandAssetsStore) {
    globalThis.__frameworkBrandAssetsStore = { byId: new Map() }
  }
  return globalThis.__frameworkBrandAssetsStore
}

function newId(): string {
  return `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export interface SaveBrandAssetInput {
  brandSlug: string
  kind: AssetKind
  variant?: string
  label: string
  dataUrl: string
  width?: number
  height?: number
  source?: 'plugin' | 'editor'
}

/**
 * Save a new asset. If `(brandSlug, kind, variant)` already exists, the
 * existing record is replaced — same variant overwrites in place. Assets
 * without a variant always create a new record (e.g. photographs).
 */
export function saveBrandAsset(input: SaveBrandAssetInput): BrandAsset {
  const s = state()
  if (input.variant) {
    for (const [id, existing] of s.byId.entries()) {
      if (
        existing.brandSlug === input.brandSlug &&
        existing.kind === input.kind &&
        existing.variant === input.variant
      ) {
        s.byId.delete(id)
        break
      }
    }
  }
  const record: BrandAsset = {
    id: newId(),
    brandSlug: input.brandSlug,
    kind: input.kind,
    variant: input.variant,
    label: input.label,
    dataUrl: input.dataUrl,
    width: input.width,
    height: input.height,
    uploadedAt: new Date().toISOString(),
    source: input.source ?? 'plugin',
  }
  s.byId.set(record.id, record)
  return record
}

export function getBrandAsset(id: string): BrandAsset | null {
  return state().byId.get(id) ?? null
}

export function listBrandAssets(brandSlug: string, kind?: AssetKind): BrandAsset[] {
  return Array.from(state().byId.values())
    .filter((a) => a.brandSlug === brandSlug && (kind ? a.kind === kind : true))
    .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))
}

export function deleteBrandAsset(id: string): boolean {
  return state().byId.delete(id)
}
