import type { PluginMessage, SelectionSummary, UIMessage } from '../types'

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T

let activeTab: 'template' | 'tokens' | 'settings' = 'template'
let selection: SelectionSummary | null = null

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

function refreshPushDisabled(): void {
  const push = $('#push') as HTMLButtonElement
  const brand =
    activeTab === 'template'
      ? ($('#brand') as HTMLInputElement).value.trim()
      : ($('#brand-tokens') as HTMLInputElement).value.trim()

  if (!brand) {
    push.disabled = true
    return
  }
  if (activeTab === 'template') {
    push.disabled = !selection || selection.count === 0
  } else if (activeTab === 'tokens') {
    push.disabled = false
  } else {
    push.disabled = true
  }
}

function renderSelection(s: SelectionSummary): void {
  selection = s
  const container = $('#selection')
  if (s.count === 0) {
    container.innerHTML = '<div class="empty">Select 1+ frames in Figma.</div>'
    refreshPushDisabled()
    return
  }
  container.innerHTML = s.frames
    .map(
      (f) =>
        `<div class="frame"><span>${escapeHtml(f.name)}</span><span class="dim">${Math.round(f.w)} × ${Math.round(f.h)}</span></div>`,
    )
    .join('')
  refreshPushDisabled()
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function postToCode(msg: UIMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*')
}

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

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach((el) => {
    el.addEventListener('click', () => setTab((el as HTMLElement).dataset.tab as typeof activeTab))
  })
  ;['brand', 'brand-tokens'].forEach((id) => {
    const el = document.getElementById(id) as HTMLInputElement
    el.addEventListener('input', refreshPushDisabled)
  })
  ;($('#cancel') as HTMLButtonElement).addEventListener('click', () => postToCode({ type: 'close' }))
  ;($('#push') as HTMLButtonElement).addEventListener('click', () => {
    if (activeTab === 'template') {
      const name = ($('#name') as HTMLInputElement).value.trim()
      logLine(`▸ extracting template "${name || '(unnamed)'}"…`)
      postToCode({ type: 'request-extract-template', payload: { name } })
    } else if (activeTab === 'tokens') {
      logLine('▸ extracting brand tokens…')
      postToCode({ type: 'request-extract-tokens' })
    }
  })
  postToCode({ type: 'request-selection-summary' })
  setTab('template')
})

async function pushTemplate(payload: import('../types').ExtractTemplateResult): Promise<void> {
  const endpoint = ($('#endpoint') as HTMLInputElement).value.trim().replace(/\/$/, '')
  const brandSlug = ($('#brand') as HTMLInputElement).value.trim()
  if (!brandSlug) {
    logLine('error: enter a brand slug', 'err')
    return
  }
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
    logLine(`✓ pushed "${payload.name}" to ${brandSlug}`, 'ok')
  } catch (err) {
    logLine(`error: ${err instanceof Error ? err.message : String(err)}`, 'err')
  }
}

async function pushTokens(tokens: import('@framework/types').BrandTokens): Promise<void> {
  const endpoint = ($('#endpoint') as HTMLInputElement).value.trim().replace(/\/$/, '')
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
    logLine(`✓ pushed brand tokens to ${brandSlug}`, 'ok')
  } catch (err) {
    logLine(`error: ${err instanceof Error ? err.message : String(err)}`, 'err')
  }
}
