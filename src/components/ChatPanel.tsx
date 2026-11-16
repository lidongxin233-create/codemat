import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  busy: boolean;
  onAsk: (text: string) => void;
  hintLevel: number;
}

const ROLE_LABEL: Record<string, string> = {
  student: '学生', tutor: 'CodeMate 陪练', guardrail: '安全网关 Guardrail',
};

export default function ChatPanel({ messages, busy, onAsk, hintLevel }: Props) {
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const submit = () => {
    const t = draft.trim();
    if (!t || busy) return;
    onAsk(t);
    setDraft('');
  };

  return (
    <div className="card">
      <div className="card-head">
        <span>③ 陪练对话</span>
        <span className="hint">当前提示层级 L{hintLevel} / L4 · 默认不给完整实现</span>
      </div>
      <div className="chat">
        {messages.length === 0 && (
          <div className="empty">
            还没有对话。<br />从右上角选择一个典型错误样例，点击「运行并问诊」，<br />即可看到 Agent 真实取证 → 分层引导的完整闭环。
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            {m.role !== 'system' && <span className="role">{ROLE_LABEL[m.role] ?? m.role}</span>}
            {m.text}
            {m.streaming && <span className="caret" />}
            {m.citations && m.citations.length > 0 && (
              <span className="cite">📚 参考依据：{m.citations.map((c) => c.match(/^\[([^\]]+)\]/)?.[1]).filter(Boolean).join('、')}（可在右侧展开）</span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        <input
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="描述你的疑问，或直接点左侧「复验」…"
          aria-label="输入问题"
        />
        <button className="btn-primary" onClick={submit} disabled={busy || !draft.trim()}>发送</button>
      </div>
    </div>
  );
}
