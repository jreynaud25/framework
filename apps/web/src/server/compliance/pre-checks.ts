import 'server-only'
import type { BrandTokens, ComplianceFlag, LayoutNode, SlotValues } from '@framework/types'

/**
 * Deterministic compliance checks. These run *in parallel* with the LLM and
 * cover the rules where natural language is overkill:
 *   - color outside the palette (palette-only color slots)
 *   - text exceeding maxChars
 *   - typography references that don't exist in the token version
 *   - logo variant references that don't exist
 *
 * Cheap, exact, instant — and they protect against false negatives if the
 * model misses something obvious.
 */
export function deterministicPreChecks(args: {
  layout: LayoutNode
  tokens: BrandTokens
  slotValues: SlotValues
}): ComplianceFlag[] {
  const flags: ComplianceFlag[] = []
  const allowedHexes = new Set(args.tokens.colors.palette.map((p) => p.hex.toLowerCase()))
  allowedHexes.add(args.tokens.colors.primary.toLowerCase())
  for (const v of Object.values(args.tokens.colors.semantic ?? {})) {
    if (v) allowedHexes.add(v.toLowerCase())
  }
  walk(args.layout, (n) => {
    if (n.type === 'text') {
      if (n.style.tokenRef && !args.tokens.typography[n.style.tokenRef]) {
        flags.push({
          severity: 'warn',
          category: 'typography',
          description: `Typography role '${n.style.tokenRef}' is not defined in the brand tokens`,
          location: n.id,
          suggestion: `Use one of: ${Object.keys(args.tokens.typography).join(', ')}`,
        })
      }
      const slot = n.slotKey ? args.slotValues[n.slotKey] : undefined
      const text = slot?.type === 'text' ? slot.value : (n.defaultText ?? '')
      if (n.constraints?.maxChars && text.length > n.constraints.maxChars) {
        flags.push({
          severity: 'error',
          category: 'typography',
          description: `Text exceeds maxChars (${text.length}/${n.constraints.maxChars})`,
          location: n.id,
        })
      }
    }
    if (n.type === 'logo') {
      const ok = args.tokens.logos.some((l) => l.variant === n.logoVariant)
      if (!ok) {
        flags.push({
          severity: 'error',
          category: 'logo',
          description: `Logo variant '${n.logoVariant}' is not defined in this brand`,
          location: n.id,
        })
      }
    }
  })

  for (const [key, value] of Object.entries(args.slotValues)) {
    if (value.type === 'color' && !allowedHexes.has(value.hex.toLowerCase())) {
      flags.push({
        severity: 'warn',
        category: 'color',
        description: `Color ${value.hex} is not in the brand palette`,
        location: `slot:${key}`,
        suggestion: `Pick a palette color: ${[...allowedHexes].join(', ')}`,
      })
    }
  }

  return flags
}

function walk(node: LayoutNode, visit: (n: LayoutNode) => void): void {
  visit(node)
  if (node.type === 'frame') {
    for (const child of node.children) walk(child, visit)
  }
}
