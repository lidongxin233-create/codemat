import { KNOWLEDGE_GRAPH, KP_MAP } from '../data/knowledge';
import type { HintLevel, MasteryState, VariantExercise } from '../types';

/** 简化 BKT 参数（技术文档 4.9）。提示层级越高，学习增益越低。 */
const P_TRANSIT = 0.28;
const P_GUESS = 0.14;
const P_SLIP = 0.10;

export function initialMastery(): MasteryState {
  return Object.fromEntries(KNOWLEDGE_GRAPH.map((k) => [k.id, k.pInit]));
}

/**
 * 贝叶斯更新：
 *  - 观察到的作答正确率由「提示层级」折算（L0 独立=1.0，L4 参考实现=0.25）
 *  - 先按 BKT 后验公式更新，再叠加一次学习转移
 */
export function updateMastery(
  state: MasteryState,
  kpId: string,
  passed: boolean,
  hintLevel: HintLevel,
): { next: MasteryState; delta: number } {
  const prior = state[kpId] ?? KP_MAP[kpId]?.pInit ?? 0.3;
  const assistance = [1, 0.8, 0.62, 0.42, 0.25][hintLevel] ?? 1;
  const pCorrect = passed
    ? prior * (1 - P_SLIP) + (1 - prior) * P_GUESS
    : prior * P_SLIP + (1 - prior) * (1 - P_GUESS);
  let posterior = passed
    ? (prior * (1 - P_SLIP)) / Math.max(pCorrect, 1e-6)
    : (prior * P_SLIP) / Math.max(pCorrect, 1e-6);
  posterior = Math.max(0, Math.min(1, posterior));
  // 学习转移：只有在「自己走到的」层级上才产生真实增益
  const learned = posterior + (1 - posterior) * P_TRANSIT * assistance;
  const value = Math.max(0, Math.min(1, learned));
  return { next: { ...state, [kpId]: value }, delta: value - prior };
}

/** 自适应路径：优先低掌握度、先修已达标、难度带邻近的知识点 */
export function pickNextKnowledge(state: MasteryState, currentId: string): string {
  const cur = KP_MAP[currentId];
  const candidates = KNOWLEDGE_GRAPH.filter((k) => {
    if (k.id === currentId) return false;
    const prereqOk = k.prereq.every((p) => (state[p] ?? 0) >= 0.5);
    const sameDomain = cur ? k.domain === cur.domain : true;
    return prereqOk && (sameDomain || k.difficulty <= 2);
  });
  if (!candidates.length) return currentId;
  candidates.sort((a, b) => (state[a.id] ?? 0) - (state[b.id] ?? 0));
  return candidates[0].id;
}

const VARIANT_BANK: Record<string, Omit<VariantExercise, 'id' | 'kpId' | 'difficulty'>> = {
  kp_index: {
    title: '变式练习 · 统计及格人数',
    statement: '写一个函数 count_pass(scores)，返回列表中 >= 60 的元素个数。注意列表可能为空。',
    starterCode: `def count_pass(scores):
    # 在这里写你的代码
    pass`,
    hiddenConcept: '遍历边界与列表下标',
  },
  kp_type: {
    title: '变式练习 · 拼接成绩单',
    statement: '写函数 label(name, score)，返回「姓名(分数)」格式的字符串，例如 "小明(95)"。',
    starterCode: `def label(name, score):
    # 在这里写你的代码
    pass`,
    hiddenConcept: '类型转换与字符串格式化',
  },
  kp_indent: {
    title: '变式练习 · 判断奇偶数',
    statement: '写函数 parity(n)，偶数返回 "even"，奇数返回 "odd"。注意冒号与缩进。',
    starterCode: `def parity(n):
    # 在这里写你的代码
    pass`,
    hiddenConcept: '冒号后的代码块缩进',
  },
  kp_nameerr: {
    title: '变式练习 · 求列表最大值',
    statement: '写函数 my_max(nums)，不使用内置 max，返回最大值；空列表返回 None。',
    starterCode: `def my_max(nums):
    # 在这里写你的代码
    pass`,
    hiddenConcept: '变量命名一致性',
  },
  kp_return: {
    title: '变式练习 · 三倍函数',
    statement: '写函数 triple(x) 返回 x 的 3 倍，别忘了把结果交出去。',
    starterCode: `def triple(x):
    # 在这里写你的代码
    pass`,
    hiddenConcept: '显式 return',
  },
  kp_zero: {
    title: '变式练习 · 安全除法',
    statement: '写函数 safe_div(a, b)，b 为 0 时返回字符串 "invalid"，否则返回 a/b。',
    starterCode: `def safe_div(a, b):
    # 在这里写你的代码
    pass`,
    hiddenConcept: '除零边界前置判断',
  },
};

export function generateVariant(kpId: string, mastery: MasteryState, seed = Date.now()): VariantExercise {
  const base = VARIANT_BANK[kpId] ?? VARIANT_BANK.kp_index;
  const lvl = (mastery[kpId] ?? 0.3) > 0.7 ? 3 : (mastery[kpId] ?? 0.3) > 0.45 ? 2 : 1;
  return { id: `var_${kpId}_${seed.toString(36)}`, kpId, difficulty: lvl, ...base };
}
