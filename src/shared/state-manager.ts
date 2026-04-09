/**
 * Persistent State Manager
 *
 * Saves debate history, analysis progress, and session state to disk
 * so that work can resume after OpenCode restart.
 *
 * State directory: .chris-risk-workbench/ in the user's project root.
 *
 * Inspired by omo's boulder-state, adapted for chris-risk-workbench.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { log } from "../shared/logger.js"

const STATE_DIR = ".chris-risk-workbench"
const DEBATE_FILE = "debate-history.json"
const PROGRESS_FILE = "analysis-progress.json"

// === State Directory ===

function ensureStateDir(directory: string): string {
  const stateDir = join(directory, STATE_DIR)
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true })
    log.info("Created state directory: " + stateDir)
  }
  return stateDir
}

// === Debate History ===

export type DebateRecord = {
  id: string
  topic: string
  conclusion: string
  rounds: Array<{ speaker: string; content: string }>
  finalConclusion: string
  timestamp: string
}

export function saveDebate(directory: string, record: DebateRecord): void {
  try {
    const stateDir = ensureStateDir(directory)
    const filePath = join(stateDir, DEBATE_FILE)
    const existing = readDebateHistory(directory)
    existing.push(record)
    // Keep last 50 debates
    const trimmed = existing.slice(-50)
    writeFileSync(filePath, JSON.stringify(trimmed, null, 2), "utf-8")
    log.info(`Debate saved: ${record.topic.slice(0, 40)}`)
  } catch (err) {
    log.warn("Failed to save debate state: " + err)
  }
}

export function readDebateHistory(directory: string): DebateRecord[] {
  try {
    const filePath = join(directory, STATE_DIR, DEBATE_FILE)
    if (!existsSync(filePath)) return []
    const raw = readFileSync(filePath, "utf-8")
    return JSON.parse(raw) as DebateRecord[]
  } catch {
    return []
  }
}

// === Analysis Progress ===

export type AnalysisProgress = {
  sessionId: string
  taskType: string
  status: "in_progress" | "completed" | "failed"
  currentStep: string
  completedSteps: string[]
  startedAt: string
  updatedAt: string
  results?: Record<string, string>
}

export function saveProgress(directory: string, progress: AnalysisProgress): void {
  try {
    const stateDir = ensureStateDir(directory)
    const filePath = join(stateDir, PROGRESS_FILE)
    const existing = readAllProgress(directory)
    const idx = existing.findIndex(p => p.sessionId === progress.sessionId)
    progress.updatedAt = new Date().toISOString()
    if (idx >= 0) {
      existing[idx] = progress
    } else {
      existing.push(progress)
    }
    // Keep last 100 progress records
    const trimmed = existing.slice(-100)
    writeFileSync(filePath, JSON.stringify(trimmed, null, 2), "utf-8")
    log.info(`Progress saved: ${progress.taskType} - ${progress.status}`)
  } catch (err) {
    log.warn("Failed to save progress state: " + err)
  }
}

export function readAllProgress(directory: string): AnalysisProgress[] {
  try {
    const filePath = join(directory, STATE_DIR, PROGRESS_FILE)
    if (!existsSync(filePath)) return []
    const raw = readFileSync(filePath, "utf-8")
    return JSON.parse(raw) as AnalysisProgress[]
  } catch {
    return []
  }
}

export function readLatestProgress(directory: string): AnalysisProgress | null {
  const all = readAllProgress(directory)
  return all.length > 0 ? all[all.length - 1] : null
}
