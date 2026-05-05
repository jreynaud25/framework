import { headers } from 'next/headers'

export interface TenantContext {
  slug: string
  surface: 'marketing' | 'tenant'
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const h = await headers()
  const surface = h.get('x-surface')
  const slug = h.get('x-tenant-slug')
  if (surface === 'tenant' && slug) {
    return { slug, surface: 'tenant' }
  }
  return null
}

export async function requireTenantContext(): Promise<TenantContext> {
  const ctx = await getTenantContext()
  if (!ctx) {
    throw new Error('Not on a tenant subdomain')
  }
  return ctx
}
