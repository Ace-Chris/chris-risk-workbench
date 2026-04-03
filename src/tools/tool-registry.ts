import { tool } from "@opencode-ai/plugin"
import { z } from "zod"
import type { Managers } from "../create-managers.js"
import type { ChrisRiskWorkbenchConfig } from "../config/schema.js"
import { log } from '../shared/logger.js'

function createFrameworkQueryTool(frameworkManager: Managers['framework']) {
  return {
    framework_query: tool({
      description: '\u641c\u7d22\u6846\u67b6\u77e5\u8bc6\u5e93\uff0c\u6839\u636e\u5173\u952e\u8bcd\u67e5\u627e\u5339\u914d\u7684\u5206\u6790\u6846\u67b6',
      args: {
        query: z.string().describe('\u641c\u7d22\u5173\u952e\u8bcd'),
      },
      execute: async (args) => {
        const query = args.query
        if (!query) return '\u8bf7\u63d0\u4f9b\u641c\u7d22\u5173\u952e\u8bcd'
        const results = frameworkManager.searchFrameworks(query)
        if (results.size === 0) return '\u672a\u627e\u5230\u5339\u914d\u7684\u6846\u67b6\uff0c\u8bf7\u5c1d\u8bd5\u5176\u4ed6\u5173\u952e\u8bcd'
        let output = '\u627e\u5230 ' + results.size + ' \u4e2a\u5339\u914d\u6846\u67b6\uff1a\n\n'
        for (const [name, content] of results) {
          const preview = content.split('\n').slice(0, 5).join('\n')
          output += '### ' + name + '\n' + preview + '\n\n'
        }
        return output
      },
    }),
  }
}

function createDebateTools(debateManager: Managers['debate']) {
  return {
    debate_trigger: tool({
      description: '\u89e6\u53d1\u8fa9\u8bba\u673a\u5236\uff0c\u8ba9\u8d28\u7591\u5458\u548c\u8de8\u754c\u987e\u95ee\u5bf9\u5f53\u524d\u7ed3\u8bba\u8fdb\u884c\u8d28\u7591',
      args: {
        topic: z.string().describe('\u8fa9\u8bba\u4e3b\u9898'),
        conclusion: z.string().describe('\u9700\u8981\u8d28\u7591\u7684\u7ed3\u8bba'),
      },
      execute: async (args) => {
        const topic = args.topic
        const conclusion = args.conclusion
        debateManager.startDebate()
        debateManager.addPoint('system', '\u8fa9\u8bba\u4e3b\u9898: ' + topic)
        debateManager.addPoint('system', '\u5f85\u8d28\u7591\u7ed3\u8bba: ' + conclusion)
        return '\u8fa9\u8bba\u5df2\u542f\u52a8\u3002\n\u4e3b\u9898: ' + topic + '\n\u5f85\u8d28\u7591: ' + conclusion + '\n\n\u8bf7 chris \u6d3e\u8d28\u7591\u5458\u548c\u8de8\u754c\u987e\u95ee\u53c2\u4e0e\u8fa9\u8bba\u3002'
      },
    }),
    debate_status: tool({
      description: '\u67e5\u770b\u5f53\u524d\u8fa9\u8bba\u72b6\u6001\u548c\u5386\u53f2\u8bb0\u5f55',
      args: {},
      execute: async () => {
        if (debateManager.getHistory().length === 0) {
          return '\u5f53\u524d\u6ca1\u6709\u8fdb\u884c\u4e2d\u7684\u8fa9\u8bba'
        }
        return debateManager.getSummary()
      },
    }),
    debate_conclude: tool({
      description: '\u7ed3\u675f\u8fa9\u8bba\u5e76\u751f\u6210\u7efc\u5408\u7ed3\u8bba',
      args: {
        final_conclusion: z.string().describe('\u6700\u7ec8\u7efc\u5408\u7ed3\u8bba'),
      },
      execute: async (args) => {
        const finalConclusion = args.final_conclusion
        debateManager.addPoint('chris', '\u6700\u7ec8\u7ed3\u8bba: ' + finalConclusion)
        const summary = debateManager.getSummary()
        return '\u8fa9\u8bba\u7ed3\u675f\u3002\u5b8c\u6574\u8bb0\u5f55\uff1a\n\n' + summary
      },
    }),
  }
}

function createModeSwitchTool() {
  return {
    mode_switch: tool({
      description: '\u5207\u6362\u5de5\u4f5c\u6a21\u5f0f\uff08\u6570\u636e\u5206\u6790/\u7279\u5f81\u884d\u751f/\u7b56\u7565\u5236\u5b9a\uff09',
      args: {
        mode: z.enum(['data-analysis', 'feature-engineering', 'strategy-design']).describe('\u76ee\u6807\u6a21\u5f0f'),
      },
      execute: async (args) => {
        const mode = args.mode
        const labels: Record<string, string> = {
          'data-analysis': '\u6570\u636e\u5206\u6790\u6a21\u5f0f',
          'feature-engineering': '\u7279\u5f81\u884d\u751f\u6a21\u5f0f',
          'strategy-design': '\u7b56\u7565\u5236\u5b9a\u6a21\u5f0f',
        }
        return '\u5df2\u5207\u6362\u5230 ' + (labels[mode] ?? mode) + '\u3002\n\u5728\u6b64\u6a21\u5f0f\u4e0b\uff0cchris \u5c06\u4f18\u5148\u8c03\u5ea6\u76f8\u5173 Agent\u3002'
      },
    }),
  }
}

function createEvolutionTool() {
  return {
    evolve: tool({
      description: '\u89e6\u53d1\u8fdb\u5316\u5e08\u8bc4\u4f30\u7cfb\u7edf\u8868\u73b0\u5e76\u63d0\u51fa\u6539\u8fdb\u5efa\u8bae',
      args: {
        task_summary: z.string().describe('\u6700\u8fd1\u5b8c\u6210\u7684\u4efb\u52a1\u6458\u8981'),
      },
      execute: async (args) => {
        const taskSummary = args.task_summary
        return '\u8fdb\u5316\u5e08\u5df2\u6536\u5230\u8bc4\u4f30\u8bf7\u6c42\u3002\n\u4efb\u52a1\u6458\u8981: ' + taskSummary + '\n\n\u8fdb\u5316\u5e08\u5c06\u8bc4\u4f30\u4ee5\u4e0b\u7ef4\u5ea6\uff1a\n1. \u7279\u5f81\u8d28\u91cf\n2. \u5206\u6790\u6df1\u5ea6\n3. \u8fa9\u8bba\u6548\u679c\n4. \u6548\u7387\n\n\u8bf7 chris \u6d3e\u8fdb\u5316\u5e08\u6267\u884c\u8bc4\u4f30\u3002'
      },
    }),
  }
}

export function createToolRegistry(
  config: ChrisRiskWorkbenchConfig,
  managers: Managers,
): Record<string, ReturnType<typeof tool>> {
  const disabledTools = new Set(config.disabled_tools ?? [])

  const allTools: Record<string, ReturnType<typeof tool>> = {
    ...createFrameworkQueryTool(managers.framework),
    ...createDebateTools(managers.debate),
    ...createModeSwitchTool(),
    ...createEvolutionTool(),
  }

  const filteredTools: Record<string, ReturnType<typeof tool>> = {}
  for (const [name, t] of Object.entries(allTools)) {
    if (disabledTools.has(name)) {
      log.info('Tool disabled: ' + name)
      continue
    }
    filteredTools[name] = t
  }

  log.info('Registered ' + Object.keys(filteredTools).length + ' tools')
  return filteredTools
}
