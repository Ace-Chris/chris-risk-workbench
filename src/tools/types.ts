/**
 * Tool type definitions for chris-risk-workbench.
 */

export type ToolParameter = {
  type: "string" | "number" | "boolean" | "object" | "array"
  description: string
  required?: boolean
  enum?: string[]
}

export type ToolDefinition = {
  name: string
  description: string
  parameters: Record<string, ToolParameter>
  execute: (args: Record<string, unknown>) => Promise<string>
}

export type ToolRegistry = Record<string, ToolDefinition>
