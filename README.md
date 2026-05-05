# Framework

> Designer-authored. Brand-locked. Client-customizable.

A web app where designers push their Figma designs and brand clients edit the
content (text, images, colors) themselves — staying perfectly on brand because
the layout, rules, and constraints come from the designer's Figma file.

See [`BRIEF.md`](./BRIEF.md) for the full working brief and
[`CONCEPT.txt`](./CONCEPT.txt) for the UX concept.

## Repository layout

```
framework/
├── apps/
│   ├── web/        # Next.js 15 — Brand Hub + marketing + API routes
│   ├── editor/     # Vite + TanStack Router — Editor SPA
│   └── plugin/     # Figma generator plugin v2
└── packages/
    ├── db/         # Drizzle schema + Supabase Postgres + RLS policies
    ├── renderer/   # <TemplateRenderer> — interprets layout_schema + slot_values
    └── types/      # Shared TS types (LayoutNode, SlotDefinition, BrandTokens)
```

## Toolchain

- **pnpm** 9 + **Turborepo** 2
- **Node** 20.10+
- **TypeScript** 5.6
- **Next.js** 15 App Router · **Vite** 5 · **Tailwind v4**
- **Supabase Postgres** + **Drizzle ORM**
- **Clerk** (orgs = brands/studios) · **Stripe** · **Resend**
- **Cloudflare R2** + **Cloudflare Images**
- **Satori** + **resvg-js** at edge · **Remotion Lambda** for motion
- **Anthropic Claude Sonnet 4.6** for the compliance agent

## Getting started

```bash
pnpm install
pnpm dev
```

Each app has its own `dev` script orchestrated by Turbo. See `apps/*/README.md`.

## Status

Phase 1 (weeks 1–4): foundations + Brand Hub + Font system. See
[`BRIEF.md` §7](./BRIEF.md) for the 100-day plan.
