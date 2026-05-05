# @framework/plugin

Figma generator plugin v2. Replaces the v0 plugin entirely.

## Two flows

1. **Push template** — select 1+ frames named `<base>/<format>` (e.g.
   `spring-drop/1:1`, `spring-drop/9:16`), enter a brand slug + name, click
   **Push**. The sandbox walks the node tree, emits a `LayoutNode` tree plus
   a `SlotSchema`, the UI iframe POSTs to `{endpoint}/api/templates`.

2. **Brand tokens** — enter a brand slug, click **Push**. The sandbox reads
   the file's local paint and text styles plus any `logo/<variant>` frames,
   produces a `BrandTokens` object, the UI iframe POSTs to
   `{endpoint}/api/brand-tokens`.

## Layer naming conventions

- `slot/<key>` — emits an editable slot with that key
- `lock/...` — locked, not editable, no slot emitted
- `logo/<variant>` — `LogoNode` with variant ∈
  `primary | wordmark | symbol | monochrome | inverted`
- frame name suffix `1:1` / `9:16` / `16:9` / etc. — declares the format

Anything not prefixed renders as static layout. No special tagging needed —
the plugin extracts everything reasonable by default (BRIEF §0 / Concept
Scene 1: "He did NOT need to name layers a special way").

## Build

```bash
pnpm --filter @framework/plugin build
# emits:
#   dist/code.js   — sandbox bundle (CommonJS, no DOM/network)
#   dist/ui.html   — single-file UI (inlined JS+CSS)
```

Then in Figma Desktop: **Plugins → Development → Import plugin from manifest…**
and pick `apps/plugin/manifest.json`.

## Security note

The v0 plugin had a Figma personal access token committed to source
(BRIEF §8 Mon: "Revoke leaked Figma token in `Framework-generator-main/code.ts:116`").
This v2 plugin needs **no token at all**: it runs *inside* Figma already, so
all node access goes through the plugin API. The only network egress is the
JSON POST to `/api/brand-tokens` and `/api/templates` — both authenticated
by the user's session cookie / API key in the future.
