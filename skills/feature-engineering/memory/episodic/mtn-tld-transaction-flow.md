# 项目档案：MTN TLD 交易流水特征工程（708特征）

> 来源项目：赞比亚MTN MoMo Advance TLD特征工程 (2026-04)
> 数据类型：USSD交易流水（11个字符串字段 → 708个衍生特征）
> 产品类型：移动钱包透支/预借现金（MoMo Advance）
> 文档目的：沉淀「交易流水类」特征工程的完整方法论和踩坑记录

---

## 一、5步思考框架

面对一个新的信贷风控特征工程任务，按以下顺序思考：

### Step 1：原始数据解剖（"有什么"）

对每个原始字段做5W分析：

| 思考维度 | 关键问题 | 本项目实例 |
|----------|----------|------------|
| 谁(Who) | 有哪些实体标识？ | msisdn(用户)、other_profile_type(对手方) |
| 什么(What) | 事件有哪些类型？ | 9种transaction_type、CREDIT/DEBIT方向 |
| 何时(When) | 时间精度和跨度？ | ISO8601时间戳，66天demo窗口 |
| 多少(How much) | 金额字段的范围？ | amount、account_balance_before/after |
| 哪里(Where) | 渠道/地理信息？ | 10种transaction_channel → 6组映射 |

**要点：**
- 不要急于构造特征，先花30%时间彻底理解每个字段的业务含义、取值分布、缺失率
- 缺失率本身是特征：本项目对手方缺失率15.3%，"缺失"变成了最有价值的特征之一
- 所有字段值都是字符串 → 第一步必须做类型转换

### Step 2：Flag体系构建（"怎么拆"）

将类别字段和连续字段拆解为布尔标志，flag是连接"原始数据"和"聚合特征"的桥梁。

**拆解方向：**
```
原始字段                    → Flag拆解
─────────────────────────────────────────────
transaction_type(9种)       → is_cashin, is_cashout, is_p2p_credit, is_p2p_debit...
transaction_description     → is_credit, is_debit
transaction_channel(10种)   → is_ussd, is_app, is_pg, is_sp... (6组映射)
other_profile_type          → is_merchant, is_subscriber, is_agent, is_counterparty_missing
account_balance_after       → is_overdraft(bal<0), is_low_balance(bal<50), is_zero_balance(bal=0)
transaction_date            → is_night(22-06), is_weekend, is_working_hour(8-18)
业务逻辑组合                 → is_loan_txn, is_loan_repay, is_loan_debt, is_loan_prov, is_payment_send
```

**Flag设计三原则：**
- **完备性：** 每个有业务意义的子集都能被某个flag捕获
- **正交性：** flag之间不应是简单的逻辑等价
- **稀疏性感知：** 极稀疏的flag（如is_loan_prov仅10笔）应降级处理

本项目：31个flags

### Step 3：窗口分级设计（"看多远"）

基于事件频率和信息价值，为每类flag分配时间窗口。

**频率×价值二维矩阵：**
```
                信息价值
           低        中        高
      ┌─────────┬─────────┬─────────┐
  高  │ MID×5   │ HIGH×8  │ HIGH×8  │  ← 8窗口(3d~full完整覆盖)
频    │         │         │         │
率    ├─────────┼─────────┼─────────┤
      │ LOW×2   │ MID×5   │ HIGH×8  │  ← 5窗口(省3d/14d)
  中  │         │         │         │
      ├─────────┼─────────┼─────────┤
      │  不做   │ LOW×2   │ MID×5   │  ← 2窗口(仅90d/full)
  低  │         │         │         │
      └─────────┴─────────┴─────────┘
```

**窗口长度的业务含义：**

| 窗口 | 长度 | 业务含义 | 为什么需要 |
|------|------|----------|-----------|
| 3d | 3天 | 即时行为 | 捕捉突然的变化 |
| 7d | 7天 | 一周周期 | 消除周末效应 |
| 14d | 14天 | 双周趋势 | 两周收入消费周期 |
| 30d | 30天 | 自然月 | **信贷风控标准窗口**，对应账单周期 |
| 60d | 60天 | 双月平滑 | 减少单月波动 |
| 90d | 90天 | 季度 | **巴塞尔协议标准观察期** |
| 180d | 180天 | 半年 | 长期行为稳定性 |
| full | 全量 | 终身画像 | lifetime价值评估 |

**关键原则：** 窗口间比率 > 单窗口值（`income_30d_90d_ratio` 比 `income_30d` 更有区分力）

### Step 4：聚合指标选择（"怎么算"）

聚合指标层次（信息量递增、计算成本递增）：

```
L0基础 → cnt(计数), amt(金额求和)         ← 可用bincount高效实现
L1派生 → mean(=amt/cnt), median, std      ← 需要groupby计算
L2比率 → pct(=cnt_A/cnt_total), ratio     ← 需要两个基础特征
L2趋势 → OLS斜率, 窗口间动量              ← 需要时序数据
L2分布 → 熵, HHI, 偏度/峰度               ← 需要完整序列
```

