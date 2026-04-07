import type { Hooks } from "@opencode-ai/plugin"
import type { Managers } from "../create-managers.js"
import { log } from "../shared/logger.js"

export function createToolExecuteAfterHook(
  _debateManager: Managers["debate"],
): NonNullable<Hooks["tool.execute.after"]> {
  return async (input, _output) => {
    const debateTriggerTools = ["framework_query", "mode_switch"]
    if (debateTriggerTools.includes(input.tool)) {
      log.debug("Tool " + input.tool + " completed, debate coordinator notified")
    }
  }
}
