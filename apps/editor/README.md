# @framework/editor

The brand-client editor SPA. Vite + TanStack Router, mounted at
`editor.frame-work.app` (or `/editor` path on the apex — TBD week 6 per
BRIEF §10.1).

## Routes

- `/` — landing
- `/c/:compositionId` — open a composition; renders TemplateRenderer in a
  scaled stage with the slot editor sidebar

## Live preview budget

BRIEF §3.4 sets the bar at <50ms per keystroke. The editor never makes a
network call between keystrokes; `useCompositionStore` (zustand) fan-outs
the value, `<TemplateRenderer>` re-renders synchronously.

## Slot editors

Four flavors: `Text`, `Image`, `Choice`, `Color`. Each:
- writes through to `useCompositionStore`
- shows an inline character counter / preview
- surfaces `validateSlotValues` errors inline (red <11px hint)

The export button is disabled when any required slot is missing — the
brand-locked rule made tactile.

## Run

```bash
pnpm --filter @framework/editor dev
# http://localhost:3001
```
