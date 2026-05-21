import type { Block, BlockBgRef, HexColor } from '@framework/types'
import { useBrandBookContext } from '../brandBookContext'
import { useBlockOps } from './useBlockOps'
import {
  AssetPicker,
  ColorField,
  NumberField,
  PaletteColorPicker,
  SelectField,
  StringListField,
  TextField,
  TextareaField,
  ToggleField,
} from './fields'
import { PaletteEditor } from './token-editors/PaletteEditor'
import { SemanticColorsEditor } from './token-editors/SemanticColorsEditor'
import { TypographyRoleEditor } from './token-editors/TypographyRoleEditor'
import { VoiceEditor } from './token-editors/VoiceEditor'
import { ImageryEditor } from './token-editors/ImageryEditor'

/**
 * Right-side property panel. Reads context.selection.blockId, finds the
 * block on the active page, and renders the right inputs for its kind.
 * Each edit mutates the block via useBlockOps which PATCHes the page.
 */
export function BlockInspector() {
  const { book, selection, setSelection, tokens } = useBrandBookContext()
  const ops = useBlockOps()

  if (!selection.blockId || !selection.pageId) return null
  const page = book.pages.find((p) => p.id === selection.pageId)
  const block = page?.blocks.find((b) => b.id === selection.blockId)
  if (!page || !block) {
    return (
      <aside className="fw-bbook-edit__inspector">
        <div className="fw-bbook-edit__inspector-empty">Block not found.</div>
      </aside>
    )
  }

  const patch = <T extends Block>(p: Partial<T>) =>
    ops.updateBlock(page.id, block.id, p as Partial<Block>)

  // Typography role options come from the brand's tokens — keep this in
  // sync if you add custom roles.
  const roleOptions = Object.keys(tokens.typography).map((r) => ({ value: r, label: r }))

  return (
    <aside className="fw-bbook-edit__inspector">
      <header className="fw-bbook-edit__inspector-head">
        <div>
          <div className="fw-bbook-edit__inspector-kind">{block.kind}</div>
          <div className="fw-bbook-edit__inspector-id">{block.id}</div>
        </div>
        <button
          type="button"
          className="fw-bbook-edit__inspector-close"
          onClick={() => setSelection({ pageId: null, blockId: null })}
          title="Close inspector"
        >
          ×
        </button>
      </header>

      <div className="fw-bbook-edit__inspector-body">
        {renderInspectorFor(block, patch, roleOptions)}

        {/* Common: bottom gap */}
        <hr className="fw-bbook-edit__field-sep" />
        <NumberField
          label="Bottom gap (px)"
          value={block.bottomGap}
          onChange={(v) => patch({ bottomGap: v })}
        />
      </div>
    </aside>
  )
}

