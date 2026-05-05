import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import type {
  BrandTokens,
  ComplianceFlag,
  ComplianceReport,
  LayoutNode,
  SlotValues,
} from '@framework/types'
import { brandComplianceSystemPrompt } from './system-prompt'
import { deterministicPreChecks } from './pre-checks'

const MODEL = 'claude-sonnet-4-6'

// Per-million-token rates for Sonnet (cents). Sourced from Anthropic pricing
// at the time of writing; surface in env if rates change.
const RATE_INPUT_PER_MTOK = Number(process.env.CLAUDE_INPUT_RATE_USD ?? 3) // $/Mtok
const RATE_OUTPUT_PER_MTOK = Number(process.env.CLAUDE_OUTPUT_RATE_USD ?? 15)
const RATE_CACHED_READ_PER_MTOK = Number(process.env.CLAUDE_CACHED_READ_RATE_USD ?? 0.3)

const RECORD_FLAGS_TOOL: Anthropic.Tool = {
  name: 'record_flags',
  description:
    'Record the compliance review. Call this exactly once. Pass an empty flags array when the composition passes.',
  input_schema: {
    type: 'object',
    properties: {
      result: { type: 'string', enum: ['passed', 'flagged'] },
      flags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['info', 'warn', 'error'] },
            category: {
              type: 'string',
              enum: [
                'color',
                'typography',
                'logo',
                'spacing',
                'imagery',
                'voice',
                'motion',
                'custom',
              ],
            },
            description: { type: 'string' },
            ruleId: { type: 'string' },
            location: { type: 'string' },
            suggestion: { type: 'string' },
          },
          required: ['severity', 'category', 'description'],
        },
      },
    },
    required: ['result', 'flags'],
  },
}

export interface ComplianceInput {
  brandName: string
  tokens: BrandTokens
  layout: LayoutNode
  slotValues: SlotValues
  /** the format the export will ship at — context for the model */
  format: string
  /** optional: human-supplied notes about why this composition exists */
  context?: string
}

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required for compliance agent')
    client = new Anthropic({ apiKey })
  }
  return client
}

/**
 * Run a compliance review. Returns the merged result of:
 *   1. deterministic pre-checks (synchronous, no network)
 *   2. Claude review with prompt-cached brand rules
 *
 * Flags are deduped by (category, location, description).
 *
 * BRIEF §11: target <800ms with prompt-cached brand rules. The system prompt
 * is marked `cache_control: {type: 'ephemeral'}` so it is cached for ~5min
 * across calls per brand.
 */
export async function runComplianceCheck(input: ComplianceInput): Promise<ComplianceReport> {
  const start = Date.now()

  const preFlags = deterministicPreChecks({
    layout: input.layout,
    tokens: input.tokens,
    slotValues: input.slotValues,
  })

  // If pre-checks already found errors, optionally still run the LLM for the
  // qualitative pass — but skip when ANTHROPIC_API_KEY is unset (dev path).
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      result: preFlags.some((f) => f.severity === 'error') ? 'flagged' : 'passed',
      flags: preFlags,
      modelId: 'pre-checks-only',
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      costUsdMicros: 0,
      durationMs: Date.now() - start,
    }
  }

  const c = getClient()
  const systemBlocks: Anthropic.MessageCreateParamsNonStreaming['system'] = [
    {
      type: 'text',
      text: brandComplianceSystemPrompt(input.brandName, input.tokens),
      cache_control: { type: 'ephemeral' },
    },
  ]

  const userText = JSON.stringify(
    {
      format: input.format,
      context: input.context,
      layout: input.layout,
      slot_values: input.slotValues,
      pre_check_flags: preFlags,
    },
    null,
    2,
  )

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0,
    system: systemBlocks,
    tools: [RECORD_FLAGS_TOOL],
    tool_choice: { type: 'tool', name: 'record_flags' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Review this composition. Pre-check flags are listed for context — do not duplicate them. Add your own qualitative findings (voice, imagery, hierarchy).\n\n${userText}`,
          },
        ],
      },
    ],
  })

  const llmFlags = extractToolFlags(response)
  const merged = dedupeFlags([...preFlags, ...llmFlags])
  const usage = response.usage
  const inputTokens = usage.input_tokens ?? 0
  const outputTokens = usage.output_tokens ?? 0
  const cachedTokens = (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0)
  const costUsdMicros = computeCostMicros(usage)

  const result: ComplianceReport = {
    result: merged.some((f) => f.severity === 'error') ? 'flagged' : 'passed',
    flags: merged,
    modelId: MODEL,
    inputTokens,
    outputTokens,
    cachedTokens,
    costUsdMicros,
    durationMs: Date.now() - start,
  }
  return result
}

function extractToolFlags(response: Anthropic.Message): ComplianceFlag[] {
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'record_flags') {
      const input = block.input as { result?: string; flags?: ComplianceFlag[] }
      return Array.isArray(input.flags) ? input.flags : []
    }
  }
  return []
}

function dedupeFlags(flags: ComplianceFlag[]): ComplianceFlag[] {
  const seen = new Set<string>()
  const out: ComplianceFlag[] = []
  for (const f of flags) {
    const key = `${f.category}:${f.location ?? ''}:${f.description}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

function computeCostMicros(usage: Anthropic.Usage): number {
  const cachedRead = usage.cache_read_input_tokens ?? 0
  const fresh = (usage.input_tokens ?? 0) - cachedRead
  const out = usage.output_tokens ?? 0
  const cents =
    (Math.max(0, fresh) / 1_000_000) * RATE_INPUT_PER_MTOK +
    (cachedRead / 1_000_000) * RATE_CACHED_READ_PER_MTOK +
    (out / 1_000_000) * RATE_OUTPUT_PER_MTOK
  // 1 USD = 1_000_000 micros.
  return Math.round(cents * 1_000_000)
}
