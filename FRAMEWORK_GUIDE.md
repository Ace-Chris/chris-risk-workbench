# Chris Risk Workbench 框架详解

> 信贷风控多 Agent 协作工作台 — 基于 OpenCode 插件架构

---

## 一、整体架构

```
用户输入
   │
   ▼
┌─────────┐    Tab选择
│  Chris   │ ◄─────────── 唯一的 primary agent（主编/调度员）
│ (主编)   │
└────┬─────┘
     │ task 工具派发
     ├──────────┬──────────┬──────────┬──────────┐
     ▼          ▼          ▼          ▼          ▼
  分析师     工程师      研究员    跨界顾问    框架师   ...
 (subagent) (subagent)  (subagent) (subagent) (subagent)
```

三层核心：

| 层 | 组件 | 说明 |
|---|---|---|
| **调度层** | Chris | 唯一 primary，理解需求、拆任务、综合结果 |
| **执行层** | 8 个 subagent | 各司其职，被 Chris 通过 `task` 工具调度 |
| **支撑层** | Skills + Tools + Hooks | 为 agent 提供专业能力和系统功能 |

---

## 二、Agent 配置详解

### 2.1 Agent 列表

| Agent | 中文名 | 模式 | 核心职责 | 绑定 Skill |
|---|---|---|---|---|
| chris | 主编 | **primary** | 任务调度与综合 | find-skills |
| 分析师 | 分析师 | subagent | 数据分析、统计、可视化 | xlsx, data-analysis |
| 质疑员 | 质疑员 | subagent | 逻辑审查、辩论挑战 | critical-thinking-logical-reasoning |
| 工程师 | 工程师 | subagent | 特征工程、代码生成 | feature-engineering |
| 研究员 | 研究员 | subagent | 深度搜索、知识综合 | parallel-deep-research, browser-use |
| 跨界顾问 | 跨界顾问 | subagent | 跨领域创意、方案生成 | creative-problem-solver |
| 框架师 | 框架师 | subagent | 方法论梳理、流程标准化 | methodology-curator |
| 进化师 | 进化师 | subagent | 自我评估、系统改进 | self-improving-agent, agent-evaluation |
| 视觉员 | 视觉员 | subagent | 图片分析、图表生成 | ai-image-generation |

### 2.2 Agent 配置结构

每个 agent 由 `src/agents/` 下的 `.ts` 文件定义，返回 `AgentConfig` 对象：

```typescript
// src/agents/分析师.ts（示例）
export const createAnalystAgent: AgentFactory = (model) => ({
  name: "分析师",
  instructions: ANALYST_INSTRUCTIONS,   // ① 系统提示词（定义角色和能力）
  model,                                // ② 使用的模型（从配置传入）
  mode: "subagent",                     // ③ 模式：primary(显示在Tab) / subagent(被调度)
  fallback_models: [model],             // ④ 备用模型列表
  temperature: 0.3,                     // ⑤ 温度参数（越低越确定性）
  tools: {                              // ⑥ 工具权限控制（白名单）
    task: false,      // 不能再派子任务
    read: true,       // 可读文件
    write: false,     // 不能写文件
    bash: true,       // 可执行命令
    skill_mcp: true,  // 可调用 skill MCP 服务
    skill: true,      // 可调用 skill
  },
  description: "分析师 - 数据分析与统计",  // ⑦ 描述（给 Chris 看，决定派谁）
  color: "#4ECDC4",                      // ⑧ UI 颜色标识
  skills: ["xlsx", "data-analysis"],      // ⑨ 绑定的 Skill 名称列表
})

// 必须在工厂函数上挂载 mode 属性
createAnalystAgent.mode = "subagent"
```

**关键字段说明**：

- `instructions` — agent 的"人格"和"能力手册"，定义它怎么工作
- `mode` — `"primary"` 显示在 Tab 选择器，`"subagent"` 只能被 task 调度
- `tools` — 精确控制每个 agent 能用哪些工具（安全隔离）
- `description` — 帮助 Chris 判断什么任务该派给谁
- `skills` — 注入专业知识的 Skill 名称列表

---

## 三、Skill 系统

### 3.1 什么是 Skill？

Skill = **一个 SKILL.md 文件**，是写给 agent 看的专业知识手册。它不是代码，而是结构化的知识文档。

### 3.2 Skill 目录结构

