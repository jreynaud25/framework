import type {
  Destination,
  FrameClassification,
  FrameHints,
  LogoVariant,
} from '../types'

/**
 * Heuristic per-node classifier. Produces a `FrameClassification` carrying
 * the plugin's best guess for where this node belongs in a brand. Designer
 * always sees the guess and can override in the UI before pushing.
 *
 * The hints object is exposed too so the UI can show "why" (e.g. "detected
 * as photo because it has an image fill").
 */
export function classifyNode(node: SceneNode): FrameClassification {
  const width = 'width' in node ? Math.round(node.width) : 0
  const height = 'height' in node ? Math.round(node.height) : 0
  const hints = computeHints(node)
  const suggested = suggestDestination(node, hints)
  return { id: node.id, name: node.name, width, height, suggested, hints }
}

function computeHints(node: SceneNode): FrameHints {
  const isText = node.type === 'TEXT'
  let isSolidRect = false
  let hasImageFill = false
  if ('fills' in node && Array.isArray(node.fills)) {
    const fills = node.fills as readonly Paint[]
    isSolidRect =
      (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'COMPONENT') &&
      fills.length > 0 &&
      fills.every((f) => f.type === 'SOLID') &&
      // For frames, also require no children — otherwise it's a layout box
      // with a tinted background, not a "color swatch".
      (node.type === 'RECTANGLE' || !('children' in node) || node.children.length === 0)
    hasImageFill = fills.some((f) => f.type === 'IMAGE')
  }
  const hasSlots =
    node.type === 'FRAME' || node.type === 'COMPONENT'
      ? scan(node, (child) => /^(slot|lock)[\/\-]/i.test(child.name), 2)
      : false

  return {
    isText,
    isSolidRect,
    hasImageFill,
    hasSlots,
    size: {
      w: 'width' in node ? Math.round(node.width) : 0,
      h: 'height' in node ? Math.round(node.height) : 0,
    },
  }
}

function scan(node: SceneNode, pred: (n: SceneNode) => boolean, maxDepth: number): boolean {
  if (maxDepth < 0) return false
  if (pred(node)) return true
  if ('children' in node) {
    for (const child of node.children as readonly SceneNode[]) {
      if (scan(child, pred, maxDepth - 1)) return true
    }
  }
  return false
}

function suggestDestination(node: SceneNode, hints: FrameHints): Destination {
  // 1. Layer-name convention takes priority — the designer explicitly named it
  const m = node.name.toLowerCase().match(/^(logo|photo|pattern|icon)[\/\-](.*)$/)
  if (m) {
    const kind = m[1] as 'logo' | 'photo' | 'pattern' | 'icon'
    if (kind === 'logo') {
      return { kind: 'logo', variant: parseLogoVariant(m[2]) }
    }
    return { kind }
  }

  // 2. Text node → typography (size drives the role suggestion)
  if (hints.isText) {
    const text = node as TextNode
    const size = typeof text.fontSize === 'number' ? text.fontSize : 16
    const role = size >= 48 ? 'display' : size >= 24 ? 'heading' : 'body'
    return { kind: 'typography', role }
  }

  // 3. Frame containing slot/* or lock/* descendants → template
  if (hints.hasSlots) return { kind: 'template' }

  // 4. Solid-fill rectangle/frame with no children → color swatch
  if (hints.isSolidRect) return { kind: 'color' }

  // 5. Has an image fill anywhere → photography
  if (hints.hasImageFill) return { kind: 'photo' }

  // 6. Small (<= 100 × 100) vectorial frame → icon
  if (hints.size.w > 0 && hints.size.w <= 100 && hints.size.h <= 100) {
    return { kind: 'icon' }
  }

  // 7. Default fallback — a frame is most likely a template
  return { kind: 'template' }
}

function parseLogoVariant(rest: string | undefined): LogoVariant {
  const part = (rest || 'primary').split(/[\/\-\s]/)[0]?.toLowerCase() ?? ''
  if (part === 'wordmark' || part === 'symbol' || part === 'monochrome' || part === 'inverted') {
    return part
  }
  if (part === 'mark') return 'symbol'
  if (part === 'mono' || part === 'black' || part === 'white') return 'monochrome'
  if (part === 'reverse' || part === 'inv') return 'inverted'
  return 'primary'
}
