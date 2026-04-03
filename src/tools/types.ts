import type { tool } from '@opencode-ai/plugin'

/**
 * Tool type definitions for chris-risk-workbench.
 * Re-exports ToolDefinition from @opencode-ai/plugin
 */
export type ToolRegistry = Record<string, ReturnType<typeof tool>>
