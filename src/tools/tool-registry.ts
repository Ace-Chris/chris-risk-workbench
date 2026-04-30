import { tool } from "@opencode-ai/plugin"
import { z } from "zod"
import type { Managers } from "../create-managers.js"
import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import { createTaskStatusTool } from "../hooks/task-lifecycle.js"
import { log } from '../shared/logger.js'

export function createToolRegistry(
  managers: Managers,
  _config: ChrisRiskWorkbenchConfig,
): Record<string, ReturnType<typeof tool>> {
  // Note: config is used in other tool registrations but not in this specific set
  // Chris-specific tools
  const frameworkQueryTool = {
    framework_query: tool({
      description: "查询框架知识库，获取特定框架的详细信息或列出所有可用框架",
      args: {
        framework: z.string().optional().describe("要查询的框架名称（可选）"),
      },
      execute: async (args) => {
        if (args.framework) {
          const summary = managers.framework.getAllSummaries().get(args.framework)
          if (!summary) {
            return `未找到框架: ${args.framework}\n可用框架: ${Array.from(managers.framework.getAllSummaries().keys()).join(", ")}`
          }
          return `${args.framework}: ${summary}`
        } else {
          const list = Array.from(managers.framework.getAllSummaries().entries())
            .map(([name, summary]) => `- ${name}: ${summary}`)
            .join("\n")
          return `可用框架知识库:\n${list}`
        }
      },
    }),
  }

  const debateQueryTool = {
    debate_query: tool({
      description: "查询辩论历史记录，查看过去的辩论过程和结果",
      args: {
        limit: z.number().min(1).max(50).optional().default(10).describe("返回最近的辩论条数"),
      },
      execute: async (args) => {
        const history = managers.debate.getHistory()
        if (history.length === 0) {
          return "暂无辩论历史"
        }
        const recent = history.slice(-args.limit)
        return recent
          .map(
            (d, i) =>
              `${history.length - i}. ${d.speaker}: ${d.content}\n` +
              `  第 ${d.round} 轮\n` +
              `  时间: ${new Date().toLocaleString()}\n` // Simplified - would need timestamp storage
          )
          .join("\n")
      },
    }),
  }

  const modeSwitchTool = {
    mode_switch: tool({
      description: "切换工作模式（数据分析、特征工程、策略设计）",
      args: {
        mode: z.enum(["data-analysis", "feature-engineering", "strategy-design"]).describe("目标工作模式"),
      },
      execute: async (args) => {
        // Mode switching is handled by the mode-detector hook, this tool is just for explicit setting
        return `工作模式切换请求已提交: ${args.mode}。实际模式由目录结构和配置共同决定。`
      },
    }),
  }

  const evolveTool = {
    evolve: tool({
      description: "对已完成的工作进行进化式改进建议",
      args: {
        target: z
          .string()
          .describe("要改进的对象：可以是特征名称、模型名称、报告标题等"),
        aspect: z
          .enum(["performance", "interpretability", "stability", "business_logic"])
          .optional()
          .describe("改进方面"),
      },
      execute: async (args) => {
        // Delegate to evolver agent — return instruction for Chris to dispatch
        const aspectText = args.aspect ? `（${args.aspect}方面）` : ""
        return `[进化建议请求] 请将以下目标派给「进化师」进行评估：\n` +
          `目标: "${args.target}"${aspectText}\n` +
          `进化师会返回：整体评分、优点、不足、改进建议、可沉淀知识。`
      },
    }),
  }

  const taskStatusTool = createTaskStatusTool()

  const tools = {
    ...frameworkQueryTool,
    ...debateQueryTool,
    ...modeSwitchTool,
    ...evolveTool,
    ...taskStatusTool,
  }

  log.info(`Registered ${Object.keys(tools).length} tools`)
  return tools
}