import type { AgentFactory } from "./types.js"
import { createChrisAgent } from "./chris.js"
import { createAnalystAgent } from "./分析师.js"
import { createChallengerAgent } from "./质疑员.js"
import { createEngineerAgent } from "./工程师.js"
import { createResearcherAgent } from "./研究员.js"
import { createCrossAdvisorAgent } from "./跨界顾问.js"
import { createFrameworkAgent } from "./框架师.js"
import { createEvolverAgent } from "./进化师.js"
import { createLookerAgent } from "./视觉员.js"
import type { AgentOverride, ChrisRiskWorkbenchConfig } from "../config/schema.js"
import { getAgentModelConfig } from "../config/schema.js"
import type { AgentConfig, AgentRegistry } from "./types.js"

/**
 * All builtin agent factories.
 * Key = agent name (Chinese), Value = factory function.
 */
const agentSources: Record<string, AgentFactory> = {
  chris: createChrisAgent,
  "分析师": createAnalystAgent,
  "质疑员": createChallengerAgent,
  "工程师": createEngineerAgent,
  "研究员": createResearcherAgent,
  "跨界顾问": createCrossAdvisorAgent,
  "框架师": createFrameworkAgent,
  "进化师": createEvolverAgent,
  "视觉员": createLookerAgent,
}

/**
 * Create all builtin agents, applying user overrides from config.
 */
export function createBuiltinAgents(config: ChrisRiskWorkbenchConfig): AgentRegistry {
  const registry: AgentRegistry = {}
  const disabledAgents = new Set(config.disabled_agents ?? [])

  for (const [name, factory] of Object.entries(agentSources)) {
    if (disabledAgents.has(name)) {
      continue // skip disabled agents
    }

    const modelConfig = getAgentModelConfig(name, config)
    const baseAgent = factory(modelConfig.model)

    // Apply user overrides
    const override: AgentOverride | undefined = config.agents?.[name]
    if (override) {
      registry[name] = applyOverride(baseAgent, override)
    } else {
      registry[name] = baseAgent
    }
  }

  return registry
}

/**
 * Apply user config overrides to an agent.
 */
function applyOverride(base: AgentConfig, override: AgentOverride): AgentConfig {
  return {
    ...base,
    ...(override.model && { model: override.model }),
    ...(override.temperature !== undefined && { temperature: override.temperature }),
    ...(override.description && { description: override.description }),
    ...(override.prompt_append && {
      instructions: base.instructions + "\n\n" + override.prompt_append,
    }),
    ...(override.tools && { tools: { ...base.tools, ...override.tools } }),
    ...(override.disable && { mode: "subagent" as const }), // disabled agents still registered but won't be primary
  }
}

/**
 * Get list of all agent names.
 */
export function getAgentNames(): string[] {
  return Object.keys(agentSources)
}
