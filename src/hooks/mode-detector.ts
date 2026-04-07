import { existsSync } from "fs"
import { join } from "path"
import type { Hooks } from "@opencode-ai/plugin"
import type { ChrisRiskWorkbenchConfig, WorkMode } from "../config/schema.js"
import { getWorkMode } from "../config/schema.js"
import { log } from "../shared/logger.js"

export function detectWorkMode(directory: string): WorkMode {
  const hasDataDir = existsSync(join(directory, "data"))
  const hasFeaturesDir = existsSync(join(directory, "features"))
  const hasStrategyDir = existsSync(join(directory, "strategy"))
  if (hasFeaturesDir && hasDataDir) return "feature-engineering"
  if (hasStrategyDir && hasDataDir) return "strategy-design"
  if (hasDataDir) return "data-analysis"
  return "all"
}

export function createEventHook(
  config: ChrisRiskWorkbenchConfig,
  directory: string,
): NonNullable<Hooks["event"]> {
  return async (input) => {
    const eventName = String(input.event)
    if (eventName === "session.created") {
      const detected = detectWorkMode(directory)
      const configured = getWorkMode(config)
      if (detected !== "all" && configured === "all") {
        log.info("Auto-detected work mode: " + detected)
      }
    }
  }
}
