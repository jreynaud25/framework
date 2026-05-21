import { createRootRoute, Outlet } from '@tanstack/react-router'

/**
 * Root layout — no chrome. Each route owns its own header so surfaces
 * like the brand book can fill the viewport (sidebar at the very top,
 * no banner sitting above it).
 */
export const Route = createRootRoute({
  component: () => (
    <div className="h-full">
      <Outlet />
    </div>
  ),
})
