# @framework/renderer

The single React component that interprets `layout_schema` + `slot_values` +
`brand_tokens` into a rendered template. Pure: no network, no `eval`, no
dynamic JSX. Used by:

- **Brand Hub** for template previews
- **Editor SPA** for live preview (target: <50ms per keystroke)
- **Export pipeline** (Satori at edge → PNG/SVG)

```tsx
import { TemplateRenderer } from '@framework/renderer'

<TemplateRenderer
  layout={templateVersion.layoutSchema}
  tokens={brandTokenVersion.tokens}
  slotValues={composition.slotValues}
  format="1:1"
  imageResolver={(r2Key) => `https://cdn.frame-work.app/${r2Key}`}
/>
```

## API

- `TemplateRenderer({ layout, tokens, slotValues, format, imageResolver, baseSize?, mode? })`
- `formatToDimensions(format, base?)` — `'1:1' | '9:16' | …` → `{ width, height }`
- `resolveColor(ref, tokens)` — `'colors.primary' | '#FF0033'` → hex string
- `resolveTextStyle(style, tokens)` — turns `TextStyle` into CSS object
- `applyTextConstraints(text, baseFontSize, constraints)` — auto-shrink helper
- `validateSlotValues(schema, values)` — array of `SlotValidationError`

## Why this exists

BRIEF §3.1: "The Figma plugin generates a serializable schema that one fixed
React component interprets." This package **is** that fixed component. Adding
new slot types or layout primitives means extending here, not building parallel
renderers per surface.
