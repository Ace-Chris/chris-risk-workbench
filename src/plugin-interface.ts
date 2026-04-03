import type { Hooks } from '@opencode-ai/plugin'
import type { ChrisRiskWorkbenchConfig } from './config/schema.js'
import type { Managers } from './create-managers.js'
import type { HookDefinition } from './hooks/create-hooks.js'
import type { AgentRegistry } from './agents/types.js'
import { toOpenCodeAgent } from './agents/types.js'
import { log } from './shared/logger.js'

/**
 * Create the plugin interface that OpenCode will consume.
 * Returns a Hooks object matching @opencode-ai/plugin's Hooks interface.
 */
export function createPluginInterface(args: {
  config: ChrisRiskWorkbenchConfig
  agents: AgentRegistry
  tools: Record<string, ReturnType<typeof import('@opencode-ai/plugin').tool>>
  hooks: HookDefinition[]
  managers: Managers
}): Hooks {
  const { agents, tools, hooks } = args
  log.info('Creating plugin interface')

  const result: Hooks = {
    config: async (input) => {
      log.debug('config handler called')
      // Mutate input.agent with our agents converted to OpenCode format
      const agentMap: Record<string, unknown> = {}
      for (const [name, agent] of Object.entries(agents)) {
        agentMap[name] = toOpenCodeAgent(agent)
      }
      // SDK Config.agent expects { [key: string]: AgentConfig | undefined }
      // Our toOpenCodeAgent output is compatible, cast to satisfy type checker
      input.agent = agentMap as Exclude<typeof input.agent, undefined>
      log.info('Registered ' + Object.keys(agentMap).length + ' agents')
    },

    tool: tools,

    event: async (input) => {
      const eventName = typeof input.event === 'string'
        ? input.event
        : String(input.event)
      log.debug('event handler: ' + eventName)
      for (const hookDef of hooks) {
        if (hookDef.event === eventName) {
          try {
            await hookDef.handler(input)
          } catch (err) {
            log.error('Hook error for ' + eventName + ': ' + err)
          }
        }
      }
    },
  }

  return result
}
