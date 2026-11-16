import { DOMAINS, KP_MAP, KNOWLEDGE_GRAPH } from '../data/knowledge';
import type { MasteryState, ToolCall, VariantExercise } from '../types';

export function ToolTrace({ tools }: { tools: ToolCall[] }) {
  return (
    <div className="card">
      <div className="card-head"><span>④ 工具调用轨迹</span><span className="hint">{tools.length} 次调用 · 可解释性面板</span></div>
      <div className="trace">
        {tools.length === 0 && <div className="empty">工具调用会在这里逐条出现：<code>run_tests</code> / <code>search_knowledge</code> / <code>update_mastery</code> / <code>generate_variant</code></div>}
        {tools.map((t) => (
          <div className="trace-item" key={t.id}>
            <span className={`trace-dot ${t.ok ? '' : 'fail'}`} />
            <div className="trace-body">
              <span className="trace-name">{t.name}()</span>
              <span className="trace-time">{t.elapsedMs}ms</span>
              <div className="trace-sum">{t.resultSummary}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 掌握度可视化：按知识域聚合的 SVG 雷达图 + 低掌握度知识点条 */
export function MasteryPanel({ mastery, lastDelta, lastKp }: { mastery: MasteryState; lastDelta: number; lastKp: string | null }) {
  const values = DOMAINS.map((d) => {
    const ks = KNOWLEDGE_GRAPH.filter((k) => k.domain === d);
    return ks.reduce((s, k) => s + (mastery[k.id] ?? k.pInit), 0) / Math.max(ks.length, 1);
  });
  const cx = 110, cy = 96, R = 68;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / DOMAINS.length;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = (r: number[]) => r.map((v, i) => pt(i, v * R).join(',')).join(' ');
  const dataPoly = poly(values);
  const low = [...KNOWLEDGE_GRAPH].sort((a, b) => (mastery[a.id] ?? 0) - (mastery[b.id] ?? 0)).slice(0, 8);

  return (
    <div className="card">
      <div className="card-head"><span>⑤ 掌握度图谱</span><span className="hint">简化 BKT · 自适应路径依据</span></div>
      <div className="card-body mastery-wrap">
        <div className="domain-chips">
          {DOMAINS.map((d, i) => <span className="domain-chip" key={d}>{d} {(values[i] * 100).toFixed(0)}%</span>)}
        </div>
        <svg viewBox="0 0 220 190" width="100%" height="168" role="img" aria-label="知识域掌握度雷达图">
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <polygon key={r} points={poly(DOMAINS.map(() => r))} fill="none" stroke="#dbe6f3" strokeWidth="1" />
          ))}
          {DOMAINS.map((_, i) => {
            const [x, y] = pt(i, R);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#dbe6f3" strokeWidth="1" />;
          })}
          <polygon points={dataPoly} fill="rgba(21,101,192,.22)" stroke="#1565c0" strokeWidth="2" />
          {values.map((v, i) => {
            const [x, y] = pt(i, v * R);
            return <circle key={i} cx={x} cy={y} r="3" fill="#1565c0" />;
          })}
          {DOMAINS.map((d, i) => {
            const [x, y] = pt(i, R + 16);
            return <text key={d} x={x} y={y + 3} textAnchor="middle" fontSize="9" fill="#64748b">{d}</text>;
          })}
        </svg>
        {lastKp && (
          <div className="note">
            最近更新：<b>{KP_MAP[lastKp]?.name ?? lastKp}</b>
            {lastDelta !== 0 && <> 掌握度 <b style={{ color: lastDelta > 0 ? '#2e7d32' : '#c62828' }}>{lastDelta > 0 ? '+' : ''}{(lastDelta * 100).toFixed(1)}%</b></>}
            （提示层级越高，学习增益越低）
          </div>
        )}
        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 9 }}>
          <div className="note" style={{ marginBottom: 7 }}>优先补强（掌握度最低）：</div>
          {low.map((k) => {
            const v = mastery[k.id] ?? k.pInit;
            return (
              <div className="kp-row" key={k.id}>
                <span className="kp-name" title={k.description}>{k.name}</span>
                <span className="kp-bar"><span className={`kp-fill ${v < 0.4 ? 'low' : ''}`} style={{ width: `${v * 100}%` }} /></span>
                <span className="kp-val">{(v * 100).toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function VariantCard({ variant }: { variant: VariantExercise | null }) {
  return (
    <div className="card">
      <div className="card-head"><span>⑥ 自适应变式题</span><span className="hint">保持考点、变换题干</span></div>
      <div className="card-body">
        {!variant && <div className="empty">闭环达成后，系统会依据最新掌握度选择知识点与难度带，生成一道针对性变式题。</div>}
        {variant && (
          <div className="variant">
            <h4>✅ {variant.title}</h4>
            <p>{variant.statement}</p>
            <pre>{variant.starterCode}</pre>
            <div className="note" style={{ marginTop: 9 }}>
              自适应路径：<code>{KP_MAP[variant.kpId]?.name ?? variant.kpId}</code> · 难度 L{variant.difficulty} · 考点「{variant.hiddenConcept}」不变
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CitationPanel({ citations, hasRag }: { citations: string[]; hasRag: boolean }) {
  return (
    <div className="card">
      <div className="card-head"><span>⑦ RAG 检索依据</span><span className="hint">{hasRag ? '已启用' : '已关闭（对照模式）'}</span></div>
      <div className="card-body">
        {!hasRag && <div className="note">知识库检索已关闭。开启后对照：回答能引用教材原句定位到具体概念，关闭时只给通用建议。</div>}
        {hasRag && citations.length === 0 && <div className="empty">运行一轮陪练后，命中的讲义切片会显示在这里，并标注来源 ID。</div>}
        {hasRag && citations.length > 0 && (
          <div className="citation-list">
            {citations.map((c) => {
              const m = c.match(/^\[([^\]]+)\]\s*([^：]+)：([\s\S]*)$/);
              return <div className="citation" key={c}><b>{m?.[1] ?? '来源'}</b> {m?.[2] ?? ''}<br />{m?.[3] ?? c}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function AboutPanel({ modeLabel, promptVersion }: { modeLabel: string; promptVersion: string }) {
  return (
    <div className="card">
      <div className="card-head"><span>关于本作品</span><span className="hint">2026 传智杯 · AI WEB 挑战赛</span></div>
      <div className="card-body note">
        <p style={{ marginTop: 0 }}><b>核心理念：</b>不给答案，给台阶；以真实执行为准绳；一次陪练，一次建模。</p>
        <p><b>当前推理模式：</b>{modeLabel}</p>
        <p><b>Prompt 版本：</b><code>{promptVersion}</code> · 四层模板（系统/阶段/上下文/工具结果）</p>
        <p style={{ marginBottom: 0 }}><b>说明：</b>代码沙盒由浏览器端 Pyodide 真实执行；CDN 不可达时会显式标注「降级推断（未真实执行）」，不冒充真实运行。配置 <code>VITE_LLM_*</code> 后可切换真实大模型，接口与降级链保持不变。</p>
      </div>
    </div>
  );
}
