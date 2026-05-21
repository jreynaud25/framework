import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Layout for /d/* routes — just renders the active child via Outlet.
 * The dashboard lives in `d.index.tsx`, the create form in `d.new.tsx`.
 */
export const Route = createFileRoute('/d')({
  component: () => <Outlet />,
})
