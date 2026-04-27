---
name: Feature Engineering
description: 自进化的特征工程引导系统。具备项目记忆、维度坐标系、Pre-Flight门禁和错误预防机制。每次项目完结后归档，新项目启动时自动加载历史经验，越用越聪明。
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
metadata:
  memory:
    semantic: memory/semantic-patterns.json
    episodic: memory/episodic/
    archives: memory/project-archives/
    dimensions: memory/dimension-templates/
  evolution:
    trigger: "按照这次进化记录优化"
    process: "归档 → 抽象模式 → 更新记忆"
---

# Feature Engineering（自进化版）

> **版本**: V2.0 | **更新**: 2026-04-14
> **核心变化**: 从通用sklearn教程进化为"有记忆的特征工程引导系统"
> **来源项目**: MTN MoMo Advance（512特征，10轮审查，45个错误修复）

## 系统架构

```
                    ┌─────────────────────────────┐
                    │   新项目启动                  │
                    │        │                     │
                    │        ▼                     │
                    │   Phase 0: Pre-Flight        │
                    │   ├─ 加载历史记忆(archives)   │
                    │   ├─ 填写维度坐标系           │
                    │   └─ 跑Pre-Flight Checklist  │
                    │        │                     │
                    │        ▼ (全部Gate通过)        │
                    │   Phase 1-4: 正常设计          │
                    │        │                     │
                    │        ▼                     │
                    │   Phase 5: 项目归档 ──────┐  │
                    │   ├─ 写入project-archive  │  │
                    │   ├─ 提取semantic-pattern │  │
                    │   └─ 写入episodic记忆     │  │
                    │        │                  │  │
                    │        ▼                  │  │
                    │   框架变得更聪明 ◄──────────┘  │
                    └─────────────────────────────┘
```

## 何时使用

- 任何需要从原始数据设计衍生特征的项目
- 信贷风控评分卡特征开发
- 无监督/有监督特征工程
- 用户行为画像特征设计
- 跨域交叉特征设计

## 触发进化

用户说以下任何一种时，执行归档流程（见Phase 5）：
- **"项目完成"** / **"搞定了"**
- **"进化"** / **"启动进化师"**
- **"按照这次进化记录优化"**
- **"总结一下"** / **"沉淀记忆"**

> 🔄 完整闭环：每次项目完成 → 进化师提炼 → 写入记忆 → git push → 框架变聪明

---

# Phase 0: Pre-Flight（强制门禁）

> ⚠️ **写任何特征公式之前，必须完成Phase 0。**
> MTN项目教训：72%的错误源于"先写后验证"。Phase 0将流程翻转为"先验证后写"。

## Step 1: 加载历史记忆（必做）

> 项目开始时，必须先读取记忆文件夹，把历史项目的优势、错误、方法论加载到上下文中。
> 这样每个新项目都能站在之前所有项目的肩膀上。

### 1.1 读取执行顺序

```
① semantic-patterns.json  →  跨项目通用规则（当前16条）
② episodic/*.md           →  同类数据类型的方法论（思考框架/映射模式/Checklist）
③ project-archives/*.json →  具体项目的全景记录（维度/错误/决策）
④ dimension-templates/    →  匹配当前领域的维度模板
```

### 1.2 具体读取动作

```
# 第一步：读通用规则（每次必读）
读取 memory/semantic-patterns.json
→ 列出所有P0/P1级模式，作为本次项目的"避坑清单"
→ 特别关注：上次项目的P0模式（如clip陷阱、分母保护）

# 第二步：匹配同类方法论（按数据类型匹配）
读取 memory/episodic/ 下所有 .md 文件
→ 如果当前项目是"交易流水"类 → 加载 mtn-tld-transaction-flow.md
→ 如果当前项目是"信用报告"类 → 加载对应的归档
→ 提取：5步思考框架、映射模式、维度拆解、Checklist
→ 关键：这些方法论直接复用，不需要重新发明

# 第三步：读具体项目档案（参考类似项目的踩坑）
读取 memory/project-archives/ 下的相关 .json
→ 提取：犯了什么错、怎么修的、哪些维度容易遗漏
→ 重点关注：与当前项目数据类型相同的档案

# 第四步：匹配维度模板
读取 memory/dimension-templates/ 中的匹配模板
→ 信贷风控 → credit-risk-default.md
→ 其他领域 → dimension-blank.md（空白模板）
```

### 1.3 加载后输出

向用户呈现一份 **「历史经验简报」**：

