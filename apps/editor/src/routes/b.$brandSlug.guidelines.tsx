import { createFileRoute } from '@tanstack/react-router'
import { BrandIdentity } from '@/components/BrandIdentity'

export const Route = createFileRoute('/b/$brandSlug/guidelines')({
  component: BrandIdentity,
})
