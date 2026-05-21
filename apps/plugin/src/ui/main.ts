import type {
  ClassifyResult,
  Destination,
  ExtractedAsset,
  ExtractTemplateResult,
  FrameClassification,
  LogoVariant,
  PluginMessage,
  PushBundle,
  SelectionSummary,
  UIMessage,
} from '../types'

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T

interface BrandRecord {
  id: string
  slug: string
  name: string
  industry?: string
  primaryColor?: string
  clientEmail?: string
  createdAt?: string
}

let activeTab: 'push' | 'tokens' | 'settings' = 'push'
let classification: FrameClassification[] = []
/** Per-frame designer override of the suggested destination. Keyed by node id. */
let overrides: Record<string, Destination> = {}
let brands: BrandRecord[] = []
let selectedBrandSlug: string | null = null

/* ──────────────────────────────────────────────────────── */
/*  Storage                                                  */
/* ──────────────────────────────────────────────────────── */
const LS = {
  brand: 'framework.brand',
  endpoint: 'framework.endpoint',
  editor: 'framework.editor',
} as const

function lsGet(k: string, fallback = ''): string {
  try { return localStorage.getItem(k) ?? fallback } catch { return fallback }
}
function lsSet(k: string, v: string): void {
  try { localStorage.setItem(k, v) } catch { /* ignore */ }
}

function getEndpoint(): string {
  return ($('#endpoint') as HTMLInputElement).value.trim().replace(/\/$/, '')
}
function getEditorBase(): string {
  return ($('#editor-base') as HTMLInputElement).value.trim().replace(/\/$/, '')
}

/* ──────────────────────────────────────────────────────── */
/*  UI helpers                                               */
/* ──────────────────────────────────────────────────────── */

function setTab(name: typeof activeTab): void {
  activeTab = name
  document.querySelectorAll('.tab').forEach((el) => {
    el.setAttribute('aria-selected', String((el as HTMLElement).dataset.tab === name))
  })
  document.querySelectorAll('.panel').forEach((el) => {
    ;(el as HTMLElement).hidden = (el as HTMLElement).dataset.panel !== name
  })
  refreshPushDisabled()
}

function logLine(text: string, kind?: 'err' | 'ok'): void {
  const log = $('#log') as HTMLDivElement
  const span = document.createElement('div')
  if (kind) span.className = kind
  span.textContent = text
  log.append(span)
  log.scrollTop = log.scrollHeight
}

function logLink(text: string, href: string): void {
  const log = $('#log') as HTMLDivElement
  const a = document.createElement('a')
  a.textContent = text
  a.href = href
  a.target = '_blank'
  a.rel = 'noopener'
  a.className = 'log-link'
  const wrap = document.createElement('div')
  wrap.append(a)
  log.append(wrap)
  log.scrollTop = log.scrollHeight
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!),
  )
}

function postToCode(msg: UIMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*')
}

function destinationOf(frame: FrameClassification): Destination {
  return overrides[frame.id] ?? frame.suggested
}

function refreshPushDisabled(): void {
  const push = $('#push') as HTMLButtonElement
  if (activeTab === 'push') {
    const hasReal = classification.some(
      (f) => destinationOf(f).kind !== 'ignore',
    )
    push.disabled = !selectedBrandSlug || !hasReal
  } else if (activeTab === 'tokens') {
    push.disabled = !selectedBrandSlug
  } else {
    push.disabled = true
  }
}

/* ──────────────────────────────────────────────────────── */
/*  Selection rendering                                      */
/* ──────────────────────────────────────────────────────── */

function renderSelectionSummary(s: SelectionSummary): void {
  if (s.count === 0) {
    classification = []
    overrides = {}
    $('#frame-list').innerHTML =
      '<div class="empty">Select one or more frames in Figma to start.</div>'
    refreshPushDisabled()
    return
  }
  // Re-classify whenever selection changes.
  postToCode({ type: 'request-classify-selection' })
}

