# Chris Risk Workbench 框架详解

> 信贷风控多 Agent 协作工作台 v0.2.0 — 基于 OpenCode 插件架构

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
  分析师     工程师      研究员    跨界顾问    框架师  ...
 (subagent) (subagent)  (subagent) (subagent) (subagent)
```

三层核心：

| 层 | 组件 | 说明 |
|---|---|---|
| **调度层** | Chris | 唯一 primary，理解需求、拆任务、综合结果 |
| **执行层** | 8 个 subagent | 各司其职，被 Chris 通过 `task` 工具调度 |
| **支撑层** | Skills + Tools + Hooks + Managers | 为 agent 提供专业能力和系统功能 |

---

## 二、Agent 配置详解

### 2.1 Agent 列表

| Agent | 中文名 | 模式 | 核心职责 | 绑定 Skill |
|---|---|---|---|---|
| chris | 主编 | **primary** | 任务调度与综合 | find-skills |
| 分析师 | 分析师 | subagent | 数据分析、统计、可视化 | xlsx, data-analysis |
| 质疑员 | 质疑员 | subagent | 闸门审查、辩论挑战 | critical-thinking-logical-reasoning, debate-review |
| 工程师 | 工程师 | subagent | 特征工程、代码生成 | Feature Engineering |
| 研究员 | 研究员 | subagent | 深度搜索、知识综合 | parallel-deep-research, hv-analysis, browser-use, agent-browser |
| 跨界顾问 | 跨界顾问 | subagent | 跨领域创意、方案生成 | creative-problem-solver |
| 框架师 | 框架师 | subagent | 方法论梳理、流程标准化 | methodology-curator |
| 进化师 | 进化师 | subagent | 自我评估、系统改进、知识同步 | self-improving-agent, agent-evaluation, neat-freak |
| 视觉员 | 视觉员 | subagent | 图片分析、图表生成 | ai-image-generation, pdf |

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
  maxSteps: 25,                         // ⑤ 最大执行步数
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
- `maxSteps` — 限制执行步数，防止死循环

---

## 三、Skill 系统

### 3.1 什么是 Skill？

Skill = **一个 SKILL.md 文件**，是写给 agent 看的专业知识手册。它不是代码，而是结构化的知识文档。

### 3.2 Skill 目录结构

```
chris-risk-workbench/
├── skills/                          ← 插件自带的 Skill（22+个）
│   ├── data-analysis/
│   │   └── SKILL.md                 ← 数据分析专业知识
│   ├── feature-engineering/
│   │   └── SKILL.md                 ← 特征工程专业知识
│   ├── parallel-deep-research/
│   │   └── SKILL.md                 ← 深度调研方法论
│   ├── hv-analysis/
│   │   └── SKILL.md                 ← 横纵分析框架
│   ├── neat-freak/
│   │   └── SKILL.md                 ← 知识整理同步
│   └── ...（共22+个）
└── .agents/skills/                  ← OpenCode 标准 Skill 目录
    ├── xlsx/
    │   └── SKILL.md                 ← Excel 操作知识
    ├── pdf/
    │   └── SKILL.md                 ← PDF 操作知识
    ├── docx/
    │   └── SKILL.md                 ← Word 文档知识
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

| 工具名 | 用途 | 实现状态 |
|---|---|---|
| `framework_query` | 查询风控框架知识库（`frameworks/` 目录） | ✅ 已实现 |
| `debate_query` | 查询辩论历史记录 | ✅ 已实现 |
| `mode_switch` | 切换工作模式（数据分析/特征工程/策略设计） | ⚙️ 提示型（实际由目录结构决定） |
| `evolve` | 对已完成工作进行进化式改进建议 | ✅ 派发给进化师执行 |
| `task_status` | 查看子 Agent 任务状态（运行中/已完成/超时/失败） | ✅ 已实现 |

### 4.2 工具注册流程

```typescript
// src/tools/tool-registry.ts
import { tool } from "@opencode-ai/plugin"

export function createToolRegistry(managers, config) {
  return {
    framework_query: tool({
      description: "查询框架知识库",
      args: { framework: z.string().optional() },
      execute: async (args) => {
        // 查询 managers.framework
      },
    }),
    debate_query: tool({ ... }),
    mode_switch: tool({ ... }),
    evolve: tool({ ... }),
    task_status: tool({ ... }),  // 来自 task-lifecycle.ts
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
  skill: true,      // ✅ 可调用 skill
  read: true,       // ✅ 可读文件
  write: true,      // ✅ 可写文件
  bash: false,      // ❌ 不执行命令
  grep: false,      // ❌ 不搜索代码
  look_at: false,   // ❌ 不看图（派给视觉员）
}

// 进化师的工具权限
tools: {
  task: false,      // ❌ 不能派子任务
  read: true,       // ✅ 可读文件
  write: true,      // ✅ 可写经验文件
  bash: true,       // ✅ 可执行命令
  grep: true,       // ✅ 可搜索
  skill_mcp: true,  // ✅ 可调用 skill MCP
  skill: true,      // ✅ 可调用 skill（neat-freak 等）
}
```

