import { KNOWLEDGE_BASE, KP_MAP } from '../data/knowledge';
import type { RetrievalHit } from '../types';

/**
 * 轻量 RAG 检索（技术文档 4.7）。
 * MVP 用「关键词加权 + 字符二元组相似度」代替向量库，零外部依赖、可离线复现；
 * 接口与向量检索一致，后续可替换为 Embedding + Top-K。
 */
function bigrams(s: string): Set<string> {
  const t = s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff._]/g, '');
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

function dice(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((x) => { if (b.has(x)) inter++; });
  return (2 * inter) / (a.size + b.size);
}

export function retrieve(query: string, kpId: string, topK = 3): RetrievalHit[] {
  const q = query.toLowerCase();
  const qb = bigrams(query);
  return KNOWLEDGE_BASE.map((chunk) => {
    let score = dice(qb, bigrams(chunk.text + chunk.title)) * 0.9;
    for (const kw of chunk.keywords) {
      if (q.includes(kw.toLowerCase())) score += 0.45;
    }
    if (chunk.kpId === kpId) score += 0.75;          // 元数据过滤：同知识点优先
    if (KP_MAP[chunk.kpId]) score += 0.02;
    return { chunk, score };
  })
    .filter((h) => h.score > 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** 关闭 RAG 时的对照回答（用于演示「生成质量因检索增强而提升」） */
export const GENERIC_NO_RAG = '看起来代码运行出错了。建议检查一下变量、循环边界和数据类型，然后重新运行看看。';

export function formatCitations(hits: RetrievalHit[]): string[] {
  return hits.map((h) => `[${h.chunk.id}] ${h.chunk.title}：${h.chunk.text}`);
}
