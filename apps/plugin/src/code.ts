import type {
  ExtractedAsset,
  ExtractMixedResult,
  ExtractTemplateResult,
  ExtractTokensResult,
  PluginMessage,
  UIMessage,
} from './types'
import { extractBrandTokens } from './extract/tokens'
import { extractTemplate, extractTemplateFromNodes } from './extract/template'
import { extractAssetFromNode, parseAssetKind } from './extract/assets'

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

      case 'request-extract-mixed': {
        const result: ExtractMixedResult = await extractMixed(msg.payload.name)
        send({ type: 'extract-mixed-result', payload: result })
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

/**
 * Classify the current selection: assets (logo / photo / pattern / icon —
 * detected via layer-name convention) vs templates (everything else that
 * looks like a frame). Extract both buckets in parallel and return them
 * for the UI to POST to the right endpoints.
 */
async function extractMixed(name: string): Promise<ExtractMixedResult> {
  const warnings: string[] = []
  const assets: ExtractedAsset[] = []
  const templateNodes: Array<FrameNode | ComponentNode> = []

  for (const node of figma.currentPage.selection) {
    if (
      node.type !== 'FRAME' &&
      node.type !== 'COMPONENT' &&
      node.type !== 'INSTANCE' &&
      node.type !== 'GROUP'
    ) {
      continue
    }
    if (parseAssetKind(node.name)) {
      try {
        const asset = await extractAssetFromNode(node)
        if (asset) assets.push(asset)
      } catch (err) {
        warnings.push(
          `Couldn't extract "${node.name}": ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    } else if (node.type === 'FRAME' || node.type === 'COMPONENT') {
      templateNodes.push(node)
    }
  }

  let templateResult: ExtractTemplateResult | undefined
  if (templateNodes.length > 0) {
    templateResult = await extractTemplateFromNodes(templateNodes, name)
    warnings.push(...templateResult.warnings)
  }

  return { templateResult, assets, warnings }
}

// Initial summary so the UI can render the selection list immediately.
figma.on('selectionchange', () => {
  send({ type: 'selection-summary', payload: summarizeSelection() })
})
send({ type: 'selection-summary', payload: summarizeSelection() })
