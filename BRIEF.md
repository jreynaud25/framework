# Framework — Working Brief

> Generated 2026-05-05. Self-contained working document. Pick up from here.

---

## 0. The one-line positioning

> **Framework takes the work a designer hand-crafts in Figma and gives their clients an interface as fast and effortless as an AI tool — but every text, image, and color edit stays locked inside the brand identity the designer authored.**

Three claims:
- **Human-crafted, not AI-generated.** A designer's eye builds every template. AI never invents the design.
- **AI-efficient client self-serve.** The brand client (intern, social manager) edits with one-keystroke latency. Feels like Midjourney, not like Frontify.
- **Brand-identity-locked.** Every output respects the designer's typography, palette, motion, voice. No drift, ever.

This is the wedge no competitor occupies. Canva has the speed without the brand-lock. Frontify has the brand-lock without the generation. Motor has the motion without the static. Sameness has the AI without the human authorship. Framework is the only product where all four are true at once.

---

## 1. The wedge — narrow, specific, defensible

**For Phase 1, Framework is "the system between a fashion brand's brand book and every drop post."**

Not all brands. Fashion + luxury + cultural. Why:
- Recurring trigger: every drop / season / event = 20–60 social assets, 4–8x per year per brand
- Visible pain: a 0.5pt off-brand kerning kills luxury perception
- Basile's network: Paris fashion access is the unfair go-to-market advantage
- Underserved by the 40 competitors mapped (Motor closest, motion-only, service-shaped)
- AI compliance has obvious value: luxury brands obsess over exactly the rules an agent enforces

**Expansion path** after fashion is locked: cultural institutions → hospitality → premium F&B → horizontal.

---

## 2. Competitive landscape — where the empty cells are

40+ players analysed. The 6 cells nobody else fills together:

| Axis | Who has it | Framework |
|---|---|---|
| Brand Hub | Frontify, Standards, Sameness | ✓ designer-priced |
| Brand-locked Generation | Marq (ugly), Canva Brand Kit (weak) | ✓ Figma-native, designer-authored |
| Motion / Animation | Motor (only motion) | ✓ Lottie + Jitter import |
| AI Compliance | Sameness (generic) | ✓ vertical-tuned for fashion |
| Designer-led GTM with 2-sided pricing | Nobody | ✓ free designers + 30% rev-share |
| Fashion / luxury vertical focus | Motor (partially) | ✓ explicit |

The *intersection* of all six = the only unclaimed ground.

---

## 3. Architecture decisions

### 3.1 Figma is for authoring, not for runtime

The v0 prototype routes every render through a human's open Figma desktop. Wrong. Authoring stays in Figma; runtime moves to React.

```
DESIGNER (slow OK, runs once per template)
  Figma → Generator plugin walks node tree →
  Emits structured JSON: layout schema + slot schema + brand tokens
  Stored in Postgres + R2

CLIENT (must be instant, every keystroke)
  React renders the JSON via <TemplateRenderer> → live preview <50ms
  No network call between keystrokes

EXPORT
  Same JSON + slot values → Satori at edge → PNG/SVG (~150ms)
  Lottie + dotLottie text replacement for motion
  Remotion Lambda for MP4 export
```

The Figma plugin generates a serializable schema that one fixed React component interprets. **No `eval`, no dynamic JSX, no security exposure.** Builder.io / Locofy can be used as v1 of the compiler.

### 3.2 Brand tokens are versioned

When the designer changes the brand red, existing posts must NOT silently update. Tokens live in `brand_token_versions`. Compositions pin to a version. New compositions use latest published. Hub shows version history + diff.

### 3.3 Per-tenant font hosting with license attestation

Three font sources, three legal flows:

| Source | Legal | Implementation |
|---|---|---|
| Google Fonts (open-source) | Free | Standard `<link>` to Google CDN |
| Adobe Fonts | Tied to brand admin's Adobe sub | Brand admin enters kit ID; we load via Adobe CDN; for PNG export use headless Chrome instead of Satori |
| Self-hosted (Monotype, GT, Pangram, custom) | Per-domain webfont license required | Brand admin uploads WOFF2 + click-through attestation: "I have a webfont license covering `*.frame-work.app/{tenant}`." We log it. Liability sits with the attesting admin. |

For PNG/JPG export: subset the font to glyphs used in this composition (~200 bytes), embed in Satori, render. Output is pixels. Legally clean — no font data leaves the server.

For "Final SVG" export (default): outline text to paths. No font shipped.
For "Editable SVG" export (power-user): embed subset font in `<defs>`, subject to license.

### 3.4 The render path budgets

| Action | Today (v0) | Target | How |
|---|---|---|---|
| Hub page first paint | 1–3 s | < 100 ms TTFB | Next.js SSG + ISR on Vercel Edge |
| Editor preview after typing | 5–15 s | < 50 ms | Client-side TemplateRenderer, no network |
| Export PNG | 3–8 s | < 200 ms | Satori at edge |
| Export MP4 | n/a | 2–4 s | Remotion Lambda parallel |
| AI compliance check | n/a | < 800 ms | Claude with prompt-cached brand rules |
| Brand-image treatment | n/a | 0.5–2 s | fal.ai LoRA inference (Phase 4) |

---

## 4. Stack

