/**
 * Agent type definitions for chris-risk-workbench.
 */

export type AgentMode = "primary" | "subagent" | "all"

export type AgentConfig = {
  name: string
  instructions: string
  model: string
  mode: AgentMode
  fallback_models: string[]
  tools?: Record<string, boolean>
  temperature?: number
  description: string
  color?: string
}

export type AgentFactory = ((model: string) => AgentConfig) & { mode: AgentMode }

export type AgentRegistry = Record<string, AgentConfig>
