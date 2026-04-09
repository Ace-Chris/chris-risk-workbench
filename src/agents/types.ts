/**
 * Agent type definitions for chris-risk-workbench.
 * Internal types used by agent factories and registry.
 */

export type AgentMode = "primary" | "subagent" | "all"

export type AgentConfig = {
  name: string
  instructions: string
  model: string
  mode: AgentMode
  fallback_models: string[]
  tools?: { [key: string]: boolean }
  temperature?: number
  description: string
  color?: string
  /** Skill names to load and inject into this agent's instructions */
  skills?: string[]
  /** Maximum number of agentic iterations before forcing text-only response */
  maxSteps?: number
}

export type AgentFactory = ((model: string) => AgentConfig) & { mode: AgentMode }

export type AgentRegistry = { [key: string]: AgentConfig }

/**
 * Convert our internal AgentConfig to OpenCode SDK's AgentConfig format.
 * Maps `instructions` to `prompt`, drops `name` (key IS the name).
 * Passes through `fallback_models` and `maxSteps` as extra fields —
 * these are handled by omo (oh-my-openagent) runtime if present.
 */
export function toOpenCodeAgent(agent: AgentConfig): { [key: string]: unknown } {
  const result: { [key: string]: unknown } = {
    prompt: agent.instructions,
    model: agent.model,
    mode: agent.mode,
  }
  if (agent.temperature !== undefined) {
    result.temperature = agent.temperature
  }
  if (agent.color) {
    result.color = agent.color
  }
  if (agent.tools) {
    result.tools = agent.tools
  }
  if (agent.description) {
    result.description = agent.description
  }
  if (agent.maxSteps !== undefined) {
    result.maxSteps = agent.maxSteps
  }
  if (agent.fallback_models && agent.fallback_models.length > 0) {
    result.fallback_models = agent.fallback_models
  }
  return result
}