const BG_REF_OPTIONS: { value: BlockBgRef | '_inline'; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'bg', label: 'Surface (bg)' },
  { value: 'fg', label: 'Ink (fg)' },
  { value: 'accent', label: 'Accent' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderInspectorFor(block: Block, patch: any, roleOptions: { value: string; label: string }[]): React.ReactNode {
  switch (block.kind) {
    case 'hero':
      return (
        <>
          <TextField label="Title" value={block.title} onChange={(v) => patch({ title: v })} />
          <TextareaField
            label="Subtitle"
            value={block.subtitle ?? ''}
            rows={3}
            onChange={(v) => patch({ subtitle: v })}
          />
          <SelectField
            label="Background"
            value={block.bgKind}
            options={[
              { value: 'primary', label: 'Brand primary' },
              { value: 'color', label: 'Custom color' },
              { value: 'image', label: 'Image' },
              { value: 'none', label: 'None (neutral)' },
            ]}
            onChange={(v) => patch({ bgKind: v })}
          />
          {block.bgKind === 'color' ? (
            <ColorField
              label="Color"
              value={block.bgColor}
              onChange={(v) => patch({ bgColor: v })}
            />
          ) : null}
          {block.bgKind === 'image' ? (
            <AssetPicker
              label="Image"
              value={block.bgAssetId}
              onChange={(v) => patch({ bgAssetId: v })}
            />
          ) : null}
          <SelectField
            label="Height"
            value={block.height ?? 'md'}
            options={[
              { value: 'sm', label: 'Small (240px)' },
              { value: 'md', label: 'Medium (360px)' },
              { value: 'lg', label: 'Large (480px)' },
            ]}
            onChange={(v) => patch({ height: v })}
          />
          <SelectField
            label="Alignment"
            value={block.align ?? 'left'}
            options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]}
            onChange={(v) => patch({ align: v })}
          />
        </>
      )

    case 'section':
      return (
        <>
          <TextField label="Title" value={block.title} onChange={(v) => patch({ title: v })} />
          <TextareaField
            label="Subtitle"
            value={block.subtitle ?? ''}
            rows={3}
            onChange={(v) => patch({ subtitle: v })}
          />
          <TextField
            label="Anchor (optional)"
            value={block.anchor ?? ''}
            placeholder="auto from title"
            onChange={(v) => patch({ anchor: v || undefined })}
          />
        </>
      )

    case 'text':
      return (
        <>
          <TextareaField
            label="Markdown"
            value={block.markdown}
            rows={8}
            onChange={(v) => patch({ markdown: v })}
          />
          <SelectField
            label="Width"
            value={block.width ?? 'narrow'}
            options={[{ value: 'narrow', label: '65ch (narrow)' }, { value: 'wide', label: 'Full' }]}
            onChange={(v) => patch({ width: v })}
          />
        </>
      )

    case 'heading':
      return (
        <>
          <TextField label="Text" value={block.text} onChange={(v) => patch({ text: v })} />
          <SelectField
            label="Level"
            value={String(block.level) as '2' | '3' | '4'}
            options={[
              { value: '2', label: 'h2' },
              { value: '3', label: 'h3' },
              { value: '4', label: 'h4' },
            ]}
            onChange={(v) => patch({ level: Number(v) as 2 | 3 | 4 })}
          />
        </>
      )

    case 'divider':
      return (
        <SelectField
          label="Style"
          value={block.style ?? 'line'}
          options={[{ value: 'line', label: 'Line' }, { value: 'space', label: 'Space' }]}
          onChange={(v) => patch({ style: v })}
        />
      )

    case 'spacer':
      return (
        <NumberField
          label="Height (px)"
          value={block.height ?? 48}
          min={8}
          max={400}
          onChange={(v) => patch({ height: v })}
        />
      )

    case 'callout':
      return (
        <>
          <SelectField
            label="Tone"
            value={block.tone}
            options={[
              { value: 'info', label: 'Info' },
              { value: 'do', label: 'Do' },
              { value: 'dont', label: 'Don\'t' },
              { value: 'warn', label: 'Warn' },
            ]}
            onChange={(v) => patch({ tone: v })}
          />
          <TextField
            label="Title (optional)"
            value={block.title ?? ''}
            onChange={(v) => patch({ title: v || undefined })}
          />
          <TextareaField
            label="Body"
            value={block.body}
            rows={3}
            onChange={(v) => patch({ body: v })}
          />
        </>
      )

    case 'related':
      return (
        <RelatedLinksInspector
          links={block.links}
          onChange={(next) => patch({ links: next })}
        />
      )

    case 'table':
      return (
        <TableRowsInspector rows={block.rows} onChange={(next) => patch({ rows: next })} />
      )

    case 'palette':
      return (
        <>
          <SelectField
            label="Columns"
            value={String(block.columns ?? 3) as '2' | '3' | '4' | '5'}
            options={[
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
            ]}
            onChange={(v) => patch({ columns: Number(v) as 2 | 3 | 4 | 5 })}
          />
          <StringListField
            label="Shown specs"
            value={block.showFields ?? ['hex']}
            onChange={(next) =>
              patch({ showFields: next as ('hex' | 'rgb' | 'cmyk' | 'pantone' | 'usage')[] })
            }
            placeholder="hex | rgb | cmyk | pantone | usage"
          />
          <hr className="fw-bbook-edit__field-sep" />
          <PaletteEditor />
        </>
      )

    case 'colorCard':
      return (
        <>
          <PaletteColorPicker
            label="Palette color"
            value={block.paletteName}
            onChange={(v) => patch({ paletteName: v })}
          />
          {!block.paletteName ? (
            <>
              <ColorField
                label="Inline hex"
                value={block.inlineHex}
                onChange={(v) => patch({ inlineHex: v })}
              />
              <TextField
                label="Inline name"
                value={block.inlineName ?? ''}
                onChange={(v) => patch({ inlineName: v })}
              />
            </>
          ) : null}
          <hr className="fw-bbook-edit__field-sep" />
          <PaletteEditor />
        </>
      )

    case 'colorPairing':
      return (
        <>
          <p className="fw-bbook-edit__hint">
            Default pairings are derived from your semantic colors (bg / fg / primary).
            Edit them below to change every brand book pairing card at once.
          </p>
          <hr className="fw-bbook-edit__field-sep" />
          <SemanticColorsEditor />
        </>
      )

    case 'tintScale':
      return (
        <>
          <PaletteColorPicker
            label="Color"
            value={block.paletteName}
            onChange={(v) => patch({ paletteName: v })}
          />
          <SelectField
            label="Mode"
            value={block.mode ?? 'opacity'}
            options={[
              { value: 'opacity', label: 'Opacity' },
              { value: 'tint', label: 'Tint (mix w/ white)' },
            ]}
            onChange={(v) => patch({ mode: v })}
          />
          <StringListField
            label="Stops (%)"
            value={(block.stops ?? [100, 75, 50, 25]).map(String)}
            onChange={(next) =>
              patch({ stops: next.map((s) => Number(s)).filter((n) => !Number.isNaN(n)) })
            }
            placeholder="e.g. 50"
          />
          <hr className="fw-bbook-edit__field-sep" />
          <PaletteEditor />
        </>
      )

    case 'logoSpecimen':
      return (
        <>
          <AssetPicker
            label="Logo"
            value={block.logoAssetId}
            kind="logo"
            onChange={(v) => patch({ logoAssetId: v })}
          />
          <SelectField
            label="Background"
            value={(block.bg ?? 'bg') as BlockBgRef}
            options={BG_REF_OPTIONS as { value: BlockBgRef; label: string }[]}
            onChange={(v) => patch({ bg: v })}
          />
          <NumberField
            label="Logo height"
            value={block.height ?? 140}
            min={40}
            max={400}
            onChange={(v) => patch({ height: v })}
          />
          <ToggleField
            label="Show clearspace"
            value={!!block.showClearspace}
            onChange={(v) => patch({ showClearspace: v })}
          />
        </>
      )

    case 'logoGrid':
      return (
        <LogoGridInspector
          variants={block.variants}
          bgs={block.bgs}
          onChange={(next) => patch(next)}
        />
      )

    case 'logoClearspace':
      return (
        <>
          <AssetPicker
            label="Logo"
            value={block.logoAssetId}
            kind="logo"
            onChange={(v) => patch({ logoAssetId: v })}
          />
          <NumberField
            label="Clearspace × logo height"
            value={block.clearspaceX ?? 1.0}
            min={0.25}
            max={3}
            step={0.25}
            onChange={(v) => patch({ clearspaceX: v })}
          />
        </>
      )

    case 'logoMisuse':
      return (
        <LogoMisuseInspector items={block.items} onChange={(next) => patch({ items: next })} />
      )

    case 'logoPlacement':
      return (
        <LogoPlacementInspector
          positions={block.positions ?? ['tl', 'tr', 'bl', 'br', 'c']}
          onChange={(next) => patch({ positions: next })}
        />
      )

    case 'typeSpecimen':
      return (
        <>
          <SelectField
            label="Role"
            value={block.role}
            options={roleOptions}
            onChange={(v) => patch({ role: v })}
          />
          <TextField
            label="Sample text"
            value={block.sampleText ?? ''}
            placeholder="The quick brown fox…"
            onChange={(v) => patch({ sampleText: v || undefined })}
          />
          <NumberField
            label="Size override (px)"
            value={block.sizePx}
            min={12}
            max={240}
            onChange={(v) => patch({ sizePx: v })}
          />
          <hr className="fw-bbook-edit__field-sep" />
          <TypographyRoleEditor role={block.role} />
        </>
      )

    case 'typeScale':
      return (
        <>
          <p className="fw-bbook-edit__hint">
            Auto-generated from tokens.typography. Edit each role below to change the scale rows.
          </p>
          <hr className="fw-bbook-edit__field-sep" />
          {roleOptions.map((opt) => (
            <TypographyRoleEditor key={opt.value} role={opt.value} />
          ))}
        </>
      )

    case 'characterSet':
      return (
        <>
          <SelectField
            label="Role"
            value={block.role}
            options={roleOptions}
            onChange={(v) => patch({ role: v })}
          />
          <SelectField
            label="Set"
            value={block.set ?? 'all'}
            options={[
              { value: 'all', label: 'All' },
              { value: 'upper', label: 'Uppercase' },
              { value: 'lower', label: 'Lowercase' },
              { value: 'numerals', label: 'Numerals' },
            ]}
            onChange={(v) => patch({ set: v })}
          />
          <hr className="fw-bbook-edit__field-sep" />
          <TypographyRoleEditor role={block.role} />
        </>
      )

    case 'image':
      return (
        <>
          <AssetPicker
            label="Asset"
            value={block.assetId}
            onChange={(v) => patch({ assetId: v })}
          />
          <TextField
            label="Or URL"
            value={block.url ?? ''}
            onChange={(v) => patch({ url: v || undefined })}
          />
          <TextField
            label="Caption"
            value={block.caption ?? ''}
            onChange={(v) => patch({ caption: v })}
          />
          <SelectField
            label="Fit"
            value={block.fit ?? 'cover'}
            options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }]}
            onChange={(v) => patch({ fit: v })}
          />
          <SelectField
            label="Aspect"
            value={block.aspect ?? 'auto'}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: '1:1', label: '1:1' },
              { value: '4:3', label: '4:3' },
              { value: '16:9', label: '16:9' },
              { value: '3:4', label: '3:4' },
              { value: '9:16', label: '9:16' },
            ]}
            onChange={(v) => patch({ aspect: v })}
          />
        </>
      )

    case 'imageGrid':
      return (
        <ImageGridInspector
          assetIds={block.assetIds}
          columns={block.columns ?? 3}
          aspect={block.aspect ?? '4:3'}
          onChange={(next) => patch(next)}
        />
      )

    case 'doDontGrid':
      return (
        <>
          <DoDontInspector
            items={block.items}
            columns={block.columns ?? 2}
            onChange={(next) => patch(next)}
          />
          <hr className="fw-bbook-edit__field-sep" />
          <ImageryEditor />
        </>
      )

    case 'toneChips':
      return (
        <>
          <StringListField
            label="Local chips (overrides tokens)"
            value={block.chips ?? []}
            placeholder="e.g. Confident"
            onChange={(next) => patch({ chips: next.length ? next : undefined })}
          />
          <hr className="fw-bbook-edit__field-sep" />
          <VoiceEditor field="tone" />
        </>
      )

    case 'vocabulary':
      return (
        <>
          <StringListField
            label="Local preferred (overrides)"
            value={block.preferred ?? []}
            onChange={(next) => patch({ preferred: next.length ? next : undefined })}
          />
          <StringListField
            label="Local avoid (overrides)"
            value={block.avoid ?? []}
            onChange={(next) => patch({ avoid: next.length ? next : undefined })}
          />
          <hr className="fw-bbook-edit__field-sep" />
          <VoiceEditor field="vocabulary" />
        </>
      )

    case 'copyExamples':
      return (
        <CopyExamplesInspector
          pairs={block.pairs}
          onChange={(next) => patch({ pairs: next })}
        />
      )

    case 'patternGrid':
      return (
        <PatternGridInspector
          assetIds={block.assetIds}
          onChange={(next) => patch({ assetIds: next })}
        />
      )

    case 'downloads':
      return (
        <DownloadsInspector
          items={block.items}
          onChange={(next) => patch({ items: next })}
        />
      )

    case 'embed':
      return (
        <>
          <TextareaField
            label="HTML"
            value={block.html}
            rows={8}
            onChange={(v) => patch({ html: v })}
          />
          <NumberField
            label="Height (px)"
            value={block.height ?? 320}
            min={80}
            max={1200}
            onChange={(v) => patch({ height: v })}
          />
        </>
      )

    default: {
      // Exhaustive check — TS errors if a new BlockKind is added.
      const _: never = block
      void _
      return null
    }
  }
}

