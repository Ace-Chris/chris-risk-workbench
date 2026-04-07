/**
 * chris-risk-workbench — OpenCode Plugin Entry Point
 *
 * Initializes the multi-agent credit risk workbench:
 *  1. Loads config
 *  2. Creates managers (Framework, Debate)
 *  3. Loads skills from disk via SkillLoader
 *  4. Creates agents with skill injection
 *  5. Registers tools and hooks
 *  6. Returns the plugin interface (Hooks)
 */

import type { Plugin } from "@opencode-ai/plugin"
import { loadPluginConfig } from "./config/schema.js"
import { createManagers } from "./create-managers.js"
import { createBuiltinAgents } from "./agents/builtin-agents.js"
import { createToolRegistry } from "./tools/tool-registry.js"
import { createHooks } from "./hooks/create-hooks.js"
import { createPluginInterface } from "./plugin-interface.js"
import { SkillLoader, resolveSkillPaths } from "./shared/skill-loader.js"
import { log } from "./shared/logger.js"

const ChrisRiskWorkbenchPlugin: Plugin = async (ctx) => {
  log.info("=== chris-risk-workbench initializing ===")

  const config = loadPluginConfig(ctx.directory)
  log.info("Config loaded")

  const managers = createManagers(config, ctx.directory)
  log.info("Managers created")

  const skillPaths = resolveSkillPaths(
    ctx.directory,
    config.skills_path ? [config.skills_path] : undefined,
  )
  const skillLoader = new SkillLoader(skillPaths)
  log.info("SkillLoader ready: " + skillLoader.getLoadedSkillNames().length + " skills indexed")

  const agents = createBuiltinAgents(config, skillLoader)
  log.info("Agents created")

  const tools = createToolRegistry(config, managers)
  log.info("Tools created")

  const hooks = createHooks(config, managers, ctx.directory)
  log.info("Hooks created")

  const iface = createPluginInterface({ config, agents, tools, hooks, managers })
  log.info("=== chris-risk-workbench ready ===")

  return {
    name: "chris-risk-workbench",
    ...iface,
  }
}

export default ChrisRiskWorkbenchPlugin
export type { ChrisRiskWorkbenchConfig, WorkMode } from "./config/schema.js"
export type { AgentConfig, AgentRegistry } from "./agents/types.js"
