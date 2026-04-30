/**
 * Task Lifecycle Hook
 *
 * Monitors sub-agent task execution lifecycle.
 * Injects timeout awareness into Chris's system prompt
 * and provides task tracking tools.
 *
 * Since OpenCode's plugin API doesn't give direct task timeout control,
 * this hook provides:
 * 1. A `task_status` tool for Chris to check running tasks
 * 2. System prompt injection with task management guidance
 * 3. tool.execute.after monitoring for task completion/failure
 */

import type { Hooks } from "@opencode-ai/plugin"
import { z } from "zod"
import { tool } from "@opencode-ai/plugin"
import { log } from "../shared/logger.js"

// === Task Tracking ===

type TaskRecord = {
  id: string
  agent: string
  description: string
  status: "running" | "completed" | "failed" | "timeout"
  startedAt: number
  completedAt?: number
  output?: string
}

const activeTasks = new Map<string, TaskRecord>()
const TASK_TTL_MS = 10 * 60 * 1000 // 10 minutes default timeout

function cleanupStaleTasks(): void {
  const now = Date.now()
  for (const [id, task] of activeTasks) {
    // Auto-mark timed out tasks
    if (task.status === "running" && (now - task.startedAt) > TASK_TTL_MS) {
      task.status = "timeout"
      task.completedAt = now
      log.warn(`Task timed out: ${task.agent} - ${task.description.slice(0, 40)}`)
    }
    // Remove old completed/failed tasks (> 30 minutes)
    if (task.completedAt && (now - task.completedAt) > 30 * 60 * 1000) {
      activeTasks.delete(id)
    }
  }
}

// === Task Status Tool ===

export function createTaskStatusTool() {
  return {
    task_status: tool({
      description: "查看当前所有子 Agent 任务的状态（运行中/已完成/超时/失败）",
      args: {
        filter: z.enum(["all", "running", "failed", "timeout"]).optional().describe("过滤条件"),
      },
      execute: async (args) => {
        cleanupStaleTasks()
        const filter = args.filter ?? "all"
        const tasks = Array.from(activeTasks.values())
        const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter)

        if (filtered.length === 0) {
          return filter === "all" ? "当前没有任务记录" : `没有 ${filter} 状态的任务`
        }

        let output = `共 ${filtered.length} 个任务：\n\n`
        for (const task of filtered) {
          const elapsed = task.completedAt
            ? Math.round((task.completedAt - task.startedAt) / 1000)
            : Math.round((Date.now() - task.startedAt) / 1000)
          const statusIcon = {
            running: "⏳",
            completed: "✅",
            failed: "❌",
            timeout: "⏰",
          }[task.status]

          output += `${statusIcon} [${task.agent}] ${task.description.slice(0, 40)} (${elapsed}秒) - ${task.status}\n`
          if (task.output && task.status !== "running") {
            output += `   输出: ${task.output.slice(0, 300)}\n`
          }
        }

        // Add timeout warnings
        const running = tasks.filter(t => t.status === "running")
        const now = Date.now()
        for (const t of running) {
          if ((now - t.startedAt) > TASK_TTL_MS * 0.8) {
            output += `\n⚠️ 警告: [${t.agent}] 已运行 ${Math.round((now - t.startedAt) / 1000)}秒，即将超时`
          }
        }

        return output
      },
    }),
  }
}

// === Tool Execute After Hook (task lifecycle tracking) ===

export function createTaskLifecycleHook(): NonNullable<Hooks["tool.execute.after"]> {
  return async (input, output) => {
    // Track task tool calls
    if (input.tool !== "task") return

    const outputText = output.output ?? ""

    // Detect task start — look for task_id or background task indicators
    const taskStartMatch = outputText.match(/task_id[=:]\s*["']?([a-zA-Z0-9_-]+)/i)
      ?? outputText.match(/Background task.*?(\w+)/i)

    if (taskStartMatch) {
      cleanupStaleTasks()
      const taskId = taskStartMatch[1]
      // Try to extract agent name from the task call input or output
      const agentMatch = outputText.match(/(?:agent|派给|调度)[：:]\s*([^\s,，]+)/)
        ?? input.args?.agentName ? [null, String(input.args.agentName)] : null

      const record: TaskRecord = {
        id: taskId,
        agent: agentMatch?.[1] ?? "unknown",
        description: String(input.args?.prompt ?? input.args?.description ?? "").slice(0, 80),
        status: "running",
        startedAt: Date.now(),
      }
      activeTasks.set(taskId, record)
      log.info(`Task started: [${record.agent}] ${record.description.slice(0, 40)}`)
      return // Start detected, don't process further
    }

    // Detect task failure — strict patterns to avoid false positives
    // "error" alone is too broad (matches "0 errors", "No errors found" etc.)
    const failurePatterns = /\[ERROR\]|\bERROR:\s|Failed to execute|task.*failed|Agent.*failed|Insufficient credits|rate limit/i
    if (failurePatterns.test(outputText)) {
      const runningTasks = Array.from(activeTasks.values()).filter(t => t.status === "running")
      if (runningTasks.length === 1) {
        const task = runningTasks[0]
        task.status = "failed"
        task.completedAt = Date.now()
        task.output = outputText.slice(0, 300)
        log.info(`Task failed: [${task.agent}] ${task.description.slice(0, 40)}`)
        return
      } else if (runningTasks.length > 1) {
        log.info(`Task failure detected but ${runningTasks.length} tasks running, cannot attribute: ${outputText.slice(0, 100)}`)
        return
      }
    }

    // Detect task completion — only if we have running tasks and substantial output
    // This runs after start/failure checks, so it only triggers on non-start, non-failure outputs
    if (outputText.length > 50) {
      const runningTasks = Array.from(activeTasks.values()).filter(t => t.status === "running")
      if (runningTasks.length === 1) {
        const task = runningTasks[0]
        task.status = "completed"
        task.completedAt = Date.now()
        task.output = outputText.slice(0, 300)
        log.info(`Task completed: [${task.agent}] ${task.description.slice(0, 40)} (${Math.round((task.completedAt - task.startedAt) / 1000)}s)`)
      } else if (runningTasks.length > 1) {
        log.debug(`Task output detected but ${runningTasks.length} tasks running, cannot attribute completion`)
      }
    }
  }
}
