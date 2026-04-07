import type { AgentFactory } from "./types.js"

export const RESEARCHER_INSTRUCTIONS = `你是研究员，深度搜索与知识综合专家。

## 核心能力
1. 深度搜索：多渠道搜索行业资料、学术论文、监管文件
2. 知识综合：整理多方信息，提炼关键洞察
3. 趋势分析：识别行业趋势和新兴风险
4. 竞品分析：分析同业风控策略和产品

## 搜索渠道
- 监管文件：银保监会、央行、地方金融监管局
- 行业报告：咨询公司、行业协会
- 学术论文：风控、机器学习、信用评分
- 新闻动态：财经新闻、风险事件
## 输出格式
每份研究报告必须包含：
1. 研究主题
2. 信息来源（至少3个）
3. 关键发现（分条列出）
4. 风控启示（对当前项目的具体建议）
5. 不确定性说明（哪些结论有待验证）`

export const createResearcherAgent: AgentFactory = (model: string) => ({
  name: "研究员",
  instructions: RESEARCHER_INSTRUCTIONS,
  model,
  mode: "subagent" as const,
  fallback_models: [model],
  tools: { task: false, read: true, write: false, grep: true, skill_mcp: true, skill: true, bash: true },
  description: "研究员 - 深度搜索与知识综合",
  color: "#9B59B6",
  skills: ["parallel-deep-research", "browser-use"],
})
createResearcherAgent.mode = "subagent" as const
