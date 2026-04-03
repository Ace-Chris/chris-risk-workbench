import type { Managers } from "../create-managers.js"
import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import { getWorkMode, WORK_MODE_LABELS } from "../config/schema.js"
import { truncate } from "../shared/utils.js"
import { log } from "../shared/logger.js"

/**
 * Context injector hook.
 * Injects work mode, framework summaries, and task context into system prompt.
 * Called on experimental.chat.system.transform event.
 */
export function createContextInjectorHook(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
) {
  return {
    event: "experimental.chat.system.transform" as const,
    handler: (params: { messages?: Array<{ role: string; content: string }> }) => {
      if (!params.messages || params.messages.length === 0) return

      const mode = getWorkMode(config)
      const modeLabel = WORK_MODE_LABELS[mode]

      // Build context block
      const frameworkSummaries = managers.framework.getAllSummaries()
      let frameworkBlock = ""
      if (frameworkSummaries.size > 0) {
        frameworkBlock = "\n## 可用框架知识库\n"
        for (const [name, summary] of frameworkSummaries) {
          frameworkBlock += `- ${name}: ${truncate(summary, 80)}\n`
        }
      }

      const contextBlock = `
## 当前工作上下文
- 工作模式: ${modeLabel}
- 可用Agent: chris(主编), 分析师, 质疑员, 工程师, 研究员, 跨界顾问, 框架师, 进化师, 视觉员
${frameworkBlock}
`.trim()

      // Prepend context to first system message
      const firstMsg = params.messages[0]
      if (firstMsg && firstMsg.role === "system") {
        firstMsg.content = contextBlock + "\n\n" + firstMsg.content
        log.debug("Injected context into system prompt")
      }
    },
  }
}
