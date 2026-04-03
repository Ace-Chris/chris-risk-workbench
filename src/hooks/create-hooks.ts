import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import type { Managers } from "../create-managers.js"
import { createModeDetectorHook } from "./mode-detector.js"
import { createDebateCoordinatorHook } from "./debate-coordinator.js"
import { createContextInjectorHook } from "./context-injector.js"
import { log } from "../shared/logger.js"

export type HookDefinition = {
  event: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (params: any) => void
}

/**
 * Create all hooks and return as array
 */
export function createHooks(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
): HookDefinition[] {
  const hooks: HookDefinition[] = [
    createModeDetectorHook(config),
    createDebateCoordinatorHook(managers.debate),
    createContextInjectorHook(config, managers),
  ]

  log.info("Registered " + hooks.length + " hooks")
  return hooks
}
