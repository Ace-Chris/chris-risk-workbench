/**
 * Agent model allocation table.
 * Centralized model assignment — change here, applies everywhere.
 *
 * Design principle: All agents use glm-5.1 as primary.
 * Agents that benefit from different reasoning styles can be overridden
 * via config file (chris-risk-workbench.jsonc).
 *
 * OpenRouter free models are NOT used as default due to reliability issues
 * (rate limits, credit exhaustion). They can be configured as fallback_models
 * in the config file if the user has active credits.
 */

export type ModelConfig = {
  model: string
  fallback: string
  temperature?: number
  mode: "primary" | "subagent" | "all"
}

export const AGENT_MODEL_MAP: Record<string, ModelConfig> = {
   chris: {
     model: "zai-coding-plan/glm-5.1",
     fallback: "zai-coding-plan/glm-5.1",
     mode: "primary",
   },
   "分析师": {
     model: "zai-coding-plan/glm-5.1",
     fallback: "zai-coding-plan/glm-5.1",
     temperature: 0.3,
     mode: "subagent",
   },
   "质疑员": {
     model: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
     fallback: "zai-coding-plan/glm-5.1",
     temperature: 0.5,
     mode: "subagent",
   },
   "跨界顾问": {
     model: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
     fallback: "zai-coding-plan/glm-5.1",
     temperature: 0.7,
     mode: "subagent",
   },
   "框架师": {
     model: "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
     fallback: "zai-coding-plan/glm-5.1",
     mode: "subagent",
   },
   "工程师": {
     model: "zai-coding-plan/glm-5.1",
     fallback: "zai-coding-plan/glm-5.1",
     temperature: 0.2,
     mode: "subagent",
   },
   "研究员": {
     model: "zai-coding-plan/glm-5.1",
     fallback: "zai-coding-plan/glm-5.1",
     mode: "subagent",
   },
   "进化师": {
     model: "zai-coding-plan/glm-5.1",
     fallback: "zai-coding-plan/glm-5.1",
     mode: "subagent",
   },
"视觉员": {
  model: "zai-coding-plan/glm-5v-turbo",
  fallback: "zai-coding-plan/glm-5.1",
  mode: "subagent",
},
}

/** Get model for an agent, with optional user override */
export function resolveAgentModel(
  agentName: string,
  userOverride?: string,
): { model: string; fallback: string; temperature?: number } {
  const base = AGENT_MODEL_MAP[agentName]
  if (!base) {
    return { model: userOverride ?? "zai-coding-plan/glm-5.1", fallback: "zai-coding-plan/glm-5.1" }
  }
  return {
    model: userOverride ?? base.model,
    fallback: base.fallback,
    temperature: base.temperature,
  }
}
