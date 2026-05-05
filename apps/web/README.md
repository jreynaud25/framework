# @framework/web

Next.js 15 App Router. Hosts:

- **Marketing site** at the apex (`frame-work.app`)
- **Brand Hub** at every tenant subdomain (`{slug}.frame-work.app`) — Vevo-style
- **API routes** at `/api/*` (Edge runtime where possible)
  - `POST /api/brand-tokens` — plugin → brand_token_versions
  - `POST /api/templates` — plugin → templates + template_versions
  - `GET /api/health` — liveness probe

## Subdomain routing

`src/middleware.ts` parses the host, sets `x-tenant-slug` and `x-surface`,
and lets the root layout decide between marketing vs tenant rendering.

In dev, use `{slug}.localhost:3000` (e.g. `3070.localhost:3000`) to hit the
tenant surface. macOS/Linux resolve any `*.localhost` automatically.

## Run

```bash
cp .env.example .env.local
pnpm dev
```
