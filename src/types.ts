/** 全局类型定义 —— 与《技术文档》3.3 / 4.6 的数据结构保持一致 */

export type AgentStage = 'IDLE' | 'PLAN' | 'ACT' | 'OBSERVE' | 'REFLECT' | 'HINT' | 'CLOSE';

export type HintLevel = 0 | 1 | 2 | 3 | 4;

export interface KnowledgePoint {
  id: string;
  name: string;
  domain: string;
  prereq: string[];
  difficulty: number; // 1-5
  pInit: number;      // 初始掌握度
  description: string;
}

export interface KnowledgeChunk {
  id: string;
  kpId: string;
  title: string;
  text: string;
  keywords: string[];
}

export interface RetrievalHit {
  chunk: KnowledgeChunk;
  score: number;
}

export interface SampleCase {
  id: string;
  title: string;
  kpId: string;
  errorType: string;
  prompt: string;
  starterCode: string;
  brokenLine: number;
  tests: Array<{ name: string; call: string; expect: string }>;
  hints: [string, string, string, string]; // L1-L4 分层脚手架
  reference: string;                       // 仅服务端/揭晓时可见
  concept: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  elapsedMs: number;
  engine: 'pyodide' | 'fallback';
  passed?: number;
  total?: number;
  failures?: string[];
}

export interface ProblemSheet {
  code: string;
  errorText: string;
  kpId: string;
  sampleId: string;
  hintLevel: HintLevel;
  rounds: number;
  history: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'student' | 'tutor' | 'system' | 'guardrail';
  text: string;
  ts: number;
  stage?: AgentStage;
  hintLevel?: HintLevel;
  citations?: string[];
  streaming?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  resultSummary: string;
  ok: boolean;
  elapsedMs: number;
  ts: number;
}

export interface AgentStep {
  stage: AgentStage;
  label: string;
  detail: string;
  ts: number;
}

export interface MasteryState {
  [kpId: string]: number;
}

export interface VariantExercise {
  id: string;
  kpId: string;
  difficulty: number;
  title: string;
  statement: string;
  starterCode: string;
  hiddenConcept: string;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export interface LLMDecision {
  stage: AgentStage;
  thought: string;
  tool?: { name: string; args: Record<string, unknown> };
  final?: string;
  hintLevel?: HintLevel;
  citations?: string[];
}

export interface SessionSnapshot {
  messages: ChatMessage[];
  tools: ToolCall[];
  steps: AgentStep[];
  mastery: MasteryState;
  hintLevel: HintLevel;
  rounds: number;
  variant: VariantExercise | null;
  solved: boolean;
}
