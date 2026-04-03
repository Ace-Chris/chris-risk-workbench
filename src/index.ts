/**
 * chris-risk-workbench — Credit risk workbench plugin for OpenCode.
 *
 * 5-step initialization:
 * 1. loadPluginConfig   → read user/project config, validate with Zod
 * 2. createManagers     → FrameworkManager (knowledge base) + DebateManager
 * 3. createBuiltinAgents → 9 agents with model allocation
 * 4. createTools        → framework query, debate, mode switch, evolution
 * 5. createHooks        → mode detector, debate coordinator, context injector
 * 6. createPluginInterface → wire everything into OpenCode plugin protocol
 */
/**
 * chris-risk-workbench — Credit risk workbench plugin for OpenCode.
 *
 * 5-step initialization:
 * 1. loadPluginConfig   → read user/project config, validate with Zod
 * 2. createManagers     → FrameworkManager (knowledge base) + DebateManager
 * 3. createBuiltinAgents → 9 agents with model allocation
 * 4. createTools        → framework query, debate, mode switch, evolution
 * 5. createHooks        → mode detector, debate coordinator, context injector
 * 6. createPluginInterface → wire everything into OpenCode plugin protocol
 */

import { loadPluginConfig } from "./config/schema.js"
import { createManagers } from "./create-managers.js"
import { createBuiltinAgents } from "./agents/builtin-agents.js"
import { createTools } from "./create-tools.js"
import { createHooks } from "./hooks/create-hooks.js"
import { createPluginInterface } from "./plugin-interface.js"
import { log } from "./shared/logger.js"

/**
 * Local type for the OpenCode plugin function signature.
 * Matches @opencode-ai/plugin's Plugin type.
 */
type PluginFn = (ctx: { directory: string }) => Promise<Record<string, unknown>>

const ChrisRiskWorkbenchPlugin: PluginFn = async (ctx) => {
  log.info("=== chris-risk-workbench initializing ===")

  // Step 1: Load configuration
  const config = loadPluginConfig(ctx.directory)
  log.info("Config loaded")

  // Step 2: Create managers
  const managers = createManagers(config, ctx.directory)
  log.info("Managers created")

  // Step 3: Create agents
  const agents = createBuiltinAgents(config)
  log.info("Agents created: " + Object.keys(agents).join(", "))

  // Step 4: Create tools
  const tools = createTools(config, managers)
  log.info("Tools created")

  // Step 5: Create hooks
  const hooks = createHooks(config, managers)
  log.info("Hooks created")

  // Step 6: Create plugin interface
  const iface = createPluginInterface(config, agents, tools, hooks)
  log.info("=== chris-risk-workbench ready ===")

  return iface
}

export default ChrisRiskWorkbenchPlugin

// Re-export types for consumer access
export type { ChrisRiskWorkbenchConfig, WorkMode } from "./config/schema.js"
export type { AgentConfig, AgentRegistry } from "./agents/types.js"
