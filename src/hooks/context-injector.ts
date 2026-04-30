/**
 * Enhanced Context Injection Hook
 *
 * Auto-scans project directory for data files, feature files, strategy files,
 * and README/AGENTS.md content. Injects a rich project context into every
 * agent's system prompt so they know what's available.
 *
 * Inspired by omo's context-injector, adapted for credit risk domain.
 */

import { existsSync, readdirSync } from "fs"
import { join, extname } from "path"
import type { Hooks } from "@opencode-ai/plugin"
import type { Managers } from "../create-managers.js"
import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import { getWorkMode, WORK_MODE_LABELS } from "../config/schema.js"
import { truncate } from "../shared/utils.js"
import { log } from "../shared/logger.js"

// === File Scanner ===

const DATA_EXTENSIONS = new Set([".csv", ".xlsx", ".xls", ".tsv", ".parquet", ".json", ".jsonl"])
const CODE_EXTENSIONS = new Set([".py", ".ipynb", ".r", ".sql"])
const DOC_EXTENSIONS = new Set([".md", ".txt", ".pdf"])

type ProjectScanResult = {
  dataFiles: string[]
  codeFiles: string[]
  docFiles: string[]
  directories: string[]
  readmePreview: string
  projectKnowledge: string
  projectDecisions: string
}

function scanProjectDirectory(directory: string): ProjectScanResult {
  const result: ProjectScanResult = {
    dataFiles: [],
    codeFiles: [],
    docFiles: [],
    directories: [],
    readmePreview: "",
    projectKnowledge: "",
    projectDecisions: "",
  }

  // Read README if exists
  for (const name of ["README.md", "readme.md", "README.txt"]) {
    const readmePath = join(directory, name)
    if (existsSync(readmePath)) {
      try {
        const content = require("fs").readFileSync(readmePath, "utf-8")
        result.readmePreview = content.slice(0, 500)
        break
      } catch { /* ignore */ }
    }
  }

  // Read project knowledge if exists (.chris-risk/knowledge.md)
  const knowledgePath = join(directory, ".chris-risk", "knowledge.md")
  if (existsSync(knowledgePath)) {
    try {
      const content = require("fs").readFileSync(knowledgePath, "utf-8")
      result.projectKnowledge = truncate(content, 2000)
    } catch { /* ignore */ }
  }

  // Read project decisions if exists (.chris-risk/decisions.md)
  const decisionsPath = join(directory, ".chris-risk", "decisions.md")
  if (existsSync(decisionsPath)) {
    try {
      const content = require("fs").readFileSync(decisionsPath, "utf-8")
      result.projectDecisions = truncate(content, 1000)
    } catch { /* ignore */ }
  }

  // Scan top-level and one level deep
  scanDir(directory, result, 0)
  return result
}

function scanDir(dir: string, result: ProjectScanResult, depth: number): void {
  if (depth > 1) return // Only scan 2 levels deep
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      // Skip common noise directories
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__") continue

      const fullPath = join(dir, entry.name)
      const relativePath = depth === 0 ? entry.name : fullPath.replace(/^[^/]*[\\/]/, "")

      if (entry.isDirectory()) {
        result.directories.push(relativePath)
        scanDir(fullPath, result, depth + 1)
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase()
        if (DATA_EXTENSIONS.has(ext)) {
          result.dataFiles.push(relativePath)
        } else if (CODE_EXTENSIONS.has(ext)) {
          result.codeFiles.push(relativePath)
        } else if (DOC_EXTENSIONS.has(ext)) {
          result.docFiles.push(relativePath)
        }
      }
    }
  } catch { /* ignore permission errors */ }
}

function formatFileList(files: string[], maxItems: number = 20): string {
  if (files.length === 0) return "（无）"
  const shown = files.slice(0, maxItems)
  const remaining = files.length - maxItems
  let text = shown.map(f => `  - ${f}`).join("\n")
  if (remaining > 0) text += `\n  - ...及其他 ${remaining} 个文件`
  return text
}

// === Hook Factory ===

export function createSystemTransformHook(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
  directory: string,
): NonNullable<Hooks["experimental.chat.system.transform"]> {
  const mode = getWorkMode(config)
  const modeLabel = WORK_MODE_LABELS[mode]

  // Cache project scan (refreshed per session via closure)
  let cachedScan: ProjectScanResult | null = null

  return async (_input, output) => {
    // Scan project on first call
    if (!cachedScan) {
      cachedScan = scanProjectDirectory(directory)
      log.info(`Project scan: ${cachedScan.dataFiles.length} data files, ${cachedScan.codeFiles.length} code files, ${cachedScan.directories.length} directories`)
    }
    const scan = cachedScan

    // Framework summaries
    const frameworkSummaries = managers.framework.getAllSummaries()
    let frameworkBlock = ""
    if (frameworkSummaries.size > 0) {
      frameworkBlock = "\n## 可用框架知识库\n"
      for (const [name, summary] of frameworkSummaries) {
        frameworkBlock += "- " + name + ": " + truncate(summary, 80) + "\n"
      }
    }

    // Cross-project experience summaries
    const experienceSummaries = managers.experience.getAllSummaries()
    let experienceBlock = ""
    if (experienceSummaries.size > 0) {
      experienceBlock = "\n## 跨项目经验库（可借鉴）\n"
      for (const [name, summary] of experienceSummaries) {
        experienceBlock += "- " + name + ": " + truncate(summary, 100) + "\n"
      }
    }

    // Project data context
    let projectBlock = ""
    if (scan.dataFiles.length > 0 || scan.codeFiles.length > 0 || scan.directories.length > 0) {
      projectBlock = "\n## 项目文件概览\n"
      if (scan.dataFiles.length > 0) {
        projectBlock += `### 数据文件 (${scan.dataFiles.length})\n${formatFileList(scan.dataFiles)}\n`
      }
      if (scan.codeFiles.length > 0) {
        projectBlock += `### 代码文件 (${scan.codeFiles.length})\n${formatFileList(scan.codeFiles)}\n`
      }
      if (scan.directories.length > 0 && scan.directories.length <= 15) {
        projectBlock += `### 目录结构\n${scan.directories.map(d => `  - ${d}/`).join("\n")}\n`
      }
    }

    // README preview
    let readmeBlock = ""
    if (scan.readmePreview) {
      readmeBlock = "\n## 项目说明（README 摘要）\n" + truncate(scan.readmePreview, 400) + "\n"
    }

    // Project knowledge (from .chris-risk/knowledge.md)
    let knowledgeBlock = ""
    if (scan.projectKnowledge) {
      knowledgeBlock = "\n## 项目知识库（.chris-risk/knowledge.md）\n" + scan.projectKnowledge + "\n"
    }

    // Project decisions (from .chris-risk/decisions.md)
    let decisionsBlock = ""
    if (scan.projectDecisions) {
      decisionsBlock = "\n## 项目决策日志（.chris-risk/decisions.md）\n" + scan.projectDecisions + "\n"
    }

    const contextBlock = [
      "## 当前工作上下文",
      "- 工作模式: " + modeLabel,
      "- 当前项目目录: " + directory,
      "- 可用Agent: chris(主编), 分析师, 质疑员, 工程师, 研究员, 跨界顾问, 框架师, 进化师, 视觉员",
      projectBlock,
      readmeBlock,
      knowledgeBlock,
      decisionsBlock,
      frameworkBlock,
      experienceBlock,
    ].join("\n")
    output.system.push(contextBlock)
    log.debug("Injected enhanced context into system prompt")
  }
}
