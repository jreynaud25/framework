import Link from 'next/link'
import { getTenantContext } from '@/lib/tenant'
import { TenantHub } from '@/components/tenant/TenantHub'
import { MarketingHome } from '@/components/marketing/MarketingHome'

export default async function RootPage() {
  const tenant = await getTenantContext()
  if (tenant) return <TenantHub slug={tenant.slug} />
  return <MarketingHome />
}

export { Link }
