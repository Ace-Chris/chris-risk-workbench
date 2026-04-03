/**
 * Agent model allocation table.
 * Centralized model assignment — change here, applies everywhere.
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
    model: "zai-coding-plan/glm-5.1",
    fallback: "zai-coding-plan/glm-5.1",
    temperature: 0.5,
    mode: "subagent",
  },
  "工程师": {
    model: "zai-coding-plan/glm-5.1",
    fallback: "zai-coding-plan/glm-5.1",
    mode: "subagent",
  },
  "研究员": {
    model: "opencode/qwen3.6-plus-free",
    fallback: "zai-coding-plan/glm-5.1",
    mode: "subagent",
  },
  "跨界顾问": {
    model: "opencode/qwen3.6-plus-free",
    fallback: "zai-coding-plan/glm-5.1",
    temperature: 0.7,
    mode: "subagent",
  },
  "框架师": {
    model: "opencode/qwen3.6-plus-free",
    fallback: "zai-coding-plan/glm-5.1",
    mode: "subagent",
  },
  "进化师": {
    model: "opencode/qwen3.6-plus-free",
    fallback: "zai-coding-plan/glm-5.1",
    mode: "subagent",
  },
  "视觉员": {
    model: "zai-coding-plan/glm-5v",
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
