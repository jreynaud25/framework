import type { TypographyEntry } from '@framework/types'
import { rgbToHex } from '../util'

/**
 * Extract a single color (hex) from a node's first solid fill. Returns
 * null if the node has no solid fill — designer should pick a different
 * destination.
 */
export function extractColorFromNode(node: SceneNode): string | null {
  if (!('fills' in node)) return null
  const fills = node.fills as readonly Paint[] | typeof figma.mixed
  if (fills === figma.mixed || !Array.isArray(fills) || fills.length === 0) return null
  const solid = fills.find((f) => f.type === 'SOLID') as SolidPaint | undefined
  if (!solid) return null
  return rgbToHex(solid.color, solid.opacity ?? 1)
}

/**
 * Extract a TypographyEntry from a TextNode — family, weight, size,
 * lineHeight, letterSpacing. Returns null for non-text nodes or mixed
 * properties.
 */
export function extractTypographyFromNode(node: SceneNode): TypographyEntry | null {
  if (node.type !== 'TEXT') return null
  const text = node as TextNode
  const fontName = text.fontName
  if (fontName === figma.mixed) return null
  const fontSize = typeof text.fontSize === 'number' ? text.fontSize : 16
  const family = fontName.family
  const weight = fontWeight(fontName)
  const lineHeight = lineHeightToNumber(text.lineHeight) ?? 1.4
  const letterSpacing = letterSpacingToPx(text.letterSpacing)
  return {
    fontFamily: family,
    fontTokenKey: 'inline',
    weights: [weight],
    defaultWeight: weight,
    scale: [Math.round(fontSize)],
    lineHeight,
    letterSpacing,
  }
}

function fontWeight(name: FontName): number {
  const s = name.style.toLowerCase()
  if (s.includes('thin')) return 100
  if (s.includes('extralight') || s.includes('ultralight')) return 200
  if (s.includes('light')) return 300
  if (s.includes('regular') || s === 'normal') return 400
  if (s.includes('medium')) return 500
  if (s.includes('semibold') || s.includes('demibold')) return 600
  if (s.includes('bold')) return 700
  if (s.includes('extrabold') || s.includes('ultrabold')) return 800
  if (s.includes('black') || s.includes('heavy')) return 900
  return 400
}

function lineHeightToNumber(lh: TextNode['lineHeight']): number | undefined {
  if (!lh || (typeof lh === 'object' && 'unit' in lh && lh.unit === 'AUTO')) return undefined
  if (typeof lh === 'object' && 'unit' in lh) {
    if (lh.unit === 'PERCENT') return lh.value / 100
    if (lh.unit === 'PIXELS') return lh.value
  }
  return undefined
}

function letterSpacingToPx(ls: TextNode['letterSpacing']): number | undefined {
  if (!ls || typeof ls !== 'object') return undefined
  if (ls.unit === 'PIXELS') return ls.value
  if (ls.unit === 'PERCENT') return ls.value / 100
  return undefined
}
