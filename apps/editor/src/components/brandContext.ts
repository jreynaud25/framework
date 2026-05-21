import { createContext, useContext } from 'react'

export interface BrandRecord {
  id: string
  slug: string
  name: string
  industry?: 'fashion' | 'luxury' | 'hospitality' | 'other'
  primaryColor?: string
  clientEmail?: string
  inviteSentAt?: string
  ownerUserId: string
  createdAt: string
  updatedAt: string
}

export interface BrandContextValue {
  brand: BrandRecord | null
  brandSlug: string
  designerEnabled: boolean
  reloadBrand: () => Promise<void> | void
}

export const BrandContext = createContext<BrandContextValue | null>(null)

export function useBrandContext(): BrandContextValue {
  const ctx = useContext(BrandContext)
  if (!ctx) {
    throw new Error('useBrandContext must be used inside <BrandBookLayout>')
  }
  return ctx
}
