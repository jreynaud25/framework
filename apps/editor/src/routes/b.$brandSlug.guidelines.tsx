import { createFileRoute, Outlet } from '@tanstack/react-router'

/**
 * Pass-through for /b/<slug>/guidelines and its children. The full
 * sidebar + main layout is already owned by /b/<slug>, so this route
 * just provides an Outlet for the page sub-routes.
 */
export const Route = createFileRoute('/b/$brandSlug/guidelines')({
  component: Outlet,
})
