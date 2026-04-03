import { existsSync } from "fs"
import { join } from "path"
import type { ChrisRiskWorkbenchConfig, WorkMode } from "../config/schema.js"
import { getWorkMode } from "../config/schema.js"
import { log } from "../shared/logger.js"

/**
 * Detect work mode from project directory structure.
 * Called on session.created event.
 */
export function detectWorkMode(directory: string): WorkMode {
  // Simple heuristic: check for directory/file hints
  const hasDataDir = existsSync(join(directory, "data"))
  const hasFeaturesDir = existsSync(join(directory, "features"))
  const hasStrategyDir = existsSync(join(directory, "strategy"))

  if (hasFeaturesDir && hasDataDir) return "feature-engineering"
  if (hasStrategyDir && hasDataDir) return "strategy-design"
  if (hasDataDir) return "data-analysis"

  return "all"
}

/**
 * Hook: auto-detect work mode when session starts
 */
export function createModeDetectorHook(config: ChrisRiskWorkbenchConfig) {
  return {
    event: "session.created" as const,
    handler: (params: { directory?: string }) => {
      if (params.directory) {
        const detected = detectWorkMode(params.directory)
        const configured = getWorkMode(config)
        if (detected !== "all" && configured === "all") {
          log.info("Auto-detected work mode: " + detected)
        }
      }
    },
  }
}
