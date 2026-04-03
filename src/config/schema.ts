import { z } from "zod"
import { existsSync, readFileSync } from "fs"
import { join, resolve } from "path"
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
export function loadPluginConfig(directory: string): ChrisRiskWorkbenchConfig {
  // 1. Load user config: ~/.config/opencode/chris-risk-workbench.jsonc
  const userConfigDir = resolve(directory, "..", "..")
  const userConfigPath = join(userConfigDir, ".config", "opencode", "chris-risk-workbench.jsonc")
  let userConfig: Partial<ChrisRiskWorkbenchConfig> = {}
  if (existsSync(userConfigPath)) {
    try {
      const raw = readFileSync(userConfigPath, "utf-8")
      userConfig = parseJSONC(raw) as Partial<ChrisRiskWorkbenchConfig>
      log.info("Loaded user config from " + userConfigPath)
    } catch (err) {
      log.warn("Failed to parse user config: " + userConfigPath, err)
    }
  }

  // 2. Load project config: .opencode/chris-risk-workbench.jsonc
  const projectConfigPath = join(directory, ".opencode", "chris-risk-workbench.jsonc")
  let projectConfig: Partial<ChrisRiskWorkbenchConfig> = {}
  if (existsSync(projectConfigPath)) {
    try {
      const raw = readFileSync(projectConfigPath, "utf-8")
      projectConfig = parseJSONC(raw) as Partial<ChrisRiskWorkbenchConfig>
      log.info("Loaded project config from " + projectConfigPath)
    } catch (err) {
      log.warn("Failed to parse project config: " + projectConfigPath, err)
    }
  }

  // 3. Merge: project overrides user overrides defaults
  const merged = deepMerge(DEFAULT_CONFIG, userConfig)
  const finalConfig = deepMerge(merged, projectConfig)

  // 4. Validate with Zod
  const result = ChrisRiskWorkbenchConfigSchema.safeParse(finalConfig)
  if (!result.success) {
    log.error("Config validation errors:", result.error)
    return DEFAULT_CONFIG
  }

  log.info("Final config loaded successfully")
  return result.data
}

// === Helper Functions ===
export function getAgentModelConfig(
  agentName: string,
  config: ChrisRiskWorkbenchConfig,
): ModelConfig {
  const defaultModel = AGENT_MODEL_MAP[agentName]
  if (!defaultModel) {
    return {
      model: "zai-coding-plan/glm-5.1",
      fallback: "zai-coding-plan/glm-5.1",
      mode: "subagent",
    }
  }

  const override = config.agents?.[agentName]
  if (override?.model) {
    return {
      ...defaultModel,
      model: override.model,
      fallback: override.fallback_models?.[0] ?? defaultModel.fallback,
      temperature: override.temperature ?? defaultModel.temperature,
    }
  }

  return defaultModel
}

export function getWorkMode(config: ChrisRiskWorkbenchConfig): WorkMode {
  return config.mode ?? "all"
}
