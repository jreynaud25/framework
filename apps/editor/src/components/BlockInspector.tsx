import { useMemo, useRef, useState } from 'react'
import type { BrandTokens, ColorSlotSource, Fill, LayoutNode } from '@framework/types'
import { useCompositionStore } from '@/state/composition'
import { findNode, generateSlotKey } from './mergeDesignerMarks'

interface Props {
  layout: LayoutNode
  tokens: BrandTokens
}

type Tab = 'brand' | 'custom' | 'free' | 'gradient'

/**
 * Inspector for the currently-selected block in designer mode. Lets the
 * designer assign:
 *   - A brand palette color (locked, on-brand)
 *   - A designer-added custom color (from the per-editor swatch set)
 *   - Any free color (eyedropper / hex)
 *   - A 2-stop linear gradient
 * The chosen fill replaces the node's `style.fills` via
 * `blockFillOverrides[nodeId]` and is baked into the layout on Publish.
 */
export function BlockInspector({ layout, tokens }: Props) {
  const selectedNodeId = useCompositionStore((s) => s.selectedNodeId)
  const blockFillOverrides = useCompositionStore((s) => s.blockFillOverrides)
  const designerSwatches = useCompositionStore((s) => s.designerSwatches)
  const marks = useCompositionStore((s) => s.marks)
  const toggleMark = useCompositionStore((s) => s.toggleMark)
  const updateMark = useCompositionStore((s) => s.updateMark)
  const setBlockFill = useCompositionStore((s) => s.setBlockFill)
  const addDesignerSwatch = useCompositionStore((s) => s.addDesignerSwatch)
  const removeDesignerSwatch = useCompositionStore((s) => s.removeDesignerSwatch)
  const setSelectedNode = useCompositionStore((s) => s.setSelectedNode)

  const node = useMemo(
    () => (selectedNodeId ? findNode(layout, selectedNodeId) : null),
    [layout, selectedNodeId],
  )

  const currentFills: Fill[] | undefined = useMemo(() => {
    if (!node) return undefined
    if (selectedNodeId && blockFillOverrides[selectedNodeId]) return blockFillOverrides[selectedNodeId]
    if (node.type === 'frame' || node.type === 'shape' || node.type === 'image') {
      return node.style?.fills
    }
    return undefined
  }, [node, selectedNodeId, blockFillOverrides])

  const initialTab: Tab = currentFills?.[0]?.type === 'linear-gradient' ? 'gradient' : 'brand'
  const [tab, setTab] = useState<Tab>(initialTab)

  if (!selectedNodeId || !node) return null

  const isFillable = node.type === 'frame' || node.type === 'shape' || node.type === 'image'
  const currentSolid =
    currentFills?.[0]?.type === 'solid' ? currentFills[0].color : '#000000'

  function applySolid(color: string) {
    if (!selectedNodeId) return
    setBlockFill(selectedNodeId, [{ type: 'solid', color }])
  }

  function applyGradient(g: Extract<Fill, { type: 'linear-gradient' }>) {
    if (!selectedNodeId) return
    setBlockFill(selectedNodeId, [g])
  }

  function clearOverride() {
    if (!selectedNodeId) return
    setBlockFill(selectedNodeId, null)
  }

  const nodeLabel = describeNode(node)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="fw-section">Selected · {nodeLabel}</div>
        <button
          type="button"
          className="fw-btn fw-btn--ghost"
          onClick={() => setSelectedNode(null)}
          aria-label="Deselect"
          title="Deselect"
        >
          ×
        </button>
      </div>

      {node.type === 'image' ? <ImageFitSection node={node} /> : null}

      {!isFillable ? (
        <div className="text-[11px] text-[var(--muted)]">
          This block doesn't accept a color/gradient.
        </div>
      ) : (
        <>
          <div className="fw-tabs">
            <button className="fw-tab" data-active={tab === 'brand'} onClick={() => setTab('brand')}>Brand</button>
            <button className="fw-tab" data-active={tab === 'custom'} onClick={() => setTab('custom')}>Custom</button>
            <button className="fw-tab" data-active={tab === 'free'} onClick={() => setTab('free')}>Free</button>
            <button className="fw-tab" data-active={tab === 'gradient'} onClick={() => setTab('gradient')}>Gradient</button>
          </div>

          {tab === 'brand' ? (
            <BrandTab tokens={tokens} current={currentSolid} onPick={applySolid} />
          ) : null}

          {tab === 'custom' ? (
            <CustomTab
              swatches={designerSwatches}
              current={currentSolid}
              onPick={applySolid}
              onAdd={addDesignerSwatch}
              onRemove={removeDesignerSwatch}
            />
          ) : null}

          {tab === 'free' ? <FreeTab current={currentSolid} onPick={applySolid} /> : null}

          {tab === 'gradient' ? (
            <GradientTab
              current={
                currentFills?.[0]?.type === 'linear-gradient'
                  ? currentFills[0]
                  : { type: 'linear-gradient', angle: 135, stops: [{ position: 0, color: '#ffffff' }, { position: 1, color: '#000000' }] }
              }
              onChange={applyGradient}
            />
          ) : null}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="fw-btn fw-btn--ghost"
              onClick={clearOverride}
              disabled={!blockFillOverrides[selectedNodeId]}
            >
              Reset to original
            </button>
          </div>

          {/* ====== Client-editable section ====== */}
          <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--fg)]">Client can change this</span>
              <input
                type="checkbox"
                checked={!!marks[selectedNodeId]}
                onChange={(e) => {
                  if (e.target.checked) {
                    const existing = new Set([...Object.values(marks).map((m) => m.slotKey)])
                    const labelSrc = `block-${selectedNodeId}`
                    const slotKey = generateSlotKey(labelSrc, 'color', existing, selectedNodeId)
                    toggleMark({
                      nodeId: selectedNodeId,
                      slotKey,
                      type: 'color',
                      label: `${nodeLabel} color`,
                      allowedSources: ['brand', 'custom'],
                      defaultValue: currentSolid.startsWith('#') ? currentSolid : undefined,
                    })
                  } else if (marks[selectedNodeId]) {
                    toggleMark({ ...marks[selectedNodeId], nodeId: selectedNodeId })
                  }
                }}
              />
            </div>

            {marks[selectedNodeId]?.type === 'color' ? (
              <div className="space-y-1 pl-3 border-l border-[var(--line)]">
                <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">
                  Allowed sources
                </div>
                {(['brand', 'custom', 'free'] as ColorSlotSource[]).map((src) => {
                  const sources = marks[selectedNodeId]!.allowedSources ?? ['brand', 'custom', 'free']
                  const checked = sources.includes(src)
                  return (
                    <label key={src} className="flex items-center gap-2 text-[12px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const curr = sources
                          const next = e.target.checked
                            ? Array.from(new Set([...curr, src]))
                            : curr.filter((s) => s !== src)
                          updateMark(selectedNodeId, { allowedSources: next as ColorSlotSource[] })
                        }}
                      />
                      <span className="text-[var(--fg-2)]">
                        {src === 'brand' ? 'Brand palette' : src === 'custom' ? 'Designer custom' : 'Any color (free picker)'}
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Image fit toggle (designer-only). Marks the image as a client-editable
 * slot if it isn't already, then writes `imageFit` onto the mark which
 * `mergeSchemaWithMarks` translates into the slot's `constraints.fit`.
 */
function ImageFitSection({ node }: { node: LayoutNode & { type: 'image' } }) {
  const marks = useCompositionStore((s) => s.marks)
  const toggleMark = useCompositionStore((s) => s.toggleMark)
  const updateMark = useCompositionStore((s) => s.updateMark)
  const mark = marks[node.id]
  const styleFit = node.style?.fit
  const fit: 'cover' | 'contain' =
    mark?.imageFit ?? (styleFit === 'contain' ? 'contain' : 'cover')

  function setFit(next: 'cover' | 'contain') {
    if (!mark) {
      const existing = new Set(Object.values(marks).map((m) => m.slotKey))
      const labelSrc = `image-${node.id}`
      const slotKey = generateSlotKey(labelSrc, 'image', existing, node.id)
      toggleMark({
        nodeId: node.id,
        slotKey,
        type: 'image',
        label: `Image ${slotKey}`,
        imageFit: next,
      })
      return
    }
    updateMark(node.id, { imageFit: next })
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">Image fit</div>
      <div className="fw-tabs">
        <button className="fw-tab" data-active={fit === 'cover'} onClick={() => setFit('cover')}>
          Cover
        </button>
        <button className="fw-tab" data-active={fit === 'contain'} onClick={() => setFit('contain')}>
          Contain
        </button>
      </div>
      <div className="text-[10px] text-[var(--muted)]">
        {fit === 'cover'
          ? 'Fills the frame, may crop. Client can drag to reposition.'
          : 'Whole image visible, letterboxed if needed.'}
      </div>
    </div>
  )
}

function describeNode(node: LayoutNode): string {
  if (node.type === 'frame') return 'Frame'
  if (node.type === 'shape') return node.shape === 'circle' ? 'Circle' : node.shape === 'path' ? 'Vector' : 'Rectangle'
  if (node.type === 'image') return 'Image'
  if (node.type === 'text') return 'Text'
  return 'Logo'
}

/* -------- Brand tab -------- */
function BrandTab({
  tokens,
  current,
  onPick,
}: {
  tokens: BrandTokens
  current: string
  onPick: (color: string) => void
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">Brand guidelines</div>
      <div className="fw-swatch-grid">
        {tokens.colors.palette.map((p) => (
          <button
            key={p.hex}
            type="button"
            className="fw-swatch fw-swatch--lg"
            style={{
              background: p.hex,
              outline: current.toLowerCase() === p.hex.toLowerCase() ? '2px solid var(--fg)' : 'none',
              outlineOffset: '2px',
            }}
            onClick={() => onPick(p.hex)}
            title={`${p.name} · ${p.hex}`}
          />
        ))}
      </div>
    </div>
  )
}

/* -------- Custom tab -------- */
function CustomTab({
  swatches,
  current,
  onPick,
  onAdd,
  onRemove,
}: {
  swatches: string[]
  current: string
  onPick: (color: string) => void
  onAdd: (color: string) => void
  onRemove: (color: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">Your custom colors</span>
        <button
          type="button"
          className="fw-btn"
          onClick={() => inputRef.current?.click()}
        >
          + Add
        </button>
        <input
          ref={inputRef}
          type="color"
          className="hidden"
          onChange={(e) => onAdd(e.target.value)}
        />
      </div>
      {swatches.length === 0 ? (
        <div className="text-[11px] text-[var(--muted)]">No custom colors yet — click "+ Add".</div>
      ) : (
        <div className="fw-swatch-grid">
          {swatches.map((c) => (
            <div key={c} className="relative">
              <button
                type="button"
                className="fw-swatch fw-swatch--lg"
                style={{
                  background: c,
                  outline: current.toLowerCase() === c.toLowerCase() ? '2px solid var(--fg)' : 'none',
                  outlineOffset: '2px',
                }}
                onClick={() => onPick(c)}
                title={c}
              />
              <button
                type="button"
                onClick={() => onRemove(c)}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--bg-3)] text-[10px] text-[var(--muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)]"
                aria-label={`Remove ${c}`}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------- Free tab -------- */
function FreeTab({ current, onPick }: { current: string; onPick: (color: string) => void }) {
  const [local, setLocal] = useState(current)
  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">Any color</div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={local}
          onChange={(e) => {
            setLocal(e.target.value)
            onPick(e.target.value)
          }}
          className="fw-swatch fw-swatch--lg"
          style={{ background: local, padding: 0 }}
        />
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            if (/^#[0-9A-Fa-f]{3,8}$/.test(local)) onPick(local)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
          }}
          className="fw-hex-input"
          placeholder="#000000"
          spellCheck={false}
        />
      </div>
    </div>
  )
}

/* -------- Gradient tab -------- */
function GradientTab({
  current,
  onChange,
}: {
  current: Extract<Fill, { type: 'linear-gradient' }>
  onChange: (g: Extract<Fill, { type: 'linear-gradient' }>) => void
}) {
  const stops = current.stops.length >= 2 ? current.stops : [
    { position: 0, color: '#ffffff' },
    { position: 1, color: '#000000' },
  ]
  function update(angle: number, newStops: typeof stops) {
    onChange({ type: 'linear-gradient', angle, stops: newStops })
  }
  function setStopColor(i: number, color: string) {
    const next = stops.map((s, idx) => (idx === i ? { ...s, color } : s))
    update(current.angle, next)
  }
  function setStopPosition(i: number, position: number) {
    const next = stops.map((s, idx) => (idx === i ? { ...s, position } : s))
    update(current.angle, next)
  }
  function setAngle(angle: number) {
    update(angle, stops)
  }

  const cssGradient = `linear-gradient(${current.angle}deg, ${stops
    .map((s) => `${s.color} ${Math.round(s.position * 100)}%`)
    .join(', ')})`

  return (
    <div className="space-y-3">
      <div className="text-[10px] tracking-[0.1em] uppercase text-[var(--muted)]">Linear gradient</div>
      <div className="fw-gradient-preview" style={{ background: cssGradient }} />

      <div className="space-y-2">
        {stops.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={s.color}
              onChange={(e) => setStopColor(i, e.target.value)}
              className="fw-swatch"
              style={{ background: s.color, padding: 0 }}
            />
            <input
              type="text"
              value={s.color}
              onChange={(e) => setStopColor(i, e.target.value)}
              className="fw-hex-input"
              spellCheck={false}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={s.position}
              onChange={(e) => setStopPosition(i, Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-[10px] text-[var(--muted)] w-8 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(s.position * 100)}%
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[var(--fg-2)]">Angle</span>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={current.angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-[11px] text-[var(--muted)] w-10 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {current.angle}°
        </span>
      </div>
    </div>
  )
}
