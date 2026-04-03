import { createToolRegistry } from './tools/tool-registry.js'
import type { Managers } from './create-managers.js'
import type { ChrisRiskWorkbenchConfig } from './config/schema.js'
import { log } from './shared/logger.js'

export function createTools(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
): Record<string, ReturnType<typeof import('@opencode-ai/plugin').tool>> {
  const registry = createToolRegistry(config, managers)
  log.info('Tools created: ' + Object.keys(registry).join(', '))
  return registry
}
