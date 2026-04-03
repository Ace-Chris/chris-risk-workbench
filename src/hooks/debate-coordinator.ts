import type { Managers } from "../create-managers.js"
import { log } from "../shared/logger.js"

/**
 * Debate coordinator hook.
 * Automatically triggers debate after analyst/engineer produce results.
 */
export function createDebateCoordinatorHook(_debateManager: Managers["debate"]) {
  return {
    event: "tool.execute.after" as const,
    handler: (params: { toolName?: string; result?: string }) => {
      if (!params.toolName) return

      // Auto-trigger debate hint after key tools complete
      const debateTriggerTools = ["framework_query", "mode_switch"]
      if (debateTriggerTools.includes(params.toolName)) {
        log.debug("Tool " + params.toolName + " completed, debate coordinator notified")
      }
    },
  }
}
