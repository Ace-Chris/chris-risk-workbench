import type { ChrisRiskWorkbenchConfig } from "./config/schema.js"
import type { ToolRegistry } from "./tools/types.js"
import type { HookDefinition } from "./hooks/create-hooks.js"
import type { AgentRegistry } from "./agents/types.js"
import { log } from "./shared/logger.js"

/**
 * Plugin interface — the object returned to OpenCode.
 * Implements the OpenCode plugin protocol handlers.
 */
export interface PluginInterface {
  name: string
  config: (params: { agents?: AgentRegistry }) => AgentRegistry
  tool: (params: { name: string }) => unknown
  event: (params: { event: string; data?: unknown }) => void
  [key: string]: unknown
}

/**
 * Create the plugin interface that OpenCode will consume.
 */
export function createPluginInterface(
  _config: ChrisRiskWorkbenchConfig,
  agents: AgentRegistry,
  tools: ToolRegistry,
  hooks: HookDefinition[],
): PluginInterface {
  log.info("Creating plugin interface")

  return {
    name: "chris-risk-workbench",

    config: (_params: { agents?: AgentRegistry }) => {
      log.debug("config handler called")
      return agents
    },

    tool: (params: { name: string }) => {
      const tool = tools[params.name]
      if (!tool) return undefined
      return tool
    },

    event: (params: { event: string; data?: unknown }) => {
      log.debug("event handler: " + params.event)
      for (const hook of hooks) {
        if (hook.event === params.event) {
          try {
            hook.handler(params.data ?? {})
          } catch (err) {
            log.error("Hook error for " + params.event + ": " + err)
          }
        }
      }
    },
  }
}
