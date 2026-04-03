import type { Plugin } from "@opencode-ai/plugin"

import { loadPluginConfig } from "./config/schema.js"
import { createManagers } from "./create-managers.js"
import { createBuiltinAgents } from "./agents/builtin-agents.js"
import { createToolRegistry } from "./tools/tool-registry.js"
import { createHooks } from "./hooks/create-hooks.js"
import { createPluginInterface } from "./plugin-interface.js"
import { log } from "./shared/logger.js"

const ChrisRiskWorkbenchPlugin: Plugin = async (ctx) => {
  log.info("=== chris-risk-workbench initializing ===")

  const config = loadPluginConfig(ctx.directory)
  log.info("Config loaded")

  const managers = createManagers(config, ctx.directory)
  log.info("Managers created")

  const agents = createBuiltinAgents(config)
  log.info("Agents created")

  const tools = createToolRegistry(config, managers)
  log.info("Tools created")

  const hooks = createHooks(config, managers)
  log.info("Hooks created")

  const iface = createPluginInterface({
    config,
    agents,
    tools,
    hooks,
    managers,
  })
  log.info("=== chris-risk-workbench ready ===")

  return iface
}

export default ChrisRiskWorkbenchPlugin

export type { ChrisRiskWorkbenchConfig, WorkMode } from "./config/schema.js"
export type { AgentConfig, AgentRegistry } from "./agents/types.js"
