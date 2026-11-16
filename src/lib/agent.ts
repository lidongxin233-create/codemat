import { SAMPLE_MAP } from '../data/samples';
import { getAdapter } from './llm';
import { retrieve, formatCitations, GENERIC_NO_RAG } from './rag';
import { runTests, runCode } from './sandbox';
import { updateMastery, generateVariant, pickNextKnowledge } from './mastery';
import { checkInput } from './guardrail';
import type {
  AgentStep, ChatMessage, ExecResult, HintLevel, MasteryState, ProblemSheet,
  SessionSnapshot, ToolCall,
} from '../types';

export interface AgentEvents {
  onStage: (step: AgentStep) => void;
  onMessage: (msg: ChatMessage) => void;
  onStreamChunk: (id: string, chunk: string) => void;
  onStreamEnd: (id: string) => void;
  onTool: (call: ToolCall) => void;
  onExec: (exec: ExecResult) => void;
  onCitations: (citations: string[]) => void;
  onMastery: (state: MasteryState, delta: number, kpId: string) => void;
  onVariant: (v: SessionSnapshot['variant']) => void;
  onSolved: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const stageLabel: Record<string, string> = {
  PLAN: '规划诊断假设', ACT: '调用工具取证', OBSERVE: '解读运行结果',
  REFLECT: '反思并决策', HINT: '生成分层提示', CLOSE: '闭环并建模', IDLE: '待命',
};

/** 模拟流式输出：逐段推送，驱动前端"AI 正在思考/书写"的交互体验 */
async function streamText(id: string, text: string, ev: AgentEvents, speed = 12): Promise<void> {
  ev.onMessage({ id, role: 'tutor', text: '', ts: Date.now(), streaming: true });
  for (let i = 0; i < text.length; i += speed) {
    ev.onStreamChunk(id, text.slice(i, i + speed));
    await new Promise((r) => setTimeout(r, 14));
  }
  ev.onStreamEnd(id);
}

function step(stage: AgentStep['stage'], detail: string, ev: AgentEvents): void {
  ev.onStage({ stage, label: stageLabel[stage] ?? stage, detail, ts: Date.now() });
}

/**
 * 一次完整陪练轮次：显式 Plan → Act → Observe → Reflect → Hint/Close 状态机。
 * 每一步都产生可观测轨迹（UI 的"会话轨迹"面板据此渲染）。
 */
export async function runAgentRound(params: {
  sheet: ProblemSheet;
  mastery: MasteryState;
  hasRag: boolean;
  events: AgentEvents;
  maxRounds?: number;
}): Promise<{ sheet: ProblemSheet; mastery: MasteryState; solved: boolean }> {
  const { sheet, events: ev } = params;
  let mastery = params.mastery;
  const sample = SAMPLE_MAP[sheet.sampleId];
  const MAX = params.maxRounds ?? 6;

  // 输入 Guardrail
  const guard = checkInput(sheet.errorText || sheet.code);
  if (!guard.ok) {
    ev.onMessage({ id: uid(), role: 'guardrail', text: guard.text, ts: Date.now() });
    return { sheet, mastery, solved: false };
  }

  // ---------- PLAN ----------
  step('PLAN', `读取结构化问题单（知识点 ${sheet.kpId}），生成诊断假设并决定首个工具`, ev);
  const plan = await getAdapter().decide({
    problem: sheet, hasRag: params.hasRag, citations: [], stage: 'PLAN',
    exec: { stdout: '', stderr: '', exitCode: 0, elapsedMs: 0, engine: 'pyodide' },
  });
  await streamText(uid(), `【诊断计划】${plan.thought}`, ev, 18);

  // ---------- ACT ----------
  step('ACT', `执行 ${plan.tool?.name ?? 'run_tests'}：在隔离沙盒中真实运行代码与单元测试`, ev);
  const t0 = performance.now();
  let exec: ExecResult;
  try {
    exec = await runTests(sheet.code, sample);
  } catch {
    exec = await runCode(sheet.code, sample);
  }
  ev.onExec(exec);
  ev.onTool({
    id: uid(), name: 'run_tests',
    args: { test_suite_id: sheet.sampleId, source_bytes: sheet.code.length },
    resultSummary: `exit_code=${exec.exitCode}, tests=${exec.passed ?? 0}/${exec.total ?? 0}, ${exec.elapsedMs}ms, engine=${exec.engine}`,
    ok: exec.exitCode === 0, elapsedMs: Math.round(performance.now() - t0), ts: Date.now(),
  });

  // ---------- RAG（工具：search_knowledge） ----------
  const hits = params.hasRag ? retrieve(exec.stderr + ' ' + sheet.code, sheet.kpId, 3) : [];
  const citations = params.hasRag ? formatCitations(hits) : [];
  ev.onCitations(citations);
  if (params.hasRag) {
    ev.onTool({
      id: uid(), name: 'search_knowledge',
      args: { query: exec.stderr.slice(0, 40) || sheet.kpId, top_k: 3 },
      resultSummary: `命中 ${hits.length} 条：${hits.map((h) => h.chunk.id).join(', ') || '无'}`,
      ok: hits.length > 0, elapsedMs: 3, ts: Date.now(),
    });
  }

  // ---------- OBSERVE ----------
  step('OBSERVE', `解读真实输出：exit_code=${exec.exitCode}，单测 ${exec.passed ?? 0}/${exec.total ?? 0}`, ev);
  const observe = await getAdapter().decide({ problem: sheet, exec, hasRag: params.hasRag, citations, stage: 'OBSERVE' });
  await streamText(uid(), `【观察】${observe.thought}`, ev, 18);

  // ---------- REFLECT ----------
  step('REFLECT', '依据证据决定继续取证 / 给出提示 / 结束闭环', ev);
  const reflect = await getAdapter().decide({ problem: sheet, exec, hasRag: params.hasRag, citations, stage: 'REFLECT' });
  await streamText(uid(), `【反思】${reflect.thought}`, ev, 18);

  const passed = exec.exitCode === 0 && (exec.total ?? 0) > 0 && exec.passed === exec.total;

  // ---------- CLOSE ----------
  if (reflect.stage === 'CLOSE' || passed) {
    step('CLOSE', '更新知识点掌握度，生成自适应变式题', ev);
    const { next, delta } = updateMastery(mastery, sheet.kpId, true, sheet.hintLevel as HintLevel);
    mastery = next;
    ev.onMastery(mastery, delta, sheet.kpId);
    ev.onTool({
      id: uid(), name: 'update_mastery',
      args: { knowledge_id: sheet.kpId, result: sheet.hintLevel <= 1 ? 'mastered' : 'assisted', hint_level: sheet.hintLevel },
      resultSummary: `掌握度 ${(mastery[sheet.kpId] * 100).toFixed(1)}%（Δ ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%）`,
      ok: true, elapsedMs: 2, ts: Date.now(),
    });
    const nextKp = pickNextKnowledge(mastery, sheet.kpId);
    const variant = generateVariant(nextKp, mastery);
    ev.onTool({
      id: uid(), name: 'generate_variant',
      args: { knowledge_id: nextKp, difficulty: variant.difficulty },
      resultSummary: `${variant.title}（自适应路径：${nextKp}）`,
      ok: true, elapsedMs: 2, ts: Date.now(),
    });
    const closing = params.hasRag
      ? reflect.final
      : GENERIC_NO_RAG + '\n\n（对照：未启用 RAG 时无法引用教材依据，也无法说明具体概念）';
    await streamText(uid(), closing ?? '复验通过。', ev, 16);
    ev.onVariant(variant);
    ev.onSolved();
    return { sheet: { ...sheet, rounds: sheet.rounds + 1 }, mastery, solved: true };
  }

  // ---------- HINT ----------
  const newLevel = Math.min(4, reflect.hintLevel ?? (sheet.hintLevel + 1)) as HintLevel;
  step('HINT', `输出 L${newLevel} 分层提示（不泄露完整实现）`, ev);
  const hintText = reflect.final ?? '';
  await streamText(uid(), hintText, ev, 14);
  ev.onMessage({
    id: uid(), role: 'system',
    text: `提示层级 L${newLevel} / L4 · ${sheet.rounds + 1}/${MAX} 轮 · 修改代码后点「复验」让 Agent 再次取证`,
    ts: Date.now(), hintLevel: newLevel,
  });
  ev.onTool({
    id: uid(), name: 'guardrail_check',
    args: { stage: 'HINT', hint_level: newLevel },
    resultSummary: '输出合规：未检测到完整可复制实现',
    ok: true, elapsedMs: 1, ts: Date.now(),
  });
  return {
    sheet: { ...sheet, hintLevel: newLevel, rounds: sheet.rounds + 1 },
    mastery,
    solved: false,
  };
}
