"""
复合拦截规则搜索脚本（通用模板）
=================================
用途：从规则池（Excel）中搜索最优 2-3 条组合拦截规则
用法：修改顶部「配置区」后直接运行

输出：
  1. 每个组合的 Train/OOT 验证表格
  2. 规则间重叠率
  3. 按综合得分排序的结果

版本: V1.0 | 2026-04-22
"""

import pandas as pd
import numpy as np
from itertools import combinations

# ============================================================
#                       配置区（必改）
# ============================================================

# --- 文件路径 ---
RULE_EXCEL = ""          # 规则挖掘结果 Excel 路径
TRAIN_CSV  = ""          # 训练集 CSV 路径
OOT_CSV    = ""          # OOT 集 CSV 路径
DATA_DICT  = ""          # 数据字典路径（可选，留空则跳过）

# --- 列名 ---
RULE_COL    = "rule_logic"   # 规则表达式所在列
TARGET_COL  = "y"            # 目标变量列（1=坏客户）

# --- 搜索参数 ---
N_RULES          = 3          # 组合规则数量（2 或 3）
COVERAGE_MIN     = 0.10      # 组合覆盖率下限
COVERAGE_MAX     = 0.20      # 组合覆盖率上限
MIN_LIFT         = 1.05      # OOT 最小 lift
MAX_PREC_DIFF    = 0.07      # precision 差异上限（train vs oot）
MAX_COV_DIFF     = 0.06      # coverage 差异上限（train vs oot）
MIN_SINGLE_COV   = 0.03      # 单条规则最小覆盖率
MIN_SINGLE_LIFT  = 1.05      # 单条规则最小 OOT lift

# --- 手工规则（可选，用项目实际规则替换引号内内容）---
# 留空列表 [] 则仅使用 Excel 中的规则
# 示例格式：与 DataFrame.query() 兼容的表达式
MANUAL_RULES = [
    # 示例（请替换为实际规则）:
    # '`feature_a_6m` > 300 and `feature_a_3m` <= 310',
    # '`feature_b_1m` <= 60 and `feature_c_3m` > 480',
    # '`feature_d_6m` <= 8 and `feature_e_6m` > 700',
]

# --- 数据字典列名（如有）---
DICT_FEATURE_COL = "feature_name"   # 特征名列
DICT_MEANING_COL = "meaning"        # 含义列

# ============================================================
#                       核心逻辑（一般不需修改）
# ============================================================

def load_data():
    """加载训练集、OOT集和规则池"""
    print("=" * 60)
    print("加载数据...")
    
    df_train = pd.read_csv(TRAIN_CSV)
    df_oot   = pd.read_csv(OOT_CSV)
    
    print(f"  Train: {len(df_train)} 行, 坏账率={df_train[TARGET_COL].mean():.2%}")
    print(f"  OOT:   {len(df_oot)} 行, 坏账率={df_oot[TARGET_COL].mean():.2%}")
    
    # 加载规则池
    rules_df = pd.read_excel(RULE_EXCEL)
    pool_rules = rules_df[RULE_COL].dropna().unique().tolist()
    
    # 合并手工规则
    all_rules = list(MANUAL_RULES) + pool_rules
    print(f"  规则池: Excel={len(pool_rules)}条, 手工={len(MANUAL_RULES)}条, 合计={len(all_rules)}条")
    
    return df_train, df_oot, all_rules


def validate_single_rule(rule, df, target_col=TARGET_COL):
    """验证单条规则在数据集上的表现"""
    try:
        mask = df.query(rule).index
        n = len(mask)
        if n == 0:
            return None
        
        coverage = n / len(df)
        precision = df.loc[mask, target_col].mean()
        overall_bad_rate = df[target_col].mean()
        lift = precision / overall_bad_rate if overall_bad_rate > 0 else 0
        
        return {
            'n': n,
            'coverage': coverage,
            'precision': precision,
            'lift': lift,
            'mask': set(mask)
        }
    except Exception as e:
        return None