### Step 5：领域模块+跨域交叉（"拼成什么图"）

将特征组织为业务领域模块，再跨域组合：

| 模块 | 关注点 | 关键特征类型 |
|------|--------|-------------|
| A_活跃 | 用户是否活跃 | recency, 活跃天数, 连续活跃/沉默 |
| B_收支 | 钱从哪来到哪去 | 收支金额, 净现金流, 覆盖率 |
| C_消费 | 花钱的方式 | 消费集中度, 大额消费, 冲动消费 |
| D_社交 | 和谁交易 | P2P方向, 对手方多样性 |
| F_渠道 | 通过什么渠道 | 渠道偏好, 数字素养 |
| L_透支 | 余额是否透支 | 透支深度, 持续性, 恢复能力 |
| R_风险 | 风险信号汇总 | 余额波动, 余额状态转换 |
| T_时间 | 什么时候交易 | 时间分布, 交易间隔, 周期性 |
| Loan_信贷 | 信贷行为 | 还款意愿, 催收深度, 类型递进 |

---

## 二、核心放大器：Flag×Window×Metric 三维笛卡尔积

```
31个flags × 8个窗口 × 2个指标(cnt+amt) = 496个基础组合
```

这是从11个字段到708个特征的最核心放大机制。

### 6种可复用映射模式（信息量递增）

| 模式 | 公式模板 | 信息量 | 实例 |
|------|----------|:------:|------|
| 过滤聚合 | `df[flag].groupby(uid)[field].agg(metric)` | ★★ | credit_cnt_30d |
| 占比 | `cnt_A / cnt_total` | ★★★ | cashin_pct, night_pct |
| 比率 | `metric_A / metric_B` | ★★★★ | cashflow_coverage |
| **窗口间动量** | `short_window / long_window` | ★★★★★ | income_30d_90d_ratio |
| **时序趋势** | `OLS(values ~ time)` | ★★★★★ | income_trend_slope |
| **行为组合** | `交叉条件 → 计数` | ★★★★★ | night_cashout_flag |

**核心洞察：** 简单的过滤聚合(cnt/amt)覆盖了大部分基础信息，但真正有区分力的往往是比率、趋势和交叉组合。

---

## 三、8个正交维度（MECE拆解）

```
├─ 时间维度 ─── 窗口(3d~full) / 时段(深夜/周末/工作日) / 节奏(间隔) / 趋势(OLS)
├─ 方向维度 ─── 收入(CREDIT) / 支出(DEBIT) / 子方向(cashin/cashout/p2p...)
├─ 金额维度 ─── 总量(cnt/amt) / 分布(mean/median/std/CV) / 极值 / 集中度(HHI)
├─ 对象维度 ─── 对手方类型 / 渠道类型 / 多样性(nunique/熵)
├─ 频率维度 ─── 交易笔数 / 活跃天数 / 规律性(频率CV)
├─ 状态维度 ─── 余额状态 / 信贷状态 / 状态转换
├─ 行为维度 ─── 习惯(时间偏好) / 异常(爆发交易) / 心理(冲动/拖延)
└─ 结构维度 ─── 收支比 / 净现金流方向 / 消费结构占比
```

**MECE自检：** 对每个flag问——在每个窗口里算cnt和amt了吗？算占比了吗？用比率关联了吗？捕捉趋势了吗？4个"是"=MECE覆盖。

---

## 四、高级特征选用决策树

```
你想了解什么？
│
├─ 趋势方向？ → OLS斜率（np.polyfit(x, y, 1)[0]）
│   前提：≥3个数据点（建议≥7）
│
├─ 多样性/分散度？ → Shannon熵（-Σp·log(p)）
│   优势：不受类别数量影响，可直接比较
│
├─ 时序可预测性？
│   ├─ 简单 → 自相关系数（autocorr(lag=1)）
│   ├─ 中等 → 排列熵（Permutation Entropy, d=3）
│   └─ 复杂 → Sample熵（SampEn, m=2, r=0.2σ）
│   前提：≥10个数据点
│
├─ 周期性？ → FFT主频幅值
│   前提：≥14天数据
│
├─ 状态惯性？ → Markov转移矩阵对角线占比
│   简化版：(s[t]==s[t+1])的占比
│
├─ 波动程度？
│   ├─ 相对波动 → CV（std/mean）
│   ├─ 绝对波动 → std
│   └─ 极端波动 → (max-min)/std
│
└─ 行为异常？
    ├─ 爆发交易 → 短时间内大额高频
    ├─ 大额突变 → |pct_change| > 3σ
    └─ 冲动消费 → 大额入账后48h内消费率
```

