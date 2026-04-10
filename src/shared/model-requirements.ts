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
      model: "",
      fallback: "",
      mode: "primary",
    },
    "分析师": {
      model: "",
      fallback: "",
      temperature: 0.3,
      mode: "subagent",
    },
    "质疑员": {
       model: "jsai/MiniMax-M2.7-highspeed",
       fallback: "opencode/glm-5.1",
       temperature: 0.5,
       mode: "subagent",
     },
     "跨界顾问": {
       model: "jsai/MiniMax-M2.7-highspeed",
       fallback: "opencode/glm-5.1",
       temperature: 0.7,
       mode: "subagent",
     },
     "框架师": {
       model: "",
       fallback: "",
       mode: "subagent",
     },
    "工程师": {
      model: "",
      fallback: "",
      temperature: 0.2,
      mode: "subagent",
    },
    "研究员": {
      model: "",
      fallback: "",
      mode: "subagent",
    },
    "进化师": {
      model: "",
      fallback: "",
      mode: "subagent",
    },
 "视觉员": {
   model: "",
   fallback: "",
   mode: "subagent",
 },
}

/** Get model for an agent, with optional user override */
export function resolveAgentModel(
   agentName: string,
   userOverride?: string,
): { model: string | undefined; fallback: string | undefined; temperature?: number } {
   const base = AGENT_MODEL_MAP[agentName]
   if (!base) {
     return { model: userOverride ?? undefined, fallback: undefined }
   }
   return {
     model: userOverride ?? base.model,
     fallback: base.fallback,
     temperature: base.temperature,
   }
}