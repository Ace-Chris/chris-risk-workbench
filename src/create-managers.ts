import { existsSync } from "fs"
import { log } from "./shared/logger.js"
import { loadTextFilesFromDir, resolveFrameworksPath } from "./shared/utils.js"
import type { ChrisRiskWorkbenchConfig, DebateConfig } from "./config/schema.js"

// === FrameworkManager ===
export class FrameworkManager {
  private frameworks: Map<string, string> = new Map()
  private summaries: Map<string, string> = new Map()
  constructor(frameworksPath: string) {
    if (!existsSync(frameworksPath)) {
      log.warn("Frameworks directory not found: " + frameworksPath)
      return
    }
    this.frameworks = loadTextFilesFromDir(frameworksPath)
    this.buildSummaries()
    log.info("Loaded " + this.frameworks.size + " frameworks from " + frameworksPath)
  }
  private buildSummaries(): void {
    for (const [name, content] of this.frameworks) {
      const firstLine = content.split("\n").find((l) => l.trim().length > 0) ?? name
      this.summaries.set(name, firstLine.slice(0, 100))
    }
  }
  getFramework(name: string): string | undefined {
    return this.frameworks.get(name)
  }
  getAllSummaries(): Map<string, string> {
    return this.summaries
  }
  searchFrameworks(query: string): Map<string, string> {
    const result = new Map<string, string>()
    const lower = query.toLowerCase()
    for (const [name, content] of this.frameworks) {
      if (name.toLowerCase().includes(lower) || content.toLowerCase().includes(lower)) {
        result.set(name, content)
      }
    }
    return result
  }
}
// === DebateManager ===
export class DebateManager {
  private currentRound = 0
  private history: Array<{ round: number; speaker: string; content: string }> = []
  private config: DebateConfig
  constructor(config: DebateConfig) {
    this.config = config
  }
  startDebate(): void {
    this.currentRound = 0
    this.history = []
  }
  addPoint(speaker: string, content: string): void {
    this.history.push({ round: this.currentRound, speaker, content })
  }
  nextRound(): boolean {
    this.currentRound++
    return this.currentRound <= (this.config.max_rounds ?? 3)
  }
  isFinished(): boolean {
    return this.currentRound > (this.config.max_rounds ?? 3)
  }
  getHistory(): typeof this.history {
    return this.history
  }
  getSummary(): string {
    return this.history.map((h) => `[Round ${h.round}] ${h.speaker}: ${h.content}`).join("\n")
  }
}
// === Managers Export ===
export type Managers = {
  framework: FrameworkManager
  debate: DebateManager
}
export function createManagers(config: ChrisRiskWorkbenchConfig, pluginDir: string): Managers {
  const frameworksPath = resolveFrameworksPath(pluginDir, config.frameworks_path)
  const framework = new FrameworkManager(frameworksPath)
  const debate = new DebateManager(config.debate ?? { auto_trigger: true, max_rounds: 3 })
  log.info("Managers initialized")
  return { framework, debate }
}
