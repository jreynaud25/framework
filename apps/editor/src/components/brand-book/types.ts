export type AssetKind = 'logo' | 'photo' | 'pattern' | 'icon'

export interface BrandAsset {
  id: string
  brandSlug: string
  kind: AssetKind
  variant?: string
  label: string
  dataUrl: string
  width?: number
  height?: number
  uploadedAt: string
  source?: 'plugin' | 'editor'
}
