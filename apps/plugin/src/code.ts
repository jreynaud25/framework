import type {
  Destination,
  ExtractedAsset,
  ExtractTemplateResult,
  ExtractTokensResult,
  FrameClassification,
  PluginMessage,
  PushBundle,
  UIMessage,
} from './types'
import { extractBrandTokens } from './extract/tokens'
import { extractTemplate, extractTemplateFromNodes } from './extract/template'
import { exportAssetForDestination } from './extract/assets'
import { classifyNode } from './extract/classify'
import { extractColorFromNode, extractTypographyFromNode } from './extract/single-token'

/**
 * Sandbox entrypoint. Cannot touch DOM/network directly — instead we send
 * the extracted JSON to the UI iframe (src/ui/index.html), which performs
 * the HTTP POST to frame-work.app.
 */

figma.showUI(__html__, { width: 380, height: 600, themeColors: true })

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

      case 'request-classify-selection': {
        const frames: FrameClassification[] = figma.currentPage.selection
          .filter(isClassifiable)
          .map(classifyNode)
        send({ type: 'classify-result', payload: { frames } })
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

      case 'request-push-bundle': {
        const result = await buildPushBundle(msg.payload.name, msg.payload.destinations)
        send({ type: 'push-bundle-result', payload: result })
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

function isClassifiable(node: SceneNode): boolean {
  return (
    node.type === 'FRAME' ||
    node.type === 'COMPONENT' ||
    node.type === 'INSTANCE' ||
    node.type === 'GROUP' ||
    node.type === 'RECTANGLE' ||
    node.type === 'TEXT'
  )
}

function summarizeSelection(): {
  count: number
  frames: Array<{ id: string; name: string; w: number; h: number }>
} {
  const frames = figma.currentPage.selection
    .filter(isClassifiable)
    .map((n) => ({
      id: n.id,
      name: n.name,
      w: 'width' in n ? n.width : 0,
      h: 'height' in n ? n.height : 0,
    }))
  return { count: frames.length, frames }
}

/**
 * Build the push bundle from per-frame destinations. Each destination is
 * handled in its own way:
 *   - logo / photo / pattern / icon → export as data URL
 *   - color → read solid fill → palette entry
 *   - typography → read text style → TypographyEntry under the chosen role
 *   - template → collect for extractTemplateFromNodes
 *   - ignore → skip
 */
async function buildPushBundle(
  name: string,
  destinations: Array<{ id: string; destination: Destination }>,
): Promise<PushBundle> {
  const selectionById = new Map<string, SceneNode>(
    figma.currentPage.selection.map((n) => [n.id, n]),
  )
  const assets: ExtractedAsset[] = []
  const colors: PushBundle['colors'] = []
  const typography: PushBundle['typography'] = []
  const templateNodes: Array<FrameNode | ComponentNode> = []
  const warnings: string[] = []

  for (const entry of destinations) {
    const node = selectionById.get(entry.id)
    if (!node) {
      warnings.push(`Node ${entry.id} not in selection — skipped`)
      continue
    }
    const dest = entry.destination
    if (dest.kind === 'ignore') continue

    if (dest.kind === 'template') {
      if (node.type === 'FRAME' || node.type === 'COMPONENT') {
        templateNodes.push(node)
      } else {
        warnings.push(`Can't push "${node.name}" as template — only frames / components`)
      }
      continue
    }

    if (dest.kind === 'color') {
      const hex = extractColorFromNode(node)
      if (!hex) {
        warnings.push(`Can't extract color from "${node.name}" — no solid fill`)
        continue
      }
      colors.push({ name: dest.name?.trim() || node.name, hex })
      continue
    }

    if (dest.kind === 'typography') {
      const entryT = extractTypographyFromNode(node)
      if (!entryT) {
        warnings.push(`Can't extract typography from "${node.name}" — not a text node`)
        continue
      }
      typography.push({ role: dest.role, entry: entryT })
      continue
    }

    // logo / photo / pattern / icon
    try {
      const asset = await exportAssetForDestination(node, dest)
      if (asset) assets.push(asset)
    } catch (err) {
      warnings.push(
        `Couldn't export "${node.name}": ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  let templateResult: ExtractTemplateResult | undefined
  if (templateNodes.length > 0) {
    templateResult = await extractTemplateFromNodes(templateNodes, name)
    warnings.push(...templateResult.warnings)
  }

  return { assets, colors, typography, templateResult, warnings }
}

// Push the initial summary so the UI can render immediately.
figma.on('selectionchange', () => {
  send({ type: 'selection-summary', payload: summarizeSelection() })
})
send({ type: 'selection-summary', payload: summarizeSelection() })
