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
import type { SkillLoader } from "../shared/skill-loader.js"
import { log } from "../shared/logger.js"

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
 * Create all builtin agents, applying user overrides from config
 * and injecting skill content into instructions.
 */
export function createBuiltinAgents(
  config: ChrisRiskWorkbenchConfig,
  skillLoader: SkillLoader,
): AgentRegistry {
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
    const agent = override ? applyOverride(baseAgent, override) : baseAgent

    // Inject skill content into instructions
    const finalAgent = injectSkills(agent, skillLoader)
    registry[name] = finalAgent
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
    ...(override.skills && { skills: [...(base.skills ?? []), ...override.skills] }),
    ...(override.disable && { mode: "subagent" as const }), // disabled agents still registered but won't be primary
  }
}

/**
 * Inject skill content into agent's instructions.
 * Merges agent-declared skills + user-configured skills,
 * loads their content via SkillLoader, and appends to instructions.
 */
function injectSkills(agent: AgentConfig, skillLoader: SkillLoader): AgentConfig {
  const skillNames = agent.skills ?? []
  if (skillNames.length === 0) return agent

  const skillBlock = skillLoader.buildSkillBlock(skillNames)
  if (!skillBlock) {
    log.warn(`No skill content found for agent ${agent.name} (requested: ${skillNames.join(", ")})`)
    return agent
  }

  log.info(`Injected ${skillNames.length} skills into agent ${agent.name}`)
  return {
    ...agent,
    instructions: agent.instructions + skillBlock,
  }
}

/**
 * Get list of all agent names.
 */
export function getAgentNames(): string[] {
  return Object.keys(agentSources)
}
