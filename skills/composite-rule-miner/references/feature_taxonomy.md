# 特征分类参考模板

> **用途**: 按项目实际情况填写此模板，帮助 Skill 理解特征的业务含义和风险方向
> **用法**: 将本文件复制一份，按项目的实际特征体系填写，保存为项目专属版本

---

## 一、特征维度分类

### 1. 金融交易行为（Financial Transaction）

| 特征模式 | 示例 | 风险方向 | 业务含义 |
|---------|------|---------|---------|
| `{业务}_amt_{窗口}` | payment_amt_3m | 金额越高风险越低（正常经济活动） | 窗口期内交易金额 |
| `{业务}_qty_{窗口}` | deposit_qty_3m | 频次越高风险越低（活跃用户） | 窗口期内交易次数 |
| `{业务}_max_amt_{窗口}` | payment_max_amt_1m | 最大单笔金额 | 窗口期内最大单笔交易 |
| `{业务}_avg_amt_{窗口}` | transfer_avg_amt_6m | 平均单笔金额 | 窗口期内平均交易金额 |
| `{业务}_uniq_{对象}_qty_{窗口}` | payment_uniq_acceptors_qty_6m | 对象越多风险越低（经济网络广） | 窗口期内不同交易对象数 |

**常见业务类型**: deposit（存款）、withdrawal（取款）、payment（支付/还款）、transfer（转账）、bill_payment（账单支付）、p2p（P2P转账）

**关键时间窗口**: 1m（近1月）、3m（近3月）、6m（近6月）、12m（近12月）

### 2. 通信行为（Telecom / Communication）

| 特征模式 | 示例 | 风险方向 | 业务含义 |
|---------|------|---------|---------|
| `gsm_out_calls_qty_{窗口}` | gsm_out_calls_qty_6m | ⚠️ 方向不稳定，需验证 | 外呼次数 |
| `gsm_in_calls_qty_{窗口}` | gsm_in_calls_qty_6m | ⚠️ 方向不稳定 | 来电次数 |
| `gsm_out_calls_duration_{窗口}` | gsm_out_calls_duration_3m | 通话时长 | 外呼总时长 |
| `gsm_nrd` | gsm_nrd | 最近通话日期，需转天数 | 网络注册日期/最近活跃日期 |
| `gsm_{业务}_uniq_{对象}_qty_{窗口}` | gsm_out_calls_uniq_cnt_qty_6m | 联系人数量 | 不同联系人数 |

**⚠️ 重要提醒**: 通信特征（通话量、短信量）的风险方向**因场景而异**：
- 通话多可能是做生意（低风险），也可能是推销/诈骗（高风险）
- **不可作为主要风险信号**，仅作辅助"活跃度确认"
- 使用前**必须**做分段坏账率验证

### 3. 账户状态（Account Status）

| 特征模式 | 示例 | 风险方向 | 业务含义 |
|---------|------|---------|---------|
| `{业务}_balance` | momo_balance | 余额越高风险越低（但有资金不动型例外） | 当前账户余额 |
| `{业务}_tenure` | account_tenure_days | 时间越长风险越低 | 开户时长 |
| `{业务}_status` | account_status | 账户状态 | 正常/冻结/关闭 |
| `days_since_last_{行为}` | days_since_last_login | 距上次行为天数 | 活跃度指标 |

### 4. 人口统计（Demographics）

| 特征模式 | 示例 | 风险方向 | 业务含义 |
|---------|------|---------|---------|
| `age` / `age_at_{event}` | age_at_application | 年龄 | 非线性，通常U型 |
| `gender` | gender | 性别 | 因场景而异 |
| `region` / `province` | region_code | 地区 | 区域风险差异 |

---

## 二、风险画像设计参考

基于上述特征维度，以下是常见的风险画像模式：

### 画像 A: 行为恶化型
**核心逻辑**: 曾经正常但近期骤降
**设计方法**: 比较不同时间窗口的同一指标
**示例规则**: `{feature}_6m > X and {feature}_3m <= Y`（6个月水平高但近3个月骤降）

### 画像 B: 有能力无意愿型
**核心逻辑**: 有收入/存款但不还款
**设计方法**: 收入指标高 + 还款指标低
**示例规则**: `{income_feature} > X and {payment_feature} <= Y`

### 画像 C: 经济网络窄型
**核心逻辑**: 交易对象极少，经济活动单一
**设计方法**: uniq_acceptors/contacts 类指标低
**示例规则**: `{uniq_acceptors}_6m <= X and {activity_feature} > Y`

### 画像 D: 资金流出型
**核心逻辑**: 只取不存/只花不赚
**设计方法**: withdrawal高 + deposit低
**示例规则**: `{withdrawal_feature} > X and {deposit_feature} <= Y`

### 画像 E: 长期缺失型
**核心逻辑**: 某类关键金融行为长期为零
**设计方法**: 关键行为指标 = 0 或极低
**示例规则**: `{key_feature}_6m <= X`（极低值）

---

## 三、方向性验证清单

在构建规则前，对以下类型的特征**必须**做分段坏账率分析：

| 特征类型 | 验证方法 | 风险方向假设 | 需确认 |
|---------|---------|-------------|--------|
| 金额类 | 按 [0, P25, P50, P75, max] 分段 | 越高越安全 | □ |
| 频次类 | 按 [0, P25, P50, P75, max] 分段 | 越高越安全 | □ |
| 通信类 | 按 [0, P25, P50, P75, max] 分段 | ⚠️ 不确定 | □ |
| 余额类 | 按 [0, P25, P50, P75, max] 分段 | ⚠️ 不确定 | □ |
| 时长/日期类 | 转为天数后再分段 | 越长越安全 | □ |

**验证代码模板**:
```python
import numpy as np

def verify_direction(df, feature, target='y', bins=None):
    """分段验证特征与坏账率的关系"""
    if bins is None:
        bins = [df[feature].min(), df[feature].quantile(0.25), 
                df[feature].quantile(0.5), df[feature].quantile(0.75), 
                df[feature].max() + 1]
    
    for i in range(len(bins) - 1):
        low, high = bins[i], bins[i+1]
        mask = (df[feature] > low) & (df[feature] <= high)
        if mask.sum() > 0:
            rate = df.loc[mask, target].mean()
            print(f"  ({low:.1f}, {high:.1f}]: n={mask.sum()}, 坏账率={rate:.2%}")
        else:
            print(f"  ({low:.1f}, {high:.1f}]: n=0")
```

---

## 四、项目适配记录

> **每次使用此模板时，在此记录适配信息**

| 项目 | 数据来源 | 关键维度 | 主要画像 | 日期 |
|------|---------|---------|---------|------|
| MTN首贷风险 | 通信+移动支付 | 金融交易+通信行为+账户余额 | 骤降型+有钱不付型+网络窄型 | 2026-04-22 |
| （待填写） | （待填写） | （待填写） | （待填写） | （待填写） |
