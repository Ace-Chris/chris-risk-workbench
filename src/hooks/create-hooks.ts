import type { Hooks } from "@opencode-ai/plugin"
import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import type { Managers } from "../create-managers.js"
import { createEventHook } from "./mode-detector.js"
import { createToolExecuteAfterHook } from "./debate-coordinator.js"
import { createSystemTransformHook } from "./context-injector.js"
import { log } from "../shared/logger.js"

export type CreatedHooks = {
  event?: Hooks["event"]
  "tool.execute.after"?: Hooks["tool.execute.after"]
  "experimental.chat.system.transform"?: Hooks["experimental.chat.system.transform"]
}

export function createHooks(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
  directory: string,
): CreatedHooks {
  const hooks: CreatedHooks = {}
  const eventHook = createEventHook(config, directory)
  if (eventHook) hooks.event = eventHook
  const toolAfterHook = createToolExecuteAfterHook(managers.debate)
  if (toolAfterHook) hooks["tool.execute.after"] = toolAfterHook
  const systemTransformHook = createSystemTransformHook(config, managers)
  if (systemTransformHook) hooks["experimental.chat.system.transform"] = systemTransformHook
  log.info("Registered " + Object.keys(hooks).length + " hooks")
  return hooks
}
