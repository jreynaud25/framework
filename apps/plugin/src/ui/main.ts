import type { PluginMessage, SelectionSummary, UIMessage } from '../types'

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

let activeTab: 'template' | 'tokens' | 'settings' = 'template'
let selection: SelectionSummary | null = null
let brands: BrandRecord[] = []
let selectedBrandSlug: string | null = null

/**
 * Persisted preferences. The plugin UI iframe has its own localStorage scoped
 * to this plugin.
 */
const LS = {
  brand: 'framework.brand',
  endpoint: 'framework.endpoint',
  editor: 'framework.editor',
} as const

function lsGet(k: string, fallback = ''): string {
  try {
    return localStorage.getItem(k) ?? fallback
  } catch {
    return fallback
  }
}
function lsSet(k: string, v: string): void {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

function getEndpoint(): string {
  return ($('#endpoint') as HTMLInputElement).value.trim().replace(/\/$/, '')
}

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
  a.style.color = '#6ee7b7'
  a.style.textDecoration = 'underline'
  a.style.cursor = 'pointer'
  const wrap = document.createElement('div')
  wrap.append(a)
  log.append(wrap)
  log.scrollTop = log.scrollHeight
}

function refreshPushDisabled(): void {
  const push = $('#push') as HTMLButtonElement
  if (activeTab === 'template') {
    push.disabled = !selectedBrandSlug || !selection || selection.count === 0
  } else if (activeTab === 'tokens') {
    const brand = ($('#brand-tokens') as HTMLInputElement).value.trim()
    push.disabled = !brand
  } else {
    push.disabled = true
  }
}

function autoFillNameFromSelection(s: SelectionSummary): void {
  if (s.count === 0) return
  const nameInput = $('#name') as HTMLInputElement
  if (nameInput.value.trim()) return
  const first = s.frames[0]!.name
  const base = first.split('/')[0]!.trim()
  if (base) nameInput.placeholder = base
}

