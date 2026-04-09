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
            output += `   输出: ${task.output.slice(0, 100)}\n`
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
    const sessionID = input.sessionID

    // Detect task start
    if (outputText.includes("task_id") || outputText.includes("Background task")) {
      cleanupStaleTasks()
    }

    // Detect task failure
    if (outputText.includes("[ERROR]") || outputText.includes("error") || outputText.includes("Failed")) {
      log.info(`Task failure detected in session ${sessionID}: ${outputText.slice(0, 100)}`)
    }
  }
}
