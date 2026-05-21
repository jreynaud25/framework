import { createFileRoute } from '@tanstack/react-router'
import { BrandCreateForm } from '@/components/BrandCreateForm'

export const Route = createFileRoute('/d/new')({
  component: BrandCreateForm,
})
