import { createToolRegistry } from "./tools/tool-registry.js"
import type { Managers } from "./create-managers.js"
import type { ChrisRiskWorkbenchConfig } from "./config/schema.js"
import type { ToolRegistry } from "./tools/types.js"
import { log } from "./shared/logger.js"

/**
 * Create all plugin tools.
 * Thin wrapper around tool-registry for clean dependency injection.
 */
export function createTools(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
): ToolRegistry {
  const registry = createToolRegistry(config, managers)
  log.info("Tools created: " + Object.keys(registry).join(", "))
  return registry
}