function renderSelection(s: SelectionSummary): void {
  selection = s
  const container = $('#selection')
  if (s.count === 0) {
    container.innerHTML = '<div class="empty">Click a frame in Figma to select it.</div>'
    refreshPushDisabled()
    return
  }
  container.innerHTML = s.frames
    .map(
      (f) =>
        `<div class="frame"><span>${escapeHtml(f.name)}</span><span class="dim">${Math.round(f.w)} × ${Math.round(f.h)}</span></div>`,
    )
    .join('')
  autoFillNameFromSelection(s)
  refreshPushDisabled()
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function postToCode(msg: UIMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*')
}

/* ─────────────────────────────── Brands ─────────────────────────────── */

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

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function showCreateError(msg: string | null): void {
  const el = $('#new-brand-error') as HTMLDivElement
  if (msg) {
    el.textContent = msg
    el.hidden = false
  } else {
    el.textContent = ''
    el.hidden = true
  }
}

async function submitNewBrand(): Promise<void> {
  showCreateError(null)
  const name = ($('#new-brand-name') as HTMLInputElement).value.trim()
  if (name.length < 2) {
    showCreateError('Brand name too short')
    return
  }
  const slug = slugify(name)
  if (!/^[a-z0-9-]{2,}$/.test(slug)) {
    showCreateError("Can't derive a slug from this name — try another")
    return
  }

  const endpoint = getEndpoint()
  try {
    const res = await fetch(`${endpoint}/api/brands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    })
    if (res.status === 409) {
      showCreateError('A brand with that name already exists')
      return
    }
    if (!res.ok) {
      showCreateError(`Failed (HTTP ${res.status})`)
      return
    }
    const brand = (await res.json()) as BrandRecord
    brands.push(brand)
    lsSet(LS.brand, brand.slug)
    populateBrandSelect()
    ;($('#brand-select') as HTMLSelectElement).value = brand.slug
    selectedBrandSlug = brand.slug
    logLine(`✓ created brand "${brand.name}" — add details on the dashboard`, 'ok')
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

/* ─────────────────────────────── Lifecycle ─────────────────────────────── */

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data?.pluginMessage as PluginMessage | undefined
  if (!data) return
  switch (data.type) {
    case 'selection-summary':
      renderSelection(data.payload)
      return
    case 'extract-tokens-result':
      void pushTokens(data.payload.tokens)
      ;($('#tokens-preview') as HTMLPreElement).textContent = JSON.stringify(data.payload.tokens, null, 2)
      data.payload.warnings.forEach((w) => logLine(`! ${w}`))
      return
    case 'extract-template-result':
      void pushTemplate(data.payload)
      data.payload.warnings.forEach((w) => logLine(`! ${w}`))
      return
    case 'error':
      logLine(`error: ${data.payload.message}`, 'err')
      return
  }
})

function hydrateFromStorage(): void {
  const brandTokens = lsGet(LS.brand)
  const endpoint = lsGet(LS.endpoint, 'http://localhost:3000')
  const editor = lsGet(LS.editor, 'http://localhost:3001')
  if (brandTokens) ($('#brand-tokens') as HTMLInputElement).value = brandTokens
  ;($('#endpoint') as HTMLInputElement).value = endpoint
  ;($('#editor-base') as HTMLInputElement).value = editor
}

document.addEventListener('DOMContentLoaded', () => {
  hydrateFromStorage()
  void loadBrands()

  document.querySelectorAll('.tab').forEach((el) => {
    el.addEventListener('click', () => setTab((el as HTMLElement).dataset.tab as typeof activeTab))
  })

  ;($('#brand-select') as HTMLSelectElement).addEventListener('change', (e) => {
    selectedBrandSlug = (e.target as HTMLSelectElement).value || null
    if (selectedBrandSlug) lsSet(LS.brand, selectedBrandSlug)
    refreshPushDisabled()
  })

  ;($('#brand-new-toggle') as HTMLButtonElement).addEventListener('click', () => {
    const form = $('#brand-create-form') as HTMLDivElement
    if (form.hidden) {
      // Pre-fill the slug if user has typed a name elsewhere
      openCreateForm()
    } else {
      closeCreateForm()
    }
  })
  ;($('#brand-refresh') as HTMLButtonElement).addEventListener('click', () => {
    void loadBrands()
  })

  ;($('#new-brand-submit') as HTMLButtonElement).addEventListener('click', () => {
    void submitNewBrand()
  })
  ;($('#new-brand-name') as HTMLInputElement).addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') void submitNewBrand()
  })

  ;($('#brand-tokens') as HTMLInputElement).addEventListener('input', (e) => {
    lsSet(LS.brand, (e.target as HTMLInputElement).value.trim())
    refreshPushDisabled()
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
    if (activeTab === 'template') {
      const name = ($('#name') as HTMLInputElement).value.trim()
      logLine(`▸ extracting template "${name || (selection?.frames[0]?.name.split('/')[0] ?? 'unnamed')}"…`)
      postToCode({ type: 'request-extract-template', payload: { name } })
    } else if (activeTab === 'tokens') {
      logLine('▸ extracting brand tokens…')
      postToCode({ type: 'request-extract-tokens' })
    }
  })
  postToCode({ type: 'request-selection-summary' })
  setTab('template')
})

/* ─────────────────────────────── Push ─────────────────────────────── */

async function pushTemplate(payload: import('../types').ExtractTemplateResult): Promise<void> {
  const endpoint = getEndpoint()
  const editorBase = ($('#editor-base') as HTMLInputElement).value.trim().replace(/\/$/, '')
  const brandSlug = selectedBrandSlug
  if (!brandSlug) {
    logLine('error: pick a brand first', 'err')
    return
  }
  logLine(`  canvas: ${payload.canvas.width} × ${payload.canvas.height} px`)
  try {
    const res = await fetch(`${endpoint}/api/templates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brandSlug, ...payload }),
    })
    if (!res.ok) {
      logLine(`error: ${res.status} ${await res.text()}`, 'err')
      return
    }
    const json = (await res.json()) as { templateSlug?: string; versionNumber?: number; editorUrl?: string }
    logLine(`✓ pushed "${payload.name}" v${json.versionNumber ?? '?'} to ${brandSlug}`, 'ok')

    const path = json.editorUrl ?? `/c/${json.templateSlug ?? payload.slug}?brand=${brandSlug}`
    const designerPath = path.includes('?') ? `${path}&designer=1` : `${path}?designer=1`
    const url = `${editorBase}${designerPath}`
    logLink(`→ open ${url}`, url)
    try {
      window.open(url, '_blank')
    } catch {
      /* user can click the link instead */
    }
  } catch (err) {
    logLine(`error: ${err instanceof Error ? err.message : String(err)}`, 'err')
  }
}

async function pushTokens(tokens: import('@framework/types').BrandTokens): Promise<void> {
  const endpoint = getEndpoint()
  const brandSlug = ($('#brand-tokens') as HTMLInputElement).value.trim()
  if (!brandSlug) {
    logLine('error: enter a brand slug', 'err')
    return
  }
  try {
    const res = await fetch(`${endpoint}/api/brand-tokens`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        brandSlug,
        sourceFigmaFileKey: 'unknown',
        tokens,
      }),
    })
    if (!res.ok) {
      logLine(`error: ${res.status} ${await res.text()}`, 'err')
      return
    }
    const json = (await res.json()) as { versionNumber?: number }
    logLine(`✓ pushed brand tokens v${json.versionNumber ?? '?'} to ${brandSlug}`, 'ok')
  } catch (err) {
    logLine(`error: ${err instanceof Error ? err.message : String(err)}`, 'err')
  }
}
