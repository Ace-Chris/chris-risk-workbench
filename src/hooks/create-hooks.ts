import type { Hooks } from "@opencode-ai/plugin"
import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import type { Managers } from "../create-managers.js"
import { createEventHook } from "./mode-detector.js"
import { createToolExecuteAfterHook as createDebateAfterHook } from "./debate-coordinator.js"
import { createSystemTransformHook } from "./context-injector.js"
import { createRuntimeFallbackHook, createRuntimeFallbackToolHook } from "./runtime-fallback.js"
import { createTaskLifecycleHook } from "./task-lifecycle.js"
import { log } from "../shared/logger.js"

export type CreatedHooks = {
  event?: Hooks["event"]
  "chat.message"?: Hooks["chat.message"]
  "tool.execute.after"?: Hooks["tool.execute.after"]
  "experimental.chat.system.transform"?: Hooks["experimental.chat.system.transform"]
}

export function createHooks(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
  directory: string,
): CreatedHooks {
  const hooks: CreatedHooks = {}

  // 1. Session event hook — auto-detect work mode
  const eventHook = createEventHook(config, directory)
  if (eventHook) hooks.event = eventHook

  // 2. Runtime model fallback — auto-switch on model errors
  const fallbackChatHook = createRuntimeFallbackHook(config)
  hooks["chat.message"] = fallbackChatHook

  // 3. Tool execute after — debate coordinator + runtime fallback + task lifecycle
  const debateAfterHook = createDebateAfterHook(managers.debate)
  const fallbackToolHook = createRuntimeFallbackToolHook(config)
  const taskLifecycleHook = createTaskLifecycleHook()
  // Chain all tool.execute.after hooks
  hooks["tool.execute.after"] = async (input, output) => {
    await debateAfterHook(input, output)
    await fallbackToolHook(input, output)
    await taskLifecycleHook(input, output)
  }

  // 4. System transform — enhanced context injection
  const systemTransformHook = createSystemTransformHook(config, managers, directory)
  if (systemTransformHook) hooks["experimental.chat.system.transform"] = systemTransformHook

  log.info("Registered " + Object.keys(hooks).length + " hooks (event, chat.message, tool.execute.after, system.transform)")
  return hooks
}
