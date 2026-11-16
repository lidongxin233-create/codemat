import { useRef } from 'react';
import type { ExecResult } from '../types';

interface Props {
  code: string;
  onChange: (v: string) => void;
  brokenLine: number;
  exec: ExecResult | null;
  busy: boolean;
  onRun: () => void;
  onReveal: () => void;
  onVoice: () => void;
  onSpeak: () => void;
  onImage: (file: File) => void;
  listening: boolean;
  solved: boolean;
}

/** 轻量代码编辑器：行号 gutter + 错误行高亮 + Tab 缩进，零额外运行时依赖（首屏性能） */
export default function CodeEditor({
  code, onChange, brokenLine, exec, busy, onRun, onReveal, onVoice, onSpeak, onImage, listening, solved,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const lines = code.split('\n');

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const s = el.selectionStart;
      const next = code.slice(0, s) + '    ' + code.slice(el.selectionEnd);
      onChange(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4; });
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <span>① 代码工作区</span>
        <span className="hint">Python · 修改后点「复验」让 Agent 再次取证</span>
      </div>
      <div className="card-body">
        <div className="editor-wrap">
          <div className="gutter" aria-hidden="true">
            {lines.map((_, i) => <div key={i} className={!solved && i + 1 === brokenLine ? 'err' : ''}>{i + 1}</div>)}
          </div>
          <textarea
            className="code" value={code} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKey}
            spellCheck={false} aria-label="学生代码编辑器"
          />
        </div>

        <div className="editor-actions">
          <button className="btn-primary" onClick={onRun} disabled={busy}>
            {busy ? 'Agent 正在取证…' : solved ? '重新开始本轮' : '▶ 运行并问诊 / 复验'}
          </button>
          <button className="btn-soft" onClick={onReveal} disabled={busy || solved}>请求揭晓答案 (L4)</button>
          <button className="btn-soft" onClick={onVoice} disabled={busy}>
            {listening ? '🎙 聆听中…' : '🎙 语音提问'}
          </button>
          <button className="btn-soft" onClick={onSpeak}>🔊 朗读提示</button>
          <button className="btn-soft" onClick={() => fileRef.current?.click()}>📷 报错截图</button>
          <input
            ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(f); e.target.value = ''; }}
          />
        </div>

        {exec && (
          <div className="exec-box">
            <div className="exec-head">
              <span>exit_code={exec.exitCode} · tests={exec.passed ?? 0}/{exec.total ?? 0} · {exec.elapsedMs}ms</span>
              <span className={`engine-tag ${exec.engine === 'fallback' ? 'fb' : ''}`}>
                {exec.engine === 'pyodide' ? 'Pyodide 真实执行' : '降级推断（未真实执行）'}
              </span>
            </div>
            <pre className={exec.exitCode === 0 ? 'ok' : ''}>
              {exec.stdout ? `[stdout]\n${exec.stdout}\n` : ''}
              {exec.stderr ? `[stderr]\n${exec.stderr}` : (!exec.stdout ? '(无输出)' : '')}
              {exec.failures?.length ? `\n[失败用例]\n${exec.failures.join('\n')}` : ''}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
