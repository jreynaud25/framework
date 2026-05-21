import { createFileRoute } from '@tanstack/react-router'
import { DesignerDashboard } from '@/components/DesignerDashboard'

export const Route = createFileRoute('/d/')({
  component: DesignerDashboard,
})