function renderClassification(payload: ClassifyResult): void {
  classification = payload.frames
  // Reset overrides for frames no longer in selection.
  const ids = new Set(classification.map((f) => f.id))
  for (const id of Object.keys(overrides)) {
    if (!ids.has(id)) delete overrides[id]
  }
  const list = $('#frame-list')
  if (classification.length === 0) {
    list.innerHTML =
      '<div class="empty">Select one or more frames in Figma to start.</div>'
    refreshPushDisabled()
    return
  }
  list.innerHTML = classification.map(renderFrameCard).join('')
  // Wire up the controls inside each card.
  classification.forEach(wireCardControls)
  refreshPushDisabled()
}

function renderFrameCard(frame: FrameClassification): string {
  const dest = destinationOf(frame)
  const kindOptions = [
    { v: 'logo', label: 'Logo' },
    { v: 'photo', label: 'Photography' },
    { v: 'pattern', label: 'Pattern' },
    { v: 'icon', label: 'Icon' },
    { v: 'color', label: 'Color (palette)' },
    { v: 'typography', label: 'Typography (role)' },
    { v: 'template', label: 'Template' },
    { v: 'ignore', label: 'Ignore' },
  ]

  return `
    <div class="frame-card" data-frame="${frame.id}">
      <div class="frame-card__head">
        <span class="frame-card__name">${escapeHtml(frame.name)}</span>
        <span class="frame-card__dim">${frame.width} × ${frame.height}</span>
      </div>
      <div class="frame-card__why">${describeWhy(frame)}</div>
      <div class="frame-card__dest">
        <label>Push as</label>
        <select class="frame-card__kind">
          ${kindOptions
            .map(
              (o) =>
                `<option value="${o.v}" ${dest.kind === o.v ? 'selected' : ''}>${o.label}</option>`,
            )
            .join('')}
        </select>
      </div>
      ${renderSubFields(frame, dest)}
    </div>
  `
}

function renderSubFields(frame: FrameClassification, dest: Destination): string {
  if (dest.kind === 'logo') {
    const variants: LogoVariant[] = [
      'primary',
      'wordmark',
      'symbol',
      'monochrome',
      'inverted',
    ]
    return `
      <div class="frame-card__sub">
        <label>Variant</label>
        <select class="frame-card__variant">
          ${variants
            .map(
              (v) =>
                `<option value="${v}" ${v === dest.variant ? 'selected' : ''}>${v}</option>`,
            )
            .join('')}
        </select>
      </div>
    `
  }
  if (dest.kind === 'color') {
    const defaultName = dest.name ?? slugify(frame.name)
    return `
      <div class="frame-card__sub">
        <label>Color name</label>
        <input class="frame-card__color-name" type="text" value="${escapeHtml(defaultName)}" placeholder="primary" />
      </div>
    `
  }
  if (dest.kind === 'typography') {
    return `
      <div class="frame-card__sub">
        <label>Role</label>
        <select class="frame-card__role">
          ${['display', 'heading', 'body', 'caption', 'label', 'mono']
            .map(
              (r) =>
                `<option value="${r}" ${r === dest.role ? 'selected' : ''}>${r}</option>`,
            )
            .join('')}
        </select>
      </div>
    `
  }
  return ''
}