---

## 五、Hook 系统

### 5.1 四个 Hook

| Hook | 触发时机 | 作用 |
|---|---|---|
| `event` | OpenCode 事件（如 session 创建） | 自动检测工作模式 |
| `chat.message` | 聊天消息处理 | 运行时模型 fallback（自动切换备用模型） |
| `tool.execute.after` | 工具执行完成后 | 辩论协调 + 模型 fallback + 任务生命周期追踪 |
| `experimental.chat.system.transform` | 每次发消息前 | 注入工作上下文到系统提示词 |

### 5.2 系统提示词注入（核心 Hook）

`experimental.chat.system.transform` 会在每次对话时自动注入工作上下文：

```
## 当前工作上下文
- 工作模式: 综合模式
- 当前项目目录: /path/to/project
- 框架插件目录: /path/to/chris-risk-workbench
- 可用Agent: chris(主编), 分析师, 质疑员, 工程师, 研究员, 跨界顾问, 框架师, 进化师, 视觉员

## 项目文件概览
### 数据文件 (3)
  - data/train.csv
  - data/test.csv
  - data/dict.xlsx

## 项目说明（README 摘要）
...

## 项目知识库（.chris-risk/knowledge.md）
...

## 项目决策日志（.chris-risk/decisions.md）
...

## 可用框架知识库
- L2-business/5C信用分析: # L2 核心业务框架 - 5C信用分析
- L3-data/交互比率: # L3 数据形态框架 - 交互比率

## 跨项目经验库（可借鉴）
- feature-engineering/income-stability: 收入稳定性特征衍生方案
```

### 5.3 工作模式自动检测

```
event hook → 检测 session.created 事件
  → 扫描用户项目目录：
     - 有 data/ + features/ → feature-engineering 模式
     - 有 data/ + strategy/ → strategy-design 模式
     - 只有 data/           → data-analysis 模式
     - 其他                 → all 模式
```

### 5.4 任务生命周期追踪

`tool.execute.after` hook 监控 task 工具的调用，自动记录任务状态：

- **任务开始**：从 output 解析 task_id，写入 TaskRecord
- **任务完成**：标记已完成，记录耗时
- **任务失败**：检测错误信息，标记失败
- **超时检测**：运行超过 10 分钟的任务自动标记超时

通过 `task_status` 工具可随时查询任务状态。

---

## 六、Manager 系统

| Manager | 职责 | 数据源 | 关键方法 |
|---|---|---|---|
| `FrameworkManager` | 管理风控框架知识库 | `frameworks/` 目录（递归加载 .txt） | `getFramework()`, `getAllSummaries()`, `searchFrameworks()` |
| `ExperienceManager` | 管理跨项目经验 | `experiences/` 目录（递归加载 .md） | `getExperience()`, `getAllSummaries()`, `searchExperiences()` |
| `DebateManager` | 管理辩论流程 | 内存（会话级） | `startDebate()`, `addPoint()`, `nextRound()`, `getSummary()` |

---

## 七、多项目知识管理架构

### 7.1 两层存储

```
框架目录（共享，只读）         项目目录（隔离，读写）
chris-risk-workbench/          用户的项目/
├── frameworks/                ├── .chris-risk/
│   ├── L1-meta/               │   ├── knowledge.md      ← 项目知识
│   ├── L2-business/           │   └── decisions.md       ← 决策日志
│   ├── L3-data/               ├── data/
│   └── L4-special/            └── features/
├── skills/                    （每个项目独立）
├── experiences/               ← 跨项目经验
│   ├── feature-engineering/
│   ├── strategy-design/
│   ├── data-analysis/
│   ├── pitfalls/
│   └── best-practices/
└── dist/  ← 编译输出
```

### 7.2 知识流转规则

