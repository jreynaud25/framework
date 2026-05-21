import { createFileRoute } from '@tanstack/react-router'
import { TemplatesView } from '@/components/TemplatesView'

export const Route = createFileRoute('/b/$brandSlug/')({
  component: TemplatesView,
})
