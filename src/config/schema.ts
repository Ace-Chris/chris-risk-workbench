/**
 * Configuration schema for chris-risk-workbench.
 * Defines types, defaults, and config loading logic.
 */

import { z } from "zod"
import { existsSync, readFileSync } from "fs"
import { join } from "path"
import { parseJSONC, deepMerge } from "../shared/utils.js"
import { log } from "../shared/logger.js"
import { AGENT_MODEL_MAP } from "../shared/model-requirements.js"
import type { ModelConfig } from "../shared/model-requirements.js"

// === Work Mode ===

export type WorkMode = "data-analysis" | "feature-engineering" | "strategy-design" | "all"

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  "data-analysis": "数据分析模式",
  "feature-engineering": "特征衍生模式",
  "strategy-design": "策略制定模式",
  all: "综合模式",
}

export const WORK_MODE_DESCRIPTIONS: Record<WorkMode, string> = {
  "data-analysis": "全面探索数据，输出数据质量报告和分析报告",
  "feature-engineering": "分析变量预测能力，设计衍生特征，生成工程代码",
  "strategy-design": "制定风控策略规则，评估策略效果，优化决策逻辑",
  all: "综合模式，自动识别任务类型并调度合适的Agent",
}

// === Agent Override Schema ===

export const AgentOverrideSchema = z.object({
  model: z.string().optional(),
  fallback_models: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  skills: z.array(z.string()).optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  disable: z.boolean().optional(),
  description: z.string().optional(),
  prompt_append: z.string().optional(),
})

export type AgentOverride = z.infer<typeof AgentOverrideSchema>

// === Debate Config Schema ===

export const DebateConfigSchema = z.object({
  auto_trigger: z.boolean().optional().default(true),
  max_rounds: z.number().optional().default(3),
  participants: z.array(z.string()).optional(),
})

export type DebateConfig = z.infer<typeof DebateConfigSchema>

// === Root Config Schema ===

export const ChrisRiskWorkbenchConfigSchema = z.object({
  mode: z.enum(["data-analysis", "feature-engineering", "strategy-design", "all"]).optional(),
  agents: z.record(z.string(), AgentOverrideSchema).optional(),
  disabled_tools: z.array(z.string()).optional(),
  disabled_agents: z.array(z.string()).optional(),
  frameworks_path: z.string().optional(),
  debate: DebateConfigSchema.optional(),
  skills_path: z.string().optional(),
  /** Global fallback model chain — tried in order when the primary model fails */
  fallback_models: z.array(z.string()).optional(),
})

export type ChrisRiskWorkbenchConfig = z.infer<typeof ChrisRiskWorkbenchConfigSchema>

// === Defaults ===

export const DEFAULT_CONFIG: ChrisRiskWorkbenchConfig = {
  mode: "all",
  debate: {
    auto_trigger: true,
    max_rounds: 3,
    participants: ["分析师", "质疑员", "跨界顾问"],
  },
}

// === Config Loading ===

const CONFIG_FILENAME = "chris-risk-workbench.jsonc"

export function loadPluginConfig(directory: string): ChrisRiskWorkbenchConfig {
  const configPath = join(directory, CONFIG_FILENAME)

  if (!existsSync(configPath)) {
    log.info("No config file found, using defaults")
    return { ...DEFAULT_CONFIG }
  }

  try {
    const raw = readFileSync(configPath, "utf-8")
    const parsed = parseJSONC(raw) as Partial<ChrisRiskWorkbenchConfig>
    const config = deepMerge(DEFAULT_CONFIG, parsed)
    const validated = ChrisRiskWorkbenchConfigSchema.parse(config)
    log.info("Config loaded from " + configPath)
    return validated
  } catch (err) {
    log.warn("Failed to load config, using defaults: " + err)
    return { ...DEFAULT_CONFIG }
  }
}

// === Helper Functions ===

export function getAgentModelConfig(
  agentName: string,
  config: ChrisRiskWorkbenchConfig,
): ModelConfig {
  const base = AGENT_MODEL_MAP[agentName]
  const override = config.agents?.[agentName]

  if (!base) {
    return {
      model: override?.model ?? "opencode/glm-5.1",
      fallback: override?.fallback_models?.[0] ?? "opencode/glm-5.1",
      temperature: override?.temperature,
      mode: "subagent",
    }
  }

  return {
    model: override?.model ?? base.model,
    fallback: override?.fallback_models?.[0] ?? base.fallback,
    temperature: override?.temperature ?? base.temperature,
    mode: base.mode,
  }
}

export function getWorkMode(config: ChrisRiskWorkbenchConfig): WorkMode {
  return config.mode ?? "all"
}