| 知识类型 | 写入位置 | 由谁写 |
|---|---|---|
| 项目数据特征 | `.chris-risk/knowledge.md` | 进化师 |
| 策略/模型决策 | `.chris-risk/decisions.md` | 进化师 |
| 通用方法论经验 | `experiences/`（需用户确认） | 进化师 |
| 框架知识库 | `frameworks/`（手动维护） | 用户 |

### 7.3 关键设计决策

- **项目隔离**：进化师只写入当前项目的 `.chris-risk/`，不跨项目写入
- **跨项目需确认**：沉淀到 `experiences/` 需用户确认，防止知识污染
- **增量追加**：向 `knowledge.md` 追加内容，不覆盖已有知识
- **首次创建**：如果 `.chris-risk/` 不存在，进化师自动创建

---

## 八、配置系统

### 8.1 配置加载优先级

```
1. 默认值（src/config/schema.ts 中的 DEFAULT_CONFIG）
2. 用户项目配置（项目根目录/chris-risk-workbench.jsonc）
```

### 8.2 用户可覆盖的配置项

```jsonc
// chris-risk-workbench.jsonc（放在项目根目录）
{
  "work_mode": "feature-engineering",     // 工作模式
  "model": "glm-5.1",                    // 全局默认模型
  "disabled_agents": ["视觉员"],           // 禁用某个 agent
  "skills_path": "./my-custom-skills",     // 自定义 skill 目录
  "frameworks_path": "./my-frameworks",    // 自定义框架目录
  "debate": {
    "auto_trigger": true,                  // 自动触发辩论
    "max_rounds": 3                        // 最大辩论轮数
  },
  "agents": {
    "分析师": {
      "model": "glm-5.1",                 // 覆盖模型
      "temperature": 0.1,                  // 覆盖温度
      "prompt_append": "注意：重点关注违约客户"  // 追加提示
    }
  }
}
```

---

## 九、研究员串行工作流

研究员支持**先搜后研**的串行 Skill 工作流：

```
用户请求深度研究
  │
  ▼
研究员启动
  │
  ├─ Step 1: parallel-deep-research
  │   → 多源搜索、采集原始素材
  │   → 超时模式默认: ultra-fast (1-10min)
  │
  └─ Step 2: hv-analysis
      → 对采集素材进行横纵结构化分析
      → 输出深度研究报告
```

两个 Skill 串行执行，maxSteps=50 确保足够执行空间。

---

## 十、运行时模型 Fallback

当主模型返回错误时，自动切换到备用模型：

```
chat.message hook → 检测模型错误
  → 解析备选模型列表（从 fallback_models 配置）
  → 注入 [系统提示] 建议 Chris 重试

tool.execute.after hook → 检测工具执行模型错误
  → 同上处理
```

修复：当没有配置 `fallback_models` 时，不再注入空提示。

---

## 十一、完整案例：一次特征工程任务

### 场景

用户打开 OpenCode，选择 chris agent，输入：
> "帮我对这份数据做特征工程，目标是预测违约"

### 执行流程

```
第 1 步：用户消息经过 system.transform hook
  → 注入工作上下文：当前模式、可用 agent、可用框架、项目文件

第 2 步：Chris 理解需求，决定派给分析师
  Chris 调用 task 工具 → 分析师（subagent）

  分析师此时拥有的完整能力：
    ✅ instructions = 分析师角色定义
    ✅ skills 注入:
       - xlsx → Excel 文件读写能力
       - data-analysis → 数据分析方法论
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

  工程师执行：
    1. 基于分析师的 IV 值报告，选择高预测力变量
    2. 应用 feature-engineering skill 中的方法论
    3. 生成 Python 特征工程代码
    4. 输出特征说明文档

第 4 步：Chris 触发辩论
  Chris 调用 task 工具 → 质疑员（subagent）

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

  Chris 综合后回复用户。
```

---

## 十二、目录结构总览

