import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The root URL forwards into the designer's studio (brand list, "new
 * brand" CTA, recent activity). The user always lands inside their
 * working surface — no marketing splash to step over.
 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/d' })
  },
})
