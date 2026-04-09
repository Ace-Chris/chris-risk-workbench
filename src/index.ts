/**
 * chris-risk-workbench — OpenCode Plugin Entry Point
 *
 * Initializes the multi-agent credit risk workbench:
 *  1. Loads config from user project directory (ctx.directory)
 *  2. Creates managers (Framework, Debate) using plugin's own root
 *  3. Loads skills from both plugin-bundled and user project directories
 *  4. Creates agents with skill injection
 *  5. Registers tools and hooks
 *  6. Returns the plugin interface (Hooks)
 *
 * Path resolution follows omo (oh-my-openagent) pattern:
 *   - ctx.directory = user's project directory (for config, mode detection)
 *   - pluginRoot = plugin's own directory via import.meta.url (for bundled skills, frameworks)
 */

import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
import type { Plugin } from "@opencode-ai/plugin"
import { loadPluginConfig } from "./config/schema.js"
import { createManagers } from "./create-managers.js"
import { createBuiltinAgents } from "./agents/builtin-agents.js"
import { createToolRegistry } from "./tools/tool-registry.js"
import { createHooks } from "./hooks/create-hooks.js"
import { createPluginInterface } from "./plugin-interface.js"
import { SkillLoader, resolveSkillPaths } from "./shared/skill-loader.js"
import { log } from "./shared/logger.js"

/**
 * Plugin's own root directory, computed from this module's location.
 * dist/index.js → plugin root is one directory up.
 * Follows omo pattern: fileURLToPath(import.meta.url) → dirname → resolve("..")
 */
const __dirname = dirname(fileURLToPath(import.meta.url))
const pluginRoot = resolve(__dirname, "..")

const ChrisRiskWorkbenchPlugin: Plugin = async (ctx) => {
  log.info("=== chris-risk-workbench initializing ===")
  log.info("Plugin root: " + pluginRoot + ", User project: " + ctx.directory)

  // Config is per-project, loaded from user's project directory
  const config = loadPluginConfig(ctx.directory)
  log.info("Config loaded")

  // Managers use pluginRoot for bundled resources (frameworks/)
  const managers = createManagers(config, pluginRoot)
  log.info("Managers created")

  // Skills searched in BOTH plugin-bundled paths AND user project paths
  const skillPaths = resolveSkillPaths(
    pluginRoot,
    ctx.directory,
    config.skills_path ? [config.skills_path] : undefined,
  )
  const skillLoader = new SkillLoader(skillPaths)
  log.info("SkillLoader ready: " + skillLoader.getLoadedSkillNames().length + " skills indexed")

  const agents = createBuiltinAgents(config, skillLoader)
  log.info("Agents created")

  const tools = createToolRegistry(managers, config)
  log.info("Tools created")

  // Mode detection uses user's project directory (data/, features/, strategy/)
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
