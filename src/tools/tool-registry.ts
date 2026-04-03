import type { ToolDefinition, ToolRegistry } from "./types.js"
import type { Managers } from "../create-managers.js"
import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import { log } from "../shared/logger.js"

/**
 * Framework query tool - search frameworks knowledge base
 */
function createFrameworkQueryTool(frameworkManager: Managers["framework"]): Record<string, ToolDefinition> {
  return {
    framework_query: {
      name: "framework_query",
      description: "搜索框架知识库，根据关键词查找匹配的分析框架",
      parameters: {
        query: { type: "string", description: "搜索关键词", required: true },
      },
      execute: async (args: Record<string, unknown>) => {
        const query = String(args.query ?? "")
        if (!query) return "请提供搜索关键词"
        const results = frameworkManager.searchFrameworks(query)
        if (results.size === 0) return "未找到匹配的框架，请尝试其他关键词"
        let output = `找到 ${results.size} 个匹配框架：\n\n`
        for (const [name, content] of results) {
          const preview = content.split("\n").slice(0, 5).join("\n")
          output += `### ${name}\n${preview}\n\n`
        }
        return output
      },
    },
  }
}

/**
 * Debate tool - trigger debate between agents
 */
function createDebateTool(debateManager: Managers["debate"]): Record<string, ToolDefinition> {
  return {
    debate_trigger: {
      name: "debate_trigger",
      description: "触发辩论机制，让质疑员和跨界顾问对当前结论进行质疑",
      parameters: {
        topic: { type: "string", description: "辩论主题", required: true },
        conclusion: { type: "string", description: "需要质疑的结论", required: true },
      },
      execute: async (args: Record<string, unknown>) => {
        const topic = String(args.topic ?? "")
        const conclusion = String(args.conclusion ?? "")
        debateManager.startDebate()
        debateManager.addPoint("system", `辩论主题: ${topic}`)
        debateManager.addPoint("system", `待质疑结论: ${conclusion}`)
        return `辩论已启动。\n主题: ${topic}\n待质疑: ${conclusion}\n\n请 chris 派质疑员和跨界顾问参与辩论。`
      },
    },
    debate_status: {
      name: "debate_status",
      description: "查看当前辩论状态和历史记录",
      parameters: {},
      execute: async () => {
        if (debateManager.getHistory().length === 0) {
          return "当前没有进行中的辩论"
        }
        return debateManager.getSummary()
      },
    },
    debate_conclude: {
      name: "debate_conclude",
      description: "结束辩论并生成综合结论",
      parameters: {
        final_conclusion: { type: "string", description: "最终综合结论", required: true },
      },
      execute: async (args: Record<string, unknown>) => {
        const finalConclusion = String(args.final_conclusion ?? "")
        debateManager.addPoint("chris", `最终结论: ${finalConclusion}`)
        const summary = debateManager.getSummary()
        return `辩论结束。完整记录：\n\n${summary}`
      },
    },
  }
}

/**
 * Mode switch tool - switch between work modes
 */
function createModeSwitchTool(): Record<string, ToolDefinition> {
  return {
    mode_switch: {
      name: "mode_switch",
      description: "切换工作模式（数据分析/特征衍生/策略制定）",
      parameters: {
        mode: {
          type: "string",
          description: "目标模式: data-analysis | feature-engineering | strategy-design",
          required: true,
          enum: ["data-analysis", "feature-engineering", "strategy-design"],
        },
      },
      execute: async (args: Record<string, unknown>) => {
        const mode = String(args.mode ?? "")
        const validModes = ["data-analysis", "feature-engineering", "strategy-design"]
        if (!validModes.includes(mode)) {
          return `无效模式: ${mode}。可选: ${validModes.join(", ")}`
        }
        const labels: Record<string, string> = {
          "data-analysis": "数据分析模式",
          "feature-engineering": "特征衍生模式",
          "strategy-design": "策略制定模式",
        }
        return `已切换到 ${labels[mode]}。\n在此模式下，chris 将优先调度相关 Agent。`
      },
    },
  }
}

/**
 * Evolution tool - trigger self-improvement cycle
 */
function createEvolutionTool(): Record<string, ToolDefinition> {
  return {
    evolve: {
      name: "evolve",
      description: "触发进化师评估系统表现并提出改进建议",
      parameters: {
        task_summary: { type: "string", description: "最近完成的任务摘要", required: true },
      },
      execute: async (args: Record<string, unknown>) => {
        const taskSummary = String(args.task_summary ?? "")
        return `进化师已收到评估请求。\n任务摘要: ${taskSummary}\n\n进化师将评估以下维度：\n1. 特征质量\n2. 分析深度\n3. 辩论效果\n4. 效率\n\n请 chris 派进化师执行评估。`
      },
    },
  }
}

/**
 * Create all tools and return filtered registry
 */
export function createToolRegistry(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
): ToolRegistry {
  const disabledTools = new Set(config.disabled_tools ?? [])

  const allTools: ToolRegistry = {
    ...createFrameworkQueryTool(managers.framework),
    ...createDebateTool(managers.debate),
    ...createModeSwitchTool(),
    ...createEvolutionTool(),
  }

  // Filter disabled tools
  const filteredTools: ToolRegistry = {}
  for (const [name, tool] of Object.entries(allTools)) {
    if (disabledTools.has(name)) {
      log.info("Tool disabled: " + name)
      continue
    }
    filteredTools[name] = tool
  }

  log.info("Registered " + Object.keys(filteredTools).length + " tools")
  return filteredTools
}