function describeWhy(frame: FrameClassification): string {
  const h = frame.hints
  if (h.isText) return 'detected as text → typography'
  if (h.hasSlots) return 'contains slot/lock layers → template'
  if (h.isSolidRect) return 'solid-fill rectangle → color'
  if (h.hasImageFill) return 'has image fill → photo'
  if (h.size.w > 0 && h.size.w <= 100 && h.size.h <= 100) return 'small vectorial → icon'
  return 'frame → template'
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function wireCardControls(frame: FrameClassification): void {
  const card = document.querySelector<HTMLDivElement>(`[data-frame="${frame.id}"]`)
  if (!card) return

  const kindSelect = card.querySelector<HTMLSelectElement>('.frame-card__kind')!
  kindSelect.addEventListener('change', () => {
    const kind = kindSelect.value as Destination['kind']
    // Initialize destination with sensible defaults for this kind
    let next: Destination
    if (kind === 'logo') next = { kind: 'logo', variant: 'primary' }
    else if (kind === 'color') next = { kind: 'color', name: slugify(frame.name) }
    else if (kind === 'typography') next = { kind: 'typography', role: 'body' }
    else next = { kind } as Destination
    overrides[frame.id] = next
    // Re-render this card to swap conditional sub-fields
    rerenderCard(frame.id)
    refreshPushDisabled()
  })

  const variantSelect = card.querySelector<HTMLSelectElement>('.frame-card__variant')
  variantSelect?.addEventListener('change', () => {
    const current = destinationOf(frame)
    if (current.kind !== 'logo') return
    overrides[frame.id] = { kind: 'logo', variant: variantSelect.value as LogoVariant }
  })

  const colorNameInput = card.querySelector<HTMLInputElement>('.frame-card__color-name')
  colorNameInput?.addEventListener('input', () => {
    const current = destinationOf(frame)
    if (current.kind !== 'color') return
    overrides[frame.id] = { kind: 'color', name: colorNameInput.value }
  })

  const roleSelect = card.querySelector<HTMLSelectElement>('.frame-card__role')
  roleSelect?.addEventListener('change', () => {
    const current = destinationOf(frame)
    if (current.kind !== 'typography') return
    overrides[frame.id] = { kind: 'typography', role: roleSelect.value }
  })
}

function rerenderCard(frameId: string): void {
  const frame = classification.find((f) => f.id === frameId)
  if (!frame) return
  const card = document.querySelector<HTMLDivElement>(`[data-frame="${frameId}"]`)
  if (!card) return
  card.outerHTML = renderFrameCard(frame)
  wireCardControls(frame)
}

/* ──────────────────────────────────────────────────────── */
/*  Brands                                                   */
/* ──────────────────────────────────────────────────────── */

async function loadBrands(): Promise<void> {
  const endpoint = getEndpoint()
  const select = $('#brand-select') as HTMLSelectElement
  try {
    const res = await fetch(`${endpoint}/api/brands`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { brands: BrandRecord[] }
    brands = data.brands
    populateBrandSelect()
  } catch (err) {
    select.innerHTML = '<option value="">— Couldn\'t reach Framework —</option>'
    logLine(`error: couldn't load brands (${err instanceof Error ? err.message : String(err)})`, 'err')
  }
}

function populateBrandSelect(): void {
  const select = $('#brand-select') as HTMLSelectElement
  const last = lsGet(LS.brand)
  if (brands.length === 0) {
    select.innerHTML = '<option value="">— No brands yet — create one below</option>'
    selectedBrandSlug = null
    refreshPushDisabled()
    return
  }
  const opts = brands
    .map(
      (b) =>
        `<option value="${escapeHtml(b.slug)}" ${b.slug === last ? 'selected' : ''}>${escapeHtml(b.name)} · ${escapeHtml(b.slug)}</option>`,
    )
    .join('')
  select.innerHTML = `<option value="">— Pick a brand —</option>${opts}`
  selectedBrandSlug = select.value || null
  refreshPushDisabled()
}

function showCreateError(msg: string | null): void {
  const el = $('#new-brand-error') as HTMLDivElement
  if (msg) { el.textContent = msg; el.hidden = false } else { el.textContent = ''; el.hidden = true }
}

async function submitNewBrand(): Promise<void> {
  showCreateError(null)
  const name = ($('#new-brand-name') as HTMLInputElement).value.trim()
  if (name.length < 2) { showCreateError('Brand name too short'); return }
  const slug = slugify(name)
  if (!/^[a-z0-9-]{2,}$/.test(slug)) { showCreateError("Can't derive a slug from this name — try another"); return }

  const endpoint = getEndpoint()
  try {
    const res = await fetch(`${endpoint}/api/brands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    })
    if (res.status === 409) { showCreateError('A brand with that name already exists'); return }
    if (!res.ok) { showCreateError(`Failed (HTTP ${res.status})`); return }
    const brand = (await res.json()) as BrandRecord
    brands.push(brand)
    lsSet(LS.brand, brand.slug)
    populateBrandSelect()
    ;($('#brand-select') as HTMLSelectElement).value = brand.slug
    selectedBrandSlug = brand.slug
    logLine(`✓ created brand "${brand.name}"`, 'ok')
    closeCreateForm()
    refreshPushDisabled()
  } catch (err) {
    showCreateError(err instanceof Error ? err.message : String(err))
  }
}

function openCreateForm(): void {
  ;($('#brand-create-form') as HTMLDivElement).hidden = false
  ;($('#new-brand-name') as HTMLInputElement).focus()
}
function closeCreateForm(): void {
  ;($('#brand-create-form') as HTMLDivElement).hidden = true
  ;($('#new-brand-name') as HTMLInputElement).value = ''
  showCreateError(null)
}

/* ──────────────────────────────────────────────────────── */
/*  Message handler                                          */
/* ──────────────────────────────────────────────────────── */

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data?.pluginMessage as PluginMessage | undefined
  if (!data) return
  switch (data.type) {
    case 'selection-summary':
      renderSelectionSummary(data.payload)
      return
    case 'classify-result':
      renderClassification(data.payload)
      return
    case 'extract-tokens-result':
      void pushTokensBulk(data.payload.tokens)
      data.payload.warnings.forEach((w) => logLine(`! ${w}`))
      return
    case 'push-bundle-result':
      void dispatchBundle(data.payload)
      return
    case 'error':
      logLine(`error: ${data.payload.message}`, 'err')
      return
  }
})

/* ──────────────────────────────────────────────────────── */
/*  Push dispatch                                            */
/* ──────────────────────────────────────────────────────── */

async function dispatchBundle(bundle: PushBundle): Promise<void> {
  bundle.warnings.forEach((w) => logLine(`! ${w}`))
  const brandSlug = selectedBrandSlug
  if (!brandSlug) { logLine('error: pick a brand first', 'err'); return }
  const endpoint = getEndpoint()
  const editorBase = getEditorBase()
  const tasks: Promise<void>[] = []

  if (bundle.assets.length > 0) {
    const summary = bundle.assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.kind] = (acc[a.kind] ?? 0) + 1
      return acc
    }, {})
    logLine(
      `▸ pushing ${Object.entries(summary).map(([k, n]) => `${n} ${k}${n > 1 ? 's' : ''}`).join(', ')}…`,
    )
    tasks.push(pushAssets(endpoint, brandSlug, bundle.assets))
  }
  if (bundle.colors.length > 0) {
    logLine(`▸ pushing ${bundle.colors.length} color${bundle.colors.length > 1 ? 's' : ''}…`)
    tasks.push(pushColors(endpoint, brandSlug, bundle.colors))
  }
  if (bundle.typography.length > 0) {
    logLine(`▸ pushing ${bundle.typography.length} typography role${bundle.typography.length > 1 ? 's' : ''}…`)
    tasks.push(pushTypography(endpoint, brandSlug, bundle.typography))
  }
  if (bundle.templateResult) {
    tasks.push(pushTemplate(endpoint, editorBase, brandSlug, bundle.templateResult))
  }
  await Promise.all(tasks)

  // If only non-template stuff was pushed, open the brand book.
  if (!bundle.templateResult && (bundle.assets.length || bundle.colors.length || bundle.typography.length)) {
    const url = `${editorBase}/b/${encodeURIComponent(brandSlug)}/guidelines?designer=1`
    logLink(`→ open ${url}`, url)
    try { window.open(url, '_blank') } catch { /* fallback to the link */ }
  }
}

async function pushAssets(endpoint: string, brandSlug: string, assets: ExtractedAsset[]): Promise<void> {
  try {
    const res = await fetch(`${endpoint}/api/brands/${encodeURIComponent(brandSlug)}/assets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assets }),
    })
    if (!res.ok) { logLine(`error: assets push failed ${res.status}`, 'err'); return }
    const json = (await res.json()) as { assets: Array<{ kind: string; variant?: string; label: string }> }
    for (const a of json.assets) {
      const v = a.variant ? ` "${a.variant}"` : ''
      logLine(`✓ pushed ${a.kind}${v}`, 'ok')
    }
  } catch (err) {
    logLine(`error: ${err instanceof Error ? err.message : String(err)}`, 'err')
  }
}

