import type { ExtractTemplateResult, ExtractTokensResult, UIMessage, PluginMessage } from './types'
import { extractBrandTokens } from './extract/tokens'
import { extractTemplate } from './extract/template'

/**
 * Sandbox entrypoint. Cannot touch DOM/network directly — instead we send
 * the extracted JSON to the UI iframe (src/ui/index.html), which performs
 * the HTTP POST to frame-work.app.
 */

figma.showUI(__html__, { width: 360, height: 520, themeColors: true })

figma.ui.onmessage = async (msg: UIMessage): Promise<void> => {
  try {
    switch (msg.type) {
      case 'request-selection-summary': {
        send({
          type: 'selection-summary',
          payload: summarizeSelection(),
        })
        return
      }

      case 'request-extract-tokens': {
        const result: ExtractTokensResult = await extractBrandTokens()
        send({ type: 'extract-tokens-result', payload: result })
        return
      }

      case 'request-extract-template': {
        const result: ExtractTemplateResult = await extractTemplate(msg.payload.name)
        send({ type: 'extract-template-result', payload: result })
        return
      }

      case 'close': {
        figma.closePlugin(msg.payload?.message)
        return
      }
    }
  } catch (err) {
    send({
      type: 'error',
      payload: { message: err instanceof Error ? err.message : String(err) },
    })
  }
}

function send(msg: PluginMessage): void {
  figma.ui.postMessage(msg)
}

function summarizeSelection(): { count: number; frames: Array<{ id: string; name: string; w: number; h: number }> } {
  const frames = figma.currentPage.selection
    .filter((n): n is FrameNode | ComponentNode | InstanceNode =>
      n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE',
    )
    .map((n) => ({ id: n.id, name: n.name, w: n.width, h: n.height }))
  return { count: frames.length, frames }
}

// Initial summary so the UI can render the selection list immediately.
figma.on('selectionchange', () => {
  send({ type: 'selection-summary', payload: summarizeSelection() })
})
send({ type: 'selection-summary', payload: summarizeSelection() })
