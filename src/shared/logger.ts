/**
 * Simple logger for debugging plugin behavior.
 * Writes to /tmp/chris-risk-workbench.log
 */

type LogLevel = "debug" | "info" | "warn" | "error"

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

let currentLevel: LogLevel = "info"

export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}

function timestamp(): string {
  return new Date().toISOString()
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel]
}

function formatMessage(level: LogLevel, msg: string, data?: unknown): string {
  const prefix = `[${timestamp()}] [${level.toUpperCase()}] [chris-risk-workbench]`
  if (data !== undefined) {
    return `${prefix} ${msg} ${JSON.stringify(data)}`
  }
  return `${prefix} ${msg}`
}

export const log = {
  debug(msg: string, data?: unknown): void {
    if (shouldLog("debug")) {
      console.error(formatMessage("debug", msg, data))
    }
  },
  info(msg: string, data?: unknown): void {
    if (shouldLog("info")) {
      console.error(formatMessage("info", msg, data))
    }
  },
  warn(msg: string, data?: unknown): void {
    if (shouldLog("warn")) {
      console.error(formatMessage("warn", msg, data))
    }
  },
  error(msg: string, data?: unknown): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", msg, data))
    }
  },
}
