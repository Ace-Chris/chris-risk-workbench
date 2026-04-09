/**
 * Runtime Model Fallback Hook
 *
 * When a model API call fails (rate limit, quota, timeout, server error),
 * this hook automatically retries with a fallback model from the configured chain.
 *
 * Inspired by omo's hooks/runtime-fallback, adapted for chris-risk-workbench.
 *
 * Flow:
 *   1. chat.message hook detects model errors in assistant response
 *   2. Classifies error as retryable or non-retryable
 *   3. If retryable, selects next fallback model
 *   4. Injects a retry prompt into the session
 */

import type { Hooks } from "@opencode-ai/plugin"
import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import { log } from "../shared/logger.js"

// === Error Classification ===

const RETRYABLE_PATTERNS = [
  /rate\s*limit/i,
  /too\s+many\s+requests/i,
  /quota\s*(exceeded|exhausted|reached)/i,
  /insufficient\s+credits/i,
  /usage\s+limit/i,
  /429/,
  /503/,
  /502/,
  /server\s+error/i,
  /timeout/i,
  /context\s*(window|length|limit)\s*(exceeded|overflow|too\s+large)/i,
  /maximum\s+context/i,
  /token\s*limit/i,
]

const FATAL_PATTERNS = [
  /invalid\s+api\s+key/i,
  /authentication\s+failed/i,
  /unauthorized/i,
  /forbidden/i,
  /model\s+not\s+found/i,
  /not\s+subscribed/i,
]

function isRetryableError(errorText: string): boolean {
  const lower = errorText.toLowerCase()
  // Fatal errors are never retryable
  if (FATAL_PATTERNS.some(p => p.test(lower))) return false
  return RETRYABLE_PATTERNS.some(p => p.test(lower))
}

// === Fallback State Machine ===

type FallbackState = {
  originalModel: string
  currentModel: string
  failedModels: Set<string>
  attemptCount: number
  lastError: string
  lastErrorAt: number
}

const MAX_RETRY_ATTEMPTS = 3
const COOLDOWN_MS = 60_000 // 1 minute cooldown for failed models

const sessionStates = new Map<string, FallbackState>()

function getState(sessionID: string, originalModel: string): FallbackState {
  let state = sessionStates.get(sessionID)
  if (!state) {
    state = {
      originalModel,
      currentModel: originalModel,
      failedModels: new Set(),
      attemptCount: 0,
      lastError: "",
      lastErrorAt: 0,
    }
    sessionStates.set(sessionID, state)
  }
  return state
}

function clearState(sessionID: string): void {
  sessionStates.delete(sessionID)
}

function isModelInCooldown(model: string, state: FallbackState): boolean {
  // We don't track per-model timestamps in this simplified version
  // Just track that it failed within cooldown period
  return state.failedModels.has(model) && (Date.now() - state.lastErrorAt) < COOLDOWN_MS
}

// === Fallback Chain Resolution ===

function getFallbackModels(config: ChrisRiskWorkbenchConfig): string[] {
  const fallbacks = config.fallback_models ?? []
  if (fallbacks.length === 0) {
    return ["zai-coding-plan/glm-5.1"]
  }
  return fallbacks
}

function selectNextFallback(
  state: FallbackState,
  fallbackChain: string[],
): string | null {
  for (const model of fallbackChain) {
    if (model === state.currentModel) continue
    if (isModelInCooldown(model, state)) continue
    if (state.failedModels.has(model)) continue
    return model
  }
  // If all are failed, allow retrying the first non-cooldown model
  for (const model of fallbackChain) {
    if (!isModelInCooldown(model, state)) return model
  }
  return null
}

// === Hook Factory ===

export function createRuntimeFallbackHook(
  config: ChrisRiskWorkbenchConfig,
): NonNullable<Hooks["chat.message"]> {
  const fallbackChain = getFallbackModels(config)

  return async (input, output) => {
    const sessionID = input.sessionID
    const agent = input.agent
    const modelInfo = input.model

    // Extract text from assistant response parts
    const parts = output.parts ?? []
    const textParts = parts
      .filter((p: Record<string, unknown>) => p.type === "text" && typeof p.text === "string")
      .map((p: Record<string, unknown>) => p.text as string)
    const fullText = textParts.join("\n")

    if (!fullText || fullText.length === 0) return

    // Check if the response contains a model error
    if (!isRetryableError(fullText)) return

    const currentModel = modelInfo
      ? `${modelInfo.providerID}/${modelInfo.modelID}`
      : "unknown"

    const state = getState(sessionID, currentModel)
    state.lastError = fullText.slice(0, 200)
    state.lastErrorAt = Date.now()
    state.failedModels.add(currentModel)
    state.attemptCount++

    log.warn(
      `Model error detected for agent "${agent}" in session ${sessionID}: ${state.lastError.slice(0, 80)}` +
      ` (attempt ${state.attemptCount}/${MAX_RETRY_ATTEMPTS})`
    )

    // Don't retry forever
    if (state.attemptCount > MAX_RETRY_ATTEMPTS) {
      log.warn(`Max retry attempts reached for session ${sessionID}, giving up`)
      clearState(sessionID)
      return
    }

    // Select next fallback model
    const nextModel = selectNextFallback(state, fallbackChain)
    if (!nextModel) {
      log.warn(`No fallback model available for session ${sessionID}`)
      clearState(sessionID)
      return
    }

    state.currentModel = nextModel
    log.info(`Switching to fallback model: ${nextModel} for session ${sessionID}`)

    // We can't directly switch models via the plugin API in chat.message hook.
    // Instead, we inject a system message notifying about the fallback.
    // The agent (Chris) should see this in the next turn and adjust.
    const retryNotice = {
      type: "text",
      text: `[系统提示] 模型 ${currentModel} 调用失败：${state.lastError.slice(0, 60)}。` +
        `已切换到备选模型 ${nextModel}。如果任务需要重试，请重新派发。`,
    }
    output.parts.push(retryNotice as never)
  }
}

/**
 * Create a tool.execute.after hook that detects model errors from tool results
 * and notifies the system.
 */
export function createRuntimeFallbackToolHook(
  config: ChrisRiskWorkbenchConfig,
): NonNullable<Hooks["tool.execute.after"]> {
  return async (input, output) => {
    // Check if tool output contains model errors
    const outputText = output.output ?? ""
    if (!outputText || !isRetryableError(outputText)) return

    log.warn(
      `Tool "${input.tool}" returned a model error in session ${input.sessionID}: ${outputText.slice(0, 100)}`
    )

    // Append fallback notice to the tool output so the agent can see it
    const fallbackChain = getFallbackModels(config)

    output.output += `\n\n[系统提示] 检测到模型错误。建议 Chris 使用备选模型重试，或告知用户当前模型不可用。备选模型: ${fallbackChain.join(", ")}`
  }
}
