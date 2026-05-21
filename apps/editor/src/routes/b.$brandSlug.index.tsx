import { createFileRoute } from '@tanstack/react-router'
import { TemplatesView } from '@/components/TemplatesView'

export const Route = createFileRoute('/b/$brandSlug/')({
  component: TemplatesRoute,
})

function TemplatesRoute() {
  // BrandLayout no longer constrains the Outlet's width, so the templates
  // view supplies its own max-w container.
  return (
    <div className="mx-auto w-full max-w-6xl px-8 pb-12">
      <TemplatesView />
    </div>
  )
}
