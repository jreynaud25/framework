import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { TemplateRenderer, formatToDimensions, validateSlotValues } from '@framework/renderer'
import type { Format, LayoutNode, SlotValues } from '@framework/types'
import { useCompositionStore } from '@/state/composition'
import type { CompositionPayload } from '@/data/loadComposition'
import { SlotEditors } from './SlotEditors'
import { FormatToggle } from './FormatToggle'
import { FontStatus } from './FontStatus'
import { BlockInspector } from './BlockInspector'
import { CompositionHistory } from './CompositionHistory'
import {
  applyBlockFillOverrides,
  applyBlockOffsets,
  applyConstraintOverrides,
  applyLabelOverrides,
  applySlotOrder,
  filterExcludedSlots,
  findNode,
  generateSlotKey,
  mergeLayoutWithMarks,
  mergeSchemaWithMarks,
  mergeValuesWithMarks,
} from './mergeDesignerMarks'

const API_BASE = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL
  ?? 'http://localhost:3000'

interface Props {
  data: CompositionPayload
  designerEnabled: boolean
  /** From URL ?comp=<id>. When set, load that saved composition into the editor. */
  currentComp?: string
}

export function CompositionEditor({ data, designerEnabled, currentComp }: Props) {
  const navigate = useNavigate()
  const setCurrentCompositionId = useCompositionStore((s) => s.setCurrentCompositionId)
  const currentCompositionId = useCompositionStore((s) => s.currentCompositionId)
  const setSlot = useCompositionStore((s) => s.setSlot)
  const hydrate = useCompositionStore((s) => s.hydrate)
  const slotValues = useCompositionStore((s) => s.slotValues)
  const format = useCompositionStore((s) => s.format)
  const designerMode = useCompositionStore((s) => s.designerMode)
  const marks = useCompositionStore((s) => s.marks)
  const setDesignerMode = useCompositionStore((s) => s.setDesignerMode)
  const toggleMark = useCompositionStore((s) => s.toggleMark)
  const clearMarks = useCompositionStore((s) => s.clearMarks)
  const slotLabelOverrides = useCompositionStore((s) => s.slotLabelOverrides)
  const templateNameOverride = useCompositionStore((s) => s.templateNameOverride)
  const setTemplateName = useCompositionStore((s) => s.setTemplateName)
  const excludedSlotKeys = useCompositionStore((s) => s.excludedSlotKeys)
  const selectedNodeId = useCompositionStore((s) => s.selectedNodeId)
  const setSelectedNode = useCompositionStore((s) => s.setSelectedNode)
  const blockFillOverrides = useCompositionStore((s) => s.blockFillOverrides)
  const blockOffsets = useCompositionStore((s) => s.blockOffsets)
  const setBlockOffset = useCompositionStore((s) => s.setBlockOffset)
  const slotConfigOverrides = useCompositionStore((s) => s.slotConfigOverrides)
  const slotOrder = useCompositionStore((s) => s.slotOrder)
  const excludeSlot = useCompositionStore((s) => s.excludeSlot)
  const unexcludeSlot = useCompositionStore((s) => s.unexcludeSlot)

  // Template status (draft/published/archived). Hydrated from the payload
  // and mutated in place by PATCH responses so the dock can react without
  // forcing a route reload.
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(data.status ?? 'published')
  useEffect(() => {
    setStatus(data.status ?? 'published')
  }, [data])

  // designerMode is driven by the URL (?designer=1). The dock's view toggle
  // navigates (same-tab) between designer ↔ client URLs, which flips
  // designerEnabled which flips designerMode. No in-app toggle.
  useEffect(() => {
    setDesignerMode(designerEnabled)
  }, [designerEnabled, setDesignerMode])

  // Same-tab navigation to flip between designer / client views.
  const toggleView = () => {
    void navigate({
      to: '/c/$compositionId',
      params: { compositionId: data.templateSlug },
      search: (prev) => ({ ...prev, designer: designerEnabled ? undefined : '1' }),
    })
  }

  // Load a saved composition snapshot when ?comp=<id> is set. We do this
  // AFTER the initial `hydrate` so the snapshot's slotValues overwrite the
  // template defaults rather than getting clobbered.
  const [historyRefresh, setHistoryRefresh] = useState(0)
  useEffect(() => {
    if (!currentComp) {
      setCurrentCompositionId(null)
      return
    }
    let cancelled = false
    fetch(`/api/compositions/${encodeURIComponent(currentComp)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((comp: { id: string; slotValues: SlotValues; format: Format }) => {
        if (cancelled) return
        for (const [k, v] of Object.entries(comp.slotValues)) {
          if (v) setSlot(k, v as SlotValues[string])
        }
        setCurrentCompositionId(comp.id)
      })
      .catch((err) => {
        console.error('[history] failed to load composition', err)
      })
    return () => {
      cancelled = true
    }
  }, [currentComp, setSlot, setCurrentCompositionId])

  useEffect(() => {
    const ns = `framework.${data.brandSlug}/${data.templateSlug}`
    const read = (key: string) => {
      try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : undefined
      } catch {
        return undefined
      }
    }
    hydrate({
      format: data.format,
      slotValues: data.slotValues,
      formatLabels: read(`framework.labels.${data.brandSlug}/${data.templateSlug}`) as Record<string, string> | undefined,
      slotLabelOverrides: read(`${ns}.slotLabels`) as Record<string, string> | undefined,
      templateNameOverride: (read(`${ns}.templateName`) as string | null | undefined) ?? null,
    })
  }, [hydrate, data])

  // Persist renames to localStorage so they survive reloads.
  useEffect(() => {
    const ns = `framework.${data.brandSlug}/${data.templateSlug}`
    try {
      localStorage.setItem(`${ns}.slotLabels`, JSON.stringify(slotLabelOverrides))
    } catch {
      /* ignore */
    }
  }, [slotLabelOverrides, data])

  useEffect(() => {
    const ns = `framework.${data.brandSlug}/${data.templateSlug}`
    try {
      if (templateNameOverride === null) {
        localStorage.removeItem(`${ns}.templateName`)
      } else {
        localStorage.setItem(`${ns}.templateName`, JSON.stringify(templateNameOverride))
      }
    } catch {
      /* ignore */
    }
  }, [templateNameOverride, data])

  const currentVariant = useMemo(() => {
    if (!data.variants || data.variants.length === 0) return null
    return data.variants.find((v) => v.format === format) ?? data.variants[0] ?? null
  }, [data.variants, format])

  const sourceLayout = currentVariant?.layout ?? data.layout
  const effectiveLayout = useMemo(
    () =>
      applyBlockOffsets(
        applyBlockFillOverrides(mergeLayoutWithMarks(sourceLayout, marks), blockFillOverrides),
        blockOffsets,
      ),
    [sourceLayout, marks, blockFillOverrides, blockOffsets],
  )
  // Effective slotSchema: marks merged → label overrides applied → excluded keys filtered.
  // In designer mode we keep ALL slots visible (so the designer can un-exclude
  // by deleting / re-toggling), but client preview filters excluded keys.
  // Sidebar shows ONLY currently-editable slots in both modes. Excluding a
  // slot removes it from the sidebar — to re-add, the designer clicks the
  // corresponding element in the canvas (the canvas is the source of truth
  // for "what's editable"). This keeps the left panel uncluttered: every
  // row corresponds to a green-outlined element in the design.
  const effectiveSchema = useMemo(() => {
    const withMarks = mergeSchemaWithMarks(data.slotSchema, marks)
    const labelled = applyLabelOverrides(withMarks, slotLabelOverrides)
    const constrained = applyConstraintOverrides(labelled, slotConfigOverrides)
    const ordered = applySlotOrder(constrained, slotOrder)
    return filterExcludedSlots(ordered, excludedSlotKeys)
  }, [data.slotSchema, marks, slotLabelOverrides, slotConfigOverrides, slotOrder, excludedSlotKeys])
  const effectiveValues = useMemo(() => mergeValuesWithMarks(slotValues, marks), [slotValues, marks])
  const effectiveName = templateNameOverride ?? data.templateName
  const markedSlotKeys = useMemo(
    () => new Set(Object.values(marks).map((m) => m.slotKey)),
    [marks],
  )

  const errors = useMemo(
    () => validateSlotValues(effectiveSchema, effectiveValues),
    [effectiveSchema, effectiveValues],
  )

  const imageResolver = useMemo(
    () => (key: string) => {
      if (/^(blob:|data:|https?:\/\/)/.test(key)) return key
      return `${data.imageBaseUrl}/${key}`
    },
    [data.imageBaseUrl],
  )

  const previewRef = useRef<HTMLDivElement>(null)
  // Index of editable node ids — includes designer marks AND existing slot
  // keys from the published schema (minus exclusions). Drives the green
  // outline so the designer sees ALL editable elements without doing
  // anything; clicking unmark/exclude removes the outline.
  const editableNodeIds = useMemo(() => {
    const ids = new Set(Object.keys(marks))
    const excluded = new Set(excludedSlotKeys)
    function walk(n: LayoutNode) {
      if (n.type === 'text' || n.type === 'image') {
        if (n.slotKey && !excluded.has(n.slotKey)) ids.add(n.id)
      }
      if (n.type === 'frame') n.children.forEach(walk)
    }
    walk(sourceLayout)
    return ids
  }, [marks, excludedSlotKeys, sourceLayout])

  useEffect(() => {
    const root = previewRef.current
    if (!root) return
    root.querySelectorAll<HTMLElement>('[data-framework-id]').forEach((el) => {
      const id = el.getAttribute('data-framework-id')
      if (!id) return
      if (designerMode && editableNodeIds.has(id)) el.setAttribute('data-marked', 'true')
      else el.removeAttribute('data-marked')
      if (id === selectedNodeId) el.setAttribute('data-selected', 'true')
      else el.removeAttribute('data-selected')
    })
  })

  // -------- Drag-to-position --------
  // A drag starts on mousedown OVER the currently-selected node. Threshold
  // of 4 screen px before we commit to dragging — below that it's a click.
  // Mouse delta is converted to canvas units via the actual rendered scale
  // of `[data-framework-root]` (uniform aspect, so width ratio = scale).
  const dragRef = useRef<{
    startX: number
    startY: number
    nodeId: string
    baseOffset: { x: number; y: number }
    scale: number
    dragging: boolean
  } | null>(null)
  const draggingRef = useRef(false)

  // Image-crop drag (CLIENT view): drag a cover-fit image slot to reposition
  // its crop via objectPosition. Independent from designer block-drag.
  const cropRef = useRef<{
    startX: number
    startY: number
    slotKey: string
    base: { x: number; y: number }
    rect: { w: number; h: number }
    dragging: boolean
  } | null>(null)

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return

    // ---- Client crop drag on an image slot ----
    if (!designerEnabled || !designerMode) {
      const img = (e.target as HTMLElement).closest<HTMLImageElement>('img[data-framework-id]')
      if (img) {
        const nodeId = img.getAttribute('data-framework-id')
        if (nodeId) {
          const node = findNode(sourceLayout, nodeId)
          if (node && node.type === 'image' && node.slotKey) {
            const slot = effectiveSchema.find((s) => s.key === node.slotKey)
            const hasUploaded =
              slotValues[node.slotKey]?.type === 'image' &&
              !!(slotValues[node.slotKey] as { r2Key?: string }).r2Key
            const fit = slot?.type === 'image' ? slot.constraints.fit ?? 'cover' : 'cover'
            if (hasUploaded && fit === 'cover') {
              const rect = img.getBoundingClientRect()
              const slotValue = slotValues[node.slotKey] as
                | { type: 'image'; objectPosition?: { x: number; y: number } }
                | undefined
              const base = slotValue?.objectPosition ?? { x: 50, y: 50 }
              cropRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                slotKey: node.slotKey,
                base,
                rect: { w: rect.width, h: rect.height },
                dragging: false,
              }
              e.preventDefault()
              return
            }
          }
        }
      }
    }

    // ---- Designer block-drag (existing) ----
    if (!designerEnabled || !designerMode) return
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-framework-id]')
    if (!target) return
    const nodeId = target.getAttribute('data-framework-id')
    if (!nodeId || nodeId !== selectedNodeId) return
    const root = previewRef.current?.querySelector<HTMLElement>('[data-framework-root]')
    if (!root) return
    const rect = root.getBoundingClientRect()
    if (rect.width <= 0) return
    // Source layout root canvas width (intrinsic units).
    const canvasWidth =
      sourceLayout.type === 'frame' && typeof sourceLayout.style?.width === 'number'
        ? sourceLayout.style.width
        : data.canvas?.width ?? 1080
    const scale = rect.width / canvasWidth

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      nodeId,
      baseOffset: blockOffsets[nodeId] ?? { x: 0, y: 0 },
      scale: scale || 1,
      dragging: false,
    }
    draggingRef.current = false
  }

  function handleMouseMove(e: React.MouseEvent) {
    // Image crop drag
    const crop = cropRef.current
    if (crop) {
      const dx = e.clientX - crop.startX
      const dy = e.clientY - crop.startY
      if (!crop.dragging && Math.hypot(dx, dy) < 3) return
      crop.dragging = true
      draggingRef.current = true
      // Convert mouse delta to objectPosition delta. Drag right → image
      // shifts right (objectPosition X decreases). 1 container width = 100%.
      const nextX = Math.max(0, Math.min(100, crop.base.x - (dx / crop.rect.w) * 100))
      const nextY = Math.max(0, Math.min(100, crop.base.y - (dy / crop.rect.h) * 100))
      const existing = slotValues[crop.slotKey]
      if (existing?.type === 'image') {
        const setSlot = useCompositionStore.getState().setSlot
        setSlot(crop.slotKey, { ...existing, objectPosition: { x: nextX, y: nextY } })
      }
      e.preventDefault()
      return
    }

    // Block position drag
    const drag = dragRef.current
    if (!drag) return
    const dxScreen = e.clientX - drag.startX
    const dyScreen = e.clientY - drag.startY
    if (!drag.dragging && Math.hypot(dxScreen, dyScreen) < 4) return
    drag.dragging = true
    draggingRef.current = true
    const dxCanvas = dxScreen / drag.scale
    const dyCanvas = dyScreen / drag.scale
    setBlockOffset(drag.nodeId, {
      x: Math.round(drag.baseOffset.x + dxCanvas),
      y: Math.round(drag.baseOffset.y + dyCanvas),
    })
    e.preventDefault()
  }

  function handleMouseUp() {
    if (dragRef.current?.dragging || cropRef.current?.dragging) {
      requestAnimationFrame(() => {
        draggingRef.current = false
      })
    }
    dragRef.current = null
    cropRef.current = null
  }

  function handlePreviewClick(e: React.MouseEvent) {
    // If a drag just ended, swallow this click so we don't deselect.
    if (draggingRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (!designerEnabled || !designerMode) return
    const target = e.target as HTMLElement
    const hit = target.closest('[data-framework-id]')
    if (!hit) return
    e.preventDefault()
    e.stopPropagation()
    const nodeId = hit.getAttribute('data-framework-id')
    if (!nodeId) return

    const node = findNode(sourceLayout, nodeId)
    if (!node) return

    // Frame/shape: select for color editing — but only if the node already
    // has a fill (we only modify existing fills, never add backdrops).
    if (node.type === 'frame' || node.type === 'shape') {
      const hasFill =
        (node.style?.fills && node.style.fills.length > 0) ||
        typeof node.style?.background === 'string'
      if (hasFill) setSelectedNode(nodeId)
      return
    }

    const slotType = slotTypeFor(node)
    if (!slotType) return

    // 1) Designer-mark exists for this node → toggle it off.
    if (marks[nodeId]) {
      toggleMark({ nodeId, slotKey: marks[nodeId]!.slotKey, type: slotType, label: '' })
      return
    }

    // 2) Node has an EXISTING slotKey from the published schema (Figma push
    //    or a prior Publish). Click → flip the exclusion (un-editable in
    //    client view). No duplicate mark gets created.
    const existingSlotKey =
      (node.type === 'text' || node.type === 'image') ? node.slotKey : undefined
    if (existingSlotKey) {
      if (excludedSlotKeys.includes(existingSlotKey)) unexcludeSlot(existingSlotKey)
      else excludeSlot(existingSlotKey)
      return
    }

    // 3) Brand-new editable element — create an implicit mark.
    const existingKeys = new Set([
      ...data.slotSchema.map((s) => s.key),
      ...Object.values(marks).map((m) => m.slotKey),
    ])
    const labelSrc = node.type === 'text' ? (node.defaultText ?? '') : nodeId
    const slotKey = generateSlotKey(labelSrc, slotType, existingKeys, nodeId)
    const label =
      slotType === 'text'
        ? humanLabel(node.type === 'text' ? node.defaultText : '') || `Text ${slotKey}`
        : slotType === 'image'
          ? `Image ${slotKey}`
          : `Color ${slotKey}`
    toggleMark({
      nodeId,
      slotKey,
      type: slotType,
      defaultValue: slotType === 'text' && node.type === 'text' ? node.defaultText : undefined,
      label,
    })
  }

  const publishLayouts = useMemo(() => {
    if (!data.variants || data.variants.length === 0) return undefined
    return data.variants.map((v) => ({
      ...v,
      layout: applyBlockOffsets(
        applyBlockFillOverrides(mergeLayoutWithMarks(v.layout, marks), blockFillOverrides),
        blockOffsets,
      ),
    }))
  }, [data.variants, marks, blockFillOverrides, blockOffsets])

  const publishedSchema = useMemo(() => {
    const withMarks = mergeSchemaWithMarks(data.slotSchema, marks)
    const labelled = applyLabelOverrides(withMarks, slotLabelOverrides)
    const constrained = applyConstraintOverrides(labelled, slotConfigOverrides)
    const ordered = applySlotOrder(constrained, slotOrder)
    return filterExcludedSlots(ordered, excludedSlotKeys)
  }, [data.slotSchema, marks, slotLabelOverrides, slotConfigOverrides, slotOrder, excludedSlotKeys])

  const requiredErrors = errors.some((e) => e.reason === 'required')

  return (
    <div className="grid h-full grid-cols-[300px_1fr] overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ============ LEFT SIDEBAR ============ */}
      <aside className="flex h-full flex-col overflow-y-auto border-r border-[var(--line)] px-6 py-6">
        <header className="flex flex-col pointer-events-auto">
          <Link
            to="/b/$brandSlug"
            params={{ brandSlug: data.brandSlug }}
            search={designerEnabled ? { designer: '1' as const } : undefined}
            className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] hover:text-[var(--fg)]"
          >
            ← {data.brandSlug}
          </Link>
          <EditableTemplateName
            value={effectiveName}
            designerMode={designerMode}
            onChange={(v) => setTemplateName(v === data.templateName ? null : v)}
          />
        </header>

        <div className="fw-divider my-6" />

        <FormatToggle
          formats={data.formats as Format[]}
          storageKey={`${data.brandSlug}/${data.templateSlug}`}
        />

        <div className="fw-divider my-6" />

        <FontStatus layout={sourceLayout} tokens={data.tokens} />

        {designerEnabled && designerMode && selectedNodeId ? (
          <>
            <BlockInspector layout={sourceLayout} tokens={data.tokens} />
            <div className="fw-divider my-6" />
          </>
        ) : null}

        <SlotEditors
          schema={effectiveSchema}
          errors={errors}
          palette={data.tokens.colors.palette.map((p) => p.hex)}
          markedSlotKeys={markedSlotKeys}
        />

        <div className="fw-divider my-6" />

        <CompositionHistory
          brandSlug={data.brandSlug}
          templateSlug={data.templateSlug}
          currentCompositionId={currentCompositionId}
          refreshKey={historyRefresh}
          fallbackCanvas={data.canvas ?? currentVariant?.canvas}
          designerEnabled={designerEnabled}
        />
      </aside>

      {/* ============ MAIN CANVAS ============ */}
      <main className="grid h-full overflow-hidden">
        <section
          ref={previewRef}
          onClickCapture={handlePreviewClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative grid place-items-center overflow-hidden p-10 ${designerMode ? 'fw-designer' : ''}`}
        >
          {designerMode ? <DesignerStyles /> : null}
          <PreviewStage format={format} layout={effectiveLayout}>
            <TemplateRenderer
              layout={effectiveLayout}
              tokens={data.tokens}
              slotValues={effectiveValues}
              format={format}
              imageResolver={imageResolver}
            />
          </PreviewStage>

          <FloatingDock
            designerEnabled={designerEnabled}
            markCount={Object.keys(marks).length}
            toggleView={toggleView}
            brandSlug={data.brandSlug}
            templateSlug={data.templateSlug}
            format={format}
            slotValues={effectiveValues}
            disabledExport={requiredErrors}
            currentCompositionId={currentCompositionId}
            status={status}
            onStatusChange={setStatus}
            onSavedSnapshot={(id) => {
              setCurrentCompositionId(id)
              setHistoryRefresh((n) => n + 1)
              // Reflect the just-saved composition in the URL so reload /
              // share links land on the right entry.
              if (id !== currentComp) {
                void navigate({
                  to: '/c/$compositionId',
                  params: { compositionId: data.templateSlug },
                  search: (prev) => ({ ...prev, comp: id }),
                  replace: true,
                })
              }
            }}
            publish={async () => {
              const ok = await publishForClient({
                brandSlug: data.brandSlug,
                templateSlug: data.templateSlug,
                templateName: effectiveName,
                formats: data.formats,
                variants: publishLayouts,
                layoutSchema: effectiveLayout,
                slotSchema: publishedSchema,
                canvas: data.canvas ?? currentVariant?.canvas,
              })
              if (ok) {
                clearMarks()
                // Stay in designer mode so the designer can keep iterating.
                // The bare client URL opens in a new tab (handled by the dock).
              }
              return ok
            }}
          />

          {designerMode ? (
            <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-[var(--bg-3)] px-3 py-1.5 text-[11px] text-[var(--fg-2)] border border-[var(--line-2)]">
              Click any text or image in the preview to make it client-editable
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

function EditableTemplateName({
  value,
  designerMode,
  onChange,
}: {
  value: string
  designerMode: boolean
  onChange: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  if (!designerMode || !editing) {
    return (
      <h1
        className={
          designerMode
            ? 'fw-label--editable text-[15px] font-medium leading-tight'
            : 'text-[15px] font-medium leading-tight'
        }
        onClick={() => designerMode && setEditing(true)}
        title={designerMode ? 'Click to rename' : undefined}
        style={{ display: 'inline-block' }}
      >
        {value}
      </h1>
    )
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        onChange(draft.trim() || value)
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
      className="fw-label--editing text-[15px] font-medium leading-tight"
      style={{ minWidth: 200 }}
    />
  )
}

function slotTypeFor(node: LayoutNode): 'text' | 'image' | 'color' | null {
  if (node.type === 'text') return 'text'
  if (node.type === 'image') return 'image'
  if (node.type === 'frame' || node.type === 'shape') return 'color'
  return null
}

function humanLabel(s: string | undefined): string {
  if (!s) return ''
  const clean = s.trim().replace(/\s+/g, ' ')
  if (clean.length <= 24) return clean
  return clean.slice(0, 24) + '…'
}


function DesignerStyles() {
  return (
    <style>{`
      .fw-designer [data-framework-id] {
        outline: 1px dashed rgba(255, 255, 255, 0.15);
        outline-offset: -1px;
        cursor: pointer;
        transition: outline-color 100ms ease;
      }
      .fw-designer [data-framework-id]:hover {
        outline: 2px solid var(--highlight);
        outline-offset: -2px;
      }
      .fw-designer [data-marked] {
        outline: 2px solid var(--highlight) !important;
        outline-offset: -2px;
      }
    `}</style>
  )
}

/**
 * Floating bottom-center dock: primary actions live here instead of in the
 * sidebar. Matches the "Export MP4 0%" pattern from imagetool.paulsoulhiard.
 */
function FloatingDock({
  designerEnabled,
  markCount,
  toggleView,
  brandSlug,
  templateSlug,
  format,
  slotValues,
  disabledExport,
  publish,
  currentCompositionId,
  onSavedSnapshot,
  status,
  onStatusChange,
}: {
  designerEnabled: boolean
  markCount: number
  toggleView: () => void
  brandSlug: string
  templateSlug: string
  format: Format
  slotValues: SlotValues
  disabledExport: boolean
  publish: () => Promise<boolean>
  currentCompositionId: string | null
  onSavedSnapshot: (id: string) => void
  status: 'draft' | 'published' | 'archived'
  onStatusChange: (s: 'draft' | 'published' | 'archived') => void
}) {
  const [busy, setBusy] = useState<'png' | 'svg' | 'publish' | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  async function patchStatus(next: 'draft' | 'published' | 'archived'): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/templates/${encodeURIComponent(brandSlug)}/${encodeURIComponent(templateSlug)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function exportFile(mime: 'png' | 'svg') {
    setBusy(mime)
    setStatusMsg(null)
    setProgress(0)
    try {
      // 1) Auto-save the composition snapshot BEFORE rendering — even if the
      //    export call fails, the client's edits are persisted in history.
      void persistSnapshot()

      const res = await fetch(`${API_BASE}/api/exports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brandSlug, templateSlug, format, mime, scale: 2, slotValues }),
      })
      if (!res.ok) {
        setStatusMsg(`Failed ${res.status}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        res.headers.get('content-disposition')?.match(/filename="(.+?)"/)?.[1] ?? `export.${mime}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setProgress(100)
      setStatusMsg(`Saved ✓`)
      window.setTimeout(() => setStatusMsg(null), 1500)
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
      window.setTimeout(() => setProgress(null), 800)
    }
  }

  /**
   * Save the current composition. PUT if we're already editing an entry,
   * POST otherwise. Either way, calls back with the resulting id so the
   * editor can update `?comp=<id>` and refresh the history list.
   */
  async function persistSnapshot() {
    try {
      if (currentCompositionId) {
        const res = await fetch(`${API_BASE}/api/compositions/${currentCompositionId}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slotValues, format }),
        })
        if (res.ok) {
          const json = (await res.json()) as { id: string }
          onSavedSnapshot(json.id)
        }
      } else {
        const res = await fetch(`${API_BASE}/api/compositions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ brandSlug, templateSlug, format, slotValues }),
        })
        if (res.ok) {
          const json = (await res.json()) as { id: string }
          onSavedSnapshot(json.id)
        }
      }
    } catch (err) {
      console.error('[snapshot] failed to persist', err)
    }
  }

  return (
    <div className="fw-dock">
      {/* One toggle — flips label/destination based on current view. */}
      <button
        className="fw-dock-btn"
        onClick={toggleView}
        title={designerEnabled ? 'Preview as the client sees it' : 'Switch back to designer tools'}
      >
        {designerEnabled ? 'View as client' : 'View as designer'}
      </button>

      <div className="fw-dock__sep" />

      {designerEnabled ? (
        <>
          {/* Status pill — visible at a glance */}
          <span
            className="fw-dock-btn__progress"
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: status === 'draft' ? '#3a3a00' : status === 'archived' ? '#3a0000' : 'transparent',
              color: status === 'draft' ? '#ffd966' : status === 'archived' ? '#ff8a8a' : 'var(--muted)',
            }}
          >
            {status}
          </span>

          <button
            className="fw-dock-btn"
            data-primary="true"
            disabled={busy !== null}
            onClick={async () => {
              setBusy('publish')
              setStatusMsg(null)
              try {
                const ok = await publish()
                if (ok) {
                  setStatusMsg('Published ✓ — client view live')
                  onStatusChange('published')
                  toggleView()
                  window.setTimeout(() => setStatusMsg(null), 2500)
                } else {
                  setStatusMsg('Failed')
                  window.setTimeout(() => setStatusMsg(null), 2200)
                }
              } finally {
                setBusy(null)
              }
            }}
          >
            {busy === 'publish' ? 'Publishing…' : `Publish${markCount > 0 ? ` · ${markCount}` : ''}`}
          </button>

          {status === 'archived' ? (
            <button
              className="fw-dock-btn"
              disabled={busy !== null}
              onClick={async () => {
                const ok = await patchStatus('published')
                if (ok) {
                  onStatusChange('published')
                  setStatusMsg('Unarchived ✓')
                  window.setTimeout(() => setStatusMsg(null), 1800)
                }
              }}
              title="Make this template active again"
            >
              Unarchive
            </button>
          ) : (
            <button
              className="fw-dock-btn"
              disabled={busy !== null || status === 'draft'}
              onClick={async () => {
                if (!confirm('Archive this template? Clients will see it as read-only.')) return
                const ok = await patchStatus('archived')
                if (ok) {
                  onStatusChange('archived')
                  setStatusMsg('Archived')
                  window.setTimeout(() => setStatusMsg(null), 1800)
                }
              }}
              title="Hide from new client use (still visible in archive)"
            >
              Archive
            </button>
          )}
        </>
      ) : (
        <>
          <button
            className="fw-dock-btn"
            data-primary="true"
            disabled={disabledExport || busy !== null}
            onClick={() => exportFile('png')}
          >
            {busy === 'png' ? 'Rendering…' : 'Export PNG'}
            {progress !== null && busy === 'png' ? (
              <span className="fw-dock-btn__progress">{progress}%</span>
            ) : null}
          </button>
          <button
            className="fw-dock-btn"
            disabled={disabledExport || busy !== null}
            onClick={() => exportFile('svg')}
          >
            {busy === 'svg' ? 'Rendering…' : 'SVG'}
          </button>
        </>
      )}

      {statusMsg ? <span className="fw-dock-btn__progress ml-1">{statusMsg}</span> : null}
    </div>
  )
}

async function publishForClient(payload: {
  brandSlug: string
  templateSlug: string
  templateName: string
  formats: Format[]
  variants?: Array<{ format: Format; label?: string; canvas: { width: number; height: number }; layout: LayoutNode; figmaNodeId: string }>
  layoutSchema: LayoutNode
  slotSchema: unknown[]
  canvas?: { width: number; height: number }
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/templates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        brandSlug: payload.brandSlug,
        slug: payload.templateSlug,
        name: payload.templateName,
        figmaFileKey: 'designer-edit',
        figmaNodeId: 'designer-edit',
        formats: payload.formats,
        canvas: payload.canvas,
        variants: payload.variants,
        layoutSchema: payload.layoutSchema,
        slotSchema: payload.slotSchema,
      }),
    })
    if (!res.ok) {
      console.error('[publish] failed', res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('[publish] error', err)
    return false
  }
}

/**
 * Center + auto-fit the rendered template inside the available viewport.
 */
function PreviewStage({
  children,
  format,
  layout,
}: {
  children: React.ReactNode
  format: Format
  layout: LayoutNode
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const dims = useMemo(() => {
    if (layout.type === 'frame') {
      const w = layout.style?.width
      const h = layout.style?.height
      if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
        return { width: w, height: h }
      }
    }
    return formatToDimensions(format)
  }, [format, layout])

  useEffect(() => {
    const el = wrapperRef.current?.parentElement
    if (!el) return
    const compute = () => {
      const padding = 80 // p-10 on the section
      const bottomDock = 80 // leave room for the floating dock
      const availW = Math.max(0, el.clientWidth - padding)
      const availH = Math.max(0, el.clientHeight - padding - bottomDock)
      const raw = Math.min(availW / dims.width, availH / dims.height, 1)
      // Round to avoid sub-pixel oscillations that could feed back into
      // ResizeObserver via the scaled child's bounding box.
      const s = Number.isFinite(raw) && raw > 0 ? Math.round(raw * 1000) / 1000 : 1
      setScale((prev) => (Math.abs(prev - s) < 0.0005 ? prev : s))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [dims])

  return (
    <div
      ref={wrapperRef}
      style={{
        width: dims.width * scale,
        height: dims.height * scale,
      }}
    >
      <div
        style={{
          width: dims.width,
          height: dims.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}