```
📋 历史经验加载完成

【通用避坑清单】（P0级，必须遵守）
- fe-pat-011: clip陷阱：哨兵值被截断（MTN TLD项目60处）
- fe-pat-002: 分母=0显式保护
- fe-pat-001: 字段存在性验证（先验证后写）
- fe-pat-008: 跨层字段名一致性
...（共N条P0/P1）

【同类方法论】
- 匹配到：交易流水类方法论（mtn-tld-transaction-flow.md）
- 核心放大器：Flag×Window×Metric三维笛卡尔积
- 窗口分级策略：HIGH×8 / MID×5 / LOW×2
- 6种映射模式：过滤聚合→占比→比率→窗口动量→趋势→行为组合

【上次项目最严重的教训】
1. clip陷阱（60处，最终审查才发现）
2. 哨兵值-999与clip冲突需要从工具层面解决
3. 任务分步验证不够细（每个Task完成后应扫描哨兵值）

【可复用的Checklist】
- 5步思考框架 / 8维度MECE / 窗口设计矩阵 / 高级特征决策树
→ 已加载，将在设计过程中逐项检查
```

## Step 2: 维度坐标系

读取 `memory/dimension-templates/` 中的匹配模板，逐维度回答问题：

| 维度 | 回答的问题 | 必做检查 |
|------|-----------|---------|
| 时间 | 行为在何时发生、如何变化？ | 时间窗口(1m/3m/6m)完整性 |
| 金额 | 行为的规模有多大？ | 金额分布、极端值、负值 |
| 频次 | 行为发生的频率有多高？ | qty=0的边界处理 |
| 方向 | 资金/行为是流入还是流出？ | 流入/流出字段的命名一致性 |
| 域 | 发生在哪个业务领域？ | 每个域的空值率和realValid |
| 跨域 | 不同域的行为是否一致？ | 域间逻辑关系的合理性 |

**输出物**: 填好的维度坐标系 + 维度盲区列表

## Step 3: Pre-Flight Checklist

读取 `templates/pre-flight-checklist.md`，逐Gate验证：

| Gate | 检查内容 | MTN教训 |
|------|---------|---------|
| Gate 1 | 数据验证：字段存在性、空值率、异常值 | SMS字段不存在导致6个特征删除 |
| Gate 2 | 命名规范：前缀、缩写映射表 | 33处命名不一致 |
| Gate 3 | 空值策略：按类型填值、is_missing标志 | 空值率53%不是bug是feature |
| Gate 4 | 截断范围：类型匹配语义 | 金额不能clip(-10,10) |
| Gate 5 | 跨层引用：L0输出 vs L2引用 | 日期字段命名不一致 |
| Gate 6 | 文档完整性：16列无空 | 85个"同上" |

**Gate全部通过后，才能进入Phase 1。**

---

# Phase 1-4: 正常设计

## 分层架构

```
L0（原始清洗）→ L1（基础统计）→ L2（进阶分析）→ L3（跨域交叉）→ L4（全局评分）
```

### L0 — 原始字段清洗
- 类型验证、范围验证、空值处理、异常值处理
- 新增衍生：日期转距今、年龄计算、缺失标志（⚠️必须在fillna前）、品牌分层
- **输出**: "可用字段清单"（feature_name列），这是后续所有层的锚点

### L1 — 基础特征
- 计数(cnt)、金额(amt)、均值(unit_amt)、比率(ratio)、标志(flag)
- 每个特征只用1-2个原始字段，不引入业务假设
- 覆盖所有时间窗口(1m/3m/6m)

### L2 — 进阶特征
- **Trend**: momentum, slope(OLS), change_rate
- **Stability**: regularity, consistency, CV
- **Volatility**: concentration, HHI, conc_slope
- 关键：L2特征可引用L1特征（不限于原始字段）

### L3 — 跨域交叉
- MoMo×GSM×KYC交叉比率
- 风险组合信号（条件A & 条件B）
- 金融健康指标（余额缓冲、收支比）
- 关键：必须同时涉及≥2个域

### L4 — 全局计算
- 全局排序（percentile_rank）
- 综合评分（多维度加权）
- 画像标签（基于规则的业务标签）

## 16列标准格式

每个特征必须包含以下16列（无空值、无"同上"）：

```
feature_name | cn_name | domain | layer | field_type | formula | 
input_fields | dep_features | null_handling | value_range | 
data_type | business_logic | woe_direction | redundancy_group | 
pseudo_code | notes
```

## 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 原始清洗 | 保持原名 | mom_p2p_send_amt_6m |
| 衍生特征 | 加项目前缀 | mtn_m_p2p_send_momentum |
| 总长度 | ≤50字符 | |
| 缩写 | 统一映射表 | recv(非received), bill_pay(非bill) |

## 空值处理策略

| 字段类型 | 填充值 | 说明 |
|---------|--------|------|
| MoMo金额/次数 | 0 | 未使用=0次/0金额 |
| GSM数值 | 0 | 通信行为无缺失偏差 |
| KYC数值 | -999 | 区分"未知"和"值为0" |
| 类别型 | "UNKNOWN" | |
| 计算缺失(分母=0) | -999 | |
| 缺失标志域字段=-999 | 不参与计算 | 直接输出-999 |