async function pushColors(
  endpoint: string,
  brandSlug: string,
  colors: Array<{ name: string; hex: string }>,
): Promise<void> {
  try {
    // Get current palette so we can append (PATCH replaces arrays).
    const existing = await fetch(`${endpoint}/api/brands/${encodeURIComponent(brandSlug)}/tokens`)
    const existingTokens = existing.ok ? (await existing.json()).tokens : null
    const currentPalette: Array<{ name: string; hex: string }> = existingTokens?.colors?.palette ?? []
    // Dedupe by name (incoming entries replace same-named existing ones).
    const incomingNames = new Set(colors.map((c) => c.name))
    const merged = [...currentPalette.filter((p) => !incomingNames.has(p.name)), ...colors]

    const res = await fetch(`${endpoint}/api/brands/${encodeURIComponent(brandSlug)}/tokens`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ colors: { palette: merged } }),
    })
    if (!res.ok) { logLine(`error: tokens push failed ${res.status}`, 'err'); return }
    for (const c of colors) logLine(`✓ pushed color "${c.name}" ${c.hex.toUpperCase()}`, 'ok')
  } catch (err) {
    logLine(`error: ${err instanceof Error ? err.message : String(err)}`, 'err')
  }
}

async function pushTypography(
  endpoint: string,
  brandSlug: string,
  rows: PushBundle['typography'],
): Promise<void> {
  try {
    // Aggregate by role; if multiple frames assigned to the same role, the last one wins.
    const delta: Record<string, PushBundle['typography'][number]['entry']> = {}
    for (const r of rows) delta[r.role] = r.entry
    // The tokens endpoint requires `body` to be present on TypographyTokens —
    // but PATCH does deep-merge, so we can send just the role we're patching.
    const res = await fetch(`${endpoint}/api/brands/${encodeURIComponent(brandSlug)}/tokens`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ typography: delta }),
    })
    if (!res.ok) { logLine(`error: typography push failed ${res.status}`, 'err'); return }
    for (const r of rows) logLine(`✓ pushed typography role "${r.role}" (${r.entry.fontFamily})`, 'ok')
  } catch (err) {
    logLine(`error: ${err instanceof Error ? err.message : String(err)}`, 'err')
  }
}