```
chris-risk-workbench/
├── src/
│   ├── index.ts                    # 插件入口（Plugin 函数）
│   ├── plugin-interface.ts         # 创建 Hooks 接口（config handler 注册 agent）
│   ├── create-managers.ts          # 创建 FrameworkManager + ExperienceManager + DebateManager
│   ├── config/
│   │   └── schema.ts               # 配置定义 + loadPluginConfig()
│   ├── agents/
│   │   ├── types.ts                # AgentConfig 类型 + toOpenCodeAgent()
│   │   ├── builtin-agents.ts       # 创建所有 agent + 注入 skill
│   │   ├── chris.ts                # 主编（primary）
│   │   ├── 分析师.ts                # 数据分析
│   │   ├── 质疑员.ts                # 逻辑审查
│   │   ├── 工程师.ts                # 特征工程
│   │   ├── 研究员.ts                # 深度搜索（串行工作流）
│   │   ├── 跨界顾问.ts              # 创意方案
│   │   ├── 框架师.ts                # 方法论
│   │   ├── 进化师.ts                # 系统改进 + 知识同步
│   │   └── 视觉员.ts                # 图片分析
│   ├── hooks/
│   │   ├── create-hooks.ts         # 创建所有 hook（串联 tool.execute.after）
│   │   ├── context-injector.ts     # system.transform hook（注入上下文 + 插件目录）
│   │   ├── mode-detector.ts        # event hook（自动检测工作模式）
│   │   ├── task-lifecycle.ts       # tool.execute.after hook（任务追踪）
│   │   └── runtime-fallback.ts     # chat.message + tool hook（模型 fallback）
│   ├── tools/
│   │   └── tool-registry.ts        # 5 个工具的注册
│   └── shared/
│       ├── skill-loader.ts         # Skill 加载器 + resolveSkillPaths()
│       ├── logger.ts               # 日志系统
│       ├── model-requirements.ts   # Agent 模型配置表（AGENT_MODEL_MAP）
│       └── utils.ts                # 工具函数（truncate, loadFilesFromDir 等）
├── skills/                         # 插件自带的 22+ 个 Skill
├── frameworks/                     # 风控框架知识库（4 层 24 个框架）
│   ├── L1-meta/                    # 元框架（MECE、5W1H、假设驱动、第一原理）
│   ├── L2-business/                # 核心业务（5C信用分析、评分卡策略、额度策略等）
│   ├── L3-data/                    # 数据形态（交互比率、截面统计、时间序列、行为序列）
│   └── L4-special/                 # 高级专题（NLP、地理空间、社会网络、行为经济学等）
├── experiences/                    # 跨项目经验库
│   ├── feature-engineering/
│   ├── strategy-design/
│   ├── data-analysis/
│   ├── pitfalls/
│   └── best-practices/
├── dist/                           # 编译输出（gitignore）
├── package.json                    # v0.2.0, "main": "./dist/index.js"
└── tsconfig.json
```

---

## 十三、启动流程

```
OpenCode 启动 → 加载 dist/index.js
│
├─ import.meta.url → 计算 pluginRoot（插件自己的目录）
│
├─ loadPluginConfig(ctx.directory)    ← 从用户项目目录加载配置
├─ createManagers(config, pluginRoot) ← 用 pluginRoot 找 frameworks/ + experiences/
├─ resolveSkillPaths(pluginRoot, ctx.directory, ...)
│   → 搜索 pluginRoot/skills/ + pluginRoot/.agents/skills/
│   → 搜索 ctx.directory/skills/ + ctx.directory/.agents/skills/
├─ new SkillLoader(skillPaths)        ← 索引所有 SKILL.md
├─ createBuiltinAgents(config, skillLoader)
│   → 创建 9 个 agent
│   → injectSkills() 注入 skill 内容到 agent.instructions
├─ createToolRegistry(managers, config) → 注册 5 个工具
├─ createHooks(config, managers, ctx.directory, pluginRoot)
│   → event: 工作模式检测
│   → chat.message: 运行时 fallback
│   → tool.execute.after: 辩论 + fallback + 任务追踪
│   → system.transform: 上下文注入（含插件目录）
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

## 十四、总结

| 概念 | 一句话 |
|---|---|
| **Agent** | 一个有角色、有权限、有专业知识的 AI 角色 |
| **Skill** | 一个 SKILL.md 文件，给 agent 注入专业知识 |
| **Tool** | agent 可以调用的函数（framework_query、task_status 等） |
| **Hook** | 系统级事件处理器（注入上下文、检测模式、协调辩论、追踪任务） |
| **Chris** | 唯一的 primary agent，调度一切，自己不干活 |
| **subagent** | 被 Chris 通过 task 工具调度的专业 agent |
| **Manager** | 管理共享资源（框架库、经验库、辩论流程） |
| **pluginRoot** | 插件自身目录（通过 import.meta.url 计算） |
| **ctx.directory** | 用户项目目录（由 OpenCode SDK 传入） |
| **ExperienceManager** | 管理跨项目经验（experiences/ 目录） |
| **串行工作流** | 研究员的先搜后研模式（parallel-deep-research → hv-analysis） |

**核心设计理念：Chris 是大脑，其他 agent 是手和眼，Skill 是专业知识，Tool 是操作工具，Hook 是神经系统。**