## 截断范围速查表

| 类型 | 范围 | 适用 |
|------|------|------|
| RATIO | [0, 100] | 两个金额/次数的比 |
| RATIO_WIDE | [0, 200] | 比值可能>1的情况 |
| MOMENTUM | [-10, 10] | 近期/历史均值 |
| SLOPE | [-10, 10] | OLS回归斜率 |
| CHANGE_RATE | [-100, 100] | 变化率(%) |
| CONCENTRATION | [0, 1] | max/total |
| PERCENT | [0, 1] | 占比 |
| FLAG | [0, 1] | 布尔标志 |
| AMOUNT | 无截断 | 金额绝对值 |
| COUNT | 无截断 | 计数绝对值 |

**⚠️ 金额字段绝对不能使用SLOPE/MOMENTUM截断范围！**

---

# Phase 5: 项目归档（让框架变聪明）

> 触发条件：用户说"项目完成"/"进化"/"启动进化师"等，或项目完结时自动触发
> 
> 执行方式：派 **进化师** Agent 完成提炼，主编负责写入文件和git push

## 5.0 派进化师提炼（核心步骤）

派进化师Agent执行以下提炼工作：

```
请从本次项目中提炼以下内容：

1. 优势（做得好的）
   - 架构设计亮点
   - 性能优化策略
   - 文档/协作模式创新

2. 错误与教训（踩过的坑）
   - 系统性BUG（模式+影响范围+修复方式）
   - 思维陷阱（不是代码bug，是思路上的遗漏或偏差）
   - 流程管理问题

3. 方法论提炼（最重要）
   - 特征衍生的思考框架（面对新项目怎么思考）
   - 维度拆解的MECE方法
   - 从原始字段到特征的映射规律/放大器
   - 可复用的Checklist
```

## 5.1 写入项目归档

在 `memory/project-archives/` 下创建 `{YYYY-MM}_{项目名}.json`：

```json
{
  "project": "项目名",
  "date": "2026-04-14",
  "domain": "credit-risk",
  "data_profile": { ... },
  "dimension_system": { ... },
  "output_summary": { ... },
  "errors": [ ... ],
  "key_lessons": [ ... ],
  "review_stats": { ... }
}
```

## 5.2 提取语义模式

从项目错误中提炼新的抽象模式，追加到 `memory/semantic-patterns.json`：

**提取规则**：
- 具体错误（如"SMS字段不存在"）→ 不直接存
- 抽象模式（如"引用前必须验证字段存在"）→ 存入semantic
- 每个模式包含：pattern描述、problem、prevention、severity

**去重规则**：
- 如果新模式与已有模式的pattern字段语义相同 → 合并（更新confidence和applications）
- 如果新模式是已有模式的新实例 → 只增加applications计数

## 5.3 写入情节记忆

在 `memory/episodic/` 下创建方法论档案文件（支持 `.md` 和 `.json` 两种格式）：

**方法论档案 (.md)** — 适合丰富的、结构化的方法论内容：
- 文件命名：`{数据类型}-{领域}.md`（如 `mtn-tld-transaction-flow.md`）
- 内容包含：思考框架、映射模式、维度拆解、决策树、Checklist
- 这是新项目启动时最有价值的参考

**具体经历 (.json 或 .md)** — 适合具体踩坑记录：
- 哪个项目、哪个阶段、发生了什么
- 根因分析
- 解决方案
- 关联的semantic-pattern ID

## 5.4 更新维度模板

如果新项目发现了当前维度模板未覆盖的维度或盲区：
- 更新对应的维度模板文件
- 或创建新的领域维度模板

## 5.5 提交到GitHub（让经验不丢失）

归档完成后，必须将改动提交到Git仓库：

```bash
# 1. 查看变更
git status
git diff --stat

# 2. 暂存所有特征工程相关文件
git add skills/feature-engineering/
git add skills/self-improving-agent/memory/semantic-patterns.json
# 同步 .agents/ 目录（如果存在镜像）
git add .agents/skills/feature-engineering/
git add .agents/skills/self-improving-agent/memory/semantic-patterns.json

# 3. 提交
git commit -m "feat: archive {项目名} project experience + {N} new patterns"

# 4. 推送
git push origin main
```

**为什么这一步必须写进SKILL而不是靠记忆？**
- 归档的目的是让经验持久化——如果忘了commit/push，经验只存在本地，换台电脑就丢失
- Git commit message也是记忆的一部分——`git log` 可以追溯每次进化
- 这是"闭环的最后一环"：没有push的归档 = 没有归档

### 归档流程总结（Phase 5完整checklist）