async function pushTemplate(
  endpoint: string,
  editorBase: string,
  brandSlug: string,
  payload: ExtractTemplateResult,
): Promise<void> {
  logLine(`  canvas: ${payload.canvas.width} × ${payload.canvas.height} px`)
  try {
    const res = await fetch(`${endpoint}/api/templates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brandSlug, ...payload }),
    })
    if (!res.ok) { logLine(`error: template push ${res.status}`, 'err'); return }
    const json = (await res.json()) as { templateSlug?: string; versionNumber?: number; editorUrl?: string }
    logLine(`✓ pushed "${payload.name}" v${json.versionNumber ?? '?'} to ${brandSlug}`, 'ok')

    const path = json.editorUrl ?? `/c/${json.templateSlug ?? payload.slug}?brand=${brandSlug}`
    const designerPath = path.includes('?') ? `${path}&designer=1` : `${path}?designer=1`
    const url = `${editorBase}${designerPath}`
    logLink(`→ open ${url}`, url)
    try { window.open(url, '_blank') } catch { /* user can click the link */ }
  } catch (err) {
    logLine(`error: ${err instanceof Error ? err.message : String(err)}`, 'err')
  }
}

/* Bulk-token tab — kept from V1 for the "scan all local styles" flow. */
async function pushTokensBulk(tokens: import('@framework/types').BrandTokens): Promise<void> {
  const endpoint = getEndpoint()
  const brandSlug = selectedBrandSlug
  if (!brandSlug) { logLine('error: pick a brand first', 'err'); return }
  try {
    const res = await fetch(`${endpoint}/api/brands/${encodeURIComponent(brandSlug)}/tokens`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tokens),
    })
    if (!res.ok) { logLine(`error: ${res.status}`, 'err'); return }
    const json = (await res.json()) as { versionNumber?: number }
    logLine(`✓ pushed full token set v${json.versionNumber ?? '?'} to ${brandSlug}`, 'ok')
  } catch (err) {
    logLine(`error: ${err instanceof Error ? err.message : String(err)}`, 'err')
  }
}

/* ──────────────────────────────────────────────────────── */
/*  Lifecycle                                                */
/* ──────────────────────────────────────────────────────── */

function hydrateFromStorage(): void {
  const endpoint = lsGet(LS.endpoint, 'http://localhost:3000')
  const editor = lsGet(LS.editor, 'http://localhost:3001')
  ;($('#endpoint') as HTMLInputElement).value = endpoint
  ;($('#editor-base') as HTMLInputElement).value = editor
}

document.addEventListener('DOMContentLoaded', () => {
  hydrateFromStorage()
  void loadBrands()

  document.querySelectorAll('.tab').forEach((el) => {
    el.addEventListener('click', () =>
      setTab((el as HTMLElement).dataset.tab as typeof activeTab),
    )
  })

  ;($('#brand-select') as HTMLSelectElement).addEventListener('change', (e) => {
    selectedBrandSlug = (e.target as HTMLSelectElement).value || null
    if (selectedBrandSlug) lsSet(LS.brand, selectedBrandSlug)
    refreshPushDisabled()
  })

  ;($('#brand-new-toggle') as HTMLButtonElement).addEventListener('click', () => {
    const form = $('#brand-create-form') as HTMLDivElement
    if (form.hidden) openCreateForm()
    else closeCreateForm()
  })
  ;($('#brand-refresh') as HTMLButtonElement).addEventListener('click', () => void loadBrands())
  ;($('#new-brand-submit') as HTMLButtonElement).addEventListener('click', () => void submitNewBrand())
  ;($('#new-brand-name') as HTMLInputElement).addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void submitNewBrand()
  })

  ;($('#endpoint') as HTMLInputElement).addEventListener('input', (e) => {
    lsSet(LS.endpoint, (e.target as HTMLInputElement).value.trim())
    void loadBrands()
  })
  ;($('#editor-base') as HTMLInputElement).addEventListener('input', (e) =>
    lsSet(LS.editor, (e.target as HTMLInputElement).value.trim()),
  )
  ;($('#cancel') as HTMLButtonElement).addEventListener('click', () => postToCode({ type: 'close' }))
  ;($('#push') as HTMLButtonElement).addEventListener('click', () => {
    if (activeTab === 'push') {
      const name = ($('#template-name') as HTMLInputElement).value.trim()
      const destinations = classification
        .map((f) => ({ id: f.id, destination: destinationOf(f) }))
        .filter((d) => d.destination.kind !== 'ignore')
      if (destinations.length === 0) { logLine('error: nothing to push', 'err'); return }
      logLine(`▸ extracting ${destinations.length} frame${destinations.length > 1 ? 's' : ''}…`)
      postToCode({ type: 'request-push-bundle', payload: { name, destinations } })
    } else if (activeTab === 'tokens') {
      logLine('▸ scanning Figma local styles for tokens…')
      postToCode({ type: 'request-extract-tokens' })
    }
  })

  postToCode({ type: 'request-selection-summary' })
  setTab('push')
})
