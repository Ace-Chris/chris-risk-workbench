import { tool } from "@opencode-ai/plugin"
import { z } from "zod"
import type { Managers } from "../create-managers.js"
import { createTaskStatusTool } from "../hooks/task-lifecycle.js"
import { log } from '../shared/logger.js'

export function createToolRegistry(
  managers: Managers,
): Record<string, ReturnType<typeof tool>> {
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
    ...evolveTool,
    ...taskStatusTool,
  }

  log.info(`Registered ${Object.keys(tools).length} tools`)
  return tools
}