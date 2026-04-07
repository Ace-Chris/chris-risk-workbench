import type { Hooks } from "@opencode-ai/plugin"
import type { Managers } from "../create-managers.js"
import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import { getWorkMode, WORK_MODE_LABELS } from "../config/schema.js"
import { truncate } from "../shared/utils.js"
import { log } from "../shared/logger.js"

export function createSystemTransformHook(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
): NonNullable<Hooks["experimental.chat.system.transform"]> {
  const mode = getWorkMode(config)
  const modeLabel = WORK_MODE_LABELS[mode]
  return async (_input, output) => {
    const frameworkSummaries = managers.framework.getAllSummaries()
    let frameworkBlock = ""
    if (frameworkSummaries.size > 0) {
      frameworkBlock = "\n## 可用框架知识库\n"
      for (const [name, summary] of frameworkSummaries) {
        frameworkBlock += "- " + name + ": " + truncate(summary, 80) + "\n"
      }
    }
    const contextBlock = [
      "## 当前工作上下文",
      "- 工作模式: " + modeLabel,
      "- 可用Agent: chris(主编), 分析师, 质疑员, 工程师, 研究员, 跨界顾问, 框架师, 进化师, 视觉员",
      frameworkBlock,
    ].join("\n")
    output.system.push(contextBlock)
    log.debug("Injected context into system prompt")
  }
}