**使用原则：**
1. 最小数据量要求硬编码：`<3天→-999`、`<10笔→-999`
2. 学术灵感→工程实现需简化（Edinburgh→连续相同余额最长次数）
3. 每个高级特征都需要clip防极端值

---

## 五、8个思维陷阱

| # | 陷阱 | 后果 | 解法 |
|---|------|------|------|
| 1 | 只算总量不算结构 | 高风险和低风险用户看起来一样 | 每个flag的占比+集中度+结构比 |
| 2 | 只看静态不看动态 | 恶化趋势被忽略 | 窗口间比率+OLS斜率+衰减率 |
| 3 | 把缺失当噪声不当信号 | 丢失最有信息量的特征 | 缺失编码为独立flag |
| 4 | 哨兵值不一致 | 模型无法区分"0次"和"无数据" | 统一-999表示无数据 |
| 5 | 窗口膨胀不加控制 | 计算爆炸+高度冗余 | HIGH/MID/LOW三级分配 |
| 6 | 学术特征不接地气 | 假设不适用实际场景 | woe_direction标unknown，IV决定取舍 |
| 7 | **忽视分母为0** | 产生inf/NaN污染全局 | `np.where(denom>0, num/denom, -999)` |
| 8 | **np.where+clip陷阱** | -999哨兵值被截断为0 | 先clip再填哨兵值，或全程np.nan最后fillna |

### 陷阱8详细说明（本项目最大系统性BUG）

```python
# ❌ 错误模式（本项目发生60处）
np.where(cond, -999, x/y).clip(0, 100)
# cond=True时结果为-999，但clip(0,100)把-999截断为0！

# ✅ 正确模式1：np.where在内层
np.where(cond, -999, (x/y).clip(0, 100))

# ✅ 正确模式2：全程nan，最后fillna
result = (x/y).clip(0, 100)
result[cond] = -999  # 或 result.fillna(-999)
```

**根因：** 没有在项目初期建立"哨兵值必须在最外层赋值"的编码规范。

---

## 六、可复用Checklist

### Phase 0：数据理解
```
□ 原始字段列表：共____个字段
□ 每个字段的类型、取值范围、缺失率已记录
□ 数据时间跨度：____天
□ 用户数：____人
□ 事件频率分布（中位数用户每天____笔）
□ 目标变量是什么？
```

### Phase 1：Flag体系
```
□ 交易方向flag：is_credit, is_debit
□ 交易类型flag：is_{type}（每种类型）
□ 渠道flag：is_{channel}
□ 对手方flag：is_{counterparty_type}
□ 时间flag：is_night, is_weekend, is_working_hour
□ 余额状态flag：is_overdraft, is_low_balance, is_zero_balance
□ 业务特殊flag：is_loan_repay, is_loan_debt等
□ 组合flag：is_p2p = is_p2p_credit OR is_p2p_debit
□ Flag总数：____个
□ 每个flag的事件频率已评估
```

### Phase 2：窗口设计
```
□ HIGH/MID/LOW分级已确定
□ 短期(3d/7d) + 中期(30d/60d) + 长期(90d/180d) + full已定义
□ 数据覆盖天数是否足够（<90天时90d≈full需标注）
```

### Phase 3：基础聚合(L1)
```
□ 每个flag×窗口的cnt和amt
□ Recency特征
□ 活跃天数/活跃占比
□ mean/median/std（核心flag）
□ 哨兵值统一为-999
□ NaN检查：0 NaN
```

### Phase 4：进阶特征(L2)
```
□ 比率类：收支比、覆盖率、结构占比
□ 趋势类：OLS斜率、窗口间动量、衰减率
□ 分布类：熵、HHI、偏度/峰度、分位比
□ 时序类：自相关、FFT、状态持续性
□ 行为类：爆发检测、冲动消费率
□ 每个特征的clip范围已设定
□ 每个特征的null_handling已定义
```

### Phase 5：验证（交付前）
```
□ 特征数正确
□ 0 NaN
□ 哨兵值统一为-999
□ 无clip陷阱（自动化扫描通过）
□ 命名规范一致
□ E2E测试通过
□ 业务合理性抽检
```

---

## 七、技术决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 哨兵值 | -999 | 区分"值为0"和"无数据"，与clip(0,100)不冲突需注意 |
| 外部依赖 | 不引入scipy/tsfresh | 生产环境依赖控制，自实现sample_entropy/OLS/skewness/kurtosis |
| 聚合引擎 | np.bincount预计算 | O(248n)→O(n)，比248次groupby快10-50倍 |
| 用户级计算 | user_dfs字典预拆分 | 替代groupby.apply，17ms→3ms/次 |
| O(n²)算法截断 | 取最近500条 | Sample Entropy等算法在n>500时收敛 |
| 部署模式 | 单用户调用 | 生产环境约束 |