```
chris-risk-workbench/
├── skills/                          ← 插件自带的 Skill
│   ├── data-analysis/
│   │   └── SKILL.md                 ← 数据分析专业知识
│   ├── feature-engineering/
│   │   └── SKILL.md                 ← 特征工程专业知识
│   ├── parallel-deep-research/
│   │   └── SKILL.md                 ← 深度调研方法论
│   └── ...（共12个）
└── .agents/skills/                  ← OpenCode 标准 Skill 目录
    ├── xlsx/
    │   └── SKILL.md                 ← Excel 操作知识
    └── ...
```

### 3.3 Skill 加载流程

```
启动时：
  1. resolveSkillPaths(pluginRoot, projectDir)
     → 搜索插件目录 + 用户项目目录的 skills/ 和 .agents/skills/
  2. SkillLoader 扫描每个子目录的 SKILL.md
     → 缓存到内存 Map<skillName, content>

创建 Agent 时：
  3. injectSkills(agent, skillLoader)
     → 读取 agent.skills 列表
  4. skillLoader.buildSkillBlock(skillNames)
     → 查找并拼接所有 Skill 内容
  5. 追加到 agent.instructions 末尾
     → agent 最终的 instructions = 角色定义 + 专业知识
```

### 3.4 Skill 注入效果

以工程师为例：

```
注入前的 instructions:
  "你是工程师，信贷特征工程专家。核心职责：特征衍生、代码生成..."

注入后（追加了 feature-engineering skill 内容）:
  "你是工程师，信贷特征工程专家。核心职责：特征衍生、代码生成...

   ## 已加载的专业技能

   ### 技能: feature-engineering
   [SKILL.md 的完整内容：方法论、步骤、模板...]"
```

---

## 四、Tool 系统

### 4.1 工具列表

| 工具名 | 用途 | 调用者 |
|---|---|---|
| `framework_query` | 查询风控框架知识库 | 所有 agent |
| `mode_switch` | 切换工作模式（数据分析/特征工程/策略设计） | Chris |
| `debate_start` | 启动辩论（让质疑员挑战某个结论） | Chris |
| `debate_vote` | 对辩论结果投票 | Chris |
| `skill_suggest` | 建议使用某个 skill | Chris |
| `agent_recommend` | 推荐最适合的 agent | Chris |

### 4.2 工具注册流程

```typescript
// src/tools/tool-registry.ts
import { tool } from "@opencode-ai/plugin"

export function createToolRegistry(config, managers) {
  return {
    framework_query: tool({
      description: "查询风控框架知识库",
      parameters: { ... },
      execute: async (params) => {
        return managers.framework.query(params.framework, params.topic)
      },
    }),
    // ...其他工具
  }
}
```

工具通过 `Hooks.tool` 注册，OpenCode 会将它们加入 LLM 可调用的工具列表。

### 4.3 工具权限控制

每个 agent 通过 `tools` 字段控制工具访问：

```typescript
// Chris（主编）的工具权限
tools: {
  task: true,       // ✅ 可派子任务
  skill_mcp: true,  // ✅ 可调用 skill MCP
  read: true,       // ✅ 可读文件
  write: true,      // ✅ 可写文件
  bash: false,      // ❌ 不执行命令
  grep: false,      // ❌ 不搜索代码
}

// 工程师的工具权限
tools: {
  task: false,      // ❌ 不能派子任务
  read: true,       // ✅ 可读分析报告
  write: true,      // ✅ 可写特征代码
  bash: true,       // ✅ 可运行验证
  skill_mcp: true,  // ✅ 可调用 skill
}
```

---

## 五、Hook 系统

### 5.1 三个 Hook

| Hook | 触发时机 | 作用 |
|---|---|---|
| `event` | OpenCode 事件（如 session 创建） | 自动检测工作模式 |
| `tool.execute.after` | 工具执行完成后 | 通知辩论协调器 |
| `experimental.chat.system.transform` | 每次发消息前 | 注入工作上下文到系统提示词 |

### 5.2 系统提示词注入（核心 Hook）

`experimental.chat.system.transform` 会在每次对话时自动注入工作上下文：

```
## 当前工作上下文
- 工作模式: 特征工程
- 可用Agent: chris(主编), 分析师, 质疑员, 工程师, 研究员, 跨界顾问, 框架师, 进化师, 视觉员
- 可用框架知识库:
  - 评分卡: 信用评分卡开发标准流程...
  - 反欺诈: 实时反欺诈策略设计方法...
```

这让 LLM 知道当前有哪些 agent 和资源可用。

### 5.3 工作模式自动检测

