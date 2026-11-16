import type { ToolSchema } from '../types';

/** 统一 Tool Schema（技术文档 4.6）。同一份定义可暴露为 Function Calling 或 MCP 工具。 */
export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: 'run_code',
    description: '在隔离的浏览器端 Pyodide 沙盒中执行 Python 代码，返回真实 stdout / stderr / exit_code',
    parameters: {
      language: { type: 'string', description: '固定为 python', required: true },
      source: { type: 'string', description: '学生代码', required: true },
      timeout_ms: { type: 'number', description: '执行超时，默认 3000' },
    },
  },
  {
    name: 'run_tests',
    description: '运行该知识点绑定的单元测试，返回用例通过明细与失败断言',
    parameters: {
      source: { type: 'string', description: '学生代码', required: true },
      test_suite_id: { type: 'string', description: '样例 ID', required: true },
    },
  },
  {
    name: 'search_knowledge',
    description: '检索课程讲义与常见错误知识库，返回带来源标记的片段',
    parameters: {
      query: { type: 'string', description: '报错文本或代码上下文', required: true },
      knowledge_ids: { type: 'string[]', description: '过滤的知识点 ID' },
      top_k: { type: 'number', description: '返回条数，默认 3' },
    },
  },
  {
    name: 'get_mastery',
    description: '读取当前学生的知识点掌握度向量',
    parameters: { user_id: { type: 'string', description: '匿名本地用户 ID' } },
  },
  {
    name: 'update_mastery',
    description: '依据本轮证据更新知识点掌握度',
    parameters: {
      knowledge_id: { type: 'string', description: '知识点 ID', required: true },
      result: { type: 'string', description: 'mastered | assisted | failed', required: true },
      hint_level: { type: 'number', description: '本轮达到的最高提示层级', required: true },
    },
  },
  {
    name: 'generate_variant',
    description: '生成保持考点不变、变换题干与数据的变式题',
    parameters: {
      knowledge_id: { type: 'string', description: '知识点 ID', required: true },
      difficulty: { type: 'number', description: '难度 1-5' },
      seed: { type: 'number', description: '随机种子' },
    },
  },
];

export const TOOL_NAMES = TOOL_SCHEMAS.map((t) => t.name) as string[];

/** 供真实 LLM 使用的 OpenAI 兼容 function 定义 */
export function toOpenAITools() {
  return TOOL_SCHEMAS.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type.replace('[]', ''), description: v.description }]),
        ),
        required: Object.entries(t.parameters).filter(([, v]) => v.required).map(([k]) => k),
      },
    },
  }));
}
