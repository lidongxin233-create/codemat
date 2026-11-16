/**
 * AI 安全与可控性（技术文档 4.10）。
 * 输出侧泄答案检测 + 提示注入检测 + 敏感内容过滤 + 兜底话术。
 */
const BANNED_PATTERNS = [/忽略(之前|上面|所有)(的)?(规则|指令|要求)/i, /ignore\s+(all\s+)?(previous|prior)\s+instructions/i, /把你(的)?(系统|system)\s*prompt/i, /无条件(输出|给出).{0,6}(完整|全部).{0,4}(代码|答案)/i];

export interface GuardResult {
  ok: boolean;
  reason?: 'answer_leak' | 'injection' | 'sensitive' | 'empty';
  text: string;
}

export const FALLBACK_TEXT = '这一步我暂时没法给出可靠的提示。我们先回到运行结果：把报错的最后一行读一遍，告诉我它说的是哪一种异常？';

/** 检测学生输入里的提示注入 */
export function checkInput(text: string): GuardResult {
  if (!text.trim()) return { ok: false, reason: 'empty', text: '请描述一下你遇到的问题，或者直接点击「运行并问诊」。' };
  for (const p of BANNED_PATTERNS) {
    if (p.test(text)) {
      return { ok: false, reason: 'injection', text: '检测到试图覆盖教学规则的请求，已拦截。我会继续按「不直接给答案、只给台阶」的方式陪你练习。' };
    }
  }
  return { ok: true, text };
}

/**
 * 检测引导输出是否泄露完整可复制实现。
 * 规则：整段 fenced code、>=3 行且含 def/return 的代码块、出现参考实现标记但未经揭晓。
 */
export function checkOutput(text: string, allowReference = false): GuardResult {
  if (!text.trim()) return { ok: false, reason: 'empty', text: FALLBACK_TEXT };
  const fenced = /```[\s\S]*?```/.test(text);
  const lines = text.split('\n');
  const codeLines = lines.filter((l) => /^\s*(def |return |for |while |import |class )/.test(l));
  if (!allowReference && (fenced || codeLines.length >= 3)) {
    return { ok: false, reason: 'answer_leak', text: FALLBACK_TEXT };
  }
  if (!allowReference && /^\s*(def\s+\w+\s*\(|参考实现：\s*def\s)/m.test(text) && codeLines.length >= 2) {
    return { ok: false, reason: 'answer_leak', text: FALLBACK_TEXT };
  }
  return { ok: true, text };
}

/** 结构化输出校验：真实 LLM 返回非法 JSON 时的兜底 */
export function parseDecision<T>(raw: string, fallback: T): { value: T; retried: boolean } {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    return { value: JSON.parse(m ? m[0] : raw) as T, retried: false };
  } catch {
    return { value: fallback, retried: true };
  }
}