```
event hook → 检测 session.created 事件
  → 扫描用户项目目录：
     - 有 data/ + features/ → feature-engineering 模式
     - 有 data/ + strategy/ → strategy-design 模式
     - 只有 data/           → data-analysis 模式
     - 其他                 → all 模式
```

---

## 六、Manager 系统

| Manager | 职责 | 关键方法 |
|---|---|---|
| `FrameworkManager` | 管理风控框架知识库（`frameworks/` 目录） | `query()`, `getAllSummaries()` |
| `DebateManager` | 管理辩论流程 | `startDebate()`, `record()`, `vote()` |

---

## 七、配置系统

### 7.1 配置加载优先级

```
1. 默认值（src/config/schema.ts 中的 DEFAULT_CONFIG）
2. 用户项目配置（项目根目录/chris-risk-workbench.jsonc）
3. 环境变量覆盖
```

### 7.2 用户可覆盖的配置项

```jsonc
// chris-risk-workbench.jsonc（放在项目根目录）
{
  "work_mode": "feature-engineering",     // 工作模式
  "model": "claude-sonnet-4-20250514",          // 全局默认模型
  "disabled_agents": ["视觉员"],           // 禁用某个 agent
  "skills_path": "./my-custom-skills",     // 自定义 skill 目录
  "frameworks_path": "./my-frameworks",    // 自定义框架目录
  "agents": {
    "分析师": {
      "model": "claude-sonnet-4-20250514",        // 覆盖模型
      "temperature": 0.1,                  // 覆盖温度
      "prompt_append": "注意：重点关注违约客户"  // 追加提示
    }
  }
}
```

---

## 八、完整案例：一次特征工程任务

### 场景

用户打开 OpenCode，选择 chris agent，输入：
> "帮我对这份数据做特征工程，目标是预测违约"

### 执行流程

```
第 1 步：用户消息经过 system.transform hook
  → 注入工作上下文：当前模式、可用 agent、可用框架

第 2 步：Chris 理解需求，决定派给分析师
  Chris 调用 task 工具 → 分析师（subagent）

  分析师此时拥有的完整能力：
    ✅ instructions = 分析师角色定义
    ✅ skills 注入:
       - xlsx → Excel 文件读写能力
       - data-analysis → 数据分析方法论（IV计算、分布分析等）
    ✅ tools 权限:
       - read: true → 读取数据文件
       - bash: true → 运行 Python 分析脚本

  分析师执行：
    1. 读取数据文件
    2. 执行探索性数据分析（EDA）
    3. 计算变量 IV 值、缺失率、分布
    4. 输出数据分析报告

第 3 步：Chris 收到分析报告，派给工程师
  Chris 调用 task 工具 → 工程师（subagent）

  工程师此时拥有的完整能力：
    ✅ instructions = 工程师角色定义
    ✅ skills 注入:
       - feature-engineering → 完整的特征衍生方法论
    ✅ tools 权限:
       - read: true → 读取分析师报告
       - write: true → 写特征工程代码
       - bash: true → 运行验证脚本

  工程师执行：
    1. 基于分析师的 IV 值报告，选择高预测力变量
    2. 应用 feature-engineering skill 中的方法论
    3. 生成 Python 特征工程代码
    4. 输出特征说明文档

第 4 步：Chris 触发辩论
  Chris 调用 debate_start 工具 → 质疑员（subagent）

  质疑员：
    ✅ skills: critical-thinking-logical-reasoning
    审查工程师的特征：
    - 这个特征会不会有数据泄露？
    - 时间窗口是否合理？
    - 特征稳定性如何？

第 5 步：Chris 综合结果，回复用户
  Chris 收集所有产出：
    📊 分析师的数据分析报告
    💻 工程师的特征工程代码
    🔍 质疑员的审查意见

  Chris 综合后回复：
    "特征工程完成！包含15个衍生特征。
     分析师发现3个高IV变量，工程师基于此衍生...
     质疑员指出特征X可能有数据泄露风险，建议...
     完整代码和文档见附件。"
```

---

## 九、目录结构总览

