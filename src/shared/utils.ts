/**
 * Shared utility functions.
 */

import { readFileSync, existsSync, readdirSync } from "fs"
import { join, resolve } from "path"
import { log } from "./logger.js"

/**
 * Strip BOM from file content (Windows compatibility)
 */
export function stripBOM(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1)
  }
  return content
}

/**
 * Read a text file safely, stripping BOM
 */
export function readTextFile(filePath: string): string | null {
  try {
    const raw = readFileSync(filePath, "utf-8")
    return stripBOM(raw)
  } catch (err) {
    log.warn(`Failed to read file: ${filePath}`, err)
    return null
  }
}

/**
 * Load all .txt files from a directory as a map of filename -> content
 */
export function loadTextFilesFromDir(dirPath: string): Map<string, string> {
  return loadFilesFromDir(dirPath, [".txt"])
}

/**
 * Load all .md files from a directory (recursive) as a map of path -> content.
 * Supports sub-directories: subdir/file.md → "subdir/file"
 */
export function loadMarkdownFilesFromDir(dirPath: string): Map<string, string> {
  return loadFilesFromDir(dirPath, [".md"])
}

/**
 * Generic file loader — loads files matching given extensions from a directory recursively.
 * Returns a map of "relative name (without ext)" → file content.
 */
function loadFilesFromDir(dirPath: string, extensions: string[]): Map<string, string> {
  const result = new Map<string, string>()

  if (!existsSync(dirPath)) {
    log.warn(`Directory not found: ${dirPath}`)
    return result
  }

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        const content = readTextFile(join(dirPath, entry.name))
        if (content) {
          const nameWithoutExt = extensions.reduce(
            (name, ext) => name.replace(new RegExp(`\\${ext}$`), ""), entry.name
          )
          result.set(nameWithoutExt, content)
        }
      } else if (entry.isDirectory()) {
        const subDir = join(dirPath, entry.name)
        const subEntries = loadFilesFromDir(subDir, extensions)
        for (const [name, content] of subEntries) {
          result.set(`${entry.name}/${name}`, content)
        }
      }
    }
  } catch (err) {
    log.warn(`Failed to read directory: ${dirPath}`, err)
  }

  return result
}

/**
 * Resolve frameworks directory path
 * Priority: config override > plugin directory /frameworks
 */
export function resolveFrameworksPath(pluginDir: string, configPath?: string): string {
  if (configPath) {
    const abs = resolve(pluginDir, configPath)
    if (existsSync(abs)) return abs
    log.warn(`Configured frameworks_path not found: ${abs}, falling back to default`)
  }
  return join(pluginDir, "frameworks")
}

/**
 * Simple JSONC parser — strip single-line comments
 */
export function parseJSONC(text: string): unknown {
  const stripped = text
    .split("\n")
    .map((line) => {
      const commentIdx = line.indexOf("//")
      if (commentIdx === -1) return line
      // Don't strip inside strings (simplified check)
      const beforeComment = line.slice(0, commentIdx)
      const singleQuotes = (beforeComment.match(/'/g) ?? []).length
      const doubleQuotes = (beforeComment.match(/"/g) ?? []).length
      if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
        return beforeComment
      }
      return line
    })
    .join("\n")
  return JSON.parse(stripped)
}

/**
 * Deep merge two objects (for config layering)
 */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>,
): T {
  const result = { ...base }
  for (const key of Object.keys(override) as Array<keyof T>) {
    const baseVal = base[key]
    const overVal = override[key]
    if (
      baseVal &&
      overVal &&
      typeof baseVal === "object" &&
      typeof overVal === "object" &&
      !Array.isArray(baseVal) &&
      !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overVal as Record<string, unknown>,
      ) as T[keyof T]
    } else {
      result[key] = overVal as T[keyof T]
    }
  }
  return result
}

/**
 * Truncate text to maxLen with ellipsis
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + "..."
}
