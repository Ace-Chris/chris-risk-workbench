/**
 * SkillLoader — loads skill files from disk and provides content by name.
 *
 * Skills are expected to live in directories like:
 *   <skillsDir>/<skill-name>/SKILL.md
 *   <skillsDir>/<skill-name>.md            (flat file fallback)
 *
 * Multiple search paths are supported (plugin-bundled + user-project + user-configured).
 */

import { existsSync, readdirSync } from "fs"
import { join, resolve } from "path"
import { readTextFile } from "./utils.js"

import { log } from "./logger.js"

export class SkillLoader {
  private cache = new Map<string, string>()
  private searchPaths: string[]

  constructor(searchPaths: string[]) {
    this.searchPaths = searchPaths.filter((p) => existsSync(p))
    this.buildIndex()
  }

  private buildIndex(): void {
    for (const baseDir of this.searchPaths) {
      this.scanDirectory(baseDir)
    }
    log.info(`SkillLoader indexed ${this.cache.size} skills from ${this.searchPaths.length} paths`)
  }

  private scanDirectory(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // <dir>/<skill-name>/SKILL.md
          const skillFile = join(dir, entry.name, "SKILL.md")
          if (existsSync(skillFile)) {
            const content = readTextFile(skillFile)
            if (content) {
              this.cache.set(entry.name, content)
              log.debug(`Loaded skill: ${entry.name} from ${skillFile}`)
            }
          }
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          // <dir>/<skill-name>.md  (flat file)
          const skillName = entry.name.replace(/\.md$/, "")
          const content = readTextFile(join(dir, entry.name))
          if (content) {
            this.cache.set(skillName, content)
            log.debug(`Loaded skill: ${skillName} from ${join(dir, entry.name)}`)
          }
        }
      }
    } catch (err) {
      log.warn(`Failed to scan skill directory: ${dir}`, err)
    }
  }

  /**
   * Get a single skill's content by name.
   */
  getSkill(name: string): string | undefined {
    return this.cache.get(name)
  }

  /**
   * Get multiple skills' content, skipping missing ones with a warning.
   */
  getSkills(names: string[]): Map<string, string> {
    const result = new Map<string, string>()
    for (const name of names) {
      const content = this.cache.get(name)
      if (content) {
        result.set(name, content)
      } else {
        log.warn(`Skill not found: ${name}`)
      }
    }
    return result
  }

  /**
   * Get all loaded skill names.
   */
  getLoadedSkillNames(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Build the skill injection block for an agent's instructions.
   * Returns a string to append, or empty string if no skills found.
   */
  buildSkillBlock(skillNames: string[]): string {
    const skills = this.getSkills(skillNames)
    if (skills.size === 0) return ""

    let block = "\n\n## 已加载的专业技能\n\n"
    for (const [name, content] of skills) {
      block += `### 技能: ${name}\n\n${content}\n\n---\n\n`
    }
    return block
  }
}

/**
 * Resolve skills search paths.
 *
 * Searches in order:
 *  1. Plugin-bundled skills/ directory (from pluginRoot)
 *  2. Plugin-bundled .agents/skills/ directory (from pluginRoot)
 *  3. User project skills/ directory (from projectDir)
 *  4. User project .agents/skills/ directory (from projectDir)
 *  5. User-configured custom paths (from config)
 *
 * Deduplicates by absolute path.
 */
export function resolveSkillPaths(
  pluginRoot: string,
  projectDir: string,
  configPaths?: string[],
): string[] {
  const paths: string[] = []

  const tryAdd = (p: string) => {
    if (existsSync(p) && !paths.includes(p)) {
      paths.push(p)
    }
  }

  // Plugin-bundled skills (plugin's own root directory)
  tryAdd(join(pluginRoot, "skills"))
  tryAdd(join(pluginRoot, ".agents", "skills"))

  // User project skills (user's working directory)
  tryAdd(join(projectDir, "skills"))
  tryAdd(join(projectDir, ".agents", "skills"))

  // User-configured paths (resolved relative to project directory)
  if (configPaths) {
    for (const p of configPaths) {
      const abs = resolve(projectDir, p)
      tryAdd(abs)
    }
  }

  return paths
}