```
□ 5.0 派进化师提炼（优势+错误+方法论）
□ 5.1 写入 project-archives/{项目}.json
□ 5.2 提取新模式到 semantic-patterns.json（去重）
□ 5.3 写入 episodic/ 方法论档案(.md) + 具体经历
□ 5.4 更新 dimension-templates/（如有新发现）
□ 5.5 git add → commit → push 到 GitHub
```

---

# 记忆系统说明

## 目录结构

```
skills/feature-engineering/
├── SKILL.md                          ← 本文件
├── memory/
│   ├── semantic-patterns.json        ← 跨项目抽象模式（16条）
│   ├── project-archives/             ← 项目级归档
│   │   └── 2026-04_MTN_MoMo.json
│   ├── episodic/                     ← 方法论档案 + 具体经历
│   │   ├── mtn-tld-transaction-flow.md  ← 交易流水类方法论
│   │   └── ...
│   └── dimension-templates/          ← 维度模板
│       ├── credit-risk-default.md
│       └── dimension-blank.md
├── templates/
│   ├── pre-flight-checklist.md       ← 必检清单
│   └── notebook-template.py
└── scripts/
```

## 三层记忆的关系

```
semantic-patterns.json    ← 抽象规则（"分母要保护"）
       ↑ 提炼自
project-archives/*.json   ← 项目全景（维度+错误+决策）
       ↑ 包含
episodic/*.json          ← 具体故事（"MTN第7轮发现SMS不存在"）
```

**新项目启动时读取顺序**: archives → semantic → episodic（由宏观到微观）

---

# 历史项目经验摘要

## MTN MoMo Advance（512特征，月度聚合数据）
> 来源：2026-04归档，10轮审查，45个错误

### 最严重的3个教训
1. **先验证后写** — SMS字段不存在、gsm_la_days无1m/3m/6m、gsm_uniq_out是bnum不是anum
2. **命名即契约** — bill_is_missing vs bill_pay_is_missing (11处), p2p_received vs p2p_recv (22处)
3. **跨层字段名必须一致** — L0输出与L2引用不匹配

### 最有价值的维度发现
- **稳定性 > 趋势性**：行为可预测性本身就是信用
- **缺失 ≠ 零**：53%空值率不是bug，"从未使用MoMo"是高信息量特征
- **集中度是套现信号**：conc = max/total > 0.8 意味着套现

## MTN TLD（708特征，交易流水数据）
> 来源：2026-04归档，7个Task，60处clip陷阱修复

### 最严重的3个教训
1. **clip陷阱** — `np.where(cond, -999, x/y).clip(0,100)` 把哨兵值-999截断为0。系统性BUG，60处。根因：没有在项目初期建立"哨兵值必须在最外层赋值"的规范
2. **BUG发现时机过晚** — 60处clip陷阱在最终审查才发现，如果Task 2完成后就有哨兵值扫描，可以提前3个Task发现
3. **子Agent可靠性** — 大规模代码修改(100+行)不应委托给子Agent，容易超时/空返回

### 最有价值的方法论发现
- **Flag×Window×Metric 三维笛卡尔积** = 特征数的核心放大器（31×8×2=496）
- **bincount预计算** = 替代248次groupby，O(248n)→O(n)
- **窗口间比率 > 单窗口值** — 趋势比绝对值更有区分力
- **HIGH/MID/LOW分级** — 基于频率×价值的窗口分配，控制特征膨胀

---

# Best Practices

## DO
- ✅ Phase 0做完才开始写特征
- ✅ 项目开始时先读记忆文件夹（Step 1: 加载历史记忆）
- ✅ 所有字段引用都从L0的feature_name列复制
- ✅ 每个比率特征都有显式的分母=0保护
- ✅ **先clip再填哨兵值**（`expr.clip(lo,hi).fillna(-999)` 或 `np.where(cond, -999, expr.clip(lo,hi))`）
- ✅ 每个Task完成后扫描哨兵值完整性（不要等到最终审查）
- ✅ 高空值率(>30%)域必须生成is_missing标志
- ✅ 多维度评分用加法，避免乘法一票否决
- ✅ 项目完结后执行归档流程（Phase 5）

## DON'T
- ❌ 假设数据字典100%准确（必须与df.columns交叉验证）
- ❌ `np.where(cond, -999, x).clip(0,100)` — 哨兵值会被截断（MTN TLD 60处BUG）
- ❌ 复制粘贴截断范围不检查语义（金额不能clip(-10,10)）
- ❌ 在null_handling列写"同上"（每行必须独立完整）
- ❌ 跳过Phase 0直接写公式（72%的错误可以预防）
- ❌ 把100+行的代码修改委托给子Agent（容易超时/空返回）
- ❌ 不做归档就结束项目（经验会丢失）