def prefilter_rules(df_train, df_oot, rules):
    """预筛选：过滤掉单条表现不达标的规则"""
    print("\n" + "=" * 60)
    print("Phase 1: 预筛选规则...")
    
    passed = []
    for i, rule in enumerate(rules):
        train_r = validate_single_rule(rule, df_train)
        oot_r   = validate_single_rule(rule, df_oot)
        
        if train_r is None or oot_r is None:
            continue
        
        # 硬性约束
        if train_r['coverage'] < MIN_SINGLE_COV:
            continue
        if oot_r['lift'] < MIN_SINGLE_LIFT:
            continue
        if abs(train_r['precision'] - oot_r['precision']) > MAX_PREC_DIFF:
            continue
        if abs(train_r['coverage'] - oot_r['coverage']) > MAX_COV_DIFF:
            continue
        
        passed.append({
            'rule': rule,
            'train_coverage': train_r['coverage'],
            'train_precision': train_r['precision'],
            'train_lift': train_r['lift'],
            'oot_coverage': oot_r['coverage'],
            'oot_precision': oot_r['precision'],
            'oot_lift': oot_r['lift'],
            'train_mask': train_r['mask'],
            'oot_mask': oot_r['mask'],
        })
    
    print(f"  通过预筛选: {len(passed)}/{len(rules)} 条")
    return passed


def search_combinations(passed_rules, df_train, df_oot):
    """搜索最优组合"""
    print("\n" + "=" * 60)
    print(f"Phase 2: 搜索 C({len(passed_rules)}, {N_RULES}) 种组合...")
    
    n_total = len(list(combinations(range(len(passed_rules)), N_RULES)))
    print(f"  总组合数: {n_total}")
    
    overall_bad_train = df_train[TARGET_COL].mean()
    overall_bad_oot   = df_oot[TARGET_COL].mean()
    
    results = []
    
    for combo in combinations(range(len(passed_rules)), N_RULES):
        rules_in_combo = [passed_rules[i] for i in combo]
        
        # OR 合并
        train_union = set()
        oot_union   = set()
        for r in rules_in_combo:
            train_union |= r['train_mask']
            oot_union   |= r['oot_mask']
        
        # Train 指标
        train_cov = len(train_union) / len(df_train)
        train_prec = df_train.loc[list(train_union), TARGET_COL].mean() if train_union else 0
        train_lift = train_prec / overall_bad_train if overall_bad_train > 0 else 0
        train_recall = len(set(df_train[df_train[TARGET_COL]==1].index) & train_union) / max(df_train[TARGET_COL].sum(), 1)
        
        # OOT 指标
        oot_cov = len(oot_union) / len(df_oot)
        oot_prec = df_oot.loc[list(oot_union), TARGET_COL].mean() if oot_union else 0
        oot_lift = oot_prec / overall_bad_oot if overall_bad_oot > 0 else 0
        oot_recall = len(set(df_oot[df_oot[TARGET_COL]==1].index) & oot_union) / max(df_oot[TARGET_COL].sum(), 1)
        
        # 稳定性
        prec_diff = abs(train_prec - oot_prec)
        cov_diff  = abs(train_cov - oot_cov)
        
        # 重叠率
        individual_hits = sum(len(r['oot_mask']) for r in rules_in_combo)
        overlap_rate = 1 - len(oot_union) / individual_hits if individual_hits > 0 else 0
        
        # 过滤
        if not (COVERAGE_MIN <= oot_cov <= COVERAGE_MAX):
            continue
        if oot_lift < MIN_LIFT:
            continue
        if prec_diff > MAX_PREC_DIFF:
            continue
        if cov_diff > MAX_COV_DIFF:
            continue
        
        # 综合得分
        stability = prec_diff + cov_diff
        score = oot_recall - 2 * stability
        
        results.append({
            'rules': [r['rule'] for r in rules_in_combo],
            'train_coverage': train_cov,
            'train_precision': train_prec,
            'train_lift': train_lift,
            'train_recall': train_recall,
            'oot_coverage': oot_cov,
            'oot_precision': oot_prec,
            'oot_lift': oot_lift,
            'oot_recall': oot_recall,
            'prec_diff': prec_diff,
            'cov_diff': cov_diff,
            'overlap_rate': overlap_rate,
            'score': score,
        })
    
    print(f"  通过约束的组合: {len(results)}")
    
    # 按 score 降序排列
    results.sort(key=lambda x: x['score'], reverse=True)
    return results


