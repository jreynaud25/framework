export type Uuid = string & { readonly __brand: 'uuid' }
export type Slug = string & { readonly __brand: 'slug' }
export type R2Key = string & { readonly __brand: 'r2-key' }

export type Format = '1:1' | '9:16' | '16:9' | '4:5' | '3:4' | '2:3' | '3:2'

export const ALL_FORMATS: readonly Format[] = ['1:1', '9:16', '16:9', '4:5', '3:4', '2:3', '3:2']

export type OrgType = 'brand' | 'studio'
export type MembershipRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type TemplateStatus = 'draft' | 'published' | 'archived'
export type CompositionStatus = 'draft' | 'published' | 'archived'
export type ExportMime = 'png' | 'jpg' | 'svg' | 'mp4' | 'gif' | 'lottie'
export type SubscriptionTier = 'brand' | 'brand_plus' | 'studio' | 'enterprise'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused'
export type CommissionStatus = 'pending' | 'paid' | 'reversed' | 'on_hold'
export type FontSource = 'google' | 'adobe' | 'self_hosted' | 'system'