// ─── Inline sub-inspectors ─────────────────────────────────────────────

function RelatedLinksInspector({
  links,
  onChange,
}: {
  links: { label: string; pageSlug: string }[]
  onChange: (next: { label: string; pageSlug: string }[]) => void
}) {
  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">Links</span>
      <div className="fw-bbook-edit__list">
        {links.map((link, i) => (
          <div key={i} className="fw-bbook-edit__list-row">
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={link.label}
              placeholder="Label"
              onChange={(e) => {
                const next = [...links]
                next[i] = { ...link, label: e.target.value }
                onChange(next)
              }}
            />
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={link.pageSlug}
              placeholder="page-slug"
              onChange={(e) => {
                const next = [...links]
                next[i] = { ...link, pageSlug: e.target.value }
                onChange(next)
              }}
            />
            <button type="button" onClick={() => onChange(links.filter((_, idx) => idx !== i))}>
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="fw-bbook-edit__list-add"
          onClick={() => onChange([...links, { label: '', pageSlug: '' }])}
        >
          + add link
        </button>
      </div>
    </div>
  )
}

function TableRowsInspector({
  rows,
  onChange,
}: {
  rows: { key: string; value: string }[]
  onChange: (next: { key: string; value: string }[]) => void
}) {
  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">Rows</span>
      <div className="fw-bbook-edit__list">
        {rows.map((row, i) => (
          <div key={i} className="fw-bbook-edit__list-row">
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={row.key}
              placeholder="Key"
              onChange={(e) => {
                const next = [...rows]
                next[i] = { ...row, key: e.target.value }
                onChange(next)
              }}
            />
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={row.value}
              placeholder="Value"
              onChange={(e) => {
                const next = [...rows]
                next[i] = { ...row, value: e.target.value }
                onChange(next)
              }}
            />
            <button type="button" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="fw-bbook-edit__list-add"
          onClick={() => onChange([...rows, { key: '', value: '' }])}
        >
          + add row
        </button>
      </div>
    </div>
  )
}

function LogoMisuseInspector({
  items,
  onChange,
}: {
  items: { imageAssetId?: string; label: string }[]
  onChange: (next: { imageAssetId?: string; label: string }[]) => void
}) {
  const { assets } = useBrandBookContext()
  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">Misuse items</span>
      <div className="fw-bbook-edit__list">
        {items.map((item, i) => (
          <div key={i} className="fw-bbook-edit__list-row" style={{ flexDirection: 'column', gap: 4 }}>
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={item.label}
              placeholder="Do not …"
              onChange={(e) => {
                const next = [...items]
                next[i] = { ...item, label: e.target.value }
                onChange(next)
              }}
            />
            <select
              className="fw-bbook-edit__field-select"
              value={item.imageAssetId ?? ''}
              onChange={(e) => {
                const next = [...items]
                next[i] = { ...item, imageAssetId: e.target.value || undefined }
                onChange(next)
              }}
            >
              <option value="">— no image —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.label} · {a.kind}</option>
              ))}
            </select>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="fw-bbook-edit__list-add"
          onClick={() => onChange([...items, { label: '' }])}
        >
          + add item
        </button>
      </div>
    </div>
  )
}

function ImageGridInspector({
  assetIds,
  columns,
  aspect,
  onChange,
}: {
  assetIds: string[]
  columns: 2 | 3 | 4
  aspect: '1:1' | '4:3' | '16:9' | '3:4' | 'auto'
  onChange: (next: { assetIds?: string[]; columns?: 2 | 3 | 4; aspect?: '1:1' | '4:3' | '16:9' | '3:4' | 'auto' }) => void
}) {
  const { assets } = useBrandBookContext()
  const toggle = (id: string) => {
    const next = assetIds.includes(id) ? assetIds.filter((x) => x !== id) : [...assetIds, id]
    onChange({ assetIds: next })
  }
  return (
    <>
      <SelectField
        label="Columns"
        value={String(columns) as '2' | '3' | '4'}
        options={[
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
        ]}
        onChange={(v) => onChange({ columns: Number(v) as 2 | 3 | 4 })}
      />
      <SelectField
        label="Aspect"
        value={aspect}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: '1:1', label: '1:1' },
          { value: '4:3', label: '4:3' },
          { value: '16:9', label: '16:9' },
          { value: '3:4', label: '3:4' },
        ]}
        onChange={(v) => onChange({ aspect: v })}
      />
      <div className="fw-bbook-edit__field">
        <span className="fw-bbook-edit__field-label">Images ({assetIds.length} selected)</span>
        <div className="fw-bbook-edit__asset-row">
          {assets.length === 0 ? (
            <span className="fw-bbook-edit__asset-empty">no assets yet</span>
          ) : (
            assets.map((a) => (
              <button
                key={a.id}
                type="button"
                title={a.label}
                className={`fw-bbook-edit__asset-tile ${assetIds.includes(a.id) ? 'is-active' : ''}`}
                onClick={() => toggle(a.id)}
              >
                <img src={a.dataUrl} alt={a.label} />
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}

function DoDontInspector({
  items,
  columns,
  onChange,
}: {
  items: { assetId?: string; caption: string; kind: 'do' | 'dont' }[]
  columns: 2 | 3 | 4
  onChange: (next: { items?: { assetId?: string; caption: string; kind: 'do' | 'dont' }[]; columns?: 2 | 3 | 4 }) => void
}) {
  const { assets } = useBrandBookContext()
  const update = (i: number, patch: Partial<{ assetId?: string; caption: string; kind: 'do' | 'dont' }>) => {
    const next = [...items]
    next[i] = { ...next[i]!, ...patch }
    onChange({ items: next })
  }
  return (
    <>
      <SelectField
        label="Columns"
        value={String(columns) as '2' | '3' | '4'}
        options={[
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
        ]}
        onChange={(v) => onChange({ columns: Number(v) as 2 | 3 | 4 })}
      />
      <div className="fw-bbook-edit__field">
        <span className="fw-bbook-edit__field-label">Items</span>
        <div className="fw-bbook-edit__list">
          {items.map((item, i) => (
            <div key={i} className="fw-bbook-edit__list-row" style={{ flexDirection: 'column', gap: 4 }}>
              <select
                className="fw-bbook-edit__field-select"
                value={item.kind}
                onChange={(e) => update(i, { kind: e.target.value as 'do' | 'dont' })}
              >
                <option value="do">Do</option>
                <option value="dont">Don't</option>
              </select>
              <input
                type="text"
                className="fw-bbook-edit__field-input"
                value={item.caption}
                placeholder="Caption"
                onChange={(e) => update(i, { caption: e.target.value })}
              />
              <select
                className="fw-bbook-edit__field-select"
                value={item.assetId ?? ''}
                onChange={(e) => update(i, { assetId: e.target.value || undefined })}
              >
                <option value="">— no image —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
              <button type="button" onClick={() => onChange({ items: items.filter((_, idx) => idx !== i) })}>
                remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="fw-bbook-edit__list-add"
            onClick={() => onChange({ items: [...items, { caption: '', kind: 'do' }] })}
          >
            + add item
          </button>
        </div>
      </div>
    </>
  )
}

const LOGO_VARIANT_OPTIONS = ['primary', 'wordmark', 'symbol', 'monochrome', 'inverted']
const BG_OPTIONS: { key: BlockBgRef; label: string }[] = [
  { key: 'bg', label: 'Surface' },
  { key: 'fg', label: 'Ink' },
  { key: 'primary', label: 'Primary' },
  { key: 'accent', label: 'Accent' },
]

function LogoGridInspector({
  variants,
  bgs,
  onChange,
}: {
  variants?: string[]
  bgs?: BlockBgRef[]
  onChange: (next: { variants?: string[]; bgs?: BlockBgRef[] }) => void
}) {
  const toggleVariant = (v: string) => {
    const current = variants ?? LOGO_VARIANT_OPTIONS
    const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v]
    onChange({ variants: next.length === LOGO_VARIANT_OPTIONS.length ? undefined : next })
  }
  const toggleBg = (b: BlockBgRef) => {
    const current = bgs ?? ['bg', 'fg', 'primary']
    const next = current.includes(b) ? current.filter((x) => x !== b) : [...current, b]
    onChange({ bgs: next as BlockBgRef[] })
  }
  return (
    <>
      <div className="fw-bbook-edit__field">
        <span className="fw-bbook-edit__field-label">Variants</span>
        <div className="fw-bbook-edit__chip-row">
          {LOGO_VARIANT_OPTIONS.map((v) => {
            const on = !variants || variants.includes(v)
            return (
              <button
                key={v}
                type="button"
                className={`fw-bbook-edit__chip ${on ? 'is-active' : ''}`}
                onClick={() => toggleVariant(v)}
              >
                {v}
              </button>
            )
          })}
        </div>
      </div>
      <div className="fw-bbook-edit__field">
        <span className="fw-bbook-edit__field-label">Backgrounds</span>
        <div className="fw-bbook-edit__chip-row">
          {BG_OPTIONS.map(({ key, label }) => {
            const on = (bgs ?? ['bg', 'fg', 'primary']).includes(key)
            return (
              <button
                key={key}
                type="button"
                className={`fw-bbook-edit__chip ${on ? 'is-active' : ''}`}
                onClick={() => toggleBg(key)}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function LogoPlacementInspector({
  positions,
  onChange,
}: {
  positions: ('tl' | 'tr' | 'bl' | 'br' | 'c')[]
  onChange: (next: ('tl' | 'tr' | 'bl' | 'br' | 'c')[]) => void
}) {
  const ALL: ('tl' | 'tr' | 'bl' | 'br' | 'c')[] = ['tl', 'tr', 'bl', 'br', 'c']
  const toggle = (p: 'tl' | 'tr' | 'bl' | 'br' | 'c') => {
    const next = positions.includes(p) ? positions.filter((x) => x !== p) : [...positions, p]
    onChange(next)
  }
  const LABELS = { tl: 'Top-L', tr: 'Top-R', bl: 'Btm-L', br: 'Btm-R', c: 'Center' } as const
  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">Positions shown</span>
      <div className="fw-bbook-edit__chip-row">
        {ALL.map((p) => (
          <button
            key={p}
            type="button"
            className={`fw-bbook-edit__chip ${positions.includes(p) ? 'is-active' : ''}`}
            onClick={() => toggle(p)}
          >
            {LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  )
}

function PatternGridInspector({
  assetIds,
  onChange,
}: {
  assetIds?: string[]
  onChange: (next: string[] | undefined) => void
}) {
  const { assets } = useBrandBookContext()
  const patterns = assets.filter((a) => a.kind === 'pattern')
  const showAll = !assetIds
  const toggle = (id: string) => {
    const current = assetIds ?? patterns.map((a) => a.id)
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    onChange(next.length === patterns.length ? undefined : next)
  }
  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">
        Patterns ({showAll ? 'all' : `${assetIds!.length} selected`})
      </span>
      <div className="fw-bbook-edit__asset-row">
        {patterns.length === 0 ? (
          <span className="fw-bbook-edit__asset-empty">no pattern assets yet</span>
        ) : (
          patterns.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.label}
              className={`fw-bbook-edit__asset-tile ${
                (assetIds ?? patterns.map((x) => x.id)).includes(p.id) ? 'is-active' : ''
              }`}
              onClick={() => toggle(p.id)}
            >
              <img src={p.dataUrl} alt={p.label} />
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function DownloadsInspector({
  items,
  onChange,
}: {
  items?: { label: string; assetId?: string; url?: string; format?: string }[]
  onChange: (next: { label: string; assetId?: string; url?: string; format?: string }[] | undefined) => void
}) {
  const { assets } = useBrandBookContext()
  const rows = items ?? []
  const update = (i: number, patch: Partial<{ label: string; assetId?: string; url?: string; format?: string }>) => {
    const next = [...rows]
    next[i] = { ...next[i]!, ...patch }
    onChange(next)
  }
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i))
  const add = () => onChange([...rows, { label: 'New file' }])
  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">
        {items ? 'Custom items' : 'Auto items (logos + fonts)'}
      </span>
      <p className="fw-bbook-edit__hint">
        {items
          ? 'Custom list — overrides auto.'
          : 'Auto mode shows uploaded logos + brand fonts. Click "+ add custom item" to override.'}
      </p>
      <div className="fw-bbook-edit__list">
        {rows.map((r, i) => (
          <div key={i} className="fw-bbook-edit__list-row" style={{ flexDirection: 'column', gap: 4 }}>
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={r.label}
              placeholder="Label"
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <select
              className="fw-bbook-edit__field-select"
              value={r.assetId ?? ''}
              onChange={(e) => update(i, { assetId: e.target.value || undefined })}
            >
              <option value="">— or paste a URL —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.label} · {a.kind}</option>
              ))}
            </select>
            {!r.assetId ? (
              <input
                type="text"
                className="fw-bbook-edit__field-input"
                value={r.url ?? ''}
                placeholder="https://…"
                onChange={(e) => update(i, { url: e.target.value || undefined })}
              />
            ) : null}
            <input
              type="text"
              className="fw-bbook-edit__field-input"
              value={r.format ?? ''}
              placeholder="Format (SVG / PNG / ZIP)"
              onChange={(e) => update(i, { format: e.target.value || undefined })}
            />
            <button type="button" onClick={() => remove(i)}>remove</button>
          </div>
        ))}
        <button type="button" className="fw-bbook-edit__list-add" onClick={add}>
          + add custom item
        </button>
        {items ? (
          <button
            type="button"
            className="fw-bbook-edit__list-add"
            onClick={() => onChange(undefined)}
            style={{ marginTop: 4 }}
          >
            ↺ revert to auto
          </button>
        ) : null}
      </div>
    </div>
  )
}

function CopyExamplesInspector({
  pairs,
  onChange,
}: {
  pairs: { before: string; after: string }[]
  onChange: (next: { before: string; after: string }[]) => void
}) {
  return (
    <div className="fw-bbook-edit__field">
      <span className="fw-bbook-edit__field-label">Before / After pairs</span>
      <div className="fw-bbook-edit__list">
        {pairs.map((p, i) => (
          <div key={i} className="fw-bbook-edit__list-row" style={{ flexDirection: 'column', gap: 4 }}>
            <textarea
              className="fw-bbook-edit__field-textarea"
              rows={2}
              value={p.before}
              placeholder="Before"
              onChange={(e) => {
                const next = [...pairs]
                next[i] = { ...p, before: e.target.value }
                onChange(next)
              }}
            />
            <textarea
              className="fw-bbook-edit__field-textarea"
              rows={2}
              value={p.after}
              placeholder="After"
              onChange={(e) => {
                const next = [...pairs]
                next[i] = { ...p, after: e.target.value }
                onChange(next)
              }}
            />
            <button type="button" onClick={() => onChange(pairs.filter((_, idx) => idx !== i))}>
              remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="fw-bbook-edit__list-add"
          onClick={() => onChange([...pairs, { before: '', after: '' }])}
        >
          + add pair
        </button>
      </div>
    </div>
  )
}
