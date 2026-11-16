import type { AgentStage, AgentStep } from '../types';

const ORDER: AgentStage[] = ['PLAN', 'ACT', 'OBSERVE', 'REFLECT', 'HINT', 'CLOSE'];
const SHORT: Record<string, string> = {
  PLAN: '规划', ACT: '取证', OBSERVE: '观察', REFLECT: '反思', HINT: '引导', CLOSE: '闭环',
};

interface Props { current: AgentStage; steps: AgentStep[]; busy: boolean; }

/** AI 思考状态可视化（技术文档 5.7 / 评分点「AI 交互体验」） */
export default function StageBar({ current, steps, busy }: Props) {
  const seen = new Set(steps.map((s) => s.stage));
  const last = steps[steps.length - 1];
  return (
    <div className="card">
      <div className="card-head">
        <span>② Agent 工作流</span>
        <span className="hint">Plan → Act → Observe → Reflect → Hint / Close</span>
      </div>
      <div className="stage-bar">
        {ORDER.map((s) => {
          const cls = busy && current === s ? 'active' : seen.has(s) ? 'done' : '';
          return <span key={s} className={`stage-pill ${cls}`}>{SHORT[s]}</span>;
        })}
      </div>
      {last && <div className="stage-detail">▸ {last.label}：{last.detail}</div>}
      {!last && <div className="stage-detail">▸ 待命：选择样例并点击「运行并问诊」开始一次完整陪练</div>}
    </div>
  );
}
