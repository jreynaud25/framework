import { pgEnum } from 'drizzle-orm/pg-core'

export const orgTypeEnum = pgEnum('org_type', ['brand', 'studio'])
export const membershipRoleEnum = pgEnum('membership_role', ['owner', 'admin', 'editor', 'viewer'])
export const templateStatusEnum = pgEnum('template_status', ['draft', 'published', 'archived'])
export const compositionStatusEnum = pgEnum('composition_status', [
  'draft',
  'published',
  'archived',
])
export const exportFormatEnum = pgEnum('export_format', [
  'png',
  'jpg',
  'svg',
  'mp4',
  'gif',
  'lottie',
])
export const fontSourceEnum = pgEnum('font_source', ['google', 'adobe', 'self_hosted', 'system'])
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'brand',
  'brand_plus',
  'studio',
  'enterprise',
])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused',
])
export const commissionStatusEnum = pgEnum('commission_status', [
  'pending',
  'paid',
  'reversed',
  'on_hold',
])
export const complianceResultEnum = pgEnum('compliance_result', ['passed', 'flagged', 'error'])
