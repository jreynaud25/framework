export type ComplianceResult = 'passed' | 'flagged' | 'error'

export type FlagSeverity = 'info' | 'warn' | 'error'

export type FlagCategory =
  | 'color'
  | 'typography'
  | 'logo'
  | 'spacing'
  | 'imagery'
  | 'voice'
  | 'motion'
  | 'custom'

export interface ComplianceFlag {
  severity: FlagSeverity
  category: FlagCategory
  description: string
  ruleId?: string
  /** dotted-path / slot key / node id */
  location?: string
  suggestion?: string
}

export interface ComplianceReport {
  result: ComplianceResult
  flags: ComplianceFlag[]
  modelId: string
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  costUsdMicros: number
  durationMs: number
}