### Decided
- **Monorepo**: pnpm + Turborepo
- **Frontend**: Next.js 15 App Router (Brand Hub) + Vite/TanStack Router (Editor SPA), Tailwind v4, shadcn/ui, Framer Motion
- **Backend**: Vercel Edge Functions or Hono on Cloudflare Workers (decide week 1)
- **DB**: Supabase Postgres + Realtime + Storage (RLS replaces v0's missing ownership middleware)
- **ORM**: Drizzle (TS-native, edge-compatible)
- **Auth**: Clerk (organizations = brands/studios)
- **Email**: Resend with React Email
- **Payments**: Stripe with Customer Portal
- **Storage**: Cloudflare R2 + Cloudflare Images (replaces Cloudinary, ~30% cost, no egress)
- **Render**: Satori + resvg-js for static, Remotion Lambda for motion, Lottie React for browser playback
- **AI**: Anthropic Claude (Sonnet 4.6) with prompt caching for compliance agent
- **Image inference (Phase 4)**: fal.ai for per-brand LoRA + image treatment
- **Observability**: Sentry + Axiom

### Why this combo for two people
- TypeScript end-to-end — one language across plugin, web, api, db
- Supabase RLS solves the missing-ownership-check security bug structurally
- Clerk Organizations = brands (out of the box multi-tenant)
- Stripe Customer Portal = zero-code billing UX
- Satori at edge eliminates Cloudinary's transform pipeline

### Avoided
- Cloudflare Workers + D1 in Phase 1 (Path A from earlier reasoning) — postpone. Postgres + Vercel Edge gets us to product-market fit without learning new infra.
- MCP server / AI-native positioning (Sameness's lane) — Phase 4 defensive feature, not the wedge.
- Headless Figma rendering — operational nightmare, eliminated by JSX compile.
- Runtime Figma REST `/v1/images` — replaced by Satori. Nothing client-side ships a Figma token.

---

## 5. Data model — to convert to Drizzle

Replaces v0's four Mongo collections with a multi-tenant Postgres schema.

### Tables (snake_case in DB, camelCase in TS)

#### `users`
Clerk-backed. `id` (uuid), `clerk_id` (unique), `email`, `name`, `avatar_url`, `created_at`.

#### `organizations`
Both brands and studios.
- `id`, `clerk_org_id` (unique), `type` ENUM(`brand`, `studio`), `name`, `slug` (unique — used for subdomain `{slug}.frame-work.app`)
- `owner_user_id` (FK users)
- `metadata` JSONB { industry, websiteUrl, logoUrl }
- timestamps

#### `memberships`
- `id`, `user_id`, `organization_id`, `role` ENUM(`owner`, `admin`, `editor`, `viewer`)
- UNIQUE (user_id, organization_id)

#### `studio_brand_links`
The designer-brand relationship. Drives the 30% commission flow.
- `id`, `studio_id` (FK organizations), `brand_id` (FK organizations)
- `commission_rate` NUMERIC(5,4) default 0.3000
- UNIQUE (studio_id, brand_id)

#### `brand_token_versions`
Versioned brand identity. Compositions pin to a version.
- `id`, `brand_id`, `version_number` INT, `is_published` BOOL, `published_at`, `created_by_user_id`
- `tokens` JSONB — see shape below
- `source_figma_file_key`, `source_figma_extract_at`
- UNIQUE (brand_id, version_number)

`tokens` JSONB shape:
```ts
{
  colors: {
    primary: string,
    palette: Array<{ name, hex, cmyk?, pantone?, usage? }>,
    semantic?: { bg, fg, accent, ... }
  },
  typography: {
    [role: 'heading'|'body'|'mono'|...]: {
      fontFamily, fontTokenKey, weights[], defaultWeight,
      scale[], lineHeight, letterSpacing?
    }
  },
  spacing: { unit: 8, scale: [4,8,16,...] },
  logos: Array<{
    name, variant: 'primary'|'wordmark'|'symbol'|'monochrome'|'inverted',
    r2Key, clearSpaceMultiplier, minSizePx, allowedBackgrounds: string[]
  }>,
  motion?: { durations: {fast,base,slow}, easings: {default,emphasized}, principles: string[] },
  voice?: { tone: string[], vocabulary: {preferred,avoid}, forbidden: string[] },
  imagery?: { dos: string[], donts: string[], colorGrade?: { lutR2Key, description } },
  customRules?: Array<{ id, description, severity, appliesTo }>
}
```

#### `brand_fonts`
- `id`, `brand_id`, `token_key` (e.g. 'heading'), `family_name`
- `source` ENUM(`google`, `adobe`, `self_hosted`, `system`)
- `source_data` JSONB:
  - google: `{ name, weights[] }`
  - adobe: `{ kitId, projectId }`
  - self_hosted: `{ variants: [{ weight, style, r2Key, fileSize, format }] }`
  - system: `{ stack: string }`
- UNIQUE (brand_id, token_key)

#### `font_license_attestations`
Append-only legal log.
- `id`, `brand_font_id`, `attested_by_user_id`
- `attestation_text`, `license_pdf_r2_key`, `font_file_hash`
- `ip_address`, `user_agent`, `attested_at`

#### `templates`
A Figma-derived template family.
- `id`, `brand_id`, `name`, `slug`
- `status` ENUM(`draft`, `published`, `archived`)
- `thumbnail_r2_key`, `current_version_id` (FK template_versions)
- `figma_file_key`, `figma_node_id` — for re-import
- `format_constraints` JSONB `{ formats: ['1:1','9:16','16:9','4:5','3:4'], minResolution, maxResolution }`
- UNIQUE (brand_id, slug)

#### `template_versions`
- `id`, `template_id`, `version_number`, `is_published`, `published_at`
- `bound_token_version_id` (FK brand_token_versions) — what brand state was active at compile
- `layout_schema` JSONB — see shape below
- `slot_schema` JSONB — see shape below
- `source_figma_export` JSONB — raw extraction for debug/re-compile
- `preview_r2_key` — pre-rendered editor thumbnail
- `created_by_user_id`, `created_at`
- UNIQUE (template_id, version_number)

`layout_schema` shape (recursive `LayoutNode`):
```ts
type LayoutNode =
  | { type: 'frame', id, layout: { mode: 'horizontal'|'vertical'|'absolute', gap?, padding?[], align?, justify? }, style?, children: LayoutNode[] }
  | { type: 'text', id, slotKey?, defaultText?, style: { tokenRef?, fontSize?, weight?, color?, align?, lineClamp? }, constraints?: { maxChars?, minFontSize?, autoShrink? } }
  | { type: 'image', id, slotKey?, defaultR2Key?, style: { fit?: 'cover'|'contain', aspectRatio?, radius? } }
  | { type: 'shape', id, shape: 'rect'|'circle'|'path', style }
  | { type: 'logo', id, logoVariant: string, style? };
```

`slot_schema` shape:
```ts
type SlotDefinition =
  | { key, label, type: 'text', constraints: { maxChars?, required? }, default? }
  | { key, label, type: 'image', constraints: { maxBytes?, aspectRatio?, required? }, default? }
  | { key, label, type: 'choice', options: [{ value, label }], default? }
  | { key, label, type: 'color', constraints: { paletteOnly? }, default? };
```

#### `compositions`
A specific instance authored by a brand client. Replaces v0's `Designs`.
- `id`, `brand_id`, `template_version_id`, `created_by_user_id`
- `name`, `status` ENUM(`draft`, `published`, `archived`)
- `slot_values` JSONB — the user's text/image/choice/color picks, matches slot_schema
- `format` (`1:1`, `9:16`, etc.)
- `thumbnail_r2_key`
- timestamps + `archived_at`

#### `exports`
Every render. Powers the Archive view in the deck.
- `id`, `composition_id`, `requested_by_user_id`
- `format` ENUM(`png`, `jpg`, `svg`, `mp4`, `gif`, `lottie`), `resolution`, `scale`
- `r2_key`, `mime_type`, `size_bytes`, `width`, `height`
- `slot_values_snapshot` JSONB — frozen slot values at export time
- `render_duration_ms`, `rendered_at`

#### `assets`
Brand client image uploads. Replaces v0's `BrandImages`.
- `id`, `brand_id`, `uploaded_by_user_id`
- `original_filename`, `r2_key`, `treated_r2_key` (for Image Treatment Engine output)
- `mime_type`, `size_bytes`, `width`, `height`
- `created_at`

#### `compliance_checks`
AI agent results.
- `id`, `export_id`, `model_id` (e.g. 'claude-sonnet-4-6')
- `result` ENUM(`passed`, `flagged`, `error`)
- `flags` JSONB — array of `{ severity, category, description, ruleId?, location?, suggestion? }`
- `input_tokens`, `output_tokens`, `cached_tokens`, `cost_usd_micros`, `duration_ms`
- `checked_at`

#### `subscriptions`
Stripe-backed.
- `id`, `organization_id`, `stripe_customer_id`, `stripe_subscription_id` (unique)
- `tier` ENUM(`brand`, `brand_plus`, `studio`, `enterprise`)
- `status` ENUM(`trialing`, `active`, `past_due`, `canceled`, `paused`)
- `mrr_cents`, `currency` (default 'eur')
- `current_period_start`, `current_period_end`, `trial_ends_at`, `canceled_at`

#### `commission_payouts`
30% rev-share to studios per brand.
- `id`, `studio_id`, `brand_id`, `subscription_id`
- `period_start`, `period_end`, `gross_revenue_cents`, `commission_rate`, `commission_cents`
- `status` ENUM(`pending`, `paid`, `reversed`, `on_hold`)
- `stripe_transfer_id`, `paid_at`
- UNIQUE (subscription_id, period_start)

#### `audit_log`
Append-only. Critical for font attestations, token version publishes, deletes.
- `id`, `organization_id`, `actor_user_id`
- `action` ('brand_tokens.published', 'font.attested', 'composition.deleted', ...)
- `entity_type`, `entity_id`
- `metadata` JSONB
- `ip_address`, `user_agent`, `occurred_at`

### Removed from v0
- `Element` collection — was the `createBrand` structure but no consumer reads it. Its data is replaced by `brand_token_versions.tokens`.
- The `hasChanged` / `isOkToDownload` flags — the entire mutation queue is replaced by direct render via Satori; no Figma-desktop-in-the-loop, no flags.

### Indexes to create
- `organizations.slug` (subdomain lookups)
- `brand_token_versions(brand_id, version_number)` — already UNIQUE
- `templates(brand_id)`, `templates.figma_file_key`
- `compositions(brand_id, status, created_by_user_id)`
- `exports.composition_id`, `exports.rendered_at`
- `compliance_checks(export_id, result)`
- `audit_log(organization_id, occurred_at, action)`

### RLS policies (Supabase)
To write in `policies.sql`:
- `organizations`: members can SELECT; only owner/admin can UPDATE
- `brand_token_versions`: brand members + linked studio members can SELECT; only studio admins or brand owners can INSERT/UPDATE
- `templates`, `template_versions`: same as brand_token_versions
- `compositions`: brand members can CRUD their own; brand admins can CRUD all in their brand
- `exports`, `compliance_checks`: read-only to brand members for their brand
- `assets`: brand members can SELECT all in brand; can INSERT their own; admins delete
- `subscriptions`, `commission_payouts`: only org admin can SELECT

---

## 6. Pricing — diverges from deck

Deck has Designer €49–99 + Brand €99–299. **Change for the wedge phase:**

| Tier | Price | Who | What |
|---|---|---|---|
| **Designer** | Free | Designers | Brand Hub authoring, plugin, dashboard, analytics on referred brands |
| **Brand** | €99/mo | Single brand | 1 hub, 5 templates, 100 exports/mo, AI agent, basic motion |
| **Brand+** | €299/mo | Active brands | Unlimited templates, unlimited exports, full motion, integrations |
| **Studio** | Custom | Agencies | White-label, multi-brand, SSO, dedicated support |
| Designer commission | **30% recurring rev-share** | Designers | On every Brand/Brand+ they bring |

Rationale:
- Designers won't pay for unproven tools but will refer if it makes them look professional
- 30% of Brand-tier MRR > €49–99 fixed designer fee (and compounds with referrals)
- Webflow Designer / Squarespace Circle / ConvertKit Creator all use this model successfully
- Turns every designer into an affiliate evangelist with skin in the game

---

## 7. The 100-day plan

| Wk | Goal | Concrete deliverable |
|---|---|---|
| 1 | Foundations | Monorepo (pnpm + turbo), Supabase project, Clerk app, Stripe, Resend, Vercel deploy. Revoke leaked Figma token. Mongo→Postgres migration script run. |
| 2 | Brand tokens pipeline | Figma plugin v2 emits brand tokens (colors, type, logos, spacing) to `/api/brand-tokens` → `brand_token_versions` row. Per-tenant subdomain routing on Vercel. |
| 3 | Brand Hub MVP | Vevo-style accordion sections at `3070.frame-work.app`. Tokens render as palette swatches, type specimens, logo grid, downloadable assets. ISR revalidates on token publish. |
| 4 | Font system | Brand-admin font upload UI + license attestation modal + R2 signed serving + per-tenant CORS. Google Fonts and Adobe Fonts integration paths. **30 70 Agency live.** |
| 5–6 | Generator plugin v3 | Tagged Figma frames `[Framework]` get walked → emit `layout_schema` + `slot_schema` to `template_versions`. Use Builder.io/Locofy for v1 of the compiler if needed. |
| 7–8 | Editor MVP | TemplateRenderer React component interprets layout_schema + slot_values. Text/image/choice/color slot editors. Live preview <50ms. Format toggle. **30 70's intern ships first drop with Framework.** |
| 9–10 | Export pipeline | Satori at edge for PNG/JPG, with font subsetting. Cloudflare R2 storage. Archive view of past exports per composition. |
| 11–12 | AI compliance agent v1 | Claude Sonnet with prompt-cached brand rules system prompt. Structured tool output `{ result, flags[] }`. Deterministic color/font pre-checks in parallel. **First red-flag demo to client.** |
| 13–14 | Stripe + commissions | Brand €99/mo, Brand+ €299/mo. Stripe Customer Portal. Commission calculation cron at month-end. **First paying brand.** |
| 15 | Case study | "30 70 Agency: 60 posts in an afternoon, AI-validated, on-brand." Publish to Twitter, Sidebar, Designer News. |
| 16 | Onboarding round 2 | Onboard 5 more fashion brands from Basile's network. Refine onboarding from feedback. **Target: €600–2000 MRR.** |

End state: 6–10 paying fashion brands, €1–3k MRR, validated case study, foundation for seed raise (Phase 4 in deck).

---

## 8. Week 1 — day by day

| Day | Tasks |
|---|---|
| **Mon** | Revoke leaked Figma token in `Framework-generator-main/code.ts:116`. Rotate JWT secret. Set up new GitHub org `framework-io`. Create monorepo skeleton with pnpm + Turbo. Decide region: Vercel + Supabase EU (Frankfurt). |
| **Tue** | Drizzle schema (this brief, section 5) translated to TS in `packages/db/`. Run first migration on Supabase. Set up `apps/web` (Next.js 15) and `apps/plugin` (Figma plugin starter). |
| **Wed** | Clerk integration: organizations, custom claims, webhook to sync `users` + `organizations` + `memberships` rows. Magic-link signup flow. |
| **Thu** | Stripe setup: products (Brand, Brand+), prices, webhook handler for `customer.subscription.*` events → `subscriptions` table. Resend for transactional email with React Email. |
| **Fri** | One-shot migration script: read existing v0 Mongo dump → translate to Postgres rows. Validate on staging. Sentry + Axiom wired. **End of week: foundations production-ready, no product yet.** |

---

## 9. The user's product philosophy (added 2026-05-05)

> "Enhance human creation, give it to clients as efficient as an AI tool that they can use changing their text/image/color etc, keep following the brand identity."

This is the actual moat. Spelling it out:

- **Not generative AI.** Krea, Midjourney, Adobe Firefly produce *new* imagery from prompts. They're great but they break brand identity by definition (every output is novel).
- **Not template marketplaces.** Canva templates are user-uploaded, generic, brand-agnostic.
- **Framework is the third path.** A designer hand-crafts the system once. The client experiences it as a UX as fluid as an AI tool — type, click, upload, done — but every output is a permutation of what the designer already approved.

**Implication for the AI agent**: it isn't generating; it's *policing*. The agent is the safety net under the human creation, not the creator. This positioning is more honest, more defensible, and aligned with where luxury brands draw the AI line.

**Implication for marketing copy**: avoid "AI-generated", "generative brand"; lean on "brand-locked", "designer-authored, client-customizable", "human creativity at AI speed."

**Implication for product UX**: every editable slot should feel like a powerful constraint, not a guardrail. The user shouldn't feel locked in; they should feel guided. Interaction patterns:
- Inline character counter that warns at 90% before constraint trips
- Preview updates instantly with no save button (it's already saved)
- "Try the Pro layout" upsell when user hits a constraint a higher tier would unlock
- Image upload immediately runs through the brand's color-grade LUT (Phase 4) so the user *sees* their photo become on-brand in 0.5s — feels magical, no AI hallucination

---

## 10. Open questions / decisions to make

1. **Where to host the editor: Next.js vs Vite SPA?** Recommend Next for unified web app; defer decision to week 6 when actually building it.
2. **Builder.io vs Locofy vs DIY for Figma → JSX compiler?** Recommend Builder.io for Phase 2 (fastest), DIY in Phase 4 when we want pixel control.
3. **Edge runtime: Vercel Edge or Cloudflare Workers?** Recommend Vercel Edge for week-1 simplicity. Cloudflare Workers is a Phase 4 optimization.
4. **Subdomain vs path-based tenant routing?** Subdomain (`3070.frame-work.app`) — better for white-label feel, what the v0 already does.
5. **WebSocket or SSE for realtime?** Supabase Realtime (which uses WS internally) — no decision needed.
6. **Self-host vs SaaS for Lottie player?** lottie-react package. Trivial.
7. **Image treatment LUT pipeline: server-side vs WebGL client-side?** Phase 4 question. Probably server (fal.ai) for reliability.
8. **Pricing currency: € or $?** EU first → €. Detect in Stripe.

---

## 11. Risks / failure modes to watch

- **Builder.io / Locofy quality bottleneck.** If the Figma → JSX compile is messy, the whole pipeline breaks. Mitigation: validate on a real 30 70 template in week 5 before committing to Phase 2.
- **Font licensing edge cases.** If a brand insists on using a font we can't legally serve, we lose them. Mitigation: explicit "supported font sources" list in onboarding.
- **AI compliance false positives.** A vigilant agent that flags every export as non-compliant trains users to ignore it. Mitigation: tunable thresholds per brand, designer reviews flag list during template publish.
- **Designer churn before clients sign up.** Designers won't stay engaged on a free tier without seeing referral revenue. Mitigation: instrument referral funnel, ship designer dashboard in week 4 showing pipeline.
- **30 70 Agency declines / pilot fails.** Single-customer dependency is fragile. Mitigation: line up 2 backup pilot designers in Basile's network before week 4.

---

## 12. Files / artifacts that already exist

- `FrameWork-back-main.zip` — v0 Express + Mongo backend (will be replaced)
- `FrameWork-Front-main.zip` — v0 React + Vite frontend (editor parts can be salvaged)
- `Framework-generator-main.zip` — v0 Figma plugin (token leaked in `code.ts:116` — REVOKE)
- `FrameWork-Plugin-main.zip` — v0 runtime Figma plugin (will be retired; replaced by Satori at edge)
- `BFS x JRJR - Framework.pdf` — pitch deck, 23 pages, source of truth for vision
- `BRIEF.md` (this file)

Empty dirs created during planning: `packages/db/schema/`, `packages/db/migrations/`. Safe to delete or keep as scaffolding.

---

## 13. Next session — pick up here

Pick one of:

- **A. Drizzle schema in TS.** Convert section 5 of this brief into actual `packages/db/` files. Drizzle v0.36+, Postgres dialect, with `pgEnum`, indexes, `defaultRandom()` UUIDs. Add `policies.sql` with the RLS policies from section 5. Output ~14 files.

- **B. Figma Generator Plugin v2.** Walks the file, extracts brand tokens, tags `[Framework]` frames as templates, POSTs to `/api/brand-tokens` and `/api/templates`. TypeScript, runs in Figma's plugin sandbox. Replaces v0 plugin entirely.

- **C. Brand Hub Next.js page tree.** App-Router routes mirroring section 5 of this brief (Vevo-style). Per-tenant subdomain middleware, ISR with on-publish revalidation. Tailwind v4 + shadcn/ui, real production aesthetic.

- **D. AI compliance agent spec.** Claude system prompt template with prompt-cache layout, tool schema for structured red-flag output, fashion-specific rule encoding examples, eval set for benchmarking precision/recall against a small hand-labeled corpus.

- **E. Cold-outreach playbook for Basile.** Template DMs to 20 Paris fashion designers, demo script (5 min), pricing handling, top 5 objection responses, partner-program one-pager PDF.

Recommended order: **A → B → C in tech track**, **E in parallel for go-to-market**. D becomes urgent once first 3 brands are live (week 9).

---

---

## 14. Reference — `FrameWork-back-main` (v0 backend), already shipped

What exists today in `FrameWork-back-main.zip`. Verbatim source with annotations on **keep / refactor / discard** and mapping to the new schema in §5.

### 14.0 Filesystem

```
FrameWork-back-main/
├── api/
│   └── index.js                        # entry point
├── config/
│   ├── cloudinary.js                   # Cloudinary + multer storage
│   ├── dbConfig.js                     # Mongo connection
│   ├── mail.js                         # nodemailer transporter (Gmail SMTP)
│   ├── mailTemplate.js                 # HTML email wrapper
│   ├── mail.html                       # (legacy, unused)
│   └── mailTemplate.html               # (legacy, unused)
├── middlewares/
│   ├── checkExistingDesign.js          # 409 if FigmaFileKey already exists
│   ├── isAdmin.js                      # role gate
│   ├── isAuthenticated.js              # JWT verify + load user
│   ├── uploadImagesToCloudinary.js     # Figma /v1/images → Cloudinary
│   └── uploadImagesToCloudinaryForBrand.js  # variant for brand images
├── models/
│   ├── BrandImages.model.js            # → assets table
│   ├── Client.model.js                 # → users table
│   ├── Designs.model.js                # → templates / template_versions / compositions
│   └── Element.model.js                # → discard (unused downstream)
├── routes/
│   ├── auth.routes.js                  # signup/login/reset/me/update
│   ├── brand.routes.js                 # GET /all, GET /:figmaName
│   ├── clients.routes.js               # CRUD on users
│   ├── designs.routes.js               # main editor flow (BROKEN: nested handler)
│   ├── figma.routes.js                 # plugin polling endpoints
│   └── index.routes.js                 # mount + auth gate (WRONG ORDER)
├── package.json
├── package-lock.json
├── Dockerfile                          # Node 18.15 slim, multi-stage
├── Dockerfile - local                  # (the space in name is broken)
├── fly.toml                            # cdg region, auto-stop machines
├── .example.env
├── .gitignore
├── .dockerignore - local
└── README.md
```

Stack: Node + Express 4 + Mongoose 7 + JWT + bcryptjs + multer + cloudinary + nodemailer. Deployed to Fly.io (cdg/Frankfurt). Reachable at `https://framework-backend.fly.dev/api`.

---

### 14.1 Entry point

#### `api/index.js`

```js
// require('dotenv/config')
require("dotenv").config();
// Connect to the database
require("../config/dbConfig");

//SSL conf
const https = require("https");
const fs = require("fs");

// We need express
const express = require("express");
const cors = require("cors");
const { v4 } = require("uuid");

// Need the app
const app = express();

// const privateKey = fs.readFileSync(__dirname + "/ssl/server.key", "utf8");
// const certificate = fs.readFileSync(__dirname + "/ssl/server.crt", "utf8");
// const ca = fs.readFileSync(__dirname + "/ssl/root.crt", "utf8");

//const credentials = { key: privateKey, cert: certificate, ca: ca };

// Configuration of the app
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Authorize everyone
app.use(cors());

// Here we are importing the index router
// All the requests are handled in the subsequent routes
app.use("/api", require("../routes/index.routes"));

app.use("*", (req, res, next) => {
  res.status(200).json({ message: "That's a 404 right here..." });
});

app.use((err, req, res, next) => {
  console.log(err);
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Cast error",
      details: "Make sure you are sending correct information",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired" });
  }
  res.status(500).json({ error: err, message: err.message });
});
// const httpsServer = https.createServer(credentials, app);
// httpsServer.listen(process.env.PORT, () =>
//   console.log(`Server running on https://localhost:${process.env.PORT}`)
// );

app.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`)
);
```

**Verdict: discard.** Reasons:
1. `cors()` open to all origins — must restrict to tenant subdomains.
2. 404 returns 200 status — kills monitoring.
3. No `helmet`, no rate limiting, no request logging.
4. Hand-rolled error handler — replace with framework-native (Hono `onError` or Next route handlers).
5. Express → switch to **Hono** (or Next App Router route handlers). 5ms cold start at edge vs ~80ms for Express.

---

### 14.2 Config

#### `config/dbConfig.js`

```js
const mongoose = require("mongoose");

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/framework";

if (!URI) {
  throw Error("Could not find MONGODB_URI in the .env file.");
}

mongoose
  .connect(URI)
  .then((db) => {
    console.log(`Connected to ${db.connection.name}`);
  })
  .catch((error) => {
    console.log(error.message);
  });
```

**Verdict: discard.** Replaced by Drizzle + Supabase Postgres connection in `packages/db/index.ts`.

#### `config/cloudinary.js`

```js
// config/cloudinary.config.js

const cloudinary = require("cloudinary").v2
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const multer = require("multer")

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_NAME,
	api_key: process.env.CLOUDINARY_KEY,
	api_secret: process.env.CLOUDINARY_SECRET,
})

const storage = new CloudinaryStorage({
	// cloudinary: cloudinary,
	cloudinary,
	params: {
		allowed_formats: ["jpg", "png", "gif", "webp", "jpeg"],
		folder: "framework",
		// resource_type: 'raw' => this is in case you want to upload other type of files, not just images
	},
})

//                     storage: storage
module.exports = multer({ storage })
```

**Verdict: discard.** Replace Cloudinary with **Cloudflare R2 + Cloudflare Images**:
- ~30% the cost, no egress fees
- Pre-signed direct browser uploads (skip the Express server entirely)
- Image transforms via URL params, no Cloudinary SDK call

#### `config/mail.js`

```js
const nodemailer = require("nodemailer");

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "damien.audrezet@gmail.com",
    pass: process.env.GMAIL_PASSWORD,
  },
});

/** create reusable sendmail function 
@params {object} options - mail options (to, subject, text, html)
@params {function} callback - callback function to handle response
*/
const SENDMAIL = async (mailDetails, callback) => {
  try {
    const info = await transporter.sendMail(mailDetails);
    callback(info);
  } catch (error) {
    console.log(error);
  }
};

module.exports = SENDMAIL;
```

**Verdict: discard.** Replace with **Resend** + React Email:
- Personal Gmail address as `from` is unprofessional and triggers spam filters
- Gmail SMTP rate-limited (~500/day)
- Resend ships with React Email templating, transactional analytics, and a `from` like `team@frame-work.app`

#### `config/mailTemplate.js`

```js
// an email template that can be used with Nodemailer to send emails

const HTML_TEMPLATE = (text) => {
  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Framework.</title>
    <style>
      div {
        /* border-radius: 2rem; */
        font-family: "Plain";
        background-color: white;
      }
      .container {
        height: 100vh;
        /* width: 33.3333%; */
        padding: 1rem;
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        flex-direction: column;
      }
      .email {
        width: 80%;
        margin: 0 auto;
        background-color: white;
        padding: 20px;
      }
      .email-header {
        background-color: white;
        border: none;
        border-top: 1px solid black;
        border-bottom: 1px solid black;
        color: black;
        font-size: 0.8rem;
        padding: 0.5rem;
        height: max-content;
        flex: 1;
        display: flex;
        justify-content: flex-start;
      }
      .email-body { padding: 20px; }
      .email-footer { /* ...same as header... */ }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="email">
        <div class="email-header"><h1>Framework.</h1></div>
        <div class="email-body"><p>${text}</p></div>
        <div class="email-footer"><p>Framework</p></div>
      </div>
    </div>
  </body>
</html>`;
};

module.exports = HTML_TEMPLATE;
```

**Verdict: refactor.** The visual design is OK as a starting point — port to a React Email component. Use `Plain` font fallback. Drop the `100vh` (emails don't honor viewport units).

---

### 14.3 Models — Mongoose schemas to migrate

#### `models/Client.model.js` → maps to **`users` + `memberships`** in §5

```js
const { model, Schema } = require("mongoose");

const ClientSchema = new Schema({
  username: {
    required: true,
    unique: true,
    trim: true,
    maxLength: 50,
    type: String,
  },
  password: {
    type: String,
    select: false,
  },
  email: {
    type: String,
  },
  pictureUrl: {
    type: String,
  },
  status: {
    type: String,
    enum: ["Client", "admin"],
    default: "Client",
  },
});

const Client = model("Client", ClientSchema);

module.exports = Client;
```

**Migration plan:**
- `Client.username` → `users.name` (display) + `organizations.slug` (subdomain)
- `Client.password` → discard (Clerk owns auth)
- `Client.email` → `users.email`
- `Client.pictureUrl` → `users.avatar_url`
- `Client.status='admin'` → `memberships.role='admin'` on the framework-internal org

#### `models/Designs.model.js` → splits into **`templates`, `template_versions`, `compositions`** in §5

```js
const { model, Schema } = require("mongoose");

const frameSchema = new Schema({
  type: String,
  sectionName: String,
  frameName: String,
  frameId: String,
  thumbnailURL: String,
  archiveURL: Array,
});

const variableAndImagesSchema = new Schema({
  type: String,
  name: String,
  valuesByMode: Schema.Types.Mixed,
  id: String,
  url: String,
  hasChanged: { type: Boolean, default: false },
});

const sectionSchema = new Schema({
  type: String,
  name: String,
  id: String,
  frames: [frameSchema],
});

const DesignSchema = new Schema({
  FigmaName: String,
  FigmaFileKey: String,
  FigmaId: String,
  sections: [sectionSchema],
  images: [variableAndImagesSchema],
  variables: [variableAndImagesSchema],
  creator: { type: Schema.Types.ObjectId, ref: "Client" },
  usedBy: [{ type: Schema.Types.ObjectId, ref: "Client" }],
  hasChanged: { type: Boolean, default: false },
  isOkToDownload: { type: Boolean, default: false },
});

const Design = model("Designs", DesignSchema);

module.exports = Design;
```

**Migration plan:**
| v0 field | New table | Notes |
|---|---|---|
| `FigmaName`, `FigmaFileKey`, `FigmaId` | `templates.figma_file_key`, `templates.figma_node_id` | One `templates` row per Figma file |
| `sections[].frames[]` | `template_versions.layout_schema` (JSONB) | Restructured as `LayoutNode` tree |
| `variables[]` | `template_versions.slot_schema` (JSONB) | Restructured as `SlotDefinition[]` |
| `images[]` (template-level placeholders) | `template_versions.layout_schema` slots of type `image` | |
| `creator` | `templates.brand_id` (via the studio that owns the brand) | |
| `usedBy[]` | `memberships` on the brand | |
| `hasChanged`, `isOkToDownload` | **Discarded** | The whole flag-based mutation queue dies with Figma-in-the-loop |
| Each user's edited instance | `compositions` (new table, didn't exist in v0) | v0 mutated the design doc itself — destructive |

Per-user instances: in v0, every edit overwrote the same `Design` document. New model: `Design` is the *template* (immutable per version). Each customer creation is a `composition` row. **Multi-tenant safety + history come for free.**

#### `models/BrandImages.model.js` → maps to **`assets`** in §5

```js
const mongoose = require("mongoose");

// Define the schema
const imageSchema = new mongoose.Schema({
  FigmaName: String,
  figmaId: {
    type: String,
    required: true,
    unique: true,
  },
  images: {
    type: Object,
    required: true,
  },
});

// Create the model
const Image = mongoose.model("Image", imageSchema);

// Export the model
module.exports = Image;
```

**Migration plan:**
- `figmaId` (unique constraint) is too restrictive — one brand can have thousands of images. Drop the unique.
- `images: Object` (untyped) → typed columns `r2_key`, `mime_type`, `size_bytes`, `width`, `height`.
- Add `treated_r2_key` for the future Image Treatment Engine output.

#### `models/Element.model.js` → **discard**

```js
const mongoose = require("mongoose");

const elementSchema = new mongoose.Schema({
  name: String,
  type: String,
  characters: String,
  nodeid: String,
  elements: { type: [Object], default: undefined },
});

const brandSchema = new mongoose.Schema({
  FigmaName: String,
  FigmaId: { type: String, unique: true },
  elements: { type: [elementSchema], default: undefined },
  isPrivate: Boolean,
});

const Element = mongoose.model("Element", brandSchema);

module.exports = Element;
```

**Verdict: discard.** Written by the Generator plugin's `createBrand` route, but no consumer in the frontend reads from it. The data is replaced structurally by `brand_token_versions.tokens`. Don't migrate any rows.

---

### 14.4 Middlewares

#### `middlewares/isAuthenticated.js` → replaced by **Clerk middleware**

```js
const jwt = require("jsonwebtoken");
const User = require("../models/Client.model");

async function isAuthenticated(req, res, next) {
  try {
    let token = req.headers.authorization;
    if (!token) {
      return res.status(400).json({ message: "No token found" });
    }
    token = token.replace("Bearer ", "");
    const payload = jwt.verify(token, process.env.TOKEN_SECRET, {
      algorithm: "HS256",
    });
    const user = await User.findById(payload._id);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = isAuthenticated;
```

**Verdict: discard.** Replace with `@clerk/nextjs` `auth()` helper. No more JWT verification, no DB call per request — Clerk caches identity at the edge.

#### `middlewares/isAdmin.js` → replaced by **Clerk org roles**

```js
async function isAdmin(req, res, next) {
	try {
		console.log(req.user)
		console.log(req)
		if (req.user.status === "admin") {
			return next()
		}
		return res.status(401).json({ message: "Unauthorized" })
	} catch (error) {
		next(error)
	}
}
module.exports = isAdmin
```

**Verdict: discard.** Replace with Clerk org-role check (`auth().has({ role: 'org:admin' })`). The `console.log(req)` would dump request bodies including passwords to logs — security hole.

#### `middlewares/checkExistingDesign.js` → replaced by **Postgres UNIQUE constraint**

```js
const Design = require("../models/Designs.model");

const checkExistingDesign = async (req, res, next) => {
  try {
    const existingDesign = await Design.findOne({
      FigmaFileKey: req.body.FigmaFileKey,
    });

    if (existingDesign) {
      console.log('Existing design detected in middleware')
      return res.status(400).json({
        error: "A design with the same FigmaFileKey already exists.",
      });
    }
    next();
  } catch (error) {
    console.error("Error checking existing design:", error);
    res.status(500).json({
      error: "An error occurred while checking the existing design.",
    });
  }
};

module.exports = checkExistingDesign;
```

**Verdict: discard.** Use Postgres `UNIQUE(brand_id, figma_file_key, figma_node_id)` on `templates`. Database-level constraint > app-level race condition.

#### `middlewares/uploadImagesToCloudinary.js` → replaced by **Satori + R2**

```js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const uploadImagesToCloudinary = async (req, res, next) => {
  const { sections, FigmaFileKey } = req.body;

  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({
      error: "Sections must be an array.",
    });
  }

  let frameIds = [];
  for (let section of sections) {
    for (let frame of section.frames) {
      frameIds.push(frame.frameId);
    }
  }

  const idString = frameIds.join(",");

  try {
    const response = await fetch(
      `https://api.figma.com/v1/images/${FigmaFileKey}?ids=${idString}&scale=1&format=png`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Figma-Token": process.env.FIGMA_TOKEN,
        },
      }
    );

    const data = await response.json();
    const imageUrls = data.images;

    const uploadPromises = Object.entries(imageUrls).map(([id, url]) => {
      const imageName = id;
      return cloudinary.uploader
        .upload(url, {
          folder: "framework",
          allowed_formats: ["jpg", "png", "gif", "webp", "jpeg"],
          public_id: imageName,
        })
        .then((result) => ({ frameId: id, url: result.secure_url }));
    });

    const uploadResults = await Promise.all(uploadPromises);

    const urlMap = {};
    uploadResults.forEach((result) => {
      urlMap[result.frameId] = result.url;
    });

    for (let section of sections) {
      for (let frame of section.frames) {
        if (urlMap[frame.frameId]) {
          frame.thumbnailURL = urlMap[frame.frameId];
        }
      }
    }

    next();
  } catch (error) {
    console.error("Error uploading images to Cloudinary:", error);
    res.status(500).json({
      error: "An error occurred while uploading images to Cloudinary",
    });
  }
};

module.exports = uploadImagesToCloudinary;
```

**Verdict: refactor.** The pattern (call Figma `/v1/images` to get pre-rendered thumbnails, store them) is reused at template-creation time:
1. Keep the Figma `/v1/images` call — it's how we get the *initial* template thumbnail (one-time per template publish).
2. Replace Cloudinary upload with R2 PUT.
3. Move `FIGMA_TOKEN` to a Secret Manager entry that only the template-publish endpoint can read.
4. **Remove this from the runtime `/figma/create` path** — runtime renders use Satori, not Figma `/v1/images`.

#### `middlewares/uploadImagesToCloudinaryForBrand.js` → discard, replace with direct-to-R2 upload

```js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const uploadImagesToCloudinaryForBrand = async (req, res, next) => {
  try {
    const { images } = req.body;

    for (const [imageName, imageData] of Object.entries(images)) {
      const { ids, url } = imageData;

      const result = await cloudinary.uploader.upload(url, {
        folder: "framework",
        allowed_formats: ["jpg", "png", "gif", "webp", "jpeg"],
        public_id: imageName,
      });

      images[imageName].url = result.secure_url;
    }

    next();
  } catch (error) {
    console.error("Error uploading images to Cloudinary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = uploadImagesToCloudinaryForBrand;
```

**Verdict: discard.** Direct-to-R2 with pre-signed PUT URLs is faster (no proxy through our server) and cheaper (no Cloudinary fees). Use Cloudflare's `@aws-sdk/client-s3` against R2.

---

### 14.5 Routes

#### `routes/index.routes.js` — **MOUNT ORDER BUG**

```js
const isAuthenticated = require("../middlewares/isAuthenticated.js");
const router = require("express").Router();

router.get("/", (req, res) => {
  res.json("We are live on /api.");
});

// Prefixing routes
const ClientRoutes = require("./clients.routes.js");
router.use("/client", ClientRoutes);
router.use("/auth", require("./auth.routes.js"));
router.use("/figma", require("./figma.routes.js"));
router.use("/brand", require("./brand.routes.js"));
router.use(isAuthenticated);
//! We need to be logged in to access this part of the website
router.use("/designs", require("./designs.routes.js"));

module.exports = router;
```

**🔴 Critical bug:** `isAuthenticated` is mounted *after* `/client`, `/auth`, `/figma`, `/brand`. Those route trees are public:
- `GET /api/client/all` returns every user
- `DELETE /api/client/:id` deletes any user
- `POST /api/figma/create`, `/update`, `/createBrand`, `/:id/changeApplied` rewrite or destroy any brand's data

**Verdict: discard.** New API enforces auth at the framework layer (Hono middleware or Next route handler) on every endpoint by default; opt-out is explicit per route.

#### `routes/auth.routes.js` — **password emailed in cleartext**

```js
const router = require("express").Router();
const User = require("../models/Client.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const salt = 10;
const isAuthenticated = require("./../middlewares/isAuthenticated");
const HTML_TEMPLATE = require("../config/mailTemplate");
const SENDMAIL = require("../config/mail");
const uploader = require("../config/cloudinary");

function generatePassword() {
  const length = 10;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&_-=?";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

router.post("/signup", uploader.single("picture"), async (req, res, next) => {
  let pictureUrl;
  if (req.file) pictureUrl = req.file.path;
  const password = generatePassword();
  try {
    let { username, email } = req.body;
    username = username.toLowerCase().replace(/^"?(.*?)"?$/, "$1").replace(/\s/g, "");
    email = email.toLowerCase().replace(/^"?(.*?)"?$/, "$1").replace(/\s/g, "");
    const foundUser = await User.findOne({ username });
    if (!username || !email) return res.status(400).json({ message: "Missing some informations" });
    if (foundUser) return res.status(400).json({ message: "User already exist." });
    if (password.length < 6) return res.status(400).json({ message: "Unsafe password" });
    const generatedSalt = await bcrypt.genSalt(salt);
    const hashedPass = await bcrypt.hash(password, generatedSalt);
    const createdUser = await User.create({
      username, email, pictureUrl,
      password: hashedPass,
    });
    newUserEmail(email, username, password);
    res.status(201).json({ message: "Welcome' aboard young pirate!", createdUser });
  } catch (error) {
    next(error);
  }
});

function newUserEmail(email, username, password) {
  const message = `Hi ! JRJRJ just created you an account that you can use ! <br /> 
  <br /> 
  The username is "${username}" <br /> 
  The password is &quot;${password}&quot; <br />
  <br /> 
  Click  <a href="https://frame-work.app">here</a> to connect`;
  const options = {
    from: "Framework. <frame-work@gmail.com>",
    to: email,
    subject: "New account on Framework",
    text: message,
    html: HTML_TEMPLATE(message),
  };
  SENDMAIL(options, (info) => {
    console.log("Email sent successfully");
    console.log("MESSAGE ID: ", info.messageId);
  });
}

router.post("/login", async (req, res, next) => {
  try {
    let { username, password } = req.body;
    username = username.toLowerCase();
    const foundUser = await User.findOne({ username }).select("password username");
    if (!foundUser) return res.status(400).json({ message: "Wrong credentials" });
    const samePassword = await bcrypt.compare(password, foundUser.password);
    if (!samePassword) return res.status(400).json({ message: "Wrong credentials" });
    const payload = { username: foundUser.username, _id: foundUser._id };
    const token = jwt.sign(payload, process.env.TOKEN_SECRET, {
      algorithm: "HS256",
      expiresIn: "7d",
    });
    res.json({ token: token });
  } catch (error) {
    next(error);
  }
});

router.post("/reset", async (req, res, next) => {
  let { username } = req.body;
  username = username.toLowerCase();
  try {
    const foundUser = await User.findOne({ username });
    if (!foundUser) return res.status(400).json({ message: "User not found" });
    const password = generatePassword();
    const generatedSalt = await bcrypt.genSalt(salt);
    const hashedPass = await bcrypt.hash(password, generatedSalt);
    const newPassword = { password: hashedPass };
    const updatedClient = await User.findOneAndUpdate(
      { username }, newPassword, { new: true }
    );
    newUserEmail(updatedClient.email, updatedClient.username, password);
    res.json("coucou");
  } catch (error) {
    next(error);
  }
});

router.get("/me", isAuthenticated, async (req, res, next) => {
  res.json(req.user);
});

router.patch("/update/:id", isAuthenticated, async (req, res, next) => {
  let { username, password, email } = req.body;
  username = username.toLowerCase();
  const id = req.params.id;
  try {
    const updateFields = {};
    if (email) updateFields.email = email;
    if (password) {
      const generatedSalt = await bcrypt.genSalt(salt);
      const hashedPass = await bcrypt.hash(password, generatedSalt);
      updateFields.password = hashedPass;
    }
    const updatedClient = await User.findByIdAndUpdate(id, updateFields, { new: true });
    res.json(updatedClient);
  } catch (error) {
    res.json(error);
  }
});

module.exports = router;
```

**Verdict: discard entirely.** Replaced by Clerk:
- `Math.random()` for password gen → not cryptographically secure
- Plaintext password emailed → unrecoverable security mistake
- 7-day JWT in localStorage → XSS-extractable
- `PATCH /update/:id` doesn't verify `:id === req.user._id` → any user can update any other user
- Clerk handles signup, magic links, password reset, MFA, organizations, all of it

#### `routes/figma.routes.js` — **the polling endpoints + uptime watcher**

```js
const Design = require("../models/Designs.model");
const Element = require("../models/Element.model");
const Image = require("../models/BrandImages.model");
const uploader = require("../config/cloudinary");
const uploadImagesToCloudinary = require("../middlewares/uploadImagesToCloudinary");
const checkExistingDesign = require("../middlewares/checkExistingDesign");
const cloudinary = require("cloudinary").v2;

const router = require("express").Router();

const HTML_TEMPLATE = require("../config/mailTemplate");
const SENDMAIL = require("../config/mail");
const uploadImagesToCloudinaryForBrand = require("../middlewares/uploadImagesToCloudinaryForBrand");


// UPTIME

let uptime = 0;

function increaseUptime() {
  uptime++;
  if (uptime != 0 && uptime % 10 == 0) {
    console.log("10seconds without request from plugin");
  }
  checkIfDown();
  setTimeout(increaseUptime, 1000);
}
increaseUptime();


function checkIfDown() {
  if (uptime == 60) {
    // ... emails Damien at 1 minute
  }
  if (uptime == 600) {
    // ... emails at 10 minutes
  }
  if (uptime == 1800) {
    // ... emails at 30 minutes ("LAST WARNING")
  }
}

// ROUTES

router.get("/", (req, res) => res.json("We are live on /figma now we talk."));

router.post("/:id/changeApplied", async (req, res) => {
  const { id } = req.params;
  try {
    const oneDesign = await Design.findOneAndUpdate(
      { FigmaFileKey: id },
      { hasChanged: false, isOkToDownload: true }
    ).then((oneDesign) => res.json(oneDesign));
  } catch (error) {
    console.log("erreur", error);
  }
});

router.get("/:id/change", async (req, res) => {
  const { id } = req.params;
  uptime = 0;
  try {
    const oneDesign = await Design.findOne({ FigmaFileKey: id });
    if (oneDesign) {
      res.json(oneDesign);
    } else {
      res.status(404).json({ message: "Design not found" });
    }
  } catch (error) {
    console.error("Error while retrieving the change:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post(
  "/create",
  checkExistingDesign,
  uploadImagesToCloudinary,
  async (req, res) => {
    try {
      const newDesign = new Design({
        FigmaName: req.body.FigmaName,
        FigmaFileKey: req.body.FigmaFileKey,
        FigmaId: req.body.FigmaId,
        sections: req.body.sections,
        images: req.body.images,
        variables: req.body.variables,
        usedBy: req.body.usedBy._id,
      });
      const savedDesign = await newDesign.save();
      res.status(201).json(savedDesign);
    } catch (error) {
      res.status(500).json({ error: "Une erreur s'est produite lors de la création du design" });
    }
  }
);

router.post("/update", async (req, res) => {
  try {
    const designToUpdate = await Design.findOne({
      FigmaFileKey: req.body.FigmaFileKey,
    });
    if (!designToUpdate) {
      return res.status(400).json({ error: "Le design n'existe pas." });
    }
    designToUpdate.FigmaName = req.body.FigmaName;
    designToUpdate.FigmaFileKey = req.body.FigmaFileKey;
    designToUpdate.FigmaId = req.body.FigmaId;
    designToUpdate.sections = req.body.sections;
    designToUpdate.images = req.body.images;
    designToUpdate.variables = req.body.variables;
    designToUpdate.usedBy = req.body.usedBy._id;
    const updatedDesign = await designToUpdate.save();
    res.status(201).json(updatedDesign);
  } catch (error) {
    res.status(500).json({ error: "Une erreur s'est produite lors de l'update du design" });
  }
});

router.post("/createBrand", async (req, res) => {
  try {
    const existingElement = await Element.findOne({ FigmaId: req.body.FigmaId });
    if (existingElement) {
      await Element.updateOne({ FigmaId: req.body.FigmaId }, req.body);
    } else {
      const savedElement = await Element.create(req.body);
    }
    res.json({ success: true, message: "Data processed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/:figmaId/gettingImagesURL", uploadImagesToCloudinaryForBrand, async (req, res) => {
  const { figmaId } = req.params;
  try {
    const existingImage = await Image.findOne({ figmaId });
    if (existingImage) {
      await Image.updateOne({ figmaId }, { $set: { images: req.body.images } });
    } else {
      const newImage = new Image({
        figmaId,
        FigmaName: req.body.FigmaName,
        images: req.body.images,
      });
      await newImage.save();
    }
    res.json({ success: true, message: "Data processed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/uploadImgURL", async (req, res, next) => {
  // Array of image URLs for testing
  let imageUrls = [
    "https://images.vat19.com/covers/large/mini-circus-clown-bike.jpg",
    "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/a7194436-6812-4f51-887d-fb2f8529fef2",
  ];
  if (!Array.isArray(imageUrls)) imageUrls = [imageUrls];
  try {
    const uploadPromises = imageUrls.map((url) =>
      cloudinary.uploader.upload(url, {
        folder: "framework",
        allowed_formats: ["jpg", "png", "gif", "webp", "jpeg"],
      })
    );
    const results = await Promise.all(uploadPromises);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

**Verdict on each route:**

| v0 route | v3 replacement |
|---|---|
| `GET /:id/change` (plugin polls) | **Deleted.** No more plugin-as-renderer. |
| `POST /:id/changeApplied` (plugin acks) | **Deleted.** Same reason. |
| `POST /create` | `POST /api/templates` (auth-gated, brand-scoped). Inserts `templates` + first `template_versions` row. |
| `POST /update` | `POST /api/templates/:id/versions` — append a new version (immutable history). |
| `POST /createBrand` | `POST /api/brand-tokens` — inserts/updates `brand_token_versions`. |
| `POST /:figmaId/gettingImagesURL` | `POST /api/templates/:id/preview` — generates one-shot preview thumbnails via Figma `/v1/images` server-side. |
| `POST /uploadImgURL` (debug, hard-coded URLs) | **Deleted.** This is debug code that shipped to prod. |
| `increaseUptime` watchdog | **Deleted.** Replace with a real uptime monitor (Better Uptime, Sentry Cron, etc). The in-process timer is multi-instance-broken and emails personal addresses. |

#### `routes/designs.routes.js` — **the editor flow, BROKEN**

```js
const router = require("express").Router();
const Designs = require("../models/Designs.model");
const Client = require("../models/Client.model");
const uploader = require("../config/cloudinary");
const isAuthenticated = require("../middlewares/isAuthenticated");
const cloudinary = require("cloudinary").v2;

const HTML_TEMPLATE = require("../config/mailTemplate");
const SENDMAIL = require("../config/mail");

router.get("/all", async (req, res, next) => {
  try {
    const allDesigns = await Designs.find();
    res.json(allDesigns);
  } catch (error) { next(error); }
});

router.get("/owned", async (req, res, next) => {
  try {
    const allDesigns = await Designs.find({
      $or: [{ usedBy: req.user._id }, { creator: req.user._id }],
    });
    res.json(allDesigns);
  } catch (error) { next(error); }
});

router.post("/", uploader.single("picture"), async (req, res, next) => {
  try {
    const foundUser = await Client.find({ username: req.body.client });
    let pictureUrl;
    if (req.file) pictureUrl = req.file.path;
    const createdDesigns = await Designs.create({
      name: req.body.name,
      picture: pictureUrl,
      creator: req.user._id,
      figmaID: req.body.figmaID,
      figmaNodeIDs: req.body.figmaNodeId,
      usedBy: foundUser,
      hasChanged: false,
      numberOfTextEntries: req.body.numberOfTextEntries,
      textValues: Array.apply(null, Array(parseInt(req.body.numberOfTextEntries))),
    });
    res.status(201).json(createdDesigns);
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const oneDesign = await Designs.findById(id)
      .populate("creator", "pseudo")
      .populate("usedBy");
    res.json(oneDesign);
  } catch (error) { next(error); }
});

router.patch("/:id/archiveURL", async (req, res) => {
  const { id } = req.params;
  const { selectedFrame, archiveURL } = req.body;
  const updatedDesign = await Designs.findOneAndUpdate(
    {
      _id: id,
      "sections.frames.frameId": selectedFrame.frameId,
    },
    {
      $pull: { "sections.$.frames.$[elem].archiveURL": archiveURL },
    },
    {
      arrayFilters: [{ "elem.frameId": selectedFrame.frameId }],
      new: true,
    }
  );
  res.json("salut");
});

// 🔴 BUG: this handler nests another router.post("/:id") inside its try block
router.post("/:id", async (req, res, next) => {
  const currentDate = new Date();
  const options = { year: "numeric", month: "2-digit", day: "2-digit" };
  let dateString = currentDate.toLocaleDateString("en-US", options);
  dateString = dateString.replace(/\//g, "-");

  try {
    const { id } = req.params;
    const { thumbnailURL, selectedFrame, archive } = req.body;
    const result = await cloudinary.uploader.upload(thumbnailURL, {
      folder: "framework",
      allowed_formats: ["jpg", "png", "gif", "webp", "jpeg"],
      public_id: `${dateString}-${selectedFrame.sectionName}-${selectedFrame.frameName}`,
    });
    const cloudinaryUrl = result.secure_url;

    if (archive) {
      const updatedDesign = await Designs.findOneAndUpdate(
        { _id: id, "sections.frames.frameId": selectedFrame.frameId },
        {
          $set: { "sections.$.frames.$[elem].thumbnailURL": cloudinaryUrl },
          $push: { "sections.$.frames.$[elem].archiveURL": cloudinaryUrl },
        },
        { arrayFilters: [{ "elem.frameId": selectedFrame.frameId }], new: true }
      );
    } else {
      const updatedDesign = await Designs.findOneAndUpdate(
        { _id: id, "sections.frames.frameId": selectedFrame.frameId },
        { $set: { "sections.$.frames.$[elem].thumbnailURL": cloudinaryUrl } },
        { arrayFilters: [{ "elem.frameId": selectedFrame.frameId }], new: true }
      );
    }

    if (result) {
      console.log("ThumbnailURL updated successfully:");
      // ⚠️ control flow falls into a nested router.post("/:id") below

router.post("/:id", async (req, res, next) => {
  // ... a second handler nested inside the first one's try block
  // unreachable in practice
});

// PATCH for the actual edit flow — the 10-second polling loop lives here
router.patch("/:id", uploader.array("pictures"), async (req, res, next) => {
  const newTextArray = JSON.parse(req.body.newText);

  try {
    const { id } = req.params;
    const existingDesign = await Designs.findById(id);
    const uploadedImages = req.files.map((file) => ({
      type: "IMAGE",
      name: file.originalname,
      url: file.path,
      hasChanged: true,
    }));

    const updatedImages = existingDesign.images.map((existingImage) => {
      const matchingUpload = uploadedImages.find((upload) => upload.name === existingImage.name);
      return matchingUpload || existingImage;
    });

    const updatedDesign = await Designs.findByIdAndUpdate(
      id,
      {
        variables: newTextArray,
        hasChanged: true,
        images: updatedImages,
      },
      { new: true }
    );

    let numberOfTry = 0;
    async function checkIsChangeDone() {
      const isDesignEditionDone = await Designs.findById(id);
      if (isDesignEditionDone.isOkToDownload) {
        await Designs.findByIdAndUpdate(id, { isOkToDownload: false });
        res.json(isDesignEditionDone);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        numberOfTry++;
        if (numberOfTry < 11) {
          checkIsChangeDone();
        } else {
          next();   // 🔴 BUG: passes nothing, never sends a response, request hangs
        }
      }
    }

    checkIsChangeDone();
  } catch (error) { next(error); }
});

router.get("/notify/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userToNotify = await Client.findById(id);
    const message = `Hi ! A new design is available is your account ! <br />`;
    const options = {
      from: "Framework. <frame-work@gmail.com>",
      to: userToNotify.email,
      subject: "New design available !",
      text: message,
      html: HTML_TEMPLATE(message),
    };
    SENDMAIL(options, (info) => {
      console.log("Email sent successfully");
    });
    res.json("sent");
  } catch (error) { res.json(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deletedThing = await Designs.findByIdAndDelete(req.params.id);
    if (!deletedThing) {
      return res.json({
        message: `Could not match any document with the id ${req.params.id}`,
      });
    }
    res.json({ message: `Deleted document with id ${req.params.id}` });
  } catch (error) { next(error); }
});

module.exports = router;
```

**Bugs documented:**
1. **Nested `router.post("/:id")` inside the outer one's `try`** — the inner registration is dead code; the outer handler never returns a response on the success path.
2. **`PATCH /:id` polling loop hangs** — after 10 retries calls `next()` with no error and no response. The Express request stays open until a proxy timeout (~60s on Fly).
3. **No ownership check** on `GET/PATCH/DELETE /:id` — any authenticated user can read/edit/delete any design.
4. **Implicit Cloudinary upload of arbitrary URLs** in `POST /:id` — request body provides `thumbnailURL`, server uploads it to our Cloudinary account. Anyone can pollute storage.

**Verdict: discard, salvage the patterns.** The flow shape (PATCH variables → poll for ready → return updated doc) maps cleanly to:

| v0 endpoint | v3 endpoint | Notes |
|---|---|---|
| `GET /designs/all` (admin) | `GET /api/admin/compositions` | Internal-only |
| `GET /designs/owned` | `GET /api/compositions?brandId=:id` | Replaces with brand-scoped query, RLS-enforced |
| `POST /designs` (create) | `POST /api/compositions` | Insert into `compositions` table |
| `GET /designs/:id` | `GET /api/compositions/:id` | RLS check on brand membership |
| `PATCH /designs/:id` (edit + poll) | `PATCH /api/compositions/:id` returns immediately | No polling: render is synchronous via Satori, sub-200ms. Edit, render, return URL in one shot. |
| `PATCH /designs/:id/archiveURL` (delete archive) | `DELETE /api/exports/:exportId` | Archives are first-class `exports` rows |
| `POST /designs/:id` (upload thumbnail) | `POST /api/exports` | Server-side rendered, no client-supplied URLs |
| `GET /designs/notify/:id` | `POST /api/compositions/:id/notify` | Resend templated mail |
| `DELETE /designs/:id` | `DELETE /api/compositions/:id` | Soft-delete via `archived_at` |

#### `routes/clients.routes.js`

```js
const router = require("express").Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const Client = require("../models/Client.model");
const { isValidObjectId } = require("mongoose");
const isAdmin = require("../middlewares/isAdmin");
const HTML_TEMPLATE = require("../config/mailTemplate");
const SENDMAIL = require("../config/mail");

router.get("/", getAllClients);

async function getAllClients(req, res, next) {
  try {
    const allClients = await Client.find({ status: { $ne: "admin" } });
    res.json(allClients);
  } catch (error) { next(error); }
}

router.get("/all", async (req, res, next) => {
  try {
    const allClients = await Client.find();
    res.json(allClients);
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: `The id ${req.params.id} is not valid` });
  }
  try {
    const oneClient = await Client.findById(req.params.id);
    res.json(oneClient);
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deletedThing = await Client.findByIdAndDelete(req.params.id);
    if (!deletedThing) {
      return res.json({ message: `Could not match any document with the id ${req.params.id}` });
    }
    res.json({ message: `Deleted document with id ${req.params.id}` });
  } catch (bryan) { next(bryan); }
});

router.patch("/status/:id", isAuthenticated, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedClient = await Client.findByIdAndUpdate(id, { status }, { new: true });
    res.json(updatedClient);
  } catch (error) { next(error); }
});

module.exports = router;
```

**Verdict: discard.** Clerk handles user CRUD. Status field replaced by Clerk org roles.

#### `routes/brand.routes.js`

```js
const router = require("express").Router();
const Element = require("../models/Element.model");
const Image = require("../models/BrandImages.model");

router.get("/all", async (req, res, next) => {
  try {
    const allElements = await Element.find();
    const allImages = await Image.find();
    res.json({ elements: allElements, images: allImages });
  } catch (error) { next(error); }
});

router.get("/:figmaName", async (req, res, next) => {
  try {
    const figmaName = req.params.figmaName;
    const allElements = await Element.find({ FigmaName: figmaName });
    const allImages = await Image.find({ FigmaName: figmaName });
    if (allElements.length === 0 && allImages.length === 0) {
      return res.status(404).json({ message: "No data found for the specified figmaName" });
    }
    res.json({ elements: allElements, images: allImages });
  } catch (error) { next(error); }
});

module.exports = router;
```

**Verdict: discard.** The Element collection is unused downstream; queries replaced by `GET /api/brands/:slug/tokens` which returns the latest published `brand_token_versions` row.

---

### 14.6 Deploy & ops

#### `package.json`

```json
{
  "name": "framework-backend",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "dev": "nodemon ./api/index.js",
    "start": "node ./api/index.js",
    "seed": "node ./bin/client.seed.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "body-parser": "^1.20.2",
    "cloudinary": "^1.37.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^7.2.0",
    "multer": "^1.4.5-lts.1",
    "multer-storage-cloudinary": "^4.0.0",
    "nodemailer": "^6.9.7",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@flydotio/dockerfile": "^0.4.10",
    "nodemon": "^3.0.2"
  }
}
```

**Replacement deps for v3 (`apps/api/package.json`):**
```json
{
  "dependencies": {
    "@clerk/nextjs": "^6",
    "@anthropic-ai/sdk": "^0.34",
    "@aws-sdk/client-s3": "^3",
    "@aws-sdk/s3-request-presigner": "^3",
    "drizzle-orm": "^0.36",
    "hono": "^4",
    "next": "^15",
    "postgres": "^3.4",
    "react-email": "^3",
    "resend": "^4",
    "satori": "^0.10",
    "@resvg/resvg-js": "^2",
    "stripe": "^17",
    "zod": "^3"
  }
}
```

#### `Dockerfile`

```dockerfile
# syntax = docker/dockerfile:1

ARG NODE_VERSION=18.15.0
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app
ENV NODE_ENV="production"

FROM base as build

RUN apt-get update -qq && \
    apt-get install -y build-essential pkg-config python-is-python3

COPY --link package-lock.json package.json ./
RUN npm ci

COPY --link . .

FROM base
COPY --from=build /app /app

EXPOSE 3000
CMD [ "npm", "run", "start" ]
```

**Verdict: discard.** Vercel deploys directly from the monorepo, no Dockerfile needed. If we ever want a container (for self-hosting), regenerate from a Next.js Dockerfile template.

#### `fly.toml`

```toml
app = "framework-backend"
primary_region = "cdg"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  min_machines_running = 0
  processes = ["app"]
```

**Verdict: discard.** Vercel handles edge regions automatically. `auto_stop_machines = true + min_machines_running = 0` was clever for cost but caused 5–10s cold starts.

#### `.example.env`

```
PORT=3000
MONGODB_URI="mongodb://localhost:27017/designs"
TOKEN_SECRET=
MONGODB_URI=
CLOUDINARY_NAME=
CLOUDINARY_KEY=
CLOUDINARY_SECRET=
GMAIL_PASSWORD=
```

**Verdict: discard.** v3 env vars (`apps/api/.env.example`):

```
# Clerk
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Supabase Postgres
DATABASE_URL=
DIRECT_URL=

# Cloudflare
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=framework-prod
CF_IMAGES_TOKEN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM=Framework <hello@frame-work.app>

# Figma (server-side only, scoped to template-publish flow)
FIGMA_PAT=

# Sentry / Axiom
SENTRY_DSN=
AXIOM_TOKEN=
AXIOM_DATASET=framework

# App
NEXT_PUBLIC_APP_URL=https://frame-work.app
```

---

### 14.7 Migration map at a glance

| v0 collection / route | v3 destination | Action |
|---|---|---|
| Mongo `Client` | Postgres `users` + `memberships` (Clerk-backed) | One-shot script |
| Mongo `Designs` | Postgres `templates` + `template_versions` + `compositions` | Split: file-level data → templates; sections/variables → template_versions; user-facing edits → compositions (new) |
| Mongo `BrandImages` | Postgres `assets` | One-shot script, drop unique constraint on figmaId |
| Mongo `Element` | — | **Drop, do not migrate** |
| `POST /auth/signup` | Clerk magic link | — |
| `POST /auth/login` | Clerk session | — |
| `POST /auth/reset` | Clerk reset flow | — |
| `GET /auth/me` | Clerk `auth()` helper | — |
| `PATCH /auth/update/:id` | Clerk user update | — |
| `GET /client*` | Clerk Users API | — |
| `GET /figma/:id/change` | **Deleted** (no plugin polling) | — |
| `POST /figma/:id/changeApplied` | **Deleted** | — |
| `POST /figma/create` | `POST /api/templates` | New Drizzle insert |
| `POST /figma/update` | `POST /api/templates/:id/versions` | New version, old kept |
| `POST /figma/createBrand` | `POST /api/brand-tokens` | New Drizzle insert |
| `POST /figma/:figmaId/gettingImagesURL` | `POST /api/templates/:id/preview` | Server-side Figma `/v1/images` once, R2 upload |
| `POST /figma/uploadImgURL` | **Deleted** (was debug) | — |
| `GET /designs/all` | `GET /api/admin/compositions` | Admin-only, RLS |
| `GET /designs/owned` | `GET /api/compositions` | Brand-scoped via Clerk org |
| `POST /designs` | `POST /api/compositions` | — |
| `GET /designs/:id` | `GET /api/compositions/:id` | RLS-checked |
| `PATCH /designs/:id` | `PATCH /api/compositions/:id` + `POST /api/exports` | No more polling — synchronous render |
| `PATCH /designs/:id/archiveURL` | `DELETE /api/exports/:id` | Archives are first-class |
| `POST /designs/:id` (upload thumbnail) | **Deleted** — server-side Satori render | — |
| `GET /designs/notify/:id` | `POST /api/compositions/:id/notify` | Resend |
| `DELETE /designs/:id` | `DELETE /api/compositions/:id` (soft) | — |
| `GET /brand/all`, `GET /brand/:figmaName` | `GET /api/brands/:slug/tokens` | Returns latest published token version |

### 14.8 Salvage list — what's worth keeping

A small list of patterns that survive the rewrite, conceptually if not literally:

1. **Section/Frame structure as a navigation primitive** — the deck's editor (slide 12 "Drafts/Archive/Create") and the v0 frontend assume each composition has section + frame. Keep this UX hierarchy in the new editor; map to `template_versions.layout_schema.sections[].frames[]`.
2. **Per-export archive history** — `Designs.frames[].archiveURL` is the right idea. Rebuilt cleanly as `exports` rows joined to `compositions`, queryable by date.
3. **Variable-by-name matching pattern** (`name.includes(template) && name.includes(frame)`) — **DO NOT keep this matching logic**, but keep the *concept* of "this slot is scoped to this section/frame combination". Encode explicitly via `slot_schema[].scope: { section?, frame? }` instead of substring magic.
4. **Multi-stage middleware composition** for `POST /figma/create` (`checkExistingDesign` → `uploadImagesToCloudinary` → handler) — port to Hono middleware chain on `POST /api/templates`.
5. **The `usedBy` array allowing multiple users per design** — keep as `memberships` joining users to brand orgs.
6. **CDG region for primary infra** — keep. Frankfurt or Paris Vercel region; Supabase EU project. Latency advantage for Paris-based fashion clients.

### 14.9 Files NOT to migrate (delete on rewrite)

Hard-deletes — no rows, no patterns, no carry-over:

- `models/Element.model.js` and the Element collection in Mongo
- `routes/figma.routes.js` polling endpoints (`/change`, `/changeApplied`)
- `routes/figma.routes.js` `uploadImgURL` (debug)
- `routes/figma.routes.js` uptime watcher (`increaseUptime`)
- `auth.routes.js` `generatePassword` (insecure)
- `auth.routes.js` plaintext-password email flow
- `Dockerfile - local` (broken filename with space)
- `mail.html` and `mailTemplate.html` (legacy, unused)

---

## 15. Upgrade-in-place plan — make `FrameWork-back-main` work properly

**The pragmatic path. Don't rewrite. Patch what's broken, add what's missing, keep momentum.**

The new v3 stack (§4) remains the destination, but the bridge is the existing code working correctly under load with the 30 70 Agency pilot. Every hour spent on greenfield infra now is an hour not spent closing the next brand. We patch v0 until it hits a real wall (§16.7), then migrate.

### 15.0 Pre-work (Day 0 — 30 minutes)

1. Unzip `FrameWork-back-main.zip` into `apps/api/` in a fresh git repo
2. `npm install` against the existing `package.json`
3. Copy `.example.env` → `.env`, fill it in (skip `GMAIL_PASSWORD` — we're replacing that)
4. Verify `npm run dev` boots locally against a fresh local Mongo
5. Initial commit: `chore: import v0 backend verbatim`

Each fix below = one PR for clean git history.

---

### 15.1 Critical security (Week 1 — must ship before any further demos)

#### 15.1.1 Revoke the leaked Figma token
- **Where**: `Framework-generator-main/code.ts:116` (plugin, but token grants Figma account access)
- **Issue**: Live PAT `figd_REDACTED_REVOKE_THIS_TOKEN` committed verbatim
- **Fix**:
  1. Figma → Settings → Personal access tokens → revoke
  2. Replace literal with `process.env.FIGMA_TOKEN` injected at build via Vite `define`
  3. Move the actual token to backend `.env` only — plugin no longer holds it
  4. Re-issue plugin builds without the token

#### 15.1.2 Fix middleware mount order
- **File**: `routes/index.routes.js:14-21`
- **Issue**: `isAuthenticated` mounted *after* `/client`, `/figma`, `/brand` route trees → entirely public
- **Fix** — replace the file with:

```js
const isAuthenticated = require("../middlewares/isAuthenticated.js");
const isPlugin = require("../middlewares/isPlugin.js"); // NEW, see below
const router = require("express").Router();

router.get("/", (req, res) => res.json("We are live on /api."));

// Public — only what genuinely must be
router.use("/auth", require("./auth.routes.js"));

// Plugin-only (signed shared secret)
router.use("/figma", isPlugin, require("./figma.routes.js"));

// Public read-only of brand tokens (used by Brand Hub at *.frame-work.app)
router.use("/brands", require("./brandTokens.routes.js")); // NEW, see 16.3.5

// Everything below requires Bearer JWT
router.use(isAuthenticated);
router.use("/client", require("./clients.routes.js"));
router.use("/brand", require("./brand.routes.js"));
router.use("/designs", require("./designs.routes.js"));

module.exports = router;
```

Create `middlewares/isPlugin.js`:

```js
const crypto = require("crypto");

module.exports = function isPlugin(req, res, next) {
  const got = req.headers["x-framework-plugin-secret"];
  const want = process.env.PLUGIN_SHARED_SECRET;
  if (!got || !want) return res.status(401).json({ message: "Plugin auth required" });
  // constant-time compare prevents timing attacks
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ message: "Plugin auth invalid" });
  }
  next();
};
```

Generate a 32-byte hex secret (`openssl rand -hex 32`), put in backend `.env` as `PLUGIN_SHARED_SECRET`, embed in plugin build. The plugin sends it as `X-Framework-Plugin-Secret` header on every call to `/api/figma/*`.

#### 15.1.3 Add ownership check on /designs/:id
- **File**: `routes/designs.routes.js` (every `:id` handler)
- **Issue**: No verification that `req.user._id` is `creator` or in `usedBy` → any logged-in user can read/edit/delete any design
- **Fix** — create `middlewares/ownsDesign.js`:

```js
const Design = require("../models/Designs.model");

module.exports = async function ownsDesign(req, res, next) {
  try {
    const design = await Design.findById(req.params.id).select("creator usedBy");
    if (!design) return res.status(404).json({ message: "Not found" });

    const userId = req.user._id.toString();
    const isCreator = design.creator?.toString() === userId;
    const isUsedBy = design.usedBy?.some((u) => u.toString() === userId);
    const isAdmin = req.user.status === "admin";

    if (!isCreator && !isUsedBy && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.design = design; // pass through for handlers that want it
    next();
  } catch (error) {
    next(error);
  }
};
```

Apply to every `:id` route in `routes/designs.routes.js`:

```js
const ownsDesign = require("../middlewares/ownsDesign");

router.get("/:id", ownsDesign, ...);
router.post("/:id", ownsDesign, ...);
router.patch("/:id", ownsDesign, uploader.array("pictures"), ...);
router.patch("/:id/archiveURL", ownsDesign, ...);
router.delete("/:id", ownsDesign, ...);
```

#### 15.1.4 Delete the debug `uploadImgURL` route
- **File**: `routes/figma.routes.js:296-325`
- **Issue**: Hard-coded test URL list; anyone can pollute Cloudinary by calling it
- **Fix**: Delete the entire `router.post("/uploadImgURL", ...)` block. No replacement.

#### 15.1.5 Pin CORS to specific origins
- **File**: `api/index.js:29`
- **Issue**: `app.use(cors())` allows any origin
- **Fix**:

```js
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server, Postman
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (/^https?:\/\/[a-z0-9-]+\.frame-work\.app$/.test(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));
```

Set `ALLOWED_ORIGINS=http://localhost:5173,https://frame-work.app` in `.env`.

---

### 15.2 Bug fixes (Week 1, parallel with 15.1)

#### 15.2.1 The nested `router.post("/:id")` in `designs.routes.js`
- **File**: `routes/designs.routes.js:105-206`
- **Issue**: Two `router.post("/:id")` registrations; the second is nested inside the first's `try` block; the first never sends a response on the success path because its closing `}` is missing
- **Fix** — replace lines 105-206 entirely with **one** well-formed handler:

```js
router.post("/:id", ownsDesign, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { thumbnailURL, selectedFrame, archive } = req.body;

    // Validate the URL is from a domain we trust before re-uploading
    const allowed = ["figma-alpha-api.s3.us-west-2.amazonaws.com", "s3-alpha-sig.figma.com"];
    const url = new URL(thumbnailURL);
    if (!allowed.includes(url.hostname)) {
      return res.status(400).json({ error: "thumbnailURL must be a Figma asset" });
    }

    const dateString = new Date()
      .toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
      .replace(/\//g, "-");

    const result = await cloudinary.uploader.upload(thumbnailURL, {
      folder: "framework",
      allowed_formats: ["jpg", "png", "gif", "webp", "jpeg"],
      public_id: `${dateString}-${selectedFrame.sectionName}-${selectedFrame.frameName}`,
    });
    const cloudinaryUrl = result.secure_url;

    const update = archive
      ? {
          $set: { "sections.$.frames.$[elem].thumbnailURL": cloudinaryUrl },
          $push: { "sections.$.frames.$[elem].archiveURL": cloudinaryUrl },
        }
      : { $set: { "sections.$.frames.$[elem].thumbnailURL": cloudinaryUrl } };

    const updated = await Designs.findOneAndUpdate(
      { _id: id, "sections.frames.frameId": selectedFrame.frameId },
      update,
      { arrayFilters: [{ "elem.frameId": selectedFrame.frameId }], new: true }
    );

    if (!updated) return res.status(404).json({ error: "Design or frame not found" });
    res.json({ message: "Thumbnail updated", design: updated });
  } catch (error) {
    next(error);
  }
});
```

#### 15.2.2 The polling-loop hang
- **File**: `routes/designs.routes.js:264-283`
- **Issue**: After 10 retries calls `next()` with no error and no response → request hangs until proxy timeout
- **Fix**:

```js
let numberOfTry = 0;
async function checkIsChangeDone() {
  const isDone = await Designs.findById(id);
  if (isDone.isOkToDownload) {
    await Designs.findByIdAndUpdate(id, { isOkToDownload: false });
    return res.json(isDone);
  }
  numberOfTry++;
  if (numberOfTry >= 11) {
    return res.status(504).json({
      message: "Plugin did not apply changes within 10 seconds. Is the Figma plugin running?",
      designId: id,
    });
  }
  await new Promise((r) => setTimeout(r, 1000));
  return checkIsChangeDone();
}
checkIsChangeDone();
```

(Bandage. Phase 2 replaces polling with WebSocket / SSE.)

#### 15.2.3 Remove the in-process uptime watcher
- **File**: `routes/figma.routes.js:18-89`
- **Issue**: `setTimeout(increaseUptime, 1000)` runs in every Node process; multi-instance scaling sends duplicate alerts; emails personal Gmail accounts
- **Fix**: Delete lines 18-89. Add `/api/figma/healthz`:

```js
router.get("/healthz", async (req, res) => {
  const last = await Designs.findOne({}, { updatedAt: 1 }).sort({ updatedAt: -1 });
  const ageSeconds = last ? (Date.now() - last.updatedAt.getTime()) / 1000 : Infinity;
  if (ageSeconds > 1800) return res.status(503).json({ status: "stale", ageSeconds });
  res.json({ status: "ok", ageSeconds });
});
```

External monitor (Better Uptime free tier or UptimeRobot) pings `/api/figma/healthz` every minute → emails Damien + Jean on 503. Multi-instance safe, no in-process timer.

---

### 15.3 Schema fixes (Week 2)

#### 15.3.1 Add timestamps everywhere
- **Files**: all four models in `models/`
- **Fix**: append `{ timestamps: true }` to each schema constructor

```js
const DesignSchema = new Schema({
  /* existing fields */
}, { timestamps: true });
```

Repeat for `Client`, `BrandImages`, `Element`. Existing rows get `null` timestamps; that's fine.

#### 15.3.2 Unique index on `Designs.FigmaFileKey`
- **File**: `models/Designs.model.js:30`
- **Fix**:

```js
FigmaFileKey: { type: String, unique: true, index: true },
```

This formalizes what `checkExistingDesign` middleware was racing on.

#### 15.3.3 Add the `Tenant` collection (multi-brand groundwork)
- **New file**: `models/Tenant.model.js`

```js
const { model, Schema } = require("mongoose");

const TenantSchema = new Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["brand", "studio"], required: true },
  ownerUserId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
  managedByStudioId: { type: Schema.Types.ObjectId, ref: "Tenant" },
  metadata: {
    industry: String,
    websiteUrl: String,
    logoUrl: String,
  },
}, { timestamps: true });

module.exports = model("Tenant", TenantSchema);
```

**One-shot backfill** (`bin/migrate-tenants.js`):

```js
require("dotenv").config();
require("../config/dbConfig");
const Client = require("../models/Client.model");
const Tenant = require("../models/Tenant.model");

(async () => {
  const clients = await Client.find({ status: "Client" });
  for (const c of clients) {
    const existing = await Tenant.findOne({ slug: c.username });
    if (existing) continue;
    await Tenant.create({
      slug: c.username,
      name: c.username,
      type: "brand",
      ownerUserId: c._id,
    });
    console.log("created tenant for", c.username);
  }
  process.exit(0);
})();
```

The frontend's `${username}.frame-work.app` subdomain logic (`AuthForm.jsx:133-136`) keeps working because `Tenant.slug = Client.username`.

#### 15.3.4 Add the `BrandTokenVersion` collection
- **New file**: `models/BrandTokenVersion.model.js`

```js
const { model, Schema } = require("mongoose");

const BrandTokenVersionSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  versionNumber: { type: Number, required: true },
  isPublished: { type: Boolean, default: false },
  publishedAt: Date,
  createdByUserId: { type: Schema.Types.ObjectId, ref: "Client" },
  /** see §5 for the JSON shape: colors / typography / spacing / logos / motion / voice / imagery */
  tokens: { type: Schema.Types.Mixed, required: true },
  sourceFigmaFileKey: String,
}, { timestamps: true });

BrandTokenVersionSchema.index({ tenantId: 1, versionNumber: 1 }, { unique: true });

module.exports = model("BrandTokenVersion", BrandTokenVersionSchema);
```

#### 15.3.5 Add `routes/brandTokens.routes.js`

This is the new route the Brand Hub reads from (public) and the generator plugin writes to (auth).

```js
const router = require("express").Router();
const BrandTokenVersion = require("../models/BrandTokenVersion.model");
const Tenant = require("../models/Tenant.model");
const isAuthenticated = require("../middlewares/isAuthenticated");

// Public — Brand Hub reads latest published tokens by subdomain slug
router.get("/:slug/tokens", async (req, res, next) => {
  try {
    const tenant = await Tenant.findOne({ slug: req.params.slug.toLowerCase() });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    const latest = await BrandTokenVersion
      .findOne({ tenantId: tenant._id, isPublished: true })
      .sort({ versionNumber: -1 });
    if (!latest) return res.status(404).json({ message: "No published tokens" });
    res.json({
      tenant: { slug: tenant.slug, name: tenant.name },
      tokens: latest.tokens,
      versionNumber: latest.versionNumber,
      publishedAt: latest.publishedAt,
    });
  } catch (error) { next(error); }
});

// Authenticated — generator plugin POSTs new tokens here
router.post("/:slug/tokens", isAuthenticated, async (req, res, next) => {
  try {
    const tenant = await Tenant.findOne({ slug: req.params.slug.toLowerCase() });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });
    if (tenant.ownerUserId.toString() !== req.user._id.toString() && req.user.status !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const last = await BrandTokenVersion.findOne({ tenantId: tenant._id }).sort({ versionNumber: -1 });
    const versionNumber = (last?.versionNumber || 0) + 1;
    const created = await BrandTokenVersion.create({
      tenantId: tenant._id,
      versionNumber,
      tokens: req.body.tokens,
      sourceFigmaFileKey: req.body.sourceFigmaFileKey,
      createdByUserId: req.user._id,
      isPublished: req.body.publish === true,
      publishedAt: req.body.publish ? new Date() : undefined,
    });
    res.status(201).json(created);
  } catch (error) { next(error); }
});

module.exports = router;
```

Mounted in `routes/index.routes.js` above the auth gate (15.1.2) so the public read works without a token.

---

### 15.4 Quality (Week 2-3)

| Task | Tool | Where |
|---|---|---|
| HTTP security headers | `helmet` | `api/index.js`: `app.use(helmet())` |
| Rate limiting | `express-rate-limit` | 20 req / 15 min on `/api/auth`, 200 / min on `/api` |
| Request validation | `zod` + tiny `validate(schema)` middleware | every route body |
| Structured logs | `pino` + `pino-http` | replace all `console.log` |
| Error reporting | `@sentry/node` | top of `api/index.js`, in error handler |
| Cryptographic password gen | `crypto.randomBytes` | `auth.routes.js:11-23`, replace `Math.random()` |
| Stop emailing plaintext passwords | new `PasswordResetToken` model + signed reset URL | `auth.routes.js:84-103, 145` |

**15.4.1 — `routes/auth.routes.js:11-23` patch:**

```js
const crypto = require("crypto");
function generatePassword() {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&_-=?";
  const bytes = crypto.randomBytes(20);
  let pwd = "";
  for (let i = 0; i < 16; i++) pwd += charset[bytes[i] % charset.length];
  return pwd;
}
```

**15.4.2 — replace plaintext-password emails** with a "set your password" link flow. New model `PasswordResetToken { userId, token, expiresAt }`, email contains `${FRONTEND_URL}/auth/set-password?token=...`, single-use, 15-min expiry.

**15.4.3 — `validate` middleware** for zod:

```js
const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  req.validated = parsed.data;
  next();
};
```

Use on every write route.

---

### 15.5 Cleanup deletes (one PR)

- `routes/figma.routes.js:296-325` — `POST /uploadImgURL` debug route
- `routes/figma.routes.js:18-89` — uptime watcher
- `models/Element.model.js` — and `figma.routes.js:235-260` `createBrand` writer + `brand.routes.js` readers
- `Dockerfile - local` — broken filename with space
- `config/mail.html`, `config/mailTemplate.html` — legacy unused
- All non-essential `console.log("salut")`, `("bonjour")`, `("kikou")`, `("coucou")`, `("merci la street")` — search and prune

---

### 15.6 Day-by-day (14-day plan from "demo-fragile" to "pilot-ready")

| Day | PR |
|---|---|
| 1 | 15.1.1 (revoke token) + 15.1.4 (delete debug) + 15.5 (cleanup) |
| 2 | 15.1.5 (CORS) + 15.4 helmet + rate limit + Sentry |
| 3 | 15.1.2 (mount order, plugin secret) + 15.1.3 (ownership middleware) |
| 4 | 15.2.1 (nested handler) + 15.2.2 (polling timeout) |
| 5 | 15.2.3 (remove watcher, add healthz, wire Better Uptime) |
| 6 | 15.3.1 (timestamps) + 15.3.2 (unique index) |
| 7 | 15.3.3 (Tenant model + backfill migration) |
| 8 | 15.3.4 + 15.3.5 (BrandTokenVersion + new routes) |
| 9 | 15.4.3 (zod validation on auth + designs) |
| 10 | 15.4 pino logging |
| 11 | 15.4.1 + 15.4.2 (crypto password gen + signed reset links) |
| 12 | Update Generator plugin to call `POST /brands/:slug/tokens` |
| 13 | First Brand Hub Next.js page reads `GET /brands/:slug/tokens` |
| 14 | End-to-end pilot test with 30 70 Agency, regression sweep |

End of week 2: v0 is **pilot-ready**. No critical security holes. Ownership enforced. Tokens versioned. Brand Hub fed from real data.

---

### 15.7 Stop criteria — when to stop patching v0 and move to v3 stack

Patch until one of these triggers fires:

1. **Mongo perf**: aggregation queries on `Designs.sections.frames.archiveURL` past 200 ms p95 → switch to Postgres + Drizzle (§5)
2. **Edge latency**: a non-EU brand complains about hub TTFB > 1s → move web to Vercel Edge / Cloudflare
3. **AI agent streaming**: Anthropic SDK works on Express but lacks SSE UX → refactor to Hono on Cloudflare Workers
4. **First payment**: Stripe webhook signature handling on Express becomes painful → move to Next.js App Router route handlers
5. **Fifth brand onboarded**: multi-tenancy bugs become incidents → switch to Supabase + RLS

Until then, every hour spent on v3 infra is an hour not spent closing the next brand. **Patch.**

---

## 16. Reference — `FrameWork-Front-main` (v0 frontend), already shipped

What exists today in `FrameWork-Front-main.zip`. Verbatim source with annotations on **keep / refactor / discard** and mapping to the new architecture (§3, §4).

### 16.0 Filesystem

```
FrameWork-Front-main/
├── index.html                          # Vite shell — loads Hanalei Fill from Google Fonts (unused)
├── package.json                        # React 18 + Vite 4 + react-router-dom 6 + axios
├── package-lock.json
├── .eslintrc.cjs                       # has typo: "react/prop-type": false
├── .gitignore
├── readme.md
├── public/
│   ├── VarExemples.png                 # docs assets
│   ├── VarExemplesInFigma.png
│   └── fonts/LGC.ttf                   # Brand font, served as static
└── src/
    ├── main.jsx                        # ReactDOM.createRoot + AuthContextWrapper
    ├── App.jsx                         # Routes
    ├── App.css
    ├── index.css
    ├── assets/
    │   ├── framework-log.svg
    │   ├── Plain-Regular.otf
    │   └── react.svg
    ├── components/
    │   ├── AuthForm.jsx                # Login/Signup/Reset/Update — JWT-in-URL BUG
    │   ├── AuthForm.css
    │   ├── BrandMainPage.jsx           # Recursive brand-page render
    │   ├── CreateDesign.jsx            # Admin template create form — state mutation BUG
    │   ├── ExportDesign.jsx            # PNG download — FIGMATOKEN LEAK + event global BUG
    │   ├── Footer.jsx                  # BROKEN: returns undefined
    │   ├── Layout.jsx                  # Navbar + Outlet + Footer
    │   ├── Navbar.jsx                  # Top nav
    │   ├── Navbar.css
    │   ├── SideMenu.jsx                # Brand-page side nav
    │   └── SideMenu.css
    ├── context/
    │   └── authContext.jsx             # JWT in localStorage
    └── pages/
        ├── Brand.jsx                   # Subdomain-routed brand page
        ├── Brand.css
        ├── Clients.jsx                 # Admin user list
        ├── Clients.css
        ├── Designs.jsx                 # Designs gallery
        ├── Designs.css
        ├── IsAdmin.jsx                 # Role-gate Outlet
        ├── NotFound.jsx
        ├── OneDesign.jsx               # The editor — FIGMATOKEN LEAK + dangerouslySetInnerHTML + state mutation BUG
        ├── OneDesign.css
        └── ProtectedRoute.jsx          # Auth-gate Outlet
```

Stack: React 18 + Vite 4 + react-router-dom 6 + axios. Built/deployed to Vercel. Reads from `https://framework-backend.fly.dev/api`.

---

### 16.1 Entry / shell

#### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Hanalei+Fill&display=swap"
      rel="stylesheet"
    />

    <title>Framework.</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Verdict: refactor.** Hanalei Fill is loaded but not used anywhere — drop. Add CSP `<meta>`, `<meta name="theme-color">`, and a real favicon. Replace with Next.js `app/layout.tsx` for the new web app.

#### `src/main.jsx`

```jsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./index.css"
import { BrowserRouter } from "react-router-dom"
import AuthContextWrapper from "./context/authContext.jsx"
ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<BrowserRouter>
			<AuthContextWrapper>
				<App />
			</AuthContextWrapper>
		</BrowserRouter>
	</React.StrictMode>
)
```

**Verdict: discard.** Replaced by Next.js App Router root layout. Clerk replaces AuthContextWrapper.

#### `src/App.jsx`

```jsx
import { Route, Routes } from "react-router-dom";
import AuthForm from "./components/AuthForm";
import CreateDesign from "./components/CreateDesign";
import Layout from "./components/Layout";
import Brand from "./pages/Brand";
import Clients from "./pages/Clients";
import Designs from "./pages/Designs";
import IsAdmin from "./pages/IsAdmin";
import NotFound from "./pages/NotFound";
import OneDesign from "./pages/OneDesign";
import ProtectedRoute from "./pages/ProtectedRoute";

function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Brand />}></Route>
          <Route path="/brand" element={<Brand />}></Route>
          <Route path="/brand/:figmaName" element={<Brand />}></Route>
          <Route element={<IsAdmin />}>
            <Route path="/Clients" element={<Clients />}></Route>
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/designs" element={<Designs />}></Route>
            <Route path="/designs/create" element={<CreateDesign />} />
            <Route path="/designs/:id" element={<OneDesign />} />
            <Route path="/designs/:id/:section" element={<OneDesign />} />
            <Route path="/designs/:id/:section/:frame" element={<OneDesign />} />
            <Route path="/profile" element={<AuthForm mode="Update" />}></Route>
          </Route>

          <Route path="/auth">
            <Route path="login" element={<AuthForm mode="Log in" />} />
            <Route path="loggedin" element={<AuthForm mode="Loggedin" />}></Route>
            <Route path="create" element={<AuthForm mode="Create" />} />
            <Route path="reset" element={<AuthForm mode="Reset" />}></Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
```

**Verdict: refactor → port to Next App Router.** The route shape itself is sound. Migration:
- `/` and `/brand` → `app/page.tsx` (Brand Hub root)
- `/brand/:figmaName` → `app/brand/[slug]/page.tsx`
- `/designs` → `app/(authenticated)/designs/page.tsx`
- `/designs/:id/:section?/:frame?` → `app/(authenticated)/designs/[id]/[[...path]]/page.tsx`
- `/auth/*` → Clerk-hosted or `app/auth/[[...sign-in]]/page.tsx`

Mount strategy: Brand Hub (Vevo-style) on the apex `frame-work.app`, editor on `app.frame-work.app`, per-tenant brand portal on `${slug}.frame-work.app`.

---

### 16.2 Auth context

#### `src/context/authContext.jsx`

```jsx
import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const AuthContext = createContext();
const AuthContextWrapper = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authenticateUser();
  }, []);
  const authenticateUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        setIsLoggedIn(true);
        setIsLoading(false);
      } else {
        setUser(null);
        setIsLoggedIn(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.log(error);
      setUser(null);
      setIsLoggedIn(false);
      setIsLoading(false);
    }
  };

  const values = { user, setUser, authenticateUser, isLoggedIn, isLoading };
  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
};
export default AuthContextWrapper;
```

**Verdict: discard.** Replace with `<ClerkProvider>` from `@clerk/nextjs`. Clerk owns user state, session, multi-org membership.

---

### 16.3 Pages

#### `src/pages/ProtectedRoute.jsx`

```jsx
import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/authContext";

const ProtectedRoute = () => {
  const { isLoggedIn, isLoading, user } = useContext(AuthContext);
  if (isLoading) {
    return <p>Loading...</p>;
  }
  if (!isLoggedIn) {
		console.log("You not logged in")
    return <Navigate to={"/auth/login"} />;
  }
  if (isLoggedIn) {
    return <Outlet />;
  }
};

export default ProtectedRoute;
```

**Verdict: discard.** Next.js middleware (`middleware.ts` calling `clerkMiddleware()`) replaces this — protection becomes route-config, not a component.

#### `src/pages/IsAdmin.jsx`

```jsx
import React, { useContext } from "react"
import { AuthContext } from "../context/authContext"
import { Navigate, Outlet } from "react-router-dom"

const IsAdmin = () => {
	const { isLoggedIn, isLoading, user } = useContext(AuthContext)
	if (isLoading) return <p>Loading...</p>
	if (!isLoggedIn || user.status !== "admin") {
		return <Navigate to={"/"} />
	}
	if (isLoggedIn && user.status === "admin") return <Outlet />
}

export default IsAdmin
```

**Verdict: discard.** Replace with Clerk org-role check via `auth().has({ role: 'org:admin' })`.

#### `src/pages/NotFound.jsx`

```jsx
import React from "react";
import { NavLink } from "react-router-dom";

const NotFound = () => {
  return (
    <div>
      <h3>It looks like there is nothing here, 404. Check your url, or go back </h3>
      <NavLink to={"/designs"}><h1>Designs.</h1></NavLink>
    </div>
  );
};

export default NotFound;
```

**Verdict: refactor.** Port to `app/not-found.tsx`. Next.js App Router serves this automatically on unmatched routes with proper 404 status.

#### `src/pages/Brand.jsx`

```jsx
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BrandMainPage from "../components/BrandMainPage";
import SideMenu from "../components/SideMenu";
import { AuthContext } from "../context/authContext";
import "./Brand.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
function Brand() {
  const navigate = useNavigate();
  const { figmaName } = useParams();
  const [subDomain, setsubDomain] = useState(null);
  const [brandDatas, setBrandDatas] = useState(null);
  const { user, isLoading, authenticateUser } = useContext(AuthContext);

  const [brandImages, setBrandImages] = useState(null);

  const getBrand = async () => {
    try {
      const brandData = await axios.get(`${BACKEND_URL}/api/brand/${subDomain}`, {});

      if (
        brandData.data.elements[0].isPrivate &&
        (!user || user?.username !== subDomain)
      ) {
        navigate("/auth/login");
      } else {
        setBrandDatas(brandData.data.elements[0]);
        setBrandImages(brandData.data.images[0]);
      }
    } catch (error) {
      navigate("/notfound");
      console.log("error ici", error);
    }
  };

  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname === "frame-work.app") {
      navigate("/designs");
      return;
    }
    if (hostname != "localhost") {
      const parts = hostname.split(".");
      if (parts.length > 1 && parts[0] !== "www") {
        setsubDomain(parts[0]);
      }
    } else if (figmaName) {
      setsubDomain(figmaName);
    } else {
      navigate("/designs");
    }
  }, []);

  useEffect(() => {
    if (subDomain && !isLoading) {
      getBrand();
    }
  }, [subDomain, isLoading]);

  if (!brandDatas) {
    return <p> Loading...</p>;
  }
  return (
    <div className={`container ${subDomain.match(/^\d/) ? `_${subDomain}` : subDomain}`}>
      <p>{subDomain}</p>
      <div className="content">
        <div className="left">
          <SideMenu brandData={brandDatas}></SideMenu>
        </div>
        <div className="right">
          <BrandMainPage brandData={brandDatas} brandImages={brandImages}></BrandMainPage>
        </div>
      </div>
    </div>
  );
}

export default Brand;
```

**Verdict: refactor entirely.** This is the **proto-Brand-Hub**. The subdomain logic is right (use `${slug}.frame-work.app`); the rendering of an Element tree is wrong (recursive descent of arbitrary structure). Replace with:
- Next.js middleware that resolves `slug` from subdomain → fetches `GET /api/brands/:slug/tokens`
- `app/(brand)/[slug]/page.tsx` renders the Vevo-style accordion sections from `tokens.colors / typography / logos / motion / voice / imagery`
- Server Components for SSG + ISR (`revalidate: 60`)

#### `src/pages/Designs.jsx`

```jsx
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import "./Designs.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const Designs = () => {
  const { user, isLoggedIn, authenticateUser } = useContext(AuthContext);
  const [designs, setDesigns] = useState([]);
  const [clients, setClients] = useState([]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/client`);
      setClients(response.data);
    } catch (error) { console.log(error); }
  };

  const getDesigns = async () => {
    try {
      const allDesigns = await axios.get(`${BACKEND_URL}/api/designs/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setDesigns(allDesigns.data);
    } catch (error) { console.log(error); }
  };
  const getOwnedDesigns = async () => {
    try {
      const allDesigns = await axios.get(`${BACKEND_URL}/api/designs/owned`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setDesigns(allDesigns.data);
    } catch (error) { console.log(error); }
  };

  useEffect(() => {
    if (isLoggedIn && user.status === "admin") {
      getDesigns();
      fetchClients();
    } else {
      getOwnedDesigns();
    }
  }, []);

  if (!designs || !clients) return <div>Loading...</div>;

  return (
    <div>
      {user.status === "admin" &&
        clients.map((client) => (
          <div key={client.username} className="design-list-wrapper">
            <h5> {client.username}</h5>
            {designs.map((design) => {
              if (design.usedBy.includes(client._id)) {
                return (
                  <div key={design._id}>
                    <Link to={design._id}>
                      <div className="btn">{design.FigmaName}</div>
                    </Link>
                    {design.sections.map((section) => (
                      <div key={section._id}>
                        <Link to={`${design._id}/${section.name}`}>
                          <div className="btn title">{section.name}</div>
                        </Link>
                        <div key={section.name} className="images-wrapper">
                          {section.frames.map((frame) => (
                            <Link
                              to={`${design._id}/${section.name}/${frame.frameName}`}
                              className="image-wrapper"
                              key={frame._id}
                            >
                              <p>{frame.frameName}</p>
                              <img src={frame.thumbnailURL}></img>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
            })}
          </div>
        ))}

      {user.status != "admin" &&
        designs.map((design) => (
          <div className="design-list-wrapper">
            <Link key={design._id} to={design._id}></Link>
            {design.sections.map((section) => (
              <>
                <Link key={section._id} to={`${design._id}/${section.name}`}>
                  <div className="btn title">{section.name}</div>
                </Link>
                <div className="images-wrapper">
                  {section.frames.map((frame) => (
                    <Link
                      to={`${design._id}/${section.name}/${frame.frameName}`}
                      className="image-wrapper"
                    >
                      <div className="text-wrapper">
                        <h3>{frame.frameName}</h3>
                        <h4>Start Editing</h4>
                      </div>
                      <img src={frame.thumbnailURL}></img>
                    </Link>
                  ))}
                </div>
              </>
            ))}
          </div>
        ))}
    </div>
  );
};

export default Designs;
```

**Verdict: refactor.** Becomes the editor's **template grid + drafts list** (deck slides 12-13). Bugs:
- `design.usedBy.includes(client._id)` — Mongoose returns ObjectIds, `.includes` does reference equality, almost always false. Fix: `design.usedBy.some(u => u.toString() === client._id.toString())`.
- Missing `key` on `<>` fragments inside `.map` — must use `<React.Fragment key=...>`.
- No `key` on the second `.design-list-wrapper` div in the non-admin branch.
- `if(!designs || !clients) return Loading` — `designs` is `[]` initially which is truthy; the loading state never shows for owned-designs path.

Replace with Next.js Server Component fetching `compositions` + `templates` server-side. RLS-scoped via Clerk org. No client-side admin/non-admin branching — server picks the right query.

#### `src/pages/Clients.jsx`

```jsx
import axios from "axios";
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./Clients.css";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const Clients = () => {
  const [clients, setClients] = useState([]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/client`);
      setClients(response.data);
    } catch (error) { console.log(error); }
  };
  useEffect(() => { fetchClients(); }, []);

  const handleDelete = async (id) => {
    const userConfirmed = window.confirm("Are you sure you want to delete?");
    if (!userConfirmed) return;
    try {
      const response = await axios.delete(`${BACKEND_URL}/api/client/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      console.log("Deleted client:", response.data);
      fetchClients();
    } catch (error) { console.log(error); }
  };
  return (
    <div>
      <div className="container">
        <h2>Clients:</h2>
        La list de clients
        {clients.map((client) => (
          <div key={client._id} className="card">
            <p>
              {client.username} {client.status} {client.email}{" "}
              <button onClick={() => handleDelete(client._id)}>Delete</button>
            </p>
            <img className="client-logo" src={client.pictureUrl}></img>
          </div>
        ))}
        <NavLink to={"/auth/create"}>
          <button className="button">Ajouter Client </button>
        </NavLink>
      </div>
    </div>
  );
};

export default Clients;
```

**Verdict: discard.** Becomes "Members" page in Clerk-managed org. Use `<OrganizationProfile />` Clerk component for member CRUD with zero custom code.

#### `src/pages/OneDesign.jsx` — **THE EDITOR, has critical bugs**

```jsx
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import ExportDesign from "../components/ExportDesign";
import "./OneDesign.css";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const FIGMATOKEN = import.meta.env.VITE_FIGMATOKEN;        // 🔴 SECURITY: shipped in browser bundle
let fd = new FormData();

const OneDesign = () => {
  const [design, setDesign] = useState();
  const [client, setClient] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const [uploadMessages, setUploadMessages] = useState({});
  const [selectedTemplate, setselectedTemplate] = useState({});
  const [selectedFrame, setSelectedFrame] = useState({});
  let newThumbnailURL = "";
  const navigate = useNavigate();
  const uniqueImageNames = new Set();
  const [newText, setNewText] = useState([]);
  const [svg, setSvg] = useState(null);
  const [templateReady, setTemplateReady] = useState(false);
  const [pictures, setPictures] = useState([]);
  const { id, section, frame } = useParams();

  const getDesign = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/designs/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }).then((res) => {
          setDesign(res.data);
          setClient(res.data.usedBy);
          const sectionIndex = res.data.sections.findIndex((s) => s.name === section);
          if (sectionIndex !== -1) {
            setselectedTemplate(res.data.sections[sectionIndex]);
            if (frame) {
              const frameIndex = res.data.sections[sectionIndex].frames.findIndex(
                (s) => s.frameName === frame
              );
              setSelectedFrame(res.data.sections[sectionIndex].frames[frameIndex]);
            } else {
              setSelectedFrame(res.data.sections[sectionIndex].frames[0]);
            }
          } else {
            setselectedTemplate(res.data.sections[0]);
            setSelectedFrame(res.data.sections[0].frames[0]);
          }
          setNewText(res.data.variables);
        });
    } catch (error) {
      console.log("there is an error", error);
      navigate("/notfound");
    }
  };

  const dowloadTemplate = async (idToDownload) => {                            // 🔴 SECURITY: FIGMATOKEN used in browser
    setLoadingMessage("Waiting for Figma response");
    try {
      const figmaApiResponse = await axios.get(
          `https://api.figma.com/v1/images/${design.FigmaFileKey}?ids=${idToDownload}&format=svg&scale=1&svg_include_id=true&svg_include_node_id=true`,
          { headers: { "X-Figma-Token": FIGMATOKEN } }
        ).then(async (res) => {
          setLoadingMessage("Waiting image preview from Figma");
          newThumbnailURL = res.data.images[Object.keys(res.data.images)[0]];
          const svgData = await fetch(
            res.data.images[Object.keys(res.data.images)[0]]
          ).then((res) => res.text());
          setSvg(svgData);                                                     // 🔴 stored as raw string for dangerouslySetInnerHTML
          setTemplateReady(true);
        });
    } catch (error) { console.error("Error:", error); }
  };

  const generateDesign = async (event) => {
    setLoadingMessage("Starting Generating");
    event.preventDefault();
    setTemplateReady(false);

    fd.append("newText", JSON.stringify(newText));
    pictures.forEach((picture, index) => {
      fd.append("pictures", picture.file, picture.name);
    });

    try {
      const res = await axios.patch(`${BACKEND_URL}/api/designs/${id}`, fd, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }).then((res) => {
          setLoadingMessage("Request sent to backend");
          setTimeout(() => {                                                   // 🔴 hardcoded 2s wait then download
            dowloadTemplate(selectedFrame.frameId);
          }, 2000);
        });

      const inputFile = document.getElementById("fileInput");                  // 🔴 multiple inputs share id="fileInput"
      if (inputFile) {
        inputFile.value = "";
        setPictures([]);
      }
      fd = new FormData();
    } catch (error) { console.log(error); }
  };

  const setUploadMessage = (name, message) => {
    setUploadMessages((prevMessages) => ({ ...prevMessages, [name]: message }));
  };

  function handleFile(event, name) {
    const file = event.target.files[0];
    if (!file) { console.error("No file selected."); return; }
    const maxFileSizeInBytes = 5 * 1024 * 1024;
    if (file.size > maxFileSizeInBytes) {
      console.error("File is too large. Maximum size is 5MB.");
      return;
    }
    const img = new Image();                                                   // ⚠️ shadows window.Image with global state
    img.onload = () => {
      if (img.width > 4096 || img.height > 4096) {
        setUploadMessage(name, "Image exceed 4096x4096 pixels.");
      } else {
        setUploadMessage("");
        const newPicture = { name: name, file: file };
        setPictures((prevPictures) => [...prevPictures, newPicture]);
      }
    };
    img.onerror = () => { console.error("Invalid image file."); };
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.readAsDataURL(file);
  }

  const handleInputFocus = (svgId, hasFocus) => {
    const element = document.getElementById(svgId);
    if (element) element.classList.toggle("active", hasFocus);
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    const userConfirmed = window.confirm("Are you sure you want to delete?");
    if (!userConfirmed) return;
    try {
      const res = await axios.delete(`${BACKEND_URL}/api/designs/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }).then((res) => {
          navigate("/designs");
        });
    } catch (error) { console.log(error); }
  };

  useEffect(() => { getDesign(); }, []);

  useEffect(() => {
    if (design) {
      setTemplateReady(false);
      dowloadTemplate(selectedFrame.frameId);
    }
  }, [selectedFrame]);

  if (!design) return <div>{loadingMessage}</div>;

  return (
    <>
      <div className="mainFrame">
        <form className="main-gui">
          <div className="gui-el-wrapper">
            <h1>{selectedTemplate.name}</h1>

            <select
              className="select-wrapper"
              value={selectedFrame.frameName}
              onChange={(e) => {
                const selectedFrameName = e.target.value;
                const selectedFrameToFind = selectedTemplate.frames.find(
                  (frame) => frame.frameName === selectedFrameName
                );
                setSelectedFrame(selectedFrameToFind);
              }}
            >
              {selectedTemplate.frames.map((frame, index) => (
                <option key={frame.frameName} value={frame.frameName}>
                  {frame.frameName}
                </option>
              ))}
            </select>
          </div>
          <div className="gui-el-wrapper">
            {design.variables.map((element, index) => {                        // 🔴 substring matching for variable scoping
              if (
                (element.name.toLowerCase().includes(selectedTemplate.name.toLowerCase()) &&
                  element.name.toLowerCase().includes(selectedFrame.frameName.toLowerCase())) ||
                (element.name.toLowerCase().includes(selectedTemplate.name.toLowerCase()) &&
                  element.name.toLowerCase().includes("all"))
              ) {
                return (
                  <div key={index} className="input-wrapper">
                    <label>{element.name.split(" - ")[1]}</label>
                    <textarea
                      value={newText[index].valuesByMode}
                      type={newText[index].type}
                      onFocus={() => handleInputFocus(element.name.split(" - ")[1])}
                      onBlur={() => handleInputFocus(element.name.split(" - ")[1], false)}
                      onChange={(val) => {
                        let temp = [...newText];                               // ⚠️ shallow copy, mutates inner objects below
                        temp[index].valuesByMode = val.target.value;           // 🔴 direct mutation of state
                        setNewText(temp);
                      }}
                    />
                  </div>
                );
              }
            })}

            {design.images.map((element, index) => {
              const handleFileWithInfo = (event) => { handleFile(event, element.name); };
              if (
                (!uniqueImageNames.has(element.name) &&
                  element.name.toLowerCase().includes(selectedTemplate.name.toLowerCase()) &&
                  element.name.toLowerCase().includes(selectedFrame.frameName.toLowerCase())) ||
                (element.name.toLowerCase().includes(selectedTemplate.name.toLowerCase()) &&
                  element.name.toLowerCase().includes("all"))
              ) {
                uniqueImageNames.add(element.name);
                return (
                  <div className="input-wrapper" key={element.name}>
                    <label>{element.name.split(" - ")[1]}</label>
                    <input
                      id="fileInput"                                           // 🔴 duplicate id across multiple inputs
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp"
                      onChange={handleFileWithInfo}
                    />
                    <p className="error-message">{uploadMessages[element.name]}</p>
                  </div>
                );
              }
            })}
          </div>
          <ExportDesign
            selectedFrame={selectedFrame}
            selectedTemplate={selectedTemplate}
            design={design}
            client={client}
          ></ExportDesign>
        </form>
        <button className="btn generate-image" onClick={generateDesign}>
          Generate the image
        </button>
        <div className="preview">
          {!templateReady ? (
            <p className="loadingMessage"> {loadingMessage} </p>
          ) : (
            <div>
              <div
                className="svgDiv"
                dangerouslySetInnerHTML={{ __html: svg }}                       // 🔴 XSS — Figma SVG can contain <script>
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OneDesign;
```

**Verdict: refactor heavily — this is the editor's spiritual home, but every paragraph has a bug.** Six concrete issues marked above. Migration path:

1. **Replace `dowloadTemplate`** entirely. Stop calling Figma `/v1/images` from the browser. The new flow renders the template via `<TemplateRenderer schema={layoutSchema} values={slotValues} brand={brandTokens} />` — no Figma roundtrip, no token in browser, sub-50ms preview.
2. **Replace `dangerouslySetInnerHTML={{__html: svg}}`** with the React component above. SVG is no longer the runtime; JSX is.
3. **Replace substring variable scoping** with `slot_schema` from `template_versions` (§5).
4. **Fix state mutation**: use `setNewText((prev) => prev.map((v, i) => i === index ? {...v, valuesByMode: e.target.value} : v))`.
5. **Remove duplicate `id="fileInput"`** — give each input a unique stable id, e.g. `id={\`fileInput-${element.name}\`}` and pair with `htmlFor`.
6. **Remove `setTimeout(2000)` workaround** — the new flow returns the rendered URL directly.
7. **Remove `let fd = new FormData()` module-level singleton** — bug-prone with concurrent edits. Use a fresh FormData per submit.

#### `src/components/AuthForm.jsx`

```jsx
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import "./AuthForm.css";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || "https://frame-work.app";

const AuthForm = ({ mode }) => {
  const { user, authenticateUser, isLoggedIn } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [response, setResponse] = useState("");
  const [picture, setPicture] = useState();
  const [clients, setClients] = useState([]);

  const navigate = useNavigate();
  const currentURL = window.location.host;
  const subdomain = currentURL.split(".")[0];
  const domain = FRONTEND_URL.split("//")[1];

  const [searchParams, setSearchParams] = useSearchParams();

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/client/all`);
      setClients(response.data);
    } catch (error) { console.log(error); }
  };

  function isStringContained(clients, subdomain) {
    for (const client of clients) {
      if (client.username === subdomain) return true;
    }
    return false;
  }

  if (mode === "Loggedin") {                                                   // 🔴 setState side-effect during render
    const token = searchParams.get("token");
    localStorage.setItem("token", token);
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const userToLogin = { username, password, email };

      if (mode === "Create") {
        if (!username || !email) { setError("Username or E-mail cannot be empty"); return; }
        const fd = new FormData();
        fd.append("username", JSON.stringify(userToLogin.username));
        fd.append("email", JSON.stringify(userToLogin.email));
        if (picture) fd.append("picture", picture.file, picture.file.name);
        const response = await axios.post(`${BACKEND_URL}/api/auth/signup`, fd, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
        setResponse(response.statusText);
        setTimeout(() => { navigate("/Clients"); }, 500);
      } else if (mode === "Update") {
        const response = await axios.patch(
          `${BACKEND_URL}/api/auth/update/${user._id}`,
          userToLogin,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setResponse(response.statusText);
      } else if (mode === "Reset") {
        const response = await axios.post(`${BACKEND_URL}/api/auth/reset`, { username });
        setResponse(response.statusText);
      } else {
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, userToLogin);
        localStorage.setItem("token", response.data.token);
        setError("");
        await authenticateUser();
        if (currentURL.includes("localhost") || currentURL.includes("damdam.io")) {
          window.location.href = `http://${username}.${domain}/auth/loggedin?token=${response.data.token}`;  // 🔴 JWT in URL
        } else {
          window.location.href = `https://${username}.${domain}/auth/loggedin?token=${response.data.token}`;
        }
      }
    } catch (error) {
      console.log(error);
      setError(error.response.data.message);
    }
  };

  function handleFile(event, name) {
    const newPicture = { name: event.target.files[0].name, file: event.target.files[0] };
    setPicture(newPicture);
  }

  useEffect(() => {
    fetchClients();
    if (isLoggedIn && mode === "Update") {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, []);
  useEffect(() => {
    if (domain != currentURL && clients.length > 0 && !isStringContained(clients, subdomain)) {
      window.location.href = `${FRONTEND_URL}`;
    }
  }, [clients]);
  useEffect(() => {
    if (mode === "Loggedin") navigate("/Designs");
  }, [localStorage]);                                                          // 🔴 deps array contains a non-reactive value

  return (
    <div className="login-wrapper">
      <form className="login-container" onSubmit={handleSubmit}>
        {/* ...form fields... */}
        <p style={{ color: "red" }}>{error}</p>
        <p style={{ color: "green" }}>{response}</p>
        <button>{mode}</button>
      </form>
    </div>
  );
};

export default AuthForm;
```

**Verdict: discard.** Replace with Clerk:
- `<SignIn />`, `<SignUp />`, `<UserButton />` Clerk components handle every mode automatically
- Cross-subdomain login: Clerk's "satellite domains" feature replaces the JWT-in-URL hack with cookie-based session sharing
- Password reset, magic links, MFA, OAuth — all built-in

The four critical bugs (setState in render, JWT in URL, deps array contains `localStorage`, signup body wraps values in JSON.stringify so the backend gets `"jean"` instead of `jean`) are all sidestepped by removing the file.

#### `src/components/ExportDesign.jsx` — **FIGMATOKEN leak + event global bug**

```jsx
import axios from "axios";
import React, { useContext, useState } from "react";
import { useParams } from "react-router-dom";

import { AuthContext } from "../context/authContext";

function ExportDesign(props) {
  const [scale, setScale] = useState(4);
  const [downloadReady, setDownloadReady] = useState(true);
  const { user, isLoggedIn } = useContext(AuthContext);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const { id } = useParams();
  const { selectedFrame, selectedTemplate, design, client } = props;
  const FIGMATOKEN = import.meta.env.VITE_FIGMATOKEN;                          // 🔴 SECURITY
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  async function handleNotify(event) {
    event.preventDefault();
    try {
      const res = await axios.get(
          `${BACKEND_URL}/api/designs/notify/${client[0]._id}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        ).then((res) => {});
    } catch (error) { console.log("there is an error", error); }
  }

  async function handleDelete(event, url) {
    event.preventDefault();
    const index = selectedFrame.archiveURL.indexOf(url);                       // 🔴 mutates props directly
    if (index !== -1) selectedFrame.archiveURL.splice(index, 1);

    try {
      await axios.patch(
        `${BACKEND_URL}/api/designs/${id}/archiveURL`,
        { selectedFrame: selectedFrame, archiveURL: url },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
    } catch (error) { console.error("Error deleting the Archive URL: ", error); }
  }

  const dowloadDesign = async (idToDownload, archive) => {                    // 🔴 calls Figma /v1/images with FIGMATOKEN
    setDownloadReady(false);
    try {
      const response = await axios.get(
        `https://api.figma.com/v1/images/${design.FigmaFileKey}?ids=${idToDownload}&format=png&scale=${scale}`,
        { headers: { "X-Figma-Token": FIGMATOKEN } }
      );

      if (archive) {
        selectedFrame.archiveURL.push(response.data.images[idToDownload]);    // 🔴 mutates props
        sendPNGURLToBackend(response.data.images[idToDownload], true);
      } else {
        sendPNGURLToBackend(response.data.images[idToDownload]);
        try {
          const xhr = new XMLHttpRequest();                                    // ⚠️ XHR + Blob hack for download
          xhr.open("GET", response.data.images[idToDownload], true);
          xhr.responseType = "blob";
          xhr.onload = function () {
            const blob = xhr.response;
            const link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = `${design.FigmaName}-${selectedTemplate.name}-${selectedFrame.frameName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };
          xhr.send();
        } catch (error) { console.error(error); }
      }
    } catch (error) { console.error(error); }
    setDownloadReady(true);
  };

  const sendPNGURLToBackend = async (urlToUpdate, archive) => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/designs/${id}`,
        { thumbnailURL: urlToUpdate, selectedFrame: selectedFrame, archive: archive },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
    } catch (error) { console.error("Error sending PNG data to the backend:", error); }
  };
  return (
    <>
      <div className="footer-wrapper">
        <div className="input-wrapper resolution">
          <label>Export Resolution: {scale}</label>
          <div className="resolution-manager">
            {[4, 3, 2].map((s) => (
              <div key={s} className={`scale-option ${scale === s ? "active" : ""}`} onClick={() => setScale(s)}>
                {s === 4 ? "High" : s === 3 ? "Medium" : "Low"}
              </div>
            ))}
          </div>
        </div>

        <button className="btn" onClick={(e) => { e.preventDefault(); dowloadDesign(selectedFrame.frameId, false); }}>
          Download Assets <div className={`loader ${!downloadReady ? "" : "hidden"}`}></div>
        </button>
        <br /><br />
        <div>
          <button className="btn" onClick={(e) => { e.preventDefault(); dowloadDesign(selectedFrame.frameId, true); }}>
            Archive
          </button>
        </div>
      </div>
      <div className="image-gallery">
        {selectedFrame.archiveURL.map((url, index) => {
          const parts = url.split("/framework/");
          let afterFramework = `${selectedFrame.sectionName}-${selectedFrame.frameName}`;
          if (parts[1]) {
            afterFramework = parts[1].replace(".png", "").replace(/%20/g, " ").replace(/%23/g, "#");
          }

          return (
            <div
              key={url}
              className="image-container"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                <p>{afterFramework}</p>
                <img className="archived-img" src={url} alt="Archived Image" />
              </a>
              {hoveredIndex === index && (
                <button
                  className="delete-button"
                  onClick={() => handleDelete(event, url)}                     // 🔴 BUG: `event` is the deprecated global, not the click event
                >
                  x
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div>
        {isLoggedIn && user.status === "admin" && (
          <>
            <button className="admin-btn" onClick={handleNotify}>Notify Client</button>
          </>
        )}
      </div>
    </>
  );
}

export default ExportDesign;
```

**Verdict: refactor.** Concrete patches:
1. **Stop using `FIGMATOKEN`** — replace with `POST /api/exports {compositionId, format, scale}` returning the R2 signed URL; backend renders via Satori or proxies to Figma.
2. **Stop mutating `selectedFrame.archiveURL`** — that's the parent's state. Lift the operation to a parent callback that calls `setDesign`.
3. **`onClick={() => handleDelete(event, url)}`** — `event` is the deprecated global property, undefined in strict mode and ESM. Fix: `onClick={(e) => handleDelete(e, url)}`.
4. **XHR-Blob download dance** → simpler: server returns the asset with `Content-Disposition: attachment`, browser handles download natively.

#### `src/components/CreateDesign.jsx`

```jsx
// Earlier extract — full file shown for completeness:
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const CreateDesign = () => {
  const [name, setName] = useState("");
  const [figmaID, setfigmaID] = useState("");
  const [figmaNodeId, setFigmaNodeId] = useState("");
  const [clients, setClients] = useState("");
  const [selectedClient, setSelectedClient] = useState("jean");
  const [defaultText, setDefaultText] = useState([]);
  const [numberOfTextEntries, setNumberOfTextEntries] = useState(0);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    const fd = new FormData();
    fd.append("name", name);
    fd.append("figmaID", figmaID);
    fd.append("figmaNodeId", figmaNodeId);
    fd.append("client", selectedClient);
    fd.append("numberOfTextEntries", numberOfTextEntries);
    const arrOfDefaultText = defaultText.slice(0, numberOfTextEntries);
    fd.append("defaultText", arrOfDefaultText);                                // 🔴 array → string coerce, server gets "a,b,c"
    try {
      const response = await axios.post(`${BACKEND_URL}/api/designs`, fd, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      navigate(`/designs/${response.data._id}`);
    } catch (error) { console.log(error); }
  }

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/client`);
      setClients(response.data);
    } catch (error) { console.log(error); }
  };

  useEffect(() => { fetchClients(); }, []);

  if (!clients) return <div>Loading...</div>;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* ... text inputs for name, figmaID, figmaNodeId, client select ... */}
        <div>
          {Array.from({ length: numberOfTextEntries }).fill(0).map((e, i) => (
            <input
              key={i}
              placeholder={`DefaultValue${i}`}
              onChange={(val) => {
                let temp = defaultText;                                        // 🔴 reference to state, not copy
                temp[i] = val.target.value;                                    // 🔴 mutates state directly
                setDefaultText(temp);                                          // setter receives same reference, no rerender
              }}
            ></input>
          ))}
        </div>
        <button className="btn">Create a design</button>
      </form>
      <NavLink className={"btn"} to={"/designs"}>Cancel</NavLink>
    </div>
  );
};

export default CreateDesign;
```

**Verdict: discard.** This admin-only "create a Design" form bypasses the Figma plugin → backend flow entirely (it makes the user paste raw Figma IDs). Replaced by the **Generator Plugin v2** writing directly to `templates`. Keep no UI.

#### `src/components/Navbar.jsx` (full)

```jsx
import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "../assets/framework-log.svg";
import { AuthContext } from "../context/authContext";
import "./Navbar.css";
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || "https://frame-work.app";

const Navbar = () => {
  const { user, isLoggedIn, authenticateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    authenticateUser();
    navigate("/auth/login");
  };
  return (
    <>
      <div className="Navbar">
        {isLoggedIn && (<nav><NavLink to={"/Designs"}>Designs</NavLink></nav>)}
      </div>
      <nav className="logoWrapper">
        <NavLink to={"/Designs"}><img src={Logo} alt="Logo" /></NavLink>
      </nav>
      <div className="Navbar">
        {!isLoggedIn && (<nav><NavLink to={"/auth/login"}>Log in</NavLink></nav>)}
        <nav><NavLink to={"/"}>Brand</NavLink></nav>
        <nav><NavLink to={"/profile"}>Settings</NavLink></nav>
        {isLoggedIn && user.status === "admin" && (
          <nav><NavLink to={"/Clients"}>Clients</NavLink></nav>
        )}
        {isLoggedIn && (
          <>
            {user.pictureUrl && (<img src={user.pictureUrl} style={{ width: "50px" }}></img>)}
            <nav onClick={logout}><a href="#">Logout</a></nav>
          </>
        )}
      </div>
    </>
  );
};

export default Navbar;
```

**Verdict: refactor.** Bugs:
- `<nav>` wrapping a single `<NavLink>` per item is semantically wrong (a `<nav>` is a landmark, not a list item). Should be `<ul><li>`.
- `<a href="#">` for logout — middle-click opens a tab. Use `<button>`.
- `<img>` no `alt` on user picture (line 64).
- Path casing inconsistent (`/Designs` vs `/designs`).

Replace with shadcn/ui `NavigationMenu` + Clerk `<UserButton />`.

#### `src/components/Layout.jsx`

```jsx
import Navbar from "./Navbar"
import Footer from "./Footer"
import { Outlet } from "react-router-dom"

const Layout = () => {
	return (
		<>
			<header><Navbar /></header>
			<main><Outlet /></main>
			<footer><Footer /></footer>
		</>
	)
}

export default Layout
```

**Verdict: discard.** Becomes `app/(authenticated)/layout.tsx` and `app/(brand)/layout.tsx` in Next App Router.

#### `src/components/Footer.jsx`

```jsx
import React from "react"

const Footer = () => {
	return
}

export default Footer
```

**Verdict: 🔴 BROKEN — `return` returns `undefined`** which React treats as an invalid child and silently warns about. **Either return `null` or return real footer markup.** Discard either way; replace with brand-aware footer in the new `app/layout.tsx`.

#### `src/components/BrandMainPage.jsx`

```jsx
import React from "react";

function BrandMainPage(props) {
  const { brandData, brandImages } = props;
  const renderElements = (elements, level = 0) => {
    return elements.map((element, index) => (
      <div
        key={index}
        className={element.name === `Sub-pages` ? `subpage${level}` : ``}
        id={element.nodeid}
      >
        {element.characters && (
          <p id={`${element.nodeid}`}>
            {getTabulation(level)}
            {element.characters}
          </p>
        )}
        {element.elements && element.name.length > 0 && (
          <div>
            {getTabulation(level)}
            {!brandImages.images[element.name] &&
              renderElements(element.elements, level + 1)}
            {brandImages.images[element.name] && (
              <img src={brandImages.images[element.name].url} alt={element.nodeid} />
            )}
          </div>
        )}
      </div>
    ));
  };

  const getTabulation = (level) => {
    return Array(level).fill("    ").join("");
  };

  return (
    <div>
      {brandData && (<div><div className="main">{renderElements(brandData.elements)}</div></div>)}
    </div>
  );
}

export default BrandMainPage;
```

**Verdict: discard.** This is the recursive proto-Brand-Hub renderer. Replaced by the Vevo-style accordion components reading from `brand_token_versions.tokens` (§5).

#### `src/components/SideMenu.jsx`

```jsx
import React, { useState } from "react";

function SideMenu(props) {
  const { brandData } = props;

  const renderMenuItems = (elements, parentIds = []) => {
    return elements.map((element, index) => {
      if (element.name === "Sub-pages" || element.name.startsWith("Page")) {
        return (
          <li key={index}>
            <a
              href={`#${element.nodeid}`}
              className="link"
              style={{ marginLeft: `${parentIds.length * 20}px` }}
            >
              {element.elements[0]?.characters}
            </a>
            {element.elements && (
              <ul>
                {renderMenuItems(element.elements, [
                  ...parentIds,
                  element.elements[0]?.characters,
                ])}
              </ul>
            )}
          </li>
        );
      }
    });
  };

  return (
    <div className="SideMenu">
      {brandData && <ul>{renderMenuItems(brandData.elements)}</ul>}
    </div>
  );
}

export default SideMenu;
```

**Verdict: discard.** Replaced by the static brand-hub navigation (Identity / Color / Type / Motion / Imagery / Voice / Templates / Exports). No more recursive descent of arbitrary structure.

---

### 16.4 Build / dev config

#### `package.json`

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint src --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "host": "vite --host"
  },
  "dependencies": {
    "axios": "^1.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.11.2"
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^4.0.0",
    "eslint": "^8.38.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.3.4",
    "vite": "^4.3.2"
  }
}
```

**Replacement deps for v3 (`apps/web/package.json`):**

```json
{
  "dependencies": {
    "@clerk/nextjs": "^6",
    "@hookform/resolvers": "^3",
    "@radix-ui/react-accordion": "^1",
    "@radix-ui/react-dialog": "^1",
    "@radix-ui/react-tooltip": "^1",
    "axios": "^1",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "framer-motion": "^11",
    "lottie-react": "^2",
    "next": "^15",
    "next-themes": "^0.4",
    "react": "^18",
    "react-dom": "^18",
    "react-hook-form": "^7",
    "tailwind-merge": "^3",
    "zod": "^3"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^9",
    "eslint-config-next": "^15",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

#### `.eslintrc.cjs`

```js
module.exports = {
	env: { browser: true, es2020: true },
	extends: [
		"eslint:recommended",
		"plugin:react/recommended",
		"plugin:react/jsx-runtime",
		"plugin:react-hooks/recommended",
	],
	parserOptions: { ecmaVersion: "latest", sourceType: "module" },
	settings: { react: { version: "18.2" } },
	plugins: ["react-refresh"],
	rules: {
		"react-refresh/only-export-components": "warn",
		"react/prop-type": false,                  // 🔴 typo: should be "react/prop-types": "off"
	},
}
```

**Verdict: discard.** Replaced by `eslint-config-next` flat config in v3.

---

### 16.5 Migration map at a glance — frontend

| v0 page / component | v3 destination | Action |
|---|---|---|
| `pages/Brand.jsx` | `app/(brand)/[slug]/page.tsx` (Server Component, ISR) | Replace with Vevo-style accordion |
| `components/BrandMainPage.jsx` | Brand Hub section components (Color / Type / Logo / Motion / Voice / Imagery / Templates / Exports) | Drop recursive renderer |
| `components/SideMenu.jsx` | Static nav from brand-hub schema | Drop dynamic substring matching |
| `pages/Designs.jsx` | `app/(authenticated)/templates/page.tsx` + `app/(authenticated)/drafts/page.tsx` | Server-rendered, RLS-scoped |
| `pages/OneDesign.jsx` | `app/(authenticated)/editor/[compositionId]/page.tsx` + `<TemplateRenderer>` client component | Replace Figma roundtrip with JSX runtime |
| `components/ExportDesign.jsx` | `app/(authenticated)/editor/[id]/export-panel.tsx` calling `/api/exports` | Move Figma `/v1/images` server-side; remove FIGMATOKEN from browser |
| `components/AuthForm.jsx` | Clerk `<SignIn />` / `<SignUp />` / `<UserProfile />` | Drop entirely |
| `pages/Clients.jsx` | Clerk `<OrganizationProfile />` | Drop entirely |
| `pages/ProtectedRoute.jsx` + `IsAdmin.jsx` | `middleware.ts` + Clerk `auth()` per-route | Drop |
| `components/CreateDesign.jsx` | — (deleted; replaced by Generator Plugin) | Drop |
| `components/Navbar.jsx` | shadcn `NavigationMenu` + Clerk `<UserButton />` | Replace |
| `context/authContext.jsx` | `<ClerkProvider>` | Drop |

### 16.6 Salvage list — what survives the rewrite

A small list of patterns that survive:

1. **Subdomain routing logic** (`Brand.jsx:47-67`) — `hostname.split(".")[0]` resolving to a tenant slug. Same logic survives in Next.js `middleware.ts`.
2. **The route shape** in `App.jsx` — the URL hierarchy `/designs/:id/:section/:frame` is good UX. Port to Next.js dynamic routes.
3. **Image upload validation** in `OneDesign.jsx:167-211` — file size, image dimensions, error messaging. Port to a client-side `validateImage()` util.
4. **The "select frame from select" pattern** in `OneDesign.jsx:274-292` — keep as a controlled `<Select>` from shadcn.
5. **The 4096px max-dim image guard** — keep as a tenant-level config.
6. **The XHR-Blob download utility** in `ExportDesign.jsx:99-120` — replace with `<a href={url} download>` plus `Content-Disposition: attachment` header from the server.

### 16.7 Files NOT to migrate (delete on rewrite)

- `components/Footer.jsx` — broken (`return;`)
- `components/SideMenu.jsx` — proto-implementation only
- `components/BrandMainPage.jsx` — proto-implementation only
- `components/CreateDesign.jsx` — admin-only Figma-ID-paste form
- `pages/Brand.css`, `Designs.css`, `OneDesign.css`, etc. — replaced by Tailwind v4 utility classes
- `public/VarExemples.png`, `VarExemplesInFigma.png` — design notes, not assets
- `assets/Plain-Regular.otf`, `LGC.ttf` — re-host through tenant font system (§3.3)

---

## 17. Upgrade-in-place plan — make `FrameWork-Front-main` work properly

Same pragmatic stance as §15. Don't rewrite. Fix what's broken first; the v3 web app comes after pilot. The frontend has fewer security holes than the backend but **two are critical** (`VITE_FIGMATOKEN`, `dangerouslySetInnerHTML` of remote SVG) and must ship within 24 hours.

### 17.0 Pre-work (Day 0 — 30 minutes)

1. Unzip `FrameWork-Front-main.zip` into `apps/web/` in the same monorepo as `apps/api/` (§15.0)
2. `npm install` against the existing `package.json`
3. `cp .env.example .env`, fill backend URL
4. `npm run dev` — verify the app boots locally
5. Initial commit: `chore: import v0 frontend verbatim`

---

### 17.1 Critical security (Week 1 — must ship within 24h)

#### 17.1.1 Stop shipping `VITE_FIGMATOKEN` to the browser
- **Files**: `src/pages/OneDesign.jsx:7,81`, `src/components/ExportDesign.jsx:15,83`
- **Issue**: `import.meta.env.VITE_FIGMATOKEN` → Vite inlines into the production bundle → anyone visiting the site can extract the token from the JS and act as your Figma account
- **Fix** — move every Figma `/v1/images` call server-side. Two new backend endpoints:

**Backend** (`routes/figma.routes.js`):

```js
const isAuthenticated = require("../middlewares/isAuthenticated");
const ownsDesign = require("../middlewares/ownsDesign");

// Editor preview SVG
router.get("/preview/:designId/:frameId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { designId, frameId } = req.params;
      // Reuse ownership check by overriding params for ownsDesign
      req.params.id = designId;
      await ownsDesign(req, res, async () => {
        const design = req.design;
        const r = await fetch(
          `https://api.figma.com/v1/images/${design.FigmaFileKey}?ids=${frameId}&format=svg&scale=1&svg_include_id=true&svg_include_node_id=true`,
          { headers: { "X-Figma-Token": process.env.FIGMA_TOKEN } }
        );
        if (!r.ok) return res.status(502).json({ message: "Figma upstream error" });
        const data = await r.json();
        const svgUrl = Object.values(data.images)[0];
        const svgRes = await fetch(svgUrl);
        const svg = await svgRes.text();
        // Sanitize before returning (server-side DOMPurify)
        const DOMPurify = require("isomorphic-dompurify");
        const clean = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
        res.set("Cache-Control", "private, max-age=30");
        res.type("image/svg+xml").send(clean);
      });
    } catch (e) { next(e); }
  }
);

// Export PNG
router.get("/export/:designId/:frameId",
  isAuthenticated, /* ownsDesign via inline check */
  async (req, res, next) => {
    try {
      const { designId, frameId } = req.params;
      const scale = Math.min(parseInt(req.query.scale || "4", 10), 4);
      // ... Figma call with format=png&scale=${scale}, returns the URL
      // Either redirect to Figma's S3 URL, or proxy-stream the bytes
    } catch (e) { next(e); }
  }
);
```

**Frontend** — replace `OneDesign.jsx:72-101`:

```jsx
const dowloadTemplate = async (idToDownload) => {
  setLoadingMessage("Loading preview…");
  try {
    // No more cross-origin Figma call from the browser
    const res = await fetch(
      `${BACKEND_URL}/api/figma/preview/${design._id}/${idToDownload}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
    );
    if (!res.ok) throw new Error(`Preview failed: ${res.status}`);
    const sanitizedSvg = await res.text();
    setSvg(sanitizedSvg);
    setTemplateReady(true);
  } catch (error) {
    console.error("Preview error:", error);
    setLoadingMessage("Preview unavailable");
  }
};
```

Replace `ExportDesign.jsx:70-128` similarly: call `${BACKEND_URL}/api/figma/export/...` instead of Figma directly.

Then **delete every `VITE_FIGMATOKEN` reference** and remove the env var from Vercel + `.env`.

#### 17.1.2 Sanitize `dangerouslySetInnerHTML` SVG
- **File**: `src/pages/OneDesign.jsx:392`
- **Issue**: Figma SVGs can contain `<script>`, event handlers, foreign objects → XSS vector
- **Fix**: With 17.1.1's server-side DOMPurify, the SVG is already sanitized when it lands in `setSvg`. Belt-and-suspenders: also sanitize on the client:

```jsx
import DOMPurify from "dompurify";

// in the render path:
<div
  className="svgDiv"
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })
  }}
/>
```

```bash
npm i dompurify isomorphic-dompurify
```

#### 17.1.3 Remove JWT from URL on cross-subdomain redirect
- **File**: `src/components/AuthForm.jsx:133-136`
- **Issue**: `?token=${response.data.token}` sends JWT in URL → lands in browser history, server logs, Referer header
- **Fix** — interim (until Clerk replaces this whole flow):
  1. Backend issues a **one-time exchange code** at login: short-lived (30s), single-use
  2. Frontend redirects to `https://${slug}.frame-work.app/auth/loggedin?code=xxx`
  3. The loggedin page POSTs the code to `/api/auth/exchange` which returns the JWT
  4. JWT goes into localStorage on the target subdomain, never appears in URL

**Backend** (`routes/auth.routes.js`) — add a model + two routes:

```js
// models/AuthCode.model.js
const AuthCodeSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  usedAt: Date,
}, { timestamps: true });

// In login handler, replace the redirect-with-token with:
const code = crypto.randomBytes(24).toString("base64url");
await AuthCode.create({
  code,
  userId: foundUser._id,
  expiresAt: new Date(Date.now() + 30 * 1000), // 30s
});
res.json({ code, redirectTo: `https://${foundUser.username}.${process.env.APEX_DOMAIN}/auth/loggedin?code=${code}` });

// New endpoint:
router.post("/exchange", async (req, res, next) => {
  try {
    const { code } = req.body;
    const found = await AuthCode.findOneAndUpdate(
      { code, usedAt: null, expiresAt: { $gt: new Date() } },
      { usedAt: new Date() }
    );
    if (!found) return res.status(400).json({ message: "Invalid or expired code" });
    const token = jwt.sign(
      { _id: found.userId },
      process.env.TOKEN_SECRET,
      { algorithm: "HS256", expiresIn: "7d" }
    );
    res.json({ token });
  } catch (error) { next(error); }
});
```

**Frontend** (`AuthForm.jsx`) — replace lines 117-138:

```jsx
} else {
  const response = await axios.post(`${BACKEND_URL}/api/auth/login`, userToLogin);
  setError("");
  // Server returned { code, redirectTo }
  window.location.href = response.data.redirectTo;
}
```

And the `mode === "Loggedin"` branch (line 46) becomes:

```jsx
useEffect(() => {
  if (mode !== "Loggedin") return;
  const code = searchParams.get("code");
  if (!code) return;
  axios.post(`${BACKEND_URL}/api/auth/exchange`, { code })
    .then(({ data }) => {
      localStorage.setItem("token", data.token);
      // Strip the code from the URL to prevent replay confusion
      window.history.replaceState({}, document.title, "/auth/loggedin");
      authenticateUser().then(() => navigate("/Designs"));
    })
    .catch(() => navigate("/auth/login"));
}, [mode]);
```

This eliminates the JWT from the URL, browser history, and Referer.

---

### 17.2 Bug fixes (Week 1 — parallel with 17.1)

#### 17.2.1 Direct state mutation in OneDesign
- **File**: `src/pages/OneDesign.jsx:325-330`
- **Issue**: `let temp = [...newText]; temp[index].valuesByMode = val.target.value` — shallow copy clones the array but inner objects are still shared references; mutating them breaks React's referential-equality checks
- **Fix**:

```jsx
onChange={(val) => {
  setNewText((prev) =>
    prev.map((v, i) =>
      i === index ? { ...v, valuesByMode: val.target.value } : v
    )
  );
}}
```

#### 17.2.2 Direct state mutation in CreateDesign
- **File**: `src/components/CreateDesign.jsx:142-145`
- **Issue**: same bug, even worse — `let temp = defaultText` is a reference, not a copy. `setDefaultText(temp)` receives the same reference React already has → no rerender
- **Fix**:

```jsx
onChange={(val) => {
  setDefaultText((prev) => {
    const next = [...prev];
    next[i] = val.target.value;
    return next;
  });
}}
```

#### 17.2.3 Duplicate `id="fileInput"` across multiple inputs
- **File**: `src/pages/OneDesign.jsx:363`, `src/components/AuthForm.jsx:206`
- **Issue**: Multiple file inputs share the same DOM id → `document.getElementById("fileInput")` (line 137) returns only the first one; HTML invalid; accessibility broken
- **Fix**:

```jsx
// OneDesign.jsx:363
<input
  id={`fileInput-${element.name}`}
  // ...
/>
```

And in `generateDesign` (line 137), instead of `getElementById`, **track input refs**:

```jsx
const fileInputRefs = useRef({});
// ...
<input ref={(el) => { fileInputRefs.current[element.name] = el; }} ... />
// Reset all:
Object.values(fileInputRefs.current).forEach((el) => { if (el) el.value = ""; });
```

#### 17.2.4 `onClick` using deprecated global `event`
- **File**: `src/components/ExportDesign.jsx:230`
- **Issue**: `onClick={() => handleDelete(event, url)}` — `event` is a deprecated global property (only works in some browsers in non-strict mode). In strict mode (the React 18 default for production builds) this is `ReferenceError`.
- **Fix**:

```jsx
onClick={(e) => handleDelete(e, url)}
```

#### 17.2.5 Substring matching for variable scoping
- **Files**: `src/pages/OneDesign.jsx:299-356`, mirrors `Plugin code.ts:117-130`
- **Issue**: `element.name.toLowerCase().includes(template) && includes(frame)` — any layer rename in Figma silently breaks customer edits
- **Fix** (interim, before §5 schema migration): require the designer to name variables in a strict pattern, fail loudly when it doesn't match:

```jsx
function parseSlotName(name) {
  // Expected: "<template> - <frame> - <field>"  or  "<template> - all - <field>"
  const parts = name.split(" - ").map((s) => s.trim());
  if (parts.length !== 3) return null;
  const [tpl, frame, field] = parts;
  return { template: tpl.toLowerCase(), frame: frame.toLowerCase(), field };
}

function matchesScope(slot, template, frame) {
  if (!slot) return false;
  if (slot.template !== template.toLowerCase()) return false;
  return slot.frame === "all" || slot.frame === frame.toLowerCase();
}

// In the render:
{design.variables.map((element, index) => {
  const slot = parseSlotName(element.name);
  if (!matchesScope(slot, selectedTemplate.name, selectedFrame.frameName)) return null;
  return (
    <div key={element.id || index} className="input-wrapper">
      <label htmlFor={`text-${element.id}`}>{slot.field}</label>
      <textarea
        id={`text-${element.id}`}
        value={newText[index]?.valuesByMode || ""}
        onChange={(val) => {
          setNewText((prev) => prev.map((v, i) =>
            i === index ? { ...v, valuesByMode: val.target.value } : v
          ));
        }}
      />
    </div>
  );
})}
```

In Phase 2 this becomes structural via `slot_schema` in §5.

#### 17.2.6 Designs.jsx admin client-design matching
- **File**: `src/pages/Designs.jsx:73`
- **Issue**: `design.usedBy.includes(client._id)` — Mongoose returns ObjectIds; `.includes` does reference equality, almost never true with serialized JSON
- **Fix**:

```jsx
if (design.usedBy.some((u) => u.toString() === client._id.toString())) {
```

#### 17.2.7 Missing keys on `<>` fragments inside `.map`
- **File**: `src/pages/Designs.jsx:121`
- **Issue**: `<>...</>` short syntax can't carry a `key` prop → React warning, broken reconciliation on reorder
- **Fix**:

```jsx
{design.sections.map((section) => (
  <React.Fragment key={section._id}>
    <Link to={`${design._id}/${section.name}`}>...</Link>
    <div className="images-wrapper">...</div>
  </React.Fragment>
))}
```

Also missing key on the outer `.design-list-wrapper` div in the non-admin branch (line 114): add `key={design._id}`.

#### 17.2.8 Footer.jsx returns undefined
- **File**: `src/components/Footer.jsx:4`
- **Fix**:

```jsx
const Footer = () => null; // or real footer markup
```

#### 17.2.9 AuthForm setState during render
- **File**: `src/components/AuthForm.jsx:46-52`
- **Issue**: `if (mode === "Loggedin") { localStorage.setItem(...) }` runs synchronously during render
- **Fix**: covered by 17.1.3 — the new `useEffect` runs the side effect after render.

#### 17.2.10 AuthForm signup `JSON.stringify(username)` wraps in quotes
- **File**: `src/components/AuthForm.jsx:73-74`
- **Issue**: `fd.append("username", JSON.stringify(userToLogin.username))` sends `"jean"` (with quotes) as the field value; the backend then strips the leading/trailing quote with a regex (`auth.routes.js:42-46`) — fragile dance
- **Fix** — frontend:

```jsx
fd.append("username", userToLogin.username);
fd.append("email", userToLogin.email);
```

And remove the regex strip in `auth.routes.js:40-47`.

---

### 17.3 Quality (Week 2)

| Task | Tool | Where |
|---|---|---|
| Error boundary | `react-error-boundary` | wrap `<App />` with `<ErrorBoundary fallback={...}>` |
| Cancel inflight on unmount | `AbortController` | every `axios.get` in useEffect |
| Loading skeletons | shadcn `<Skeleton />` (port over) | replace `<p>Loading...</p>` everywhere |
| Accessibility audit | `eslint-plugin-jsx-a11y` | adds `<label htmlFor>`, alt text, button vs link |
| ESLint typo | edit `.eslintrc.cjs` | `"react/prop-types": "off"` (was `"react/prop-type": false`) |
| Drop unused Hanalei Fill | `index.html:6-9` | delete the `<link>` |
| Add proper Open Graph + favicon | `index.html` | `<meta property="og:title">`, `/favicon.ico` |
| Replace `React.StrictMode` `<>` over-wrapping | `App.jsx:14-16` | drop the leading `<>` (inside StrictMode `<Routes>` is the only child) |
| Optimistic UI on PATCH | local state update before server confirms | `OneDesign.jsx generateDesign` — show preview optimistically |
| Debounce typing | `useDebouncedValue` hook | wrap textarea onChange — but for now, not critical since render is local |

---

### 17.4 Cleanup deletes (one PR)

- `src/components/Footer.jsx` — broken stub, delete or replace with real footer
- `src/components/CreateDesign.jsx` — admin-only Figma-ID-paste form, replaced by Generator Plugin
- `index.html:6-9` — Hanalei Fill `<link>`, unused
- `public/VarExemples.png`, `public/VarExemplesInFigma.png` — design notes, not assets
- All `console.log("salut")`, `("bonjour")`, `("la val et l'index")`, `("error ici")`, etc — search/prune
- French comments mixed with code — translate or strip
- Duplicate `BACKEND_URL` declaration on every page — extract to `src/lib/config.js` and import once

---

### 17.5 Day-by-day (10-day plan)

| Day | PR |
|---|---|
| 1 | 17.1.1 (FIGMATOKEN — backend proxy + frontend swap) |
| 2 | 17.1.2 (DOMPurify on SVG) |
| 3 | 17.1.3 (one-time-code login flow) |
| 4 | 17.2.1 + 17.2.2 (state mutation fixes) |
| 5 | 17.2.3 (file input refs) + 17.2.4 (`onClick` event fix) |
| 6 | 17.2.5 (slot-name strict parsing) |
| 7 | 17.2.6 + 17.2.7 + 17.2.8 + 17.2.9 + 17.2.10 (Designs.jsx, fragments, Footer, render-side-effect, signup JSON.stringify) |
| 8 | 17.3 error boundary + skeletons + a11y |
| 9 | 17.3 cancel-on-unmount + ESLint typo + cleanup deletes |
| 10 | End-to-end smoke test on staging with 30 70 Agency. Regression sweep. |

End of week 2: frontend matches backend (§15) — **pilot-ready**. No critical security holes. Editor preview routed through backend proxy. Login no longer leaks JWT. State mutations fixed. Substring matching documented and bounded.

---

### 17.6 Stop criteria — when to stop patching v0 frontend and move to v3 web

Patch until one of these triggers fires:

1. **Editor preview > 1.5s p95** even with backend proxy — switch to JSX-runtime (§3.1) and Next.js
2. **Brand Hub design quality** plateaus on the proto-renderer — port to Next.js + Tailwind v4 + shadcn for the Vevo aesthetic
3. **Clerk integration friction** — Clerk on top of v0 React Router is awkward; cleaner to migrate to Next App Router at the same time
4. **First Stripe checkout** — Stripe Customer Portal works best with Next.js webhook handling
5. **Mobile UX** matters — v0 has no responsive design at all; mobile-first rewrite belongs in Next + Tailwind

Until then, every hour spent on the v3 web app is an hour not spent closing brands. **Patch.**

---

## 18. Reference — `Framework-generator-main` (v0 brand-creator plugin), already shipped

What exists today in `Framework-generator-main.zip`. **This is the file that contains the leaked Figma token** at `code.ts:116`. Verbatim source with annotations.

Conceptually this plugin is the **one-shot brand registration tool** — a designer runs it once per Figma file to push the brand's structure + images to the backend. It is *not* the runtime plugin (that's `FrameWork-Plugin-main`, a separate codebase).

### 18.0 Filesystem

```
Framework-generator-main/
├── manifest.json            # Figma plugin manifest, "name": "Framework-generator"
├── code.ts                  # Plugin sandbox code — 🔴 LEAKED FIGMA TOKEN at line 116
├── ui.html                  # The 2-button UI shown inside Figma
├── package.json             # Just tsc + figma plugin typings
├── tsconfig.json            # ES6 target, strict mode
├── Brandcreator.png         # Screenshot for README
├── README.md                # Setup notes
└── .gitignore               # excludes code.js
```

8 files, ~7KB of source. Built with `tsc -p tsconfig.json` → emits `code.js` that Figma loads.

---

### 18.1 `manifest.json`

```json
{
  "name": "Framework-generator",
  "id": "1331567219064921278",
  "api": "1.0.0",
  "main": "code.js",
  "capabilities": [],
  "enableProposedApi": false,
  "editorType": ["figma"],
  "ui": "ui.html",
  "networkAccess": {
    "allowedDomains": ["*"],
    "reasoning": "Dev phase",
    "devAllowedDomains": ["https://localhost:3000"]
  },
  "enablePrivatePluginApi": true
}
```

**Verdict: refactor.** Issues:
- `"allowedDomains": ["*"]` with `"reasoning": "Dev phase"` is the manifest equivalent of `cors()` open. Figma will reject this on plugin store submission — must list specific domains
- `"capabilities": []` — empty; if we want `inspect` mode access we'll need `["inspect"]`
- Replace with the production manifest:

```json
{
  "name": "Framework — Brand Creator",
  "id": "1331567219064921278",
  "api": "1.0.0",
  "main": "code.js",
  "capabilities": [],
  "enableProposedApi": false,
  "editorType": ["figma"],
  "ui": "ui.html",
  "networkAccess": {
    "allowedDomains": [
      "https://api.frame-work.app",
      "https://framework-backend.fly.dev"
    ],
    "reasoning": "Pushes brand tokens and template structures to the Framework backend.",
    "devAllowedDomains": ["http://localhost:3000"]
  }
}
```

`enablePrivatePluginApi: true` should be removed unless we're actually using a private API — this prevents Community publishing.

---

### 18.2 `code.ts` — **THE FILE WITH THE LEAKED TOKEN**

```ts
//
//
// !!!!! Don't forget the figma token line 116
//
//
let tousLesElements = [];
let allThePictures = [];
const imageMap = {};
const mergedImageMap = {};
const figmaFileKey = figma.fileKey;

const BACKENDURL = "http://localhost:3000/api";
//const BACKENDURL = "https://framework-backend.fly.dev/api";

console.log("ici le filekey", figma.fileKey);
function processAndStoreElement(parent, element) {
  // Create a new element object
  let currentElement = {};
  if (element.children) {
    currentElement = {
      name: element.name,
      nodeid: element.id,
      type: element.type,
      elements: [],
    };
  } else {
    currentElement = {
      name: element.name,
      type: element.type,
      nodeid: element.id,
      characters: element.characters,
    };
  }
  // Add the processed element to the parent
  parent.elements.push(currentElement);

  if (element.children) {
    // Recursively call the function for each child
    element.children.forEach((child) => {
      processAndStoreElement(currentElement, child);
    });
  }
}

function getElement() {
  const StructureFrame = figma.currentPage.findAll(
    (frames) => frames.type === "FRAME" && frames.name === "Structure"
  );
  const Pages = StructureFrame[0].children;                                    // 🔴 throws if no "Structure" frame exists
  Pages.forEach((page) => {
    let currentPage = { name: page.name, nodeid: page.id, elements: [] };
    tousLesElements.push(currentPage);
    page.children?.forEach((elements) => {
      processAndStoreElement(currentPage, elements);
    });
  });
}

async function getImages() {
  const allImages = figma.currentPage.findAll((elements) =>
    elements.name.includes("img")                                              // 🔴 substring match on "img" — too loose
  );
  allImages.forEach((image) => {
    if (imageMap.hasOwnProperty(image.name)) {
      imageMap[image.name].push(image.id);
    } else {
      imageMap[image.name] = [image.id];
    }
  });
  retrieveFigmaURL(imageMap);
}

const retrieveFigmaURL = async (imageMap) => {
  let arrayOfIds = [];
  Object.entries(imageMap).forEach(([name, ids]) => {
    arrayOfIds.push(ids[0]);
  });
  const idString = arrayOfIds.join(",");

  try {
    const response = await fetch(
      `https://api.figma.com/v1/images/${figma.fileKey}?ids=${idString}&scale=2&format=png`,
      {
        method: "Get",
        headers: {
          "Content-Type": "application/json",
          "X-Figma-Token": "figd_REDACTED_REVOKE_THIS_TOKEN",    // 🔴🔴🔴 LEAKED FIGMA PERSONAL ACCESS TOKEN
        },
      }
    );
    const data = await response.json();
    mergeDatas(data.images);
  } catch (error) {
    console.error("Error fetching Figma URL:", error);
    return null;
  }
};

function mergeDatas(datas) {
  for (const [name, ids] of Object.entries(imageMap)) {
    const urls = ids.map((id) => datas[id]).filter((url) => url);
    if (urls.length > 0) {
      mergedImageMap[name] = { ids: ids, url: urls[0] };
    } else {
      mergedImageMap[name] = { ids: ids, url: null };
    }
  }
  sendImagesDatas(mergedImageMap);
}

async function sendImagesDatas(mergedImageMap) {
  let datas = {
    FigmaName: figma.root.name,
    images: mergedImageMap,
  };

  try {
    const response = await fetch(
      `${BACKENDURL}/figma/${figmaFileKey}/gettingImagesURL`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datas),
      }
    );

    if (response.ok) {
      const data = await response.json();
      figma.ui.postMessage("Images correctly created or updated");
      return data;
    } else {
      figma.ui.postMessage("Failed to send data to the backend");
    }
  } catch (error) {
    console.error("An error occurred while sending data to the backend:", error);
  }
}

const sendToBackend = async (isPrivate): Promise<T> => {                       // 🔴 TS error: T is undefined
  try {
    await getElement();
    let datas = {
      FigmaName: figma.root.name,
      FigmaId: figma.fileKey,
      elements: tousLesElements,
      isPrivate: isPrivate,
    };

    const response = await fetch(`${BACKENDURL}/figma/createBrand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datas),
    });

    if (response.ok) {
      const data = await response.json();
      figma.ui.postMessage("Great success");
      return data;
    } else {
      figma.ui.postMessage("Failed to send data to the backend");
    }
  } catch (error) {
    console.error("An error occurred while sending data to the backend:", error);
  }
};

console.log("🛠️ Starting the plugin 🛠️");
getElement();
figma.showUI(__html__);
figma.ui.resize(400, 400);

figma.ui.onmessage = (msg) => {
  if (msg.type === "create") {
    figma.ui.postMessage("Loading...");
    tousLesElements = [];
    sendToBackend(msg.isPrivate);
  } else if (msg.type === "getelement") {
    figma.ui.postMessage("Loading...");
    getImages();
  } else if (msg.type === "test") {
    figma.ui.postMessage(42);
  } else {
    figma.closePlugin();
  }
};
```

**Verdict: rewrite.** This file alone embodies four critical issues:
1. **Leaked Figma token at line 116** (already noted in §15.1.1 — fix is to revoke + move server-side; this file should not call Figma REST at all)
2. **No backend authentication** — calls `/figma/*` with no token, no shared secret. Anyone can replay
3. **Writes to deprecated collections** — `Element` and `BrandImages` (§14.3, §15.5)
4. **Substring-based content extraction** — `name === "Structure"`, `name.includes("img")` — fragile naming contracts

The rewrite (§19.2) becomes the **Generator Plugin v2** that emits brand tokens to `/api/brands/:slug/tokens` (§15.3.5) and templates to `/api/templates`.

---

### 18.3 `ui.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Brand Creator</title>
    <style>
      button {
        padding: 8px 16px;
        margin-bottom: 8px;
        padding: 0.5rem;                                                        /* duplicate property */
        border: 0;
        background-color: black;
        color: white;
        border-radius: 0.2rem;
        text-align: left;
      }
      body { font-family: "Poppins", sans-serif; }                              /* Poppins not loaded */
    </style>
  </head>
  <body>
    <h1>Brand Creator</h1>
    <h2>Frame-work.app</h2>

    <button id="create">1. Create or update frame</button>
    <br />
    <button id="getelement">2. Get or update photos</button>
    <br />
    <div>
      <label>Private ? (ticked means private)</label>
      <input type="checkbox" id="private" name="private" checked />
    </div>

    <br />

    <!-- <button id="test">test</button> -->
    <button id="cancel">Cancel</button>

    <p id="info"></p>
    <script>
      onmessage = (event) => {
        document.getElementById("info").innerText = event.data.pluginMessage;
      };

      document.getElementById("create").onclick = () => {
        const isPrivate = document.getElementById("private").checked;
        parent.postMessage(
          { pluginMessage: { type: "create", isPrivate: isPrivate } },
          "*"
        );
      };
      document.getElementById("getelement").onclick = () => {
        parent.postMessage({ pluginMessage: { type: "getelement" } }, "*");
      };
      document.getElementById("cancel").onclick = () => {
        parent.postMessage({ pluginMessage: { type: "cancel" } }, "*");
      };
      document.getElementById("test").onclick = () => {                         // 🔴 #test button is commented out → throws
        parent.postMessage({ pluginMessage: { type: "test" } }, "*");
      };
    </script>
  </body>
</html>
```

**Verdict: refactor.** Concrete issues:
1. **Line 62 throws `Cannot read property 'onclick' of null`** — the `#test` button on line 38 is commented out but the script still binds to it
2. **Cancel button has handler but the code.ts switch only `figma.closePlugin()` on the `else` branch** — works, but coincidentally
3. **Poppins font referenced but not loaded** — falls back to system sans-serif
4. **No loading states, no error display**, all feedback through a single `<p id="info">`
5. **No styling, no shadcn-style polish** — looks like a 2016 internal tool

Replace with a small Preact / vanilla-TS UI built via Vite, using shadcn-style design tokens that match the eventual brand hub aesthetic.

---

### 18.4 `package.json` + `tsconfig.json`

```json
{
  "name": "Framework-generator",
  "version": "1.0.0",
  "description": "Your Figma Plugin",
  "main": "code.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "watch": "npm run build -- --watch"
  },
  "devDependencies": {
    "@figma/plugin-typings": "*",
    "typescript": "*"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es6",
    "lib": ["es6"],
    "strict": true,
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"]
  }
}
```

**Verdict: refactor.** `tsc` alone doesn't bundle, doesn't inject env vars, doesn't minify. Replace with **Vite plugin-figma setup**:

```json
// new package.json
{
  "name": "@framework/plugin-generator",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "build": "vite build",
    "watch": "vite build --watch",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.100",
    "typescript": "^5.6",
    "vite": "^5",
    "vite-plugin-singlefile": "^2"
  }
}
```

Vite's `define` config injects `BACKEND_URL` and `PLUGIN_SHARED_SECRET` at build time without committing them to source.

---

### 18.5 `README.md` (key parts already in §1 of brief)

Notable lines:
- **Line 110**: instructs the user to set the backend URL
- **Line 114-117**: instructs the user to "add your Figma Token between the """ — the original intent was "user supplies their own token", but v0 ships Damien's
- **Line 138**: "the most important is, in your Figma file, to have a Frame called Structure" — the magic-name contract
- **Line 168**: "it is important for you images to have 'img' in there name" — another magic substring contract

The README itself is not the bug; the bug is shipping a personal token AND having no proper supply mechanism.

---

### 18.6 What this plugin's outputs become in the new world

| v0 plugin action | v0 endpoint | v3 endpoint | Notes |
|---|---|---|---|
| Click "Create or update frame" | `POST /figma/createBrand` → Mongo `Element` collection | `POST /api/brands/:slug/tokens` → `BrandTokenVersion` (§15.3.4) | Emits brand tokens (color, type, spacing, logos) instead of arbitrary node tree |
| Click "Get or update photos" | `POST /figma/:figmaId/gettingImagesURL` → Mongo `BrandImages` collection | `POST /api/templates` + `POST /api/templates/:id/preview` | Photos are template assets, not brand assets — they belong to template versions, not brands |
| Anything that calls Figma `/v1/images` from the plugin | Direct fetch with hardcoded token | Backend proxy: `POST /api/figma/render-internal` (auth-gated) | Plugin holds no token |
| `name === "Structure"` magic | Implicit naming contract | Explicit `setPluginData("framework.kind", "structure")` | Survives renames |
| `name.includes("img")` magic | Implicit naming contract | Explicit `setPluginData("framework.role", "image-slot")` | Survives renames |
| `isPrivate` checkbox | Stored on Element | Replaced by tenant access rules in `organizations` table | Multi-tenant model |

---

### 18.7 Salvage list

What survives the rewrite:

1. **The recursive `processAndStoreElement` walk** — the *concept* of walking the Figma tree depth-first into a JSON tree is right. Reuse for the new layout-schema extractor in the Generator Plugin v2.
2. **The "Create or update" button labelling** — clear UX. Keep in the new UI.
3. **The `figma.fileKey` + `figma.root.name` identity pair** — the right primary key for "which Figma file is this". Keep.
4. **The 400×400 plugin window size** — appropriate for a one-shot tool. Keep.
5. **The `figma.closePlugin()` on cancel** — correct lifecycle. Keep.

What goes:
- The hardcoded Figma token (revoke, never reintroduce)
- Direct calls to Figma REST `/v1/images`
- Magic substring matching on layer names
- Writing to `Element` and `BrandImages` collections

---

## 19. Upgrade-in-place plan — make `Framework-generator-main` work properly

The **shortest** of the three upgrade plans. Two critical security items + a behavior repointing to the new endpoints. End-state: same plugin, same UX, but writes brand tokens into the new schema and never holds a Figma token.

### 19.0 Pre-work (Day 0 — 15 minutes)

1. Unzip `Framework-generator-main.zip` into `apps/plugin-generator/` in the monorepo
2. `npm install` against existing `package.json`
3. Verify `npm run build` produces `code.js`
4. In Figma: Plugins → Development → Import from manifest → select `manifest.json`
5. Smoke-test against local backend
6. Initial commit: `chore: import v0 generator plugin verbatim`

---

### 19.1 Critical security (Day 1 — must ship before any further share of the plugin)

#### 19.1.1 Revoke the leaked Figma PAT and remove all token references
- **File**: `code.ts:116`
- **Already covered**: §15.1.1 (revocation) and §17.1.1 (server-side proxy)
- **Plugin-side fix**:

```ts
// DELETE the entire retrieveFigmaURL function (lines 94-127) — Figma image fetching moves server-side.
// The plugin no longer needs Figma's REST API; it operates entirely via figma.* plugin APIs.

// REPLACE getImages() to gather node IDs only, no fetch:
async function getImages() {
  const allImages = figma.currentPage.findAll(
    (n) => n.name.includes("img") || n.getPluginData("framework.role") === "image-slot"
  );
  for (const image of allImages) {
    if (imageMap.hasOwnProperty(image.name)) {
      imageMap[image.name].push(image.id);
    } else {
      imageMap[image.name] = [image.id];
    }
  }
  // Send node-id map to backend; backend resolves URLs via its own server-side Figma token.
  await sendImagesDatas(imageMap);
}
```

The plugin now sends only node IDs; the backend (with `process.env.FIGMA_TOKEN`) does the `/v1/images` fetch.

#### 19.1.2 Add plugin shared-secret auth on every backend call
- **Files**: every `fetch(\`${BACKENDURL}/...\`)` in `code.ts`
- **Issue**: The plugin currently calls `/api/figma/*` with no authentication. Combined with §15.1.2, this becomes the only allowed caller of those endpoints
- **Fix** — define the secret in Vite config so it's injected at build time but never committed:

```ts
// vite.config.ts (new)
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  define: {
    __BACKEND_URL__: JSON.stringify(process.env.BACKEND_URL || "http://localhost:3000/api"),
    __PLUGIN_SECRET__: JSON.stringify(process.env.PLUGIN_SHARED_SECRET || ""),
  },
  build: {
    rollupOptions: {
      input: { code: "code.ts" },
      output: { entryFileNames: "code.js", format: "iife" },
    },
  },
  plugins: [viteSingleFile()],
});
```

In `code.ts`:

```ts
declare const __BACKEND_URL__: string;
declare const __PLUGIN_SECRET__: string;

const BACKENDURL = __BACKEND_URL__;

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BACKENDURL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Framework-Plugin-Secret": __PLUGIN_SECRET__,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}
```

Replace every `fetch(\`${BACKENDURL}/...\`)` with `api(...)`.

Backend must implement `isPlugin` middleware (§15.1.2). The secret is generated by `openssl rand -hex 32`, stored in backend `.env` as `PLUGIN_SHARED_SECRET`, and supplied at plugin build time (CI env var, never committed).

---

### 19.2 Repoint to the new endpoints (Days 2-4)

#### 19.2.1 Stop writing to `/figma/createBrand` (Element collection)
- **File**: `code.ts:181-219` (`sendToBackend`)
- **Current behavior**: pushes raw Figma node tree to `/figma/createBrand` → `Element` collection (deprecated, §14.3)
- **Fix**: emit **brand tokens** instead of raw structure, write to `/api/brands/:slug/tokens` (§15.3.5)

```ts
// New: extractBrandTokens.ts
type BrandTokens = {
  colors: { primary: string; palette: Array<{ name: string; hex: string }> };
  typography: Record<string, { fontFamily: string; weights: number[]; scale: number[] }>;
  spacing: { unit: number; scale: number[] };
  logos: Array<{ name: string; variant: string; nodeId: string }>;
};

export async function extractBrandTokens(): Promise<BrandTokens> {
  const tokens: BrandTokens = {
    colors: { primary: "", palette: [] },
    typography: {},
    spacing: { unit: 8, scale: [4, 8, 16, 24, 32, 48, 64] },
    logos: [],
  };

  // 1. Colors — read local color variables AND named color styles
  const colorVars = figma.variables.getLocalVariables("COLOR");
  for (const v of colorVars) {
    const value = Object.values(v.valuesByMode)[0];
    if (typeof value === "object" && "r" in value) {
      const hex = rgbToHex(value as RGB);
      tokens.colors.palette.push({ name: v.name, hex });
      if (v.name.toLowerCase().includes("primary")) tokens.colors.primary = hex;
    }
  }

  // 2. Typography — read text styles
  const textStyles = figma.getLocalTextStyles();
  for (const style of textStyles) {
    const role = inferRole(style.name); // "heading" | "body" | "mono" | ...
    tokens.typography[role] = {
      fontFamily: style.fontName.family,
      weights: [style.fontName.style === "Bold" ? 700 : 400],
      scale: [style.fontSize],
    };
  }

  // 3. Logos — find frames marked with pluginData
  const logoFrames = figma.currentPage.findAll(
    (n) => n.getPluginData("framework.kind") === "logo"
  );
  for (const frame of logoFrames) {
    const variant = frame.getPluginData("framework.variant") || "primary";
    tokens.logos.push({ name: frame.name, variant, nodeId: frame.id });
  }

  return tokens;
}

function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function inferRole(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("heading") || lower.includes("display")) return "heading";
  if (lower.includes("mono") || lower.includes("code")) return "mono";
  return "body";
}
```

In `code.ts` — replace `sendToBackend()`:

```ts
const sendBrandTokens = async (tenantSlug: string, publish: boolean) => {
  try {
    figma.ui.postMessage("Extracting tokens…");
    const tokens = await extractBrandTokens();

    figma.ui.postMessage("Pushing to Framework…");
    const result = await api<{ versionNumber: number }>(
      `/brands/${encodeURIComponent(tenantSlug)}/tokens`,
      {
        method: "POST",
        body: JSON.stringify({
          tokens,
          sourceFigmaFileKey: figma.fileKey,
          publish,
        }),
      }
    );

    figma.ui.postMessage(`Published v${result.versionNumber} of ${tenantSlug}`);
  } catch (error) {
    figma.ui.postMessage(`Failed: ${(error as Error).message}`);
  }
};
```

#### 19.2.2 Repurpose "Get or update photos" → push image slots, not brand images
- **File**: `code.ts:70-180` (`getImages`, `retrieveFigmaURL`, `mergeDatas`, `sendImagesDatas`)
- **Behavior change**: image slots are *template* metadata, not *brand* metadata. They belong on `template_versions.layout_schema` (§5), not on a top-level `BrandImages` collection
- **Fix**: defer this button until template-publish flow is ready. For now, gray it out with a "Coming soon" tooltip:

```html
<!-- ui.html -->
<button id="getelement" disabled title="Available after Templates v2 ships">
  2. Get or update photos (coming soon)
</button>
```

Day 8+ (when §15.3.5's `templates` table exists), wire to `POST /api/templates` with `{ figmaFileKey, figmaNodeId, slots: [...] }`.

#### 19.2.3 Add the tenant slug picker
- **File**: `ui.html`
- **Issue**: the plugin currently doesn't ask *which tenant* the brand should publish to. The backend infers from `figma.root.name` which is brittle.
- **Fix** — add a dropdown:

```html
<div>
  <label for="tenant-slug">Publish to brand:</label>
  <select id="tenant-slug"></select>
</div>
<div>
  <label>
    <input type="checkbox" id="publish-now" checked />
    Publish immediately (uncheck to save as draft)
  </label>
</div>
```

```ts
// In code.ts on UI mount, fetch the user's tenants and post them to the UI:
const myTenants = await api<{ slug: string; name: string }[]>("/me/tenants");
figma.ui.postMessage({ type: "tenants", tenants: myTenants });
```

```html
<!-- ui.html script -->
onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (msg?.type === "tenants") {
    const select = document.getElementById("tenant-slug");
    select.innerHTML = msg.tenants.map(t =>
      `<option value="${t.slug}">${t.name}</option>`
    ).join("");
  } else {
    document.getElementById("info").innerText = msg;
  }
};

document.getElementById("create").onclick = () => {
  parent.postMessage({
    pluginMessage: {
      type: "create",
      tenantSlug: document.getElementById("tenant-slug").value,
      publish: document.getElementById("publish-now").checked,
    },
  }, "*");
};
```

This requires a new backend endpoint `GET /api/me/tenants` returning `Tenant[]` for the authenticated user.

---

### 19.3 Bug fixes (Day 5)

#### 19.3.1 The undefined generic `T` in `sendToBackend`
- **File**: `code.ts:181`
- **Issue**: `Promise<T>` — `T` is not declared, causing TS error in strict mode (which `tsconfig.json` enables)
- **Fix**: replaced by 19.2.1 entirely. Until then: `Promise<unknown>`.

#### 19.3.2 `error.message` access on `unknown`
- **Files**: every `catch (error) { ... error.message }` in `code.ts`
- **Issue**: TS 5+ types `error` as `unknown` in strict mode → `.message` access is a compile error
- **Fix**: `(error as Error).message` or proper narrowing:

```ts
catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("…", message);
}
```

#### 19.3.3 `ui.html` line 62 throws on plugin open
- **File**: `ui.html:62-64`
- **Issue**: `document.getElementById("test").onclick = ...` references a button commented out on line 38 → null deref
- **Fix**: delete lines 62-64.

#### 19.3.4 `getElement()` throws if no "Structure" frame
- **File**: `code.ts:50` — `StructureFrame[0].children` on an empty array
- **Fix**:

```ts
function getElement() {
  const StructureFrame = figma.currentPage.findAll(
    (frames) => frames.type === "FRAME" && frames.name === "Structure"
  );
  if (StructureFrame.length === 0) {
    figma.ui.postMessage("No 'Structure' frame found on the current page. Add one and try again.");
    return;
  }
  // ... rest unchanged
}
```

(Defensive — though once 19.2.1 lands, "Structure" is no longer required.)

#### 19.3.5 Mixed-language console output and FR variable names
- **Files**: `code.ts` throughout (`tousLesElements`, `sendToBackend`, `console.log("ici le filekey")`)
- **Fix**: rename to English (`allElements`), drop debug `console.log`s, keep error-level logs only.

---

### 19.4 Quality (Day 6)

| Task | Where |
|---|---|
| Switch build from `tsc` to Vite + `vite-plugin-singlefile` | `package.json`, new `vite.config.ts` |
| Inject `BACKEND_URL`/`PLUGIN_SECRET` via `define` (never commit) | `vite.config.ts` |
| Add proper TypeScript strict mode + lint | `tsconfig.json`, ESLint flat config |
| Replace `<button>`s with shadcn-style design tokens | `ui.html` |
| Add loading + error states with proper aria-live | `ui.html` |
| Add `figma.notify()` for non-modal feedback | `code.ts` |
| Resize the plugin to 480×600 (more breathing room) | `code.ts:228` |
| Localize French strings to English | All files |

---

### 19.5 Cleanup deletes

- `code.ts:1-5` — the "Don't forget the figma token line 116" header comment (the token itself is gone; the warning is no longer needed)
- `code.ts:94-127` — `retrieveFigmaURL` (deleted by 19.1.1)
- `ui.html:62-64` — orphan `#test` click handler
- `ui.html:11` — duplicate `padding` CSS property
- All FR-only `console.log("ici le filekey")`, `("bonjour la page")`, `("Tous les éléments")` — remove

---

### 19.6 Day-by-day (8-day plan)

| Day | PR |
|---|---|
| 1 | 19.1.1 (revoke + remove Figma fetch) + 19.1.2 (plugin secret + Vite build) — **must ship before any plugin redistribution** |
| 2 | 19.2.1 — `extractBrandTokens` walker + new `POST /brands/:slug/tokens` call. Verify against backend §15.3.5 endpoint |
| 3 | 19.2.3 — tenant slug dropdown + `GET /me/tenants` backend route |
| 4 | 19.2.2 — disable "Get or update photos" until templates ship |
| 5 | 19.3 — TS error fixes, ui.html bug fix, defensive Structure check |
| 6 | 19.4 — Vite build, shadcn-style UI, English copy, larger window |
| 7 | 19.5 — cleanup deletes |
| 8 | End-to-end smoke test with 30 70 Agency's Figma file. Confirm tokens land in `BrandTokenVersion` and the Brand Hub at `3070.frame-work.app` reflects them |

End of week: plugin is **secure** (no token), **scoped** (writes to versioned tokens, not deprecated collections), **explicit** (asks which tenant), and **typed** (Vite + strict TS).

---

### 19.7 Stop criteria — when to stop patching v0 generator and rebuild

Patch until:

1. **Designer needs to author templates** (not just brand tokens) — at that point the plugin needs the JSX-emit pipeline (§3.1), which is a structural rewrite. Probably week 5-6 once templates are ready
2. **AI compliance agent needs encoded brand rules** — if Claude needs the brand's `forbidden words`, `clear-space rules`, `voice tone` in structured form, the extractor needs to be richer than what the v0 walker can produce
3. **Multi-page brand books** — the plugin currently only walks `figma.currentPage`. If brands span multiple pages, this is rewrite-territory

Until then: patch.

---

## 20. Reference — `FrameWork-Plugin-main` (v0 runtime plugin), already shipped

What exists today in `FrameWork-Plugin-main.zip`. **This is the most architecturally significant piece of v0** because it embodies the problem identified in §3.1: it's the runtime renderer that depends on a human's open Figma Desktop. Verbatim source plus the **AppleScript + LaunchAgent + Windows-PowerShell automation rig** designed to keep Figma running 24/7.

### 20.0 Filesystem

```
FrameWork-Plugin-main/
├── manifest.json                                    # "FrameWork", same allowedDomains: ["*"] issue
├── code.ts                                          # 363 lines — polling + variable apply + image apply
├── code.js                                          # 310 lines — compiled output, what's actually shipped
├── ui.html                                          # Client picker + Create/Update buttons
├── README.md                                        # Includes the Mac/Windows server setup steps
├── package.json                                     # name: "test1" (sic), tsc + figma plugin typings
├── package-lock.json
├── tsconfig.json                                    # ES6, strict
├── 30 70 agency.otf                                 # Brand font shipped inside the plugin (license unclear)
├── Figma Script.scpt                                # Binary AppleScript — the auto-reload rig
├── reloadplugin.ps1                                 # Windows equivalent — sends Shift+K + Ctrl+Tab
└── public/
    ├── com.usernametochange.scriptlauncher.plist    # macOS LaunchAgent — runs osascript every 600s
    ├── FrameworkCreator.png                         # Docs screenshot
    ├── FrameworkFrame.png                           # Docs screenshot
    ├── FrameworkSection.png                         # Docs screenshot
    ├── mouseMove.png                                # Docs screenshot of Move Mouse setup
    └── PowerToy.png                                 # Docs screenshot of PowerToys keybind
```

**The defining fact of this codebase**: the 5 docs screenshots and the LaunchAgent + AppleScript + PowerShell exist because **Figma Desktop must be open at all times** for any client edit to apply. The user maintains a dedicated Mac (and/or Windows machine) running 24/7 just to keep the plugin alive. This is the central technical debt the v3 architecture eliminates.

---

### 20.1 `manifest.json`

```json
{
  "name": "FrameWork",
  "id": "1301503752675940000",
  "api": "1.0.0",
  "main": "code.js",
  "capabilities": [],
  "enableProposedApi": false,
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": ["*"],
    "reasoning": "Dev phase",
    "devAllowedDomains": ["https://localhost:3000"]
  },
  "ui": "ui.html",
  "enablePrivatePluginApi": true
}
```

**Verdict: refactor.** Same issues as the generator plugin (§18.1):
- `"allowedDomains": ["*"]` blocks Community publication
- `enablePrivatePluginApi: true` should be removed unless we're using a private API

Restrict to `["https://api.frame-work.app", "https://framework-backend.fly.dev"]`.

---

### 20.2 `code.ts` — the polling + apply runtime

```ts
//const BACKENDURL = "http://localhost:3000/api";
const BACKENDURL = "https://framework-backend.fly.dev/api";                     // 🔴 hardcoded prod URL
let datas = {
  FigmaName: figma.root.name,
  FigmaFileKey: figma.fileKey,
  FigmaId: figma.currentPage.id,
  sections: [],
  images: [],
  variables: [],
  usedBy: {},
};

let pollTimeoutId: number | undefined;
const POLL_INTERVAL = 1000;                                                     // 🔴 1-second polling; no jitter, no backoff

let changeDesignStatus;
interface Design {
  hasChanged: boolean;
}

const fetchDesignChange = async (): Promise<Design> => {
  try {
    changeDesignStatus = await fetch(
      `${BACKENDURL}/figma/${datas.FigmaFileKey}/change`                        // 🔴 no auth header — works only because backend is wide-open
    );

    if (!changeDesignStatus.ok) {
      console.error(
        "Error response from server:",
        changeDesignStatus.status,
        changeDesignStatus.statusText
      );
      throw new Error(`Failed to fetch design change. Server returned status ${changeDesignStatus.status}`);
    }

    const responseData = await changeDesignStatus.json();
    return responseData;
  } catch (error) {
    console.error("An error occurred during fetchDesignChange:", error.message || error);  // 🔴 .message on unknown (TS strict error)
    throw new Error("Failed to fetch design change.");
  }
};

const processDesignChange = async (design: Design): Promise<void> => {
  try {
    if (design.hasChanged) {
      console.log("Change detected!", design);
      await makeChangement(design);
    }
  } catch (error) {
    console.error("An error occurred during processDesignChange:", error);
    await fetch(`${BACKENDURL}/figma/error`);                                   // 🔴 fires on any error; backend has no /error route → 404 noise
    throw new Error("Failed to process design change.");
  }
};

const checkIfChanged = async (): Promise<void> => {
  try {
    const design = await fetchDesignChange();
    await processDesignChange(design);
  } catch (error) {
    await fetch(`${BACKENDURL}/figma/error`);                                   // 🔴 hits 404 every error, no exponential backoff
    console.error("An error occurred while making the API call:", error);
  } finally {
    if (datas.FigmaFileKey) {
      pollTimeoutId = setTimeout(checkIfChanged, POLL_INTERVAL);                // 🔴 unconditional re-arm even on persistent failure
    }
  }
};

const clearPollTimeout = (): void => {
  try {
    if (pollTimeoutId !== undefined) {
      clearTimeout(pollTimeoutId);
      pollTimeoutId = undefined;
    }
  } catch (error) {
    console.error("An error occurred during clearPollTimeout:", error);
  }
};

const makeChangement = async (design): Promise<void> => {
  console.log("salut making the change", design);
  editVariables(design.variables);
  findImgAndReplace(design.images);
  settingNonVisibleEmptyText();

  const response = await fetch(
    `${BACKENDURL}/figma/${datas.FigmaFileKey}/changeApplied`,
    { method: "POST" }
  ).then((res) => { return; });
};

const editVariables = (variables: Array<string>): void => {
  const localCollections = figma.variables.getLocalVariableCollections();
  const localStringVariables = figma.variables.getLocalVariables("STRING");     // 🔴 only handles STRING — FLOAT/COLOR/BOOLEAN silently dropped

  localStringVariables.map((e, index) => {
    variables.forEach((item) => {
      if (item.name === e.name) {
        const newValue: VariableValue = item.valuesByMode;
        e.setValueForMode(localCollections[0].modes[0].modeId, newValue);
      }
    });
  });
};

const findImgAndReplace = (images): void => {
  images.map((image) => {
    if (image.hasChanged) {
      const nodes = figma.currentPage.findAll((n) => n.name === image.name);   // 🔴 O(images × nodes) on every change

      figma.createImageAsync(image.url).then(async (image: Image) => {         // ⚠️ Promise not awaited; race possible
        nodes.map((node) => {
          node.fills = [
            { type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" },
          ];
        });
      });
    }
  });
};

const createUI = async (): Promise<void> => {
  const response = await fetch(`${BACKENDURL}/client`, { method: "GET" })       // 🔴 will 401 once §15.1.2 puts /client behind auth
    .then((response) => response.json())
    .then((clientArray) => {
      let clientList: Array<Client> = [];
      clientArray.map((client: any) => {
        clientList.push(client.username);
      });
      figma.showUI(__html__, { width: 400, height: 400, title: "Framework" });
      figma.ui.postMessage(clientList);
      figma.ui.onmessage = (msg) => {
        if (msg.type === "create-framework" || msg.type === "update-framework") {
          const usedBy = clientArray.find((user) => user.username === msg.allValues[0]);
          retrieveAllDatas();
          createOrUpdateDesign(usedBy, msg.type);
        } else if (msg.type === "test") {
          figma.ui.postMessage("Bonjour le message");
        }
      };
    });
};

const createOrUpdateDesign = async (usedBy, msgType) => {
  datas.usedBy = usedBy;
  try {
    let response;
    if (msgType === "create-framework") {
      response = await fetch(`${BACKENDURL}/figma/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datas),
      });
      figma.ui.postMessage("All good");
    } else if (msgType === "update-framework") {
      response = await fetch(`${BACKENDURL}/figma/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datas),
      });
      figma.ui.postMessage("All good");
    }

    if (!response.ok) {
      figma.ui.postMessage(`Failed to create or update. Status code: ${response.status}`);
      throw new Error(`Failed to create of update. Status code: ${response.status}`);
    }
  } catch (error) {
    console.log(error);
  }
};

function settingNonVisibleEmptyText() {
  const texts = figma.currentPage.findAll((text) => text.type === "TEXT");
  texts.map((text) => {
    if (text.characters === " " || text.characters === "") {
      text.visible = false;                                                     // ⚠️ side-effect: changes designer's intent
    } else {
      text.visible = true;
    }
  });
}

const retrieveAllDatas = async (): Promise<void> => {
  datas = {
    FigmaName: figma.root.name,
    FigmaFileKey: figma.fileKey,
    FigmaId: figma.currentPage.id,
    sections: [],
    images: [],
    variables: [],
    usedBy: {},
  };

  const sections = figma.currentPage.findAll((section) => section.type === "SECTION");
  sections.forEach((section) => {
    const sectionData = {
      type: "SECTION", name: section.name, id: section.id, frames: [],
    };
    const frames = section.children;
    frames.forEach((frame) => {
      const frameData = {
        type: "FRAME",
        sectionName: section.name,
        frameName: frame.name,
        frameId: frame.id,
      };
      sectionData.frames.push(frameData);
    });
    datas.sections.push(sectionData);
  });

  const images = figma.currentPage.findAll((image) => image.name.includes("EditImg"));
  images.forEach((image) => {
    datas.images.push({ type: "IMAGE", name: image.name, id: image.id });
  });

  const textVariables = figma.variables.getLocalVariables("STRING");
  textVariables.forEach((text) => {
    datas.variables.push({
      type: "TEXT",
      name: text.name,
      valuesByMode: Object.values(text.valuesByMode)[0],
      id: text.id,
    });
  });

  const floatVariables = figma.variables.getLocalVariables("FLOAT");
  floatVariables.forEach((float) => {
    datas.variables.push({
      type: "FLOAT", name: float.name,
      valuesByMode: Object.values(float.valuesByMode)[0], id: float.id,
    });
  });

  const colorVariables = figma.variables.getLocalVariables("COLOR");
  colorVariables.forEach((color) => {
    datas.variables.push({
      type: "COLOR", name: color.name,
      valuesByMode: Object.values(color.valuesByMode)[0], id: color.id,
    });
  });

  const boolVariables = figma.variables.getLocalVariables("BOOLEAN");
  boolVariables.forEach((bool) => {
    datas.variables.push({
      type: "BOOLEAN", name: bool.name,
      valuesByMode: Object.values(bool.valuesByMode)[0], id: bool.id,
    });
  });
};

console.log("🛠️ Starting the plugin 🛠️");
retrieveAllDatas();
createUI();
checkIfChanged();
```

**Verdict: refactor for the bridge phase, then delete entirely.** Issues marked above. Six are critical:

1. **Hardcoded prod URL** (line 2) — switch to Vite-injected `__BACKEND_URL__`
2. **No auth header on any call** — once backend §15.1.2 lands, every endpoint here 401s. Must add `X-Framework-Plugin-Secret` to every fetch
3. **`createUI` fetches `/client`** which is moving behind auth (§15.1.2). Either add the plugin secret OR repoint to a new public `/api/me/tenants`
4. **1-second polling forever** — replace with exponential-backoff on error, or with WebSocket (preferred)
5. **`editVariables` only handles STRING** — FLOAT/COLOR/BOOLEAN are scraped (lines 322-353) but never re-applied. Customer text-based edits work; numeric/color/boolean edits are silent no-ops
6. **`error.message` access on `unknown`** — TS strict compile error (in `tsconfig.json:5`)

Three structural ones for the eventual deletion:

7. **Backbone of v0's "Figma desktop is the renderer" architecture** — once Satori at edge ships (§3.1), this entire codebase is unnecessary
8. **`settingNonVisibleEmptyText()` mutates the designer's file** by toggling visibility — destructive, undoes intent on next render
9. **The whole "datas" map is regenerated every save**, repopulating `figma.fileKey`, `currentPage.id`, etc. — bug-prone if the user changes pages mid-edit

---

### 20.3 `ui.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Framework Creator</title>
    <style>
      body {
        background-color: rgba(255, 255, 255, 0.13);
        font-family: "Poppins", sans-serif;                                     /* Poppins not loaded */
      }
      button {
        padding: 8px 16px;
        margin-bottom: 8px;
        padding: 0.5rem;                                                        /* duplicate property */
        border: 0;
        background-color: black;
        color: white;
        border-radius: 0.2rem;
        text-align: left;
      }
      select {
        font-size: 0.7rem;
        font-family: plain;                                                     /* "plain" not loaded as a webfont */
        padding: 0.25rem;
        box-sizing: border-box;
        border: 1px solid #a7a7a7;
        border-radius: 0.25rem;
      }
    </style>
  </head>
  <body>
    <h2>Framework Creator</h2>
    <p>
      Client:
      <select id="client" value=""></select>
    </p>
    <button id="create">Create</button>
    <button id="update">Update</button>
    <!-- <button id="test">test</button> -->
    <p id="info"></p>
    <script>
      onmessage = (event) => {
        if (typeof event.data.pluginMessage === "string") {
          document.getElementById("info").innerText = event.data.pluginMessage;
        } else {
          event.data.pluginMessage.forEach((client) => {
            document.getElementById("client").add(new Option(client));
          });
        }
      };

      document.getElementById("create").onclick = () => {
        const allValues = [document.getElementById("client").value];
        parent.postMessage({ pluginMessage: { type: "create-framework", allValues } }, "*");
      };
      document.getElementById("update").onclick = () => {
        const allValues = [document.getElementById("client").value];
        parent.postMessage({ pluginMessage: { type: "update-framework", allValues } }, "*");
      };
      document.getElementById("test").onclick = () => {                          // 🔴 #test button is commented out → null deref
        parent.postMessage({ pluginMessage: { type: "test" } }, "*");
      };
    </script>
  </body>
</html>
```

**Verdict: refactor.** Same `#test` null-deref bug as the generator plugin (§18.3). The CSS uses `font-family: plain` which expects a webfont named "plain" that isn't loaded — falls back silently. The "Client" `<select>` has `value=""` on an empty `<select>` which is meaningless. Replace with a proper Preact + Tailwind UI in v3.

---

### 20.4 `Figma Script.scpt` (binary AppleScript) — **the auto-reload rig**

The `.scpt` file is binary. The readable form (from README + decoded payload):

```applescript
# Runs every 600 seconds via LaunchAgent (com.usernametochange.scriptlauncher.plist)
repeat
  tell application "Figma" to activate
  tell application "System Events"
    # Code to switch tab (commented in repeat loop, uncommented in trailer)
    # key code 48 using control down
    delay 13
    # Code to restart the plugin: Cmd+Option+P
    key code 35 using {command down, option down}
    delay 15
  end tell
end repeat

# After repeat ends — final tab switch back to first project
# tell application "System Events"
#   key code 48 using control down
#   delay 3
# end tell
```

**Verdict: discard with the runtime plugin.** This script:
- Activates Figma every 13 seconds
- Sends Cmd+Option+P (the keybind for "restart last plugin")
- Loops indefinitely
- Triggered every 600 seconds by a LaunchAgent

It is a literal **hack to keep a Figma plugin alive on a server** because Figma plugins die after periods of inactivity. Once §3.1's JSX runtime ships, this entire mechanism — AppleScript + LaunchAgent + the dedicated Mac — gets retired.

---

### 20.5 `reloadplugin.ps1` — the Windows equivalent

```powershell
$numberOfProject = 3

$wsh = New-Object -ComObject WScript.Shell

# Make sure Figma is open on the 3070 project, or edit accordingly
$wsh.AppActivate('3070 - Figma')                                                # 🔴 hardcoded "3070" tab name

for ($i = 0; $i -lt $numberOfProject; $i++) {
  sleep 5

  Add-Type -AssemblyName System.Windows.Forms

  # Sending Shift+K key to reload the plugin
  [System.Windows.Forms.SendKeys]::SendWait('+K')
  sleep 5

  # Switching tab to another project
  [System.Windows.Forms.SendKeys]::SendWait('^{TAB}')
}
sleep 2

# Because the loop ends on the starting page of figma we have to change tab a last time
[System.Windows.Forms.SendKeys]::SendWait('^{TAB}')
```

**Verdict: discard with the runtime plugin.** Driven by **Move Mouse** (free Windows tool that prevents idle) every 30 seconds, plus **Microsoft PowerToys** to map the keystroke. Hardcodes the tab name `'3070 - Figma'` — only works for one specific brand. Documents itself in the README:

> Since the plugin is designed to run on a windows, you need to also to:
> - Install Move Mouse to run the reloadplugin.ps1 every 30 seconds
> - Install PowerToy to edit a keyboard shortcut
> - Configure Windows to prevent it to go to sleep/lock

This is the operational symptom of the architectural problem.

---

### 20.6 `public/com.usernametochange.scriptlauncher.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.damien.scriptlauncher</string>
    <key>Program</key>
    <string>/usr/bin/osascript</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/osascript</string>
        <string>/Users/damien/Documents/ScriptFigma.scpt</string>                <!-- 🔴 hardcoded user path -->
    </array>
    <key>StartInterval</key>
    <integer>600</integer>                                                       <!-- every 10 minutes -->
</dict>
</plist>
```

**Verdict: discard with the runtime plugin.** The hardcoded `/Users/damien/...` path means this only works on Damien's exact Mac. The filename is `com.usernametochange.scriptlauncher.plist` — the README literally says to rename it before installing.

---

### 20.7 `package.json` + `tsconfig.json`

```json
{
  "name": "test1",                                                              // 🔴 placeholder name shipped to prod
  "version": "1.0.0",
  "description": "Your Figma Plugin",
  "main": "code.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "watch": "npm run build -- --watch"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.80.0",
    "typescript": "*"
  }
}
```

```json
// tsconfig.json — identical to generator plugin
{
  "compilerOptions": {
    "target": "es6",
    "lib": ["es6"],
    "strict": true,
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"]
  }
}
```

**Verdict: refactor.** Same `tsc → Vite + plugin-singlefile` migration as the generator (§18.4). Rename `"test1"` to `@framework/plugin-runtime`.

---

### 20.8 `30 70 agency.otf` — bundled brand font

A 22 KB OpenType font shipped inside the plugin zip. Likely "30 70 Agency" custom font for the pilot brand. **License unclear** — if it's a proprietary foundry font, redistributing it inside a Figma plugin .zip exceeds most webfont licenses. **Audit license attestation before any further distribution.**

In v3 (§3.3), brand fonts move to per-tenant R2 storage with explicit license attestation, never bundled with the plugin.

---

### 20.9 The bigger picture — what this plugin's polling-and-apply flow becomes

```
┌────────────────────────────────────────────────────────────────────────┐
│ TODAY (v0)                                                             │
│                                                                        │
│ Frontend → PATCH /api/designs/:id → Mongo: hasChanged=true             │
│   ↓                                                                    │
│ [WAIT — frontend polls Mongo every 1s up to 10 times]                  │
│   ↓                                                                    │
│ FrameWork-Plugin-main (running in Damien's Mac, 24/7)                  │
│   ↓ polls GET /api/figma/:fileKey/change every 1s                      │
│   ↓ sees hasChanged=true                                               │
│   ↓ applies via figma.variables.setValueForMode + createImageAsync     │
│   ↓ POST /api/figma/:fileKey/changeApplied                             │
│   ↓ Mongo: hasChanged=false, isOkToDownload=true                       │
│   ↓                                                                    │
│ Frontend's poll loop sees isOkToDownload=true → fetches Figma SVG      │
│                                                                        │
│ Total round-trip: 5–15 seconds. Requires a human's open Figma.         │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ V3 (after §3.1)                                                        │
│                                                                        │
│ Frontend → POST /api/exports {compositionId, slot values}              │
│   ↓                                                                    │
│ Backend renders <TemplateRenderer> via Satori → PNG/SVG → R2           │
│   ↓ (~150ms)                                                           │
│ Backend returns signed URL                                             │
│                                                                        │
│ Total: ~200ms. No human Figma. No polling.                             │
│ FrameWork-Plugin-main DOES NOT EXIST in v3.                            │
└────────────────────────────────────────────────────────────────────────┘
```

This codebase is **the only one of the four v0 zips that does not survive into v3**. The backend gets refactored, the frontend gets refactored, the generator plugin gets repurposed — but the runtime plugin is replaced by a render function on a server.

The upgrade plan (§21) therefore has a different shape: **harden it for the bridge phase** (until JSX runtime ships), then **delete the entire codebase + the AppleScript rig + the dedicated Mac**.

---

## 21. Upgrade-in-place plan — make `FrameWork-Plugin-main` work properly (until it gets deleted)

This codebase is on a death-row timer. Every patch must be cheap because the whole repo gets retired in 6–10 weeks once §3.1 (JSX runtime) lands. **Spend zero hours on quality work that won't pay back before deletion.**

### 21.0 Pre-work (Day 0 — 15 minutes)

1. Unzip `FrameWork-Plugin-main.zip` into `apps/plugin-runtime/` in the monorepo
2. `npm install`
3. Verify `npm run build` produces a `code.js`
4. In Figma: import the manifest, confirm the plugin opens against staging backend
5. Initial commit: `chore: import v0 runtime plugin verbatim`
6. **Tag this commit `v0-runtime-final`** — that's the version the AppleScript-launched Mac currently runs against. Don't break it.

---

### 21.1 Critical security (Day 1 — must ship in coordination with backend §15.1.2)

#### 21.1.1 Add plugin shared-secret auth on every backend call
- **Files**: `code.ts:25, 60, 96, 163, 202, 212` (every `fetch(\`${BACKENDURL}/...\`)`)
- **Issue**: identical to generator plugin §19.1.2 — when backend §15.1.2 lands, every call here 401s
- **Fix**: same `api()` helper pattern as §19.1.2 — Vite injects `__PLUGIN_SECRET__` at build, every fetch sends `X-Framework-Plugin-Secret`. Code:

```ts
declare const __BACKEND_URL__: string;
declare const __PLUGIN_SECRET__: string;

const BACKENDURL = __BACKEND_URL__;

async function pluginFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BACKENDURL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Framework-Plugin-Secret": __PLUGIN_SECRET__,
      ...(init.headers || {}),
    },
  });
}
```

Replace every `fetch(\`${BACKENDURL}/...\`)` with `pluginFetch(...)`. Ship simultaneously with backend §15.1.2 to avoid breaking the production rig.

#### 21.1.2 Audit / replace the bundled `30 70 agency.otf`
- **File**: `30 70 agency.otf` at repo root
- **Issue**: redistributing a custom foundry font inside a plugin zip likely violates most webfont licenses. The plugin store also forbids fonts in plugin packages
- **Fix**:
  - **Short-term**: confirm with Basile + 30 70 the font's license. If it's a private brand font commissioned for the agency, owned by them, attestation is fine. If it's a third-party foundry font — remove from the plugin
  - **Long-term**: fonts move to the per-tenant R2 store (§3.3); plugin never bundles them

This does not require a plugin code change — just removing the file from the next build and confirming Figma can still resolve the font from the user's locally-installed system fonts.

---

### 21.2 Behavior fixes (Days 2–3 — keep the rig working)

#### 21.2.1 `createUI` fetch of `/client` will 401 after §15.1.2
- **File**: `code.ts:163`
- **Issue**: with §21.1.1 the call now sends the plugin secret, so it'll succeed. But returning the full Client list to a plugin is overkill. Replace with a public read-only `/api/brands?manageable=true` listing tenants the plugin can publish to (mirrors §19.2.3)
- **Fix**:

```ts
const createUI = async (): Promise<void> => {
  try {
    const r = await pluginFetch("/brands?usable=true");
    if (!r.ok) throw new Error(`Failed to load brands (${r.status})`);
    const brands: { slug: string; name: string }[] = await r.json();

    figma.showUI(__html__, { width: 400, height: 400, title: "Framework" });
    figma.ui.postMessage({ type: "brands", brands });

    figma.ui.onmessage = (msg) => {
      if (msg.type === "create-framework" || msg.type === "update-framework") {
        const targetBrand = brands.find((b) => b.slug === msg.brandSlug);
        retrieveAllDatas();
        createOrUpdateDesign(targetBrand, msg.type);
      }
    };
  } catch (error) {
    figma.notify(`Failed to load brands: ${(error as Error).message}`, { error: true });
    figma.closePlugin();
  }
};
```

ui.html updates to expect `{type: "brands", brands}` instead of a raw array, and posts `brandSlug` instead of `allValues`.

#### 21.2.2 Fix `editVariables` to handle FLOAT, COLOR, BOOLEAN
- **File**: `code.ts:108-131`
- **Issue**: only handles STRING — numeric/color/boolean edits are silent no-ops in v0
- **Fix**:

```ts
const editVariables = (variables: Array<any>): void => {
  const localCollections = figma.variables.getLocalVariableCollections();
  if (localCollections.length === 0) return;
  const modeId = localCollections[0].modes[0].modeId;

  const allLocals = [
    ...figma.variables.getLocalVariables("STRING"),
    ...figma.variables.getLocalVariables("FLOAT"),
    ...figma.variables.getLocalVariables("COLOR"),
    ...figma.variables.getLocalVariables("BOOLEAN"),
  ];

  // Build a name → variable map once
  const byName = new Map(allLocals.map((v) => [v.name, v]));

  for (const item of variables) {
    const target = byName.get(item.name);
    if (!target) continue;
    try {
      target.setValueForMode(modeId, item.valuesByMode);
    } catch (error) {
      console.error(`Failed to set ${item.name}:`, (error as Error).message);
    }
  }
};
```

This unlocks numeric / color / boolean edits end-to-end without changing the protocol.

#### 21.2.3 Add exponential backoff on poll failures
- **File**: `code.ts:65-78`
- **Issue**: 1s polling forever; on backend outage, plugin hammers the dead endpoint indefinitely
- **Fix**:

```ts
let consecutiveFailures = 0;
const MAX_INTERVAL = 30_000;

const checkIfChanged = async (): Promise<void> => {
  let interval = POLL_INTERVAL;
  try {
    const design = await fetchDesignChange();
    await processDesignChange(design);
    consecutiveFailures = 0;                                                    // reset on success
  } catch (error) {
    consecutiveFailures++;
    interval = Math.min(POLL_INTERVAL * 2 ** consecutiveFailures, MAX_INTERVAL);
    console.error(`Poll failed (${consecutiveFailures}x), next in ${interval}ms`);
  } finally {
    if (datas.FigmaFileKey) {
      pollTimeoutId = setTimeout(checkIfChanged, interval) as unknown as number;
    }
  }
};
```

Removes the noisy `/figma/error` fetch (which 404s anyway because backend has no such route, only a one-line "we're alive on /error" handler).

#### 21.2.4 Stop calling `/figma/error` (the 404 noise)
- **Files**: `code.ts:60, 71`
- **Fix**: delete both `await fetch(\`${BACKENDURL}/figma/error\`)` calls. They've never done anything useful. Remove the corresponding (no-op) `GET /figma/error` route from backend `figma.routes.js:115-118` while you're at it.

#### 21.2.5 Don't mutate the designer's text-visibility intent
- **File**: `code.ts:236-249` (`settingNonVisibleEmptyText`)
- **Issue**: walks every text node and toggles `visible = false/true` based on emptiness — this stomps the designer's intentional layout decisions
- **Fix**: scope to only the texts that the runtime actually edited:

```ts
function hideEmptyEditedTexts(editedNodeIds: string[]) {
  for (const id of editedNodeIds) {
    const node = figma.getNodeById(id);
    if (!node || node.type !== "TEXT") continue;
    const t = node as TextNode;
    if (t.characters === "" || t.characters === " ") t.visible = false;
  }
}
```

Track the IDs the plugin just touched; pass them in. Stop iterating the whole page.

#### 21.2.6 TS strict-mode error fixes
- **Files**: `code.ts:46, 232, 70, 87`
- **Issue**: `error.message` access on `unknown`, `Image` shadows `lib.dom.Image`, etc.
- **Fix**: use `(error as Error).message`, alias `import { Image as FigmaImage } from "@figma/plugin-typings"` (or just `figma.Image` is fine since the variable is local).

#### 21.2.7 Fix the orphaned `#test` button click handler
- **File**: `ui.html:75-77`
- **Issue**: identical to §19.3.3 — references commented-out button → null deref on plugin open
- **Fix**: delete lines 75-77.

---

### 21.3 Operational fixes (Day 4)

#### 21.3.1 Replace polling with WebSocket — **OPTIONAL**, only if §3.1 isn't shipping in 4 weeks
- **Decision criterion**: if v3 JSX runtime is on track to ship within 4 weeks, **skip this** — don't invest in WebSocket plumbing that gets thrown away. Polling + backoff is good enough as a bridge.
- **If you do it**: Supabase Realtime channel on the design row. Plugin subscribes; backend INSERT/UPDATE on `compositions` triggers a push. Plugin applies, posts back via standard HTTP. Reduces poll storm from N×1Hz to zero idle bandwidth.

#### 21.3.2 Document the AppleScript rig — don't fix it, just label it
- **Files**: `Figma Script.scpt`, `reloadplugin.ps1`, `public/com.usernametochange.scriptlauncher.plist`
- **Issue**: hardcoded paths (`/Users/damien/Documents/ScriptFigma.scpt`), hardcoded tab names (`3070 - Figma`), magic interval (600s), label `com.damien.scriptlauncher` — the rig only works on Damien's exact machine
- **Fix**: don't fix the rig. **Document its end-of-life in a top-of-repo `OPS.md`**:

```md
# Ops — runtime plugin "always-on Figma" rig

**Status**: bridge solution. Will be deleted when v3 JSX runtime (BRIEF.md §3.1) ships.

## What it does
A dedicated Mac (Damien's, currently) runs Figma Desktop 24/7 with the plugin loaded.
A LaunchAgent triggers `osascript ScriptFigma.scpt` every 600s.
The script presses Cmd+Option+P to keep the plugin alive.
This is the only reason customer edits get applied to Figma.

## Failure modes
- Mac restarts → plugin dies → all client edits queue up
- Figma Desktop updates → plugin needs manual reimport
- Damien's session logs out → silent failure
- Move Mouse on the Windows mirror runs out of license → silent failure

## Monitoring
Backend `/api/figma/healthz` (BRIEF.md §15.2.3) returns 503 if no plugin
poll has happened in 30+ minutes. Better Uptime checks every minute.
On 503, page Damien + Jean.

## When to delete this entire rig
When v3 ships and the runtime plugin is decommissioned, delete:
- This Mac's LaunchAgent
- `Figma Script.scpt`, `reloadplugin.ps1`, `*.plist`
- The Windows machine + Move Mouse + PowerToys setup
- This whole directory
```

That's the most valuable hour you can spend on this codebase: making sure the next person knows *why* the AppleScript exists and *when* to delete it.

---

### 21.4 Quality (skip)

For this codebase: skip everything that doesn't impact the bridge. **Do not** invest in TS strict mode beyond the compile-error fixes, **do not** rewrite the UI in shadcn, **do not** add tests. The codebase is going to be deleted in 6–10 weeks; ROI on quality work is negative.

The only "quality" item that pays back: the §21.2.2 variable-handler fix for FLOAT/COLOR/BOOLEAN, because it unlocks customer feature use today (numeric/color edits) without waiting for v3.

---

### 21.5 Cleanup (Day 5)

- **`reloadplugin.ps1`** — keep until Windows mirror is decommissioned
- **`Figma Script.scpt` + `com.usernametochange.scriptlauncher.plist`** — keep until Mac mirror is decommissioned, but rename plist label from `com.damien.scriptlauncher` → `app.frame-work.runtime-keepalive` and parameterize the user path via `~`
- **`public/FrameworkCreator.png`, `FrameworkSection.png`, `FrameworkFrame.png`, `mouseMove.png`, `PowerToy.png`** — keep, they document the rig
- **`30 70 agency.otf`** — remove (see §21.1.2)
- **`code.js`** — remove from git, regenerate via build (already in `.gitignore` for the generator, missing here)
- **`package.json` `"name": "test1"`** — rename to `@framework/plugin-runtime`
- **`<button id="test">` orphan handler** in `ui.html` — delete

---

### 21.6 Day-by-day (5-day plan)

| Day | PR |
|---|---|
| 1 | 21.1.1 (plugin secret on every fetch) — must coordinate-deploy with backend §15.1.2 |
| 2 | 21.1.2 (audit OTF) + 21.2.1 (`/client` → `/brands` repoint) + 21.2.7 (#test handler) |
| 3 | 21.2.2 (handle FLOAT/COLOR/BOOLEAN) + 21.2.3 (exponential backoff) + 21.2.4 (drop /figma/error) |
| 4 | 21.2.5 (scoped visibility) + 21.2.6 (TS errors) + 21.5 (cleanup) |
| 5 | Write `OPS.md` (§21.3.2). Run end-to-end smoke test on Damien's Mac. Document the JSX-runtime cutover plan. |

---

### 21.7 Stop criteria — when to delete this entire codebase

The cleanest of all the stop criteria — there's only one trigger, and it's the same as §3.1:

> **When the v3 JSX runtime ships** and a brand client can render an Instagram post via Satori at edge in <200ms without Figma Desktop being open anywhere on earth, this entire codebase + the AppleScript + the LaunchAgent + the Windows-PowerShell + the Move Mouse + the dedicated server Mac all get retired in one PR.

That PR is one of the most cathartic moments of the rebuild. **Mark the calendar.**

Until then: patch, monitor, and keep Damien's Mac plugged in.

---

## 22. Master roadmap — unified plan across all four codebases

This section consolidates §15 (backend), §17 (frontend), §19 (generator plugin), §21 (runtime plugin) into one execution timeline, plus the **Figma → React layout pipeline** that is the load-bearing technical bet of the entire rebuild.

### 22.0 The single insight

> **The generator plugin is the linchpin.** Once it can emit a faithful React component from a Figma frame — preserving auto-layout, constraints, sizing, brand tokens, and slot annotations — every other piece of v3 falls into place: the editor renders sub-50ms, exports run in Satori at the edge, motion freezes from the same component, AI compliance reads the same schema. Without that pipeline, v3 doesn't exist.

This is the deepest engineering problem in the rebuild. §22.1 is the spec. The rest of §22 is the surrounding sequencing.

---

### 22.1 The Figma → React auto-layout pipeline (the engineering core)

Three-layer architecture:

```
LAYER 1: AUTHORING            (designer in Figma, slow OK)
  Figma file with explicit pluginData tags
            ↓
  Generator plugin walks tree
            ↓
LAYER 2: COMPILATION          (one-shot per template publish, server-side)
  Backend receives node IDs + tags
            ↓
  Backend calls Figma Dev Mode REST API for measurements
            ↓
  Backend emits LayoutSchema + SlotSchema → stored in Postgres
            ↓
LAYER 3: RUNTIME              (every keystroke + every export, must be fast)
  <TemplateRenderer schema={...} values={...} brand={...} />
    ↓ for browser editor preview: native React render, <50ms
    ↓ for export: same component into Satori → SVG → PNG, ~150ms
    ↓ for motion freeze frame: same component into Remotion, ~3s for MP4
```

#### 22.1.1 Designer convention — explicit tags, no name-substring magic

The designer right-clicks a node in Figma → "Framework: Mark as Template" / "Framework: Mark as Slot". This sets `pluginData`:

| pluginData key | Values | Where applied |
|---|---|---|
| `framework.kind` | `template` \| `slot` \| `logo` \| `decorative` | Root frames + editable elements |
| `framework.slot` | `main-text` \| `secondary-text` \| `main-image` \| `date` \| custom | On nodes marked `slot` |
| `framework.format` | `1:1` \| `9:16` \| `16:9` \| `4:5` \| `3:4` (multiple, comma-sep) | On `template` root |
| `framework.constraint` | JSON: `{maxChars,minFontSize,autoShrink,required}` | On `slot` nodes |
| `framework.brandTokenRef` | `brand.color.primary` \| `brand.font.heading` \| `brand.logo.primary` | On nodes that should resolve from tokens |

**Why pluginData over name-substring matching:**
- Survives layer renames
- Designer can rename freely without breaking the contract
- Explicit, queryable, auditable
- Tags are private to the plugin (don't pollute the layers panel)

#### 22.1.2 Plugin extraction — what gets emitted

The generator walks the Figma tree once and emits a structured `TemplateExport`:

```ts
type TemplateExport = {
  // Source identity
  figmaFileKey: string;
  figmaNodeId: string;        // The template root frame's id
  templateName: string;
  formats: Format[];          // ["1:1", "9:16", "16:9"]
  
  // The layout tree
  layout: LayoutNode;
  
  // The editable surface
  slots: SlotDefinition[];
  
  // What we need from the backend to compile
  measurementRequest: {
    nodeIds: string[];        // For Figma Dev Mode REST call
  };
  
  // Brand-token references seen in this template
  tokenRefs: string[];        // ["brand.color.primary", "brand.font.heading", ...]
};

type LayoutNode =
  | FrameNode | TextNode | ImageNode | LogoNode | ShapeNode | GroupNode;

type FrameNode = {
  kind: "frame";
  id: string;
  layout: AutoLayoutSpec;
  style: FrameStyleSpec;
  children: LayoutNode[];
};

type AutoLayoutSpec = {
  mode: "horizontal" | "vertical" | "absolute";
  itemSpacing: number;        // → CSS gap
  padding: { top: number; right: number; bottom: number; left: number };
  primaryAlign: "start" | "center" | "end" | "space-between";  // → justify-content
  counterAlign: "start" | "center" | "end" | "stretch";        // → align-items
  sizingPrimary: "fixed" | "fill" | "hug";                     // → width or flex
  sizingCounter: "fixed" | "fill" | "hug";                     // → height or align-self
  width?: number;             // when sizingPrimary = "fixed"
  height?: number;            // when sizingCounter = "fixed"
};

type TextNode = {
  kind: "text";
  id: string;
  slot?: string;              // present if marked as a slot
  defaultText: string;        // fallback when slot value is empty
  style: {
    tokenRef?: string;        // "brand.font.heading" — resolves at render
    fontSize: number;
    weight: number;
    letterSpacing: number;
    lineHeight: number;
    color: string | { tokenRef: string };
    textAlign: "left" | "center" | "right" | "justify";
    textTransform: "none" | "uppercase" | "lowercase";
  };
  constraints?: {
    maxChars?: number;
    minFontSize?: number;     // for autoShrink
    autoShrink?: boolean;
    required?: boolean;
  };
};

type ImageNode = {
  kind: "image";
  id: string;
  slot?: string;
  defaultR2Key?: string;
  style: {
    width: number;
    height: number;
    fit: "cover" | "contain";
    radius: number;           // border-radius
    aspectRatio?: number;
  };
};

type LogoNode = {
  kind: "logo";
  id: string;
  variant: "primary" | "wordmark" | "symbol" | "monochrome" | "inverted";
  style: { width: number; height: number };
};

type ShapeNode = {
  kind: "shape";
  id: string;
  shape: "rect" | "ellipse" | "path";
  pathData?: string;          // SVG path 'd' for shape="path"
  style: {
    width: number;
    height: number;
    fill?: string | { tokenRef: string };
    stroke?: { color: string | { tokenRef: string }; width: number };
    radius?: number;          // for rect
  };
};

type GroupNode = {
  kind: "group";
  id: string;
  children: LayoutNode[];
};

type SlotDefinition =
  | { key: string; label: string; type: "text"; constraints: TextConstraints; default?: string }
  | { key: string; label: string; type: "image"; constraints: ImageConstraints; default?: string }
  | { key: string; label: string; type: "choice"; options: { value: string; label: string }[]; default?: string }
  | { key: string; label: string; type: "color"; constraints: { paletteOnly: boolean }; default?: string };
```

The plugin walker (TypeScript, runs inside Figma):

```ts
async function walkNode(node: SceneNode, ctx: WalkContext): Promise<LayoutNode | null> {
  // Read pluginData tags
  const kind = node.getPluginData("framework.kind"); // "template" | "slot" | "logo" | "decorative" | ""
  if (kind === "decorative") return null;            // skip; designer marked as ignored

  // Logo nodes — resolved from brand tokens at runtime
  if (kind === "logo") {
    const variant = (node.getPluginData("framework.brandTokenRef") || "primary").replace("brand.logo.", "");
    return {
      kind: "logo",
      id: node.id,
      variant,
      style: { width: node.width, height: node.height },
    };
  }

  // Text nodes
  if (node.type === "TEXT") {
    const slot = node.getPluginData("framework.slot") || undefined;
    const constraintRaw = node.getPluginData("framework.constraint");
    const constraints = constraintRaw ? JSON.parse(constraintRaw) : undefined;
    const tokenRef = node.getPluginData("framework.brandTokenRef") || undefined;
    return {
      kind: "text",
      id: node.id,
      slot,
      defaultText: (node as TextNode).characters,
      style: {
        tokenRef,
        fontSize: (node as TextNode).fontSize as number,
        weight: typeof (node as TextNode).fontName === "object"
          ? weightFromStyle((node as TextNode).fontName.style)
          : 400,
        letterSpacing: ((node as TextNode).letterSpacing as { value: number }).value || 0,
        lineHeight: ((node as TextNode).lineHeight as { value: number }).value || 1.2,
        color: extractFillColor((node as TextNode).fills) || "#000000",
        textAlign: (node as TextNode).textAlignHorizontal.toLowerCase() as any,
        textTransform: (node as TextNode).textCase === "UPPER" ? "uppercase" : "none",
      },
      constraints,
    };
  }

  // Frames with auto-layout
  if (node.type === "FRAME" || node.type === "COMPONENT") {
    const f = node as FrameNode;
    const children = (await Promise.all(
      (f.children || []).map((c) => walkNode(c, ctx))
    )).filter(Boolean) as LayoutNode[];

    return {
      kind: "frame",
      id: node.id,
      layout: extractAutoLayout(f),
      style: extractFrameStyle(f),
      children,
    };
  }

  // Image fills on rectangles → image slots
  if (node.type === "RECTANGLE" && hasImageFill(node)) {
    const slot = node.getPluginData("framework.slot") || undefined;
    return {
      kind: "image",
      id: node.id,
      slot,
      style: {
        width: node.width,
        height: node.height,
        fit: "cover",
        radius: (node as RectangleNode).cornerRadius as number || 0,
      },
    };
  }

  // Shapes
  if (["RECTANGLE", "ELLIPSE", "VECTOR"].includes(node.type)) {
    return extractShape(node);
  }

  // Groups — flatten through
  if (node.type === "GROUP") {
    const children = (await Promise.all(
      (node as GroupNode).children.map((c) => walkNode(c, ctx))
    )).filter(Boolean) as LayoutNode[];
    return { kind: "group", id: node.id, children };
  }

  return null;
}

function extractAutoLayout(frame: FrameNode): AutoLayoutSpec {
  if (frame.layoutMode === "NONE") {
    return {
      mode: "absolute",
      itemSpacing: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAlign: "start", counterAlign: "start",
      sizingPrimary: "fixed", sizingCounter: "fixed",
      width: frame.width, height: frame.height,
    };
  }
  return {
    mode: frame.layoutMode === "HORIZONTAL" ? "horizontal" : "vertical",
    itemSpacing: frame.itemSpacing,
    padding: {
      top: frame.paddingTop, right: frame.paddingRight,
      bottom: frame.paddingBottom, left: frame.paddingLeft,
    },
    primaryAlign: mapPrimary(frame.primaryAxisAlignItems),
    counterAlign: mapCounter(frame.counterAxisAlignItems),
    sizingPrimary: mapSizing(frame.layoutSizingHorizontal),
    sizingCounter: mapSizing(frame.layoutSizingVertical),
    width: frame.layoutSizingHorizontal === "FIXED" ? frame.width : undefined,
    height: frame.layoutSizingVertical === "FIXED" ? frame.height : undefined,
  };
}

function mapPrimary(v: string): AutoLayoutSpec["primaryAlign"] {
  switch (v) {
    case "MIN": return "start";
    case "CENTER": return "center";
    case "MAX": return "end";
    case "SPACE_BETWEEN": return "space-between";
    default: return "start";
  }
}

function mapSizing(v: string): "fixed" | "fill" | "hug" {
  if (v === "FILL") return "fill";
  if (v === "HUG") return "hug";
  return "fixed";
}
```

#### 22.1.3 Backend compile — measurements + brand-token resolution

The plugin POSTs the `TemplateExport` to `POST /api/templates/:slug`. The backend:

1. Validates with Zod (matches the Drizzle schema in §5)
2. Calls Figma Dev Mode REST API for any layout details that need pixel-perfect verification:
   ```
   GET /v1/files/:fileKey/nodes?ids=<comma-separated>
   ```
   This returns each node's `absoluteBoundingBox`, `effects`, `fills`, `strokes`. We use it to cross-check the plugin's emitted style and catch divergences.
3. Resolves brand-token refs:
   ```ts
   const tokens = await getBrandTokens(brandId, "latest-published");
   const compiledLayout = resolveTokenRefs(export.layout, tokens);
   ```
4. Renders one-shot preview thumbnails for the editor template grid:
   ```ts
   const preview = await renderToPng(compiledLayout, defaultSlotValues, tokens, format);
   await uploadToR2(preview, `templates/${id}/preview.png`);
   ```
5. Inserts into `template_versions` (§5):
   ```ts
   await db.insert(templateVersions).values({
     templateId,
     versionNumber: nextVersion,
     boundTokenVersionId: tokens.versionId,
     layoutSchema: compiledLayout,
     slotSchema: export.slots,
     sourceFigmaExport: export, // for re-compile/debugging
     previewR2Key: `templates/${id}/preview.png`,
     isPublished: true,
   });
   ```

#### 22.1.4 Runtime — the universal `<TemplateRenderer>`

The same React component renders in three contexts: browser editor preview, edge export to PNG via Satori, and motion freeze-frame for Remotion/Lottie.

```tsx
// packages/template-renderer/src/TemplateRenderer.tsx

type Props = {
  schema: LayoutNode;
  values: Record<string, unknown>;     // slot values keyed by slot.key
  brand: BrandTokens;                   // resolved from brand_token_versions
  format?: Format;                      // "1:1" | "9:16" | etc — drives root sizing
};

export function TemplateRenderer({ schema, values, brand, format }: Props) {
  const dim = format ? dimensionsForFormat(format) : undefined;
  return (
    <div
      style={{
        width: dim?.w ?? "auto",
        height: dim?.h ?? "auto",
        position: "relative",
        overflow: "hidden",
        background: brand.colors.semantic?.bg ?? "#fff",
      }}
    >
      <RenderNode node={schema} values={values} brand={brand} />
    </div>
  );
}

function RenderNode({ node, values, brand }: { node: LayoutNode; values: any; brand: BrandTokens }) {
  switch (node.kind) {
    case "frame":
      return (
        <div style={frameStyle(node)}>
          {node.children.map((c) => (
            <RenderNode key={c.id} node={c} values={values} brand={brand} />
          ))}
        </div>
      );
    case "text": {
      const text = node.slot && values[node.slot] != null ? String(values[node.slot]) : node.defaultText;
      const fs = computeFontSize(node, text);
      return <span style={{ ...textStyle(node, brand), fontSize: fs }}>{text}</span>;
    }
    case "image": {
      const url = node.slot && values[node.slot]?.url
        ? values[node.slot].url
        : node.defaultR2Key
          ? r2Url(node.defaultR2Key)
          : null;
      if (!url) return <div style={imagePlaceholder(node)} />;
      return <img src={url} style={imageStyle(node)} />;
    }
    case "logo": {
      const logo = brand.logos.find((l) => l.variant === node.variant) || brand.logos[0];
      return <img src={logo.r2Key ? r2Url(logo.r2Key) : ""} style={{ width: node.style.width, height: node.style.height }} />;
    }
    case "shape":
      return renderShape(node, brand);
    case "group":
      return <>{node.children.map((c) => <RenderNode key={c.id} node={c} values={values} brand={brand} />)}</>;
  }
}

function frameStyle(node: FrameNode): React.CSSProperties {
  const { layout, style } = node;
  if (layout.mode === "absolute") {
    return {
      position: "relative",
      width: layout.width,
      height: layout.height,
      background: style.background,
      borderRadius: style.cornerRadius,
    };
  }
  return {
    display: "flex",
    flexDirection: layout.mode === "horizontal" ? "row" : "column",
    gap: layout.itemSpacing,
    paddingTop: layout.padding.top,
    paddingRight: layout.padding.right,
    paddingBottom: layout.padding.bottom,
    paddingLeft: layout.padding.left,
    justifyContent: cssFromPrimary(layout.primaryAlign),
    alignItems: cssFromCounter(layout.counterAlign),
    width: sizingToCss(layout.sizingPrimary, layout.width),
    height: sizingToCss(layout.sizingCounter, layout.height),
    background: style.background,
    borderRadius: style.cornerRadius,
  };
}

function sizingToCss(s: "fixed" | "fill" | "hug", explicit?: number): string | number | undefined {
  if (s === "fixed") return explicit;
  if (s === "fill") return "100%";
  if (s === "hug") return "max-content";
}

function computeFontSize(node: TextNode, text: string): number {
  const base = node.style.fontSize;
  if (!node.constraints?.autoShrink) return base;
  const min = node.constraints.minFontSize ?? base * 0.6;
  const maxChars = node.constraints.maxChars ?? text.length;
  if (text.length <= maxChars) return base;
  const ratio = maxChars / text.length;
  return Math.max(min, Math.round(base * ratio));
}

function textStyle(node: TextNode, brand: BrandTokens): React.CSSProperties {
  const tokenStyle = node.style.tokenRef ? resolveTextToken(brand, node.style.tokenRef) : {};
  return {
    fontFamily: tokenStyle.fontFamily ?? "inherit",
    fontWeight: node.style.weight,
    letterSpacing: node.style.letterSpacing,
    lineHeight: node.style.lineHeight,
    color: typeof node.style.color === "object"
      ? resolveColorToken(brand, node.style.color.tokenRef)
      : node.style.color,
    textAlign: node.style.textAlign,
    textTransform: node.style.textTransform,
    whiteSpace: "pre-wrap",
  };
}
```

The component lives in `packages/template-renderer/` and is imported by:
- `apps/web` (browser editor preview + thumbnail)
- `apps/api/app/api/exports/route.ts` (Satori-based PNG export)
- `apps/api/app/api/motion/freeze/route.ts` (Remotion freeze frame)
- The future Brand Hub template gallery

**One component. Three runtimes. Identical pixels everywhere.**

#### 22.1.5 The Satori export path

```ts
// apps/web/app/api/exports/route.ts
import { ImageResponse } from "next/og";
import { TemplateRenderer } from "@framework/template-renderer";

export async function POST(req: Request) {
  const { compositionId, format } = await req.json();

  // Auth + ownership check via Clerk
  const { userId, orgId } = auth();
  if (!userId || !orgId) return Response.json({ error: "unauth" }, { status: 401 });

  // Load composition + template + brand
  const composition = await db.query.compositions.findFirst({
    where: and(eq(compositions.id, compositionId), eq(compositions.brandId, orgId)),
  });
  if (!composition) return Response.json({ error: "not found" }, { status: 404 });

  const tv = await db.query.templateVersions.findFirst({
    where: eq(templateVersions.id, composition.templateVersionId),
  });
  const brand = await getBrandTokens(orgId);
  const dim = dimensionsForFormat(format ?? composition.format);

  // Subset fonts to glyphs used in this composition
  const fonts = await loadAndSubsetBrandFonts(brand, gatherTextContent(tv.layoutSchema, composition.slotValues));

  return new ImageResponse(
    (
      <TemplateRenderer
        schema={tv.layoutSchema}
        values={composition.slotValues}
        brand={brand}
        format={format}
      />
    ),
    { width: dim.w, height: dim.h, fonts }
  );
}
```

`ImageResponse` = Vercel's wrapper around Satori. Returns PNG. Runs at the edge. **~150ms p50.**

#### 22.1.6 Why this beats Builder.io / Locofy

We considered using a SaaS Figma-to-React converter as v1 of the compiler. Decision: **don't, build it ourselves.** Reasoning:

| Concern | SaaS converter | Our pipeline |
|---|---|---|
| Slot annotations (text/image edit slots) | None — emits static React | First-class via `framework.slot` pluginData |
| Brand-token references | None — bakes hex codes | First-class via `framework.brandTokenRef` |
| Server-side render via Satori | Output is full Tailwind, not Satori-compatible | Schema designed for Satori |
| Constraint encoding (autoShrink, maxChars) | None | First-class via `framework.constraint` |
| Per-template version history | External SaaS database | Lives in our Postgres alongside compositions |
| Vendor risk | Builder.io could change pricing or API | We own the pipeline |
| Time to v1 | 2 days to wire | 5 days to write the walker + compiler |

The 3-day premium for ownership pays back the first time a designer needs a custom constraint we couldn't extend in a SaaS.

#### 22.1.7 Edge cases & known pitfalls

| Figma feature | How we handle |
|---|---|
| Auto-layout `Wrap` mode | Map to CSS `flex-wrap: wrap` |
| Min/max constraints on auto-layout children | Map to `min-width`/`max-width` |
| `Absolute position` inside auto-layout | `position: absolute` on the child, parent stays flex |
| Text auto-resize "Width and height" | `width: max-content; height: max-content` |
| Drop shadows | Map `effects[].type === "DROP_SHADOW"` → CSS `box-shadow` (concat multiple) |
| Inner shadow | CSS `box-shadow: inset` |
| Layer blend modes | Map common modes (`multiply`, `screen`, `overlay`) to `mix-blend-mode`; warn on exotic |
| Component instances | Walk into the master component, treat the instance as a frame with overrides |
| Variants | Variant value becomes a `{key: "variant", type: "choice"}` slot |
| Image fills with crops | Need `object-position` calculation from Figma's `imageTransform` matrix — non-trivial, defer |
| Boolean ops (union/subtract/intersect) | Render as flattened `<svg>` from Figma `/v1/images?format=svg` for that subtree |
| Strokes with non-uniform dashes | SVG only; emit inline SVG for those nodes |
| Gradients | `linear-gradient()` / `radial-gradient()` from `fills[]` |
| Text along path | Out of scope for v1; warn the designer |

The "boolean ops → flattened SVG" rule is the safety valve: anything we can't faithfully reproduce in flexbox + CSS gets baked to SVG once at compile time. The runtime never sees it as a problem.

---

### 22.2 Combined timeline — all four codebases, one schedule

Day-by-day across §15 (backend), §17 (frontend), §19 (generator), §21 (runtime). Dependencies indicated with arrows.

| Day | Backend | Frontend | Generator | Runtime |
|---|---|---|---|---|
| **1** | 15.1.1 revoke token + 15.1.4 delete debug + 15.5 cleanup | — (no work yet) | 19.1.1 remove Figma fetch + 19.1.2 plugin secret | 21.1.1 plugin secret (paired with backend) |
| **2** | 15.1.5 CORS + 15.4 helmet/rate-limit/Sentry | 17.1.1 FIGMATOKEN proxy ← 15 | 19.4 Vite build setup | 21.1.2 OTF audit |
| **3** | 15.1.2 mount order + plugin-secret middleware ← unblocks 19+21 | 17.1.2 DOMPurify SVG | (waits on 15.1.2 to land) | 21.2.1 `/client` → `/brands` |
| **4** | 15.1.3 ownership middleware + 15.2.1 nested handler | 17.1.3 one-time exchange code ← 15 | 19.2.1 extractBrandTokens walker | 21.2.2 FLOAT/COLOR/BOOLEAN handler |
| **5** | 15.2.2 polling-loop hang + 15.2.3 healthz + Better Uptime wired | 17.2.1+17.2.2 state mutations | 19.2.3 tenant dropdown ← needs 15.3.5 | 21.2.3 exponential backoff |
| **6** | 15.3.1 timestamps + 15.3.2 unique index | 17.2.3 file input refs + 17.2.4 onClick event | 19.3 TS errors + ui.html bug | 21.2.5 scoped visibility |
| **7** | 15.3.3 Tenant model + backfill | 17.2.5 strict slot-name parser | 19.5 cleanup | 21.2.6 TS errors |
| **8** | 15.3.4+15.3.5 BrandTokenVersion + endpoint ← unblocks 19+web hub | 17.2.6+7+8+9+10 misc bugs | 19.2.2 disable photos button | 21.5 cleanup |
| **9** | 15.4.3 zod validation | 17.3 error boundary + skeletons | 19.6 smoke test with 30 70 file | 21.3.2 OPS.md document the rig |
| **10** | 15.4 pino logging | 17.3 cancel-on-unmount + a11y | — generator pilot complete | — runtime patches complete |
| **11** | 15.4.1+15.4.2 crypto password gen + signed reset | 17.4 cleanup deletes | (parallel: start §22.1 walker prototype) | (no further patches) |
| **12** | (parallel: start backend half of §22.1 compile pipeline) | (waits on §22.1) | §22.1.2 walker — extractAutoLayout | (idle) |
| **13** | §22.1.3 backend compile — Zod + Figma Dev Mode REST | (waits on §22.1.4) | §22.1.2 walker — extractStyle / shapes | (idle) |
| **14** | End-to-end smoke test with v0-patched stack against 30 70 Agency | E2E with patched front | E2E generator | E2E runtime |

End of week 2: **v0 is pilot-ready** across all four codebases. v3 work has begun in parallel (Days 12-14) on the layout pipeline.

| Wk 3 | §22.1.4 TemplateRenderer (`packages/template-renderer/`) — first 80% of LayoutNode kinds covered |
| Wk 4 | §22.1.5 Satori export route + font subsetting; brand-hub MVP renders real tokens |
| Wk 5 | New editor (`apps/web/app/(authenticated)/editor/[id]/`) using TemplateRenderer; gradual replacement of v0 OneDesign.jsx |
| Wk 6 | First template compiled end-to-end Figma → JSX → editor preview <50ms |
| Wk 7 | AI compliance agent v1 (Claude + brand-tokens system prompt + structured output) |
| Wk 8 | Lottie integration for motion templates |
| Wk 9 | Stripe billing + commission payouts cron |
| Wk 10 | First paying brand on v3 |
| Wk 11 | Decommission §21 — delete runtime plugin + AppleScript + LaunchAgent + dedicated Mac |
| Wk 12 | Migrate Mongo → Postgres for the patched-v0 brands; sunset Mongo |

---

### 22.3 Critical path — what blocks what

```
  Day 1: revoke leaked token
        │
        ▼
  Day 2: backend hardening (CORS, helmet, Sentry)
  Day 3: backend mount-order + plugin secret middleware  ─────────┐
        │                                                          │
        │ unblocks                                                  │
        ▼                                                          ▼
  Day 4-5: frontend FIGMATOKEN proxy           Day 4: generator + runtime can call API
        │                                                          │
        ▼                                                          ▼
  Day 7: Tenant model              Day 8: BrandTokenVersion endpoint
        │                                       │
        └────────────┬──────────────────────────┘
                     │
                     ▼
  Day 8: generator emits brand tokens to new endpoint
                     │
                     ▼
  Day 8-10: brand-hub frontend reads tokens (Vevo-style)
                     │
                     ▼
  Day 12+: §22.1 layout pipeline (the JSX template compiler)
                     │
                     ▼
  Wk 4-5: new editor using TemplateRenderer
                     │
                     ▼
  Wk 11: runtime plugin DELETED (and the AppleScript rig retired)
```

The single longest critical-path chain is: **Day 3 backend mount-order → Day 8 brand-token endpoint → Day 8-10 brand hub → Wk 4-5 new editor → Wk 11 runtime decommission.** Anything off this path can be parallelized.

---

### 22.4 Final stack — no more options

After all the analysis across §3, §4, §22.1, the final stack is:

#### Web (apps/web)
- **Next.js 15** App Router (one app, both Brand Hub + Editor + Marketing)
- **Tailwind v4** + **shadcn/ui**
- **Radix UI** primitives via shadcn
- **Framer Motion** for micro-interactions
- **Lottie React** for motion playback
- **next-themes** for per-tenant theming (CSS variables driven by `brand_token_versions`)
- **react-hook-form** + **zod** for forms
- **DOMPurify** for any HTML/SVG that ever ends up in `dangerouslySetInnerHTML`

#### API (apps/web/app/api/...)
- **Next.js App Router route handlers** — one runtime, no separate Hono server. Edge runtime where applicable.
- **Drizzle ORM** + **postgres** driver
- **Zod** for request/response validation
- **@anthropic-ai/sdk** for AI compliance with prompt caching
- **Satori** + **@resvg/resvg-js** for static export
- **Remotion** + **@remotion/lambda** for motion export
- **subset-font** for per-export font subsetting

#### Database (packages/db)
- **Supabase Postgres** (EU region, Frankfurt or Paris)
- **Row-Level Security** policies
- **Drizzle Kit** for migrations
- Schema = §5 of this brief

#### Auth, payments, email, storage
- **Clerk** — Organizations = brands/studios, RBAC, satellite domains for `*.frame-work.app`
- **Stripe** — products: Brand €99 / Brand+ €299 / Studio custom; Customer Portal; rev-share via Connect
- **Resend** + **React Email** templates
- **Cloudflare R2** + **Cloudflare Images** (replaces Cloudinary)

#### AI
- **Anthropic Claude Sonnet 4.6** (compliance agent with prompt caching)
- **fal.ai** (per-brand LoRA + image-treatment engine, Phase 4)

#### Plugins (apps/plugin-generator, apps/plugin-runtime)
- **TypeScript** strict
- **Vite** + **vite-plugin-singlefile** for the build (replaces `tsc`)
- **@figma/plugin-typings**

#### Observability
- **Sentry** for errors (web + api + plugins)
- **Axiom** for structured logs (pino on the Node side)
- **Better Uptime** for healthz monitoring (until runtime plugin retired)
- **Vercel Analytics** for web vitals
- **PostHog** (optional, week 6+) for product analytics

#### Local dev
- **pnpm** + **Turborepo**
- **Biome** (replaces ESLint + Prettier — faster, single-tool)
- **Docker Compose** for local Postgres (or just Supabase CLI)
- **ngrok** for plugin-against-local-backend testing

---

### 22.5 Speed budget — final, committed

| Action | Today (v0) | Target | Mechanism |
|---|---|---|---|
| Brand hub TTFB anywhere on earth | 1–3s | **<100ms** | Next SSG + ISR on Vercel Edge |
| Editor preview after typing | 5–15s | **<50ms** | TemplateRenderer client-side, no network |
| Editor first paint after navigation | 2–4s | **<400ms** | Server Component loads composition + template + brand in one trip |
| PNG export | 3–8s | **<200ms** | Satori at edge, font subset |
| MP4 export (motion) | n/a | **2–4s** | Remotion Lambda parallel |
| AI compliance check (red-flag pass) | n/a | **<800ms** | Claude with prompt-cached brand rules |
| AI compliance (green-light path) | n/a | **<300ms** | Deterministic color/font check first, LLM only if pre-check inconclusive |
| Image treatment (LoRA, Phase 4) | n/a | **0.5–2s** | fal.ai inference |
| Brand-token publish from generator | n/a | **<1s** | Direct Postgres write + ISR revalidate trigger |

Compounding effect: a designer iterating on a template in v0 takes ~20s per cycle (Figma + plugin polling). On v3 the same iteration is ~200ms. **100x faster.** That's the moat.

---

### 22.6 Two-track delivery — bridge vs v3

```
                    ┌──── Track A: patch v0 in place (4 weeks) ────┐
                    │                                              │
START               │  • backend §15  10–14 days                   │
   │                │  • frontend §17  10 days                     │   PILOT GOES LIVE
   │       fork ───►│  • generator §19  8 days                     │──── on v0-patched
   │                │  • runtime §21    5 days + ops doc           │   (wk 2)
   │                │                                              │
   │                │  outcome: pilot-ready, no security holes,    │
   │                │  ownership enforced, tokens versioned        │
   │                └──────────────────────────────────────────────┘
   │
   │
   │                ┌──── Track B: build v3 in parallel (10 weeks) ─┐
   │                │                                                │
   │                │  Wk 1-2:  monorepo + Drizzle + Clerk + Stripe │
   │                │  Wk 3-4:  §22.1 compile pipeline               │
   │                │  Wk 5-6:  TemplateRenderer + new editor        │   v3 LAUNCH
   └─────fork ─────►│  Wk 7-8:  AI agent + motion                    │── (wk 11)
                    │  Wk 9-10: Stripe live + commissions cron       │
                    │  Wk 11:   decommission Track A runtime plugin  │
                    │                                                │
                    │  outcome: 100x faster, zero Figma desktop      │
                    └────────────────────────────────────────────────┘
```

**Why both tracks:** the pilot can't wait 11 weeks. Track A keeps 30 70 Agency live and earning trust. Track B builds the real product without rushing. Brands onboarded on Track A migrate to Track B in week 12 via a one-shot migration script (Mongo → Postgres + plugin uninstall).

---

### 22.7 Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Auto-layout edge cases not handled by §22.1 walker | High | Build a benchmark suite from 10 real Basile templates before week 4 — any pattern not handled becomes a `flattened-SVG` fallback, never blocks shipping |
| Figma Dev Mode REST API rate limits during compile | Low | Calls happen at template publish (rare), not runtime. Cache results in `template_versions.sourceFigmaExport` |
| Satori cannot render brand's specific font (Adobe Fonts, etc) | Medium | Use Puppeteer/Playwright fallback for non-Satori-compatible fonts; slower but legal |
| Pilot 30 70 Agency declines / pulls out | Medium | Line up 2 backup pilot designers in Basile's network in Wk 1 |
| Mongo perf degrades before v3 ready | Low | Add indexes (§15.3.2); monitor Atlas slow query log; switch trigger §15.7 |
| Stripe Connect onboarding for studio rev-share gets stuck | Medium | Defer commission payouts to Wk 12; first studios get manual SEPA transfers |
| Clerk satellite-domain feature has gotchas with `*.frame-work.app` | Medium | Spike-test in Wk 1, fall back to apex-domain auth if blocked |
| Builder.io / Locofy alternative ships first and is "good enough" | Low | We're not selling a Figma-to-code tool; we're selling a brand-locked editor. Their feature ≠ our wedge |
| AppleScript rig dies on a customer demo day | High | Pin §15.2.3 healthz alert to phone-paging; Damien restarts the Mac. This goes away forever in Wk 11 |

---

### 22.8 First-week unified deliverable

End of Day 5 across all four tracks, the deployed state should be:

- **Backend**: revoked token, mounted middleware, ownership checks live, plugin-secret auth gate functioning, helmet + rate-limit + Sentry shipped, healthz endpoint live with Better Uptime monitoring, polling-loop hang fixed
- **Frontend**: FIGMATOKEN no longer in the bundle, all Figma `/v1/images` calls proxied through backend, DOMPurify on the SVG render, JWT removed from cross-subdomain redirect URL
- **Generator plugin**: revoked Figma token never re-emitted, plugin-secret header on every call, Vite build pipeline replaces tsc, walker emits brand tokens, tenant dropdown in UI
- **Runtime plugin**: paired plugin-secret deployment, exponential backoff on poll failures, FLOAT/COLOR/BOOLEAN handler unlocks numeric/color edits end-to-end, OPS.md documents the rig's death-row status

**Verifiable demo at end of week 1:** Basile opens 30 70 Agency's Figma file, runs the generator plugin, picks "30 70" from the tenant dropdown, clicks "Publish". 30 seconds later, `3070.frame-work.app` shows the live brand hub with the agency's actual colors, fonts, logos rendered in a Vevo-style accordion.

That demo is the thing that closes the next 5 fashion brands.

---

### 22.9 Decisions you need to make this week

| # | Decision | Default | Why it matters |
|---|---|---|---|
| 1 | Subdomain vs path-based tenant routing | **Subdomain** (`3070.frame-work.app`) | White-label feel; Clerk satellite domains support; existing v0 already uses this |
| 2 | Vercel region | **EU (Frankfurt or Paris)** | Pilot is Paris-based; Mongo currently in cdg |
| 3 | Supabase region | **EU (Frankfurt)** | Co-locate with Vercel for sub-10ms DB latency |
| 4 | Build the §22.1 walker DIY or via Builder.io | **DIY** | Three-day premium for ownership of slot/token semantics |
| 5 | Figma Dev Mode REST access | **Buy a Figma Org license** | Required for `/v1/files/:key/nodes` measurements |
| 6 | Domain registrar for `frame-work.app` | **Cloudflare Registrar** | At-cost pricing, native R2/Workers integration |
| 7 | Designer subscription model | **Free** with 30% rev-share (override deck) | Removes onboarding friction; turns designers into affiliates |
| 8 | Pilot timeline | **30 70 Agency live by end of week 2 on Track A** | Forces v0 patches to land |
| 9 | Track B v3 launch target | **Week 11** | First paying brand on v3 by Wk 10 if Track A onboarded ≥3 brands |
| 10 | Sunset date for Mongo | **Week 13** | Migration script runs Wk 12; Mongo decommissioned Wk 13 |

If any of these defaults is wrong for your situation, that's the thing to flag before starting Day 1.

---

### 22.10 The single thing to do tomorrow

If you have one hour tomorrow morning:

1. Revoke the leaked Figma token in Figma Settings (5 min)
2. Delete `routes/figma.routes.js:296-325` (the debug `uploadImgURL`) (5 min)
3. Delete `routes/figma.routes.js:18-89` (the in-process uptime watcher) (5 min)
4. Generate a `PLUGIN_SHARED_SECRET` (`openssl rand -hex 32`), put in backend `.env` (5 min)
5. Add the `isPlugin` middleware (§15.1.2) — 30 lines of code (10 min)
6. Reorder `routes/index.routes.js` so auth gate is properly placed (10 min)
7. Deploy. Verify v0 still works. Commit. (20 min)

That single hour eliminates the most exploitable surface area in the entire codebase. Everything in §15-§22 builds on it.

---

## 23. Anchors back to the new world

When migrating each piece, cross-reference with the relevant brief section:

- v0 model design → §5 (data model)
- v0 auth + email → §4 (Clerk + Resend in stack)
- v0 Cloudinary → §3.4 + §4 (R2 + Cloudflare Images)
- v0 Figma plugin polling → §3.1 (Figma is authoring, not runtime)
- v0 generic security holes → §11 (risks)

---

*End of brief. Self-contained. Pick up cold from any section.*
