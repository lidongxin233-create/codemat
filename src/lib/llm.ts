import { SAMPLE_MAP } from '../data/samples';
import { KP_MAP } from '../data/knowledge';
import { checkOutput, FALLBACK_TEXT } from './guardrail';
import { buildMessages, PROMPT_VERSION, SYSTEM_PROMPT } from './prompts';
import type { ExecResult, HintLevel, LLMDecision, ProblemSheet } from '../types';

/**
 * LLM Adapter（技术文档 4.2 / 4.3）。
 * 两种实现共用同一接口 decide()：
 *  - MockDecisionEngine（默认）：无需 API Key，基于沙盒【真实执行结果】做规则化推理，
 *    生成分层引导与 Agent 决策，可完整离线演示与复现。
 *  - OpenAICompatibleEngine：配置 VITE_LLM_* 后走真实大模型（OpenAI 兼容格式 + 流式）。
 * 两者都经过同一套 Guardrail 与 Prompt 模板，行为口径一致。
 */

export type LLMMode = 'mock' | 'real';

export interface DecideContext {
  problem: ProblemSheet;
  exec: ExecResult;
  hasRag: boolean;
  citations: string[];
  stage: 'PLAN' | 'OBSERVE' | 'REFLECT';
  previousThought?: string;
}

export interface LLMAdapter {
  mode: LLMMode;
  label: string;
  decide(ctx: DecideContext): Promise<LLMDecision>;
}

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

export function detectMode(): LLMMode {
  return env.VITE_LLM_API_KEY && env.VITE_LLM_BASE_URL && env.VITE_LLM_MODEL ? 'real' : 'mock';
}

/** ---------- Mock 引擎：证据驱动的规则化推理（非"假聊天"） ---------- */
class MockDecisionEngine implements LLMAdapter {
  mode: LLMMode = 'mock';
  label = '离线推理引擎（无需 API Key）';

  async decide(ctx: DecideContext): Promise<LLMDecision> {
    const { problem, exec, hasRag, citations, stage } = ctx;
    const sample = SAMPLE_MAP[problem.sampleId];
    const kp = KP_MAP[problem.kpId];
    const errType = lastErrorLine(exec.stderr);
    const passed = (exec.passed ?? 0) === (exec.total ?? 0) && (exec.total ?? 0) > 0 && exec.exitCode === 0;

    if (stage === 'PLAN') {
      const hyp = [
        `报错末行为「${errType}」，优先怀疑 ${kp?.name ?? '该知识点'} 相关写法`,
        `第 ${sample?.brokenLine ?? 1} 行附近与预期行为不符，需用真实运行验证`,
      ];
      return {
        stage: 'PLAN',
        thought: `已读取问题单（知识点：${kp?.name ?? problem.kpId}）。生成 ${hyp.length} 条诊断假设，决定先调用 run_tests 取得真实执行证据，而不是凭文本猜测。`,
        tool: { name: 'run_tests', args: { source: problem.code.slice(0, 80) + '…', test_suite_id: problem.sampleId } },
      };
    }

    if (stage === 'OBSERVE') {
      const evidence = exec.stderr
        ? `stderr 末行：${errType}；退出码 ${exec.exitCode}；单测 ${exec.passed ?? 0}/${exec.total ?? 0} 通过`
        : `stdout：${exec.stdout || '(空)'}；退出码 ${exec.exitCode}；单测 ${exec.passed ?? 0}/${exec.total ?? 0} 通过`;
      return {
        stage: 'OBSERVE',
        thought: `沙盒${exec.engine === 'pyodide' ? '真实执行' : '降级推断'}结果已返回。${evidence}。${passed ? '假设被推翻：代码实际已通过全部用例。' : '假设成立：错误可复现，证据指向第 ' + (sample?.brokenLine ?? 1) + ' 行。'}`,
        tool: { name: 'search_knowledge', args: { query: errType + ' ' + (kp?.name ?? ''), top_k: 3 } },
        citations,
      };
    }

    // REFLECT
    if (passed) {
      return {
        stage: 'CLOSE',
        thought: '全部单元测试通过，闭环达成。汇总错因，更新掌握度并生成变式题。',
        final: `复验通过！${exec.total} 个用例全部通过，exit_code = 0。\n\n回看一下你刚才走过的过程：${sample?.concept ?? '关键概念'}。我已经把这次练习记进掌握度图谱，并为你准备了一道同考点的变式题。`,
        hintLevel: problem.hintLevel,
        citations,
      };
    }

    const next = Math.min(4, problem.hintLevel + 1) as HintLevel;
    const hint = sample?.hints[next - 1] ?? FALLBACK_TEXT;
    const guard = checkOutput(hint);
    const ragNote = hasRag && citations.length
      ? `\n\n（参考依据：${citations.map((c) => c.match(/^\[([^\]]+)\]/)?.[1]).filter(Boolean).join('、')}）`
      : '\n\n（本次未启用知识库检索，回答为通用提示）';
    return {
      stage: 'HINT',
      thought: `证据显示仍未通过（单测 ${exec.passed ?? 0}/${exec.total ?? 0}）。按 L1→L4 推进到第 ${next} 层；Guardrail ${guard.ok ? '通过：未泄露完整实现' : '已拦截并回退'}。`,
      final: guard.text + ragNote,
      hintLevel: next,
      citations: hasRag ? citations : [],
    };
  }
}

function lastErrorLine(stderr: string): string {
  const lines = stderr.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1] ?? '（无异常输出）';
}

/** ---------- 真实模型引擎：OpenAI 兼容 / SSE 流式 ---------- */
class OpenAICompatibleEngine implements LLMAdapter {
  mode: LLMMode = 'real';
  label = `大模型驱动（${env.VITE_LLM_MODEL}）`;

  async decide(ctx: DecideContext): Promise<LLMDecision> {
    const { problem, exec, citations } = ctx;
    const messages = buildMessages({
      stage: ctx.stage,
      problem: { code: problem.code, errorText: problem.errorText, kpId: problem.kpId, hintLevel: problem.hintLevel, rounds: problem.rounds },
      citations,
      toolResult: `exit_code=${exec.exitCode}\nstdout=${exec.stdout}\nstderr=${exec.stderr}\ntests=${exec.passed}/${exec.total}`,
    });
    const res = await fetch(`${env.VITE_LLM_BASE_URL!.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.VITE_LLM_API_KEY}` },
      body: JSON.stringify({
        model: env.VITE_LLM_MODEL,
        messages,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? '';
    let parsed: Partial<LLMDecision> = {};
    try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw) as Partial<LLMDecision>; } catch { /* 走兜底 */ }
    const text = parsed.final ?? FALLBACK_TEXT;
    const guard = checkOutput(text, problem.hintLevel >= 4);
    return {
      stage: parsed.stage ?? 'HINT',
      thought: parsed.thought ?? `${SYSTEM_PROMPT.slice(0, 24)}…（Prompt ${PROMPT_VERSION}）`,
      final: guard.text,
      hintLevel: parsed.hintLevel ?? Math.min(4, problem.hintLevel + 1) as HintLevel,
      citations,
      tool: parsed.tool,
    };
  }
}

let adapter: LLMAdapter | null = null;

export function getAdapter(): LLMAdapter {
  if (!adapter) adapter = detectMode() === 'real' ? new OpenAICompatibleEngine() : new MockDecisionEngine();
  return adapter;
}

/** 供 UI 切换演示：强制回到 Mock（用于"关闭真实模型对照"） */
export function forceMock(): void { adapter = new MockDecisionEngine(); }