```
chris-risk-workbench/
├── src/
│   ├── index.ts                    # 插件入口（Plugin 函数）
│   ├── plugin-interface.ts         # 创建 Hooks 接口（config handler 注册 agent）
│   ├── config/
│   │   └── schema.ts               # 配置定义 + loadPluginConfig()
│   ├── agents/
│   │   ├── types.ts                # AgentConfig 类型 + toOpenCodeAgent()
│   │   ├── builtin-agents.ts       # 创建所有 agent + 注入 skill
│   │   ├── chris.ts                # 主编（primary）
│   │   ├── 分析师.ts                # 数据分析
│   │   ├── 质疑员.ts                # 逻辑审查
│   │   ├── 工程师.ts                # 特征工程
│   │   ├── 研究员.ts                # 深度搜索
│   │   ├── 跨界顾问.ts              # 创意方案
│   │   ├── 框架师.ts                # 方法论
│   │   ├── 进化师.ts                # 系统改进
│   │   └── 视觉员.ts                # 图片分析
│   ├── hooks/
│   │   ├── create-hooks.ts         # 创建所有 hook
│   │   ├── context-injector.ts     # system.transform hook（注入上下文）
│   │   ├── mode-detector.ts        # event hook（自动检测工作模式）
│   │   └── debate-coordinator.ts   # tool.execute.after hook（辩论协调）
│   ├── tools/
│   │   ├── types.ts                # ToolRegistry 类型
│   │   └── tool-registry.ts        # 6 个工具的注册
│   ├── shared/
│   │   ├── skill-loader.ts         # Skill 加载器 + resolveSkillPaths()
│   │   ├── logger.ts               # 日志系统
│   │   ├── model-requirements.ts   # 模型需求定义
│   │   └── utils.ts                # 工具函数（truncate, resolveFrameworksPath）
│   └── create-managers.ts          # 创建 FrameworkManager + DebateManager
├── skills/                         # 插件自带的 12 个 Skill
│   ├── data-analysis/SKILL.md
│   ├── feature-engineering/SKILL.md
│   ├── parallel-deep-research/SKILL.md
│   ├── browser-use/SKILL.md
│   ├── creative-problem-solver/SKILL.md
│   ├── methodology-curator/SKILL.md
│   ├── self-improving-agent/SKILL.md
│   ├── agent-evaluation/SKILL.md
│   ├── ai-image-generation/SKILL.md
│   ├── critical-thinking-logical-reasoning/SKILL.md
│   └── find-skills/SKILL.md
├── .agents/skills/                 # OpenCode 标准 Skill 目录
│   └── xlsx/SKILL.md
├── frameworks/                     # 风控框架知识库
├── dist/                           # 编译输出（gitignore）
├── package.json                    # "main": "./dist/index.js"
└── tsconfig.json
```

---

## 十、启动流程

```
OpenCode 启动 → 加载 dist/index.js
│
├─ import.meta.url → 计算 pluginRoot（插件自己的目录）
│
├─ loadPluginConfig(ctx.directory)    ← 从用户项目目录加载配置
├─ createManagers(config, pluginRoot) ← 用 pluginRoot 找 frameworks/
├─ resolveSkillPaths(pluginRoot, ctx.directory, ...)
│   → 搜索 pluginRoot/skills/ + pluginRoot/.agents/skills/
│   → 搜索 ctx.directory/skills/ + ctx.directory/.agents/skills/
├─ new SkillLoader(skillPaths)        ← 索引所有 SKILL.md
├─ createBuiltinAgents(config, skillLoader)
│   → 创建 9 个 agent
│   → injectSkills() 注入 skill 内容到 agent.instructions
├─ createToolRegistry(config, managers) → 注册 6 个工具
├─ createHooks(config, managers, ctx.directory) → 注册 3 个 hook
│
├─ createPluginInterface({config, agents, tools, hooks, managers})
│   → config handler: 遍历 agents → toOpenCodeAgent() → input.agent
│   → tool: 工具注册表
│   → ...hooks 展开
│
└─ return { name: "chris-risk-workbench", ...interface }
    → OpenCode 接收 Hooks 对象，插件就绪
```

---

## 十一、总结

| 概念 | 一句话 |
|---|---|
| **Agent** | 一个有角色、有权限、有专业知识的 AI 角色 |
| **Skill** | 一个 SKILL.md 文件，给 agent 注入专业知识 |
| **Tool** | agent 可以调用的函数（framework_query、debate_start 等） |
| **Hook** | 系统级事件处理器（注入上下文、检测模式、协调辩论） |
| **Chris** | 唯一的 primary agent，调度一切，自己不干活 |
| **subagent** | 被 Chris 通过 task 工具调度的专业 agent |
| **Manager** | 管理共享资源（框架库、辩论流程） |
| **pluginRoot** | 插件自身目录（通过 import.meta.url 计算） |
| **ctx.directory** | 用户项目目录（由 OpenCode SDK 传入） |

**核心设计理念：Chris 是大脑，其他 agent 是手和眼，Skill 是专业知识，Tool 是操作工具。**
