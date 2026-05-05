import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="grid h-full grid-rows-[48px_1fr]">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4">
        <div className="font-medium tracking-tight">Framework</div>
        <div className="text-xs text-[var(--muted)]">Editor</div>
      </header>
      <Outlet />
    </div>
  ),
})