def print_top_results(results, top_n=5):
    """打印 Top N 结果"""
    print("\n" + "=" * 60)
    print(f"Phase 3: Top {top_n} 结果\n")
    
    for rank, r in enumerate(results[:top_n], 1):
        print(f"{'─'*50}")
        print(f"方案 #{rank} | Score={r['score']:.4f}")
        print()
        
        for i, rule in enumerate(r['rules'], 1):
            print(f"  规则{i}: {rule}")
        
        print()
        print(f"  {'指标':<12} {'Train':>8} {'OOT':>8} {'差异':>8}")
        print(f"  {'-'*40}")
        print(f"  {'Coverage':<12} {r['train_coverage']:>8.2%} {r['oot_coverage']:>8.2%} {abs(r['train_coverage']-r['oot_coverage']):>8.2%}")
        print(f"  {'Precision':<12} {r['train_precision']:>8.2%} {r['oot_precision']:>8.2%} {r['prec_diff']:>8.2%}")
        print(f"  {'Recall':<12} {r['train_recall']:>8.2%} {r['oot_recall']:>8.2%}")
        print(f"  {'Lift':<12} {r['train_lift']:>8.2f} {r['oot_lift']:>8.2f}")
        print(f"  {'重叠率':<12} {r['overlap_rate']:>8.1%}")
        print()

    if results:
        best = results[0]
        print("=" * 60)
        print("推荐方案代码块（可直接复制）:")
        print()
        lines = []
        for i, rule in enumerate(best['rules'], 1):
            var = f"query_risk_{i}"
            print(f"  {var} = '{rule}'")
            lines.append(var)
        
        combined = " | ".join([f"({v})" for v in lines])
        print(f"  query_bad = f\"{combined}\"")
        print()


def verify_direction(df, feature, target=TARGET_COL, n_bins=5):
    """
    验证特征与坏账率的方向性关系
    在构建规则前，对关键特征调用此函数确认方向
    """
    print(f"\n方向性验证: {feature}")
    
    if df[feature].nunique() <= n_bins:
        for val in sorted(df[feature].unique()):
            mask = df[feature] == val
            rate = df.loc[mask, target].mean()
            print(f"  = {val}: n={mask.sum()}, 坏账率={rate:.2%}")
    else:
        try:
            bins = pd.qcut(df[feature], q=n_bins, duplicates='drop')
            for interval in bins.categories:
                mask = bins == interval
                rate = df.loc[mask, target].mean()
                print(f"  {interval}: n={mask.sum()}, 坏账率={rate:.2%}")
        except Exception:
            # fallback: 等间距
            low, high = df[feature].min(), df[feature].max()
            step = (high - low) / n_bins
            for i in range(n_bins):
                l, h = low + i * step, low + (i+1) * step
                mask = (df[feature] > l) & (df[feature] <= h)
                if mask.sum() > 0:
                    rate = df.loc[mask, target].mean()
                    print(f"  ({l:.1f}, {h:.1f}]: n={mask.sum()}, 坏账率={rate:.2%}")


# ============================================================
#                          主流程
# ============================================================

if __name__ == "__main__":
    # 1. 加载数据
    df_train, df_oot, all_rules = load_data()
    
    # 2. 预筛选
    passed = prefilter_rules(df_train, df_oot, all_rules)
    
    if len(passed) < N_RULES:
        print(f"\n⚠️ 通过预筛选的规则不足 {N_RULES} 条，无法组合")
        print("建议: 放宽 MIN_SINGLE_COV / MIN_SINGLE_LIFT / MAX_PREC_DIFF 等参数")
        exit(1)
    
    # 3. 组合搜索
    results = search_combinations(passed, df_train, df_oot)
    
    if not results:
        print("\n⚠️ 没有组合通过所有约束")
        print("建议: 放宽 COVERAGE_MIN / COVERAGE_MAX / MIN_LIFT 等参数")
        exit(1)
    
    # 4. 输出 Top 结果
    print_top_results(results)
    
    # 5. 对最佳方案的关键特征做方向性验证（需手动取消注释并填写特征名）
    # best = results[0]
    # for rule in best['rules']:
    #     # 提取特征名并验证
    #     import re
    #     features = re.findall(r'`(\w+)`', rule)
    #     for feat in features:
    #         verify_direction(df_train, feat)
