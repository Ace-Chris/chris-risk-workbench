import type { Hooks } from "@opencode-ai/plugin"
import type { ChrisRiskWorkbenchConfig } from "./config/schema.js"
import type { Managers } from "./create-managers.js"
import type { AgentRegistry } from "./agents/types.js"
import { toOpenCodeAgent } from "./agents/types.js"
import { log } from "./shared/logger.js"
import type { CreatedHooks } from "./hooks/create-hooks.js"

export function createPluginInterface(args: {
  config: ChrisRiskWorkbenchConfig
  agents: AgentRegistry
  tools: Record<string, ReturnType<typeof import("@opencode-ai/plugin").tool>>
  hooks: CreatedHooks
  managers: Managers
}): Hooks {
  const { agents, tools, hooks } = args
  log.info("Creating plugin interface")

  const result: Hooks = {
    config: async (input) => {
      log.info("config handler called — registering agents")
      const agentMap: Record<string, unknown> = {}
      for (const [name, agent] of Object.entries(agents)) {
        const ocAgent = toOpenCodeAgent(agent)
        agentMap[name] = ocAgent
        log.info("Agent: " + name + " | mode=" + (ocAgent as Record<string, unknown>).mode + " | hasDescription=" + !!((ocAgent as Record<string, unknown>).description))
      }
      input.agent = agentMap as Exclude<typeof input.agent, undefined>
      log.info("Registered " + Object.keys(agentMap).length + " agents into config.agent")
    },
    tool: tools,
    ...hooks,
  }
  return result
}
