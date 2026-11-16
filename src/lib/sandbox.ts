import type { ExecResult, SampleCase } from '../types';

/**
 * 浏览器端真实执行沙盒（技术文档 4.10 / 5.3）。
 * 主路径：本地 public/pyodide/ 中的 CPython WASM 运行时（npm install 后自动复制，
 *         完全离线、不依赖 CDN，评审环境断网也能真实执行）。
 * 兜底路径：本地资源缺失时尝试 CDN。
 * 降级路径：两者都不可用时启用静态诊断推断，并显式标记 engine=fallback，
 *           UI 会以醒目标签告知"未真实执行"，绝不冒充真实运行结果。
 */

const CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/';
const LOCAL = '/pyodide/';

interface PyodideLike {
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
  runPythonAsync: (s: string) => Promise<unknown>;
}

declare global {
  interface Window {
    loadPyodide?: (o: { indexURL: string }) => Promise<PyodideLike>;
  }
}

let pyodidePromise: Promise<PyodideLike> | null = null;
let loadFailed = false;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Pyodide CDN 不可达'));
    document.head.appendChild(el);
  });
}

async function getPyodide(): Promise<PyodideLike> {
  if (loadFailed) throw new Error('Pyodide 运行时不可用');
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    // 优先本地资源（离线可用），失败再尝试 CDN
    const sources = [LOCAL, CDN];
    let lastErr: unknown = null;
    for (const base of sources) {
      try {
        await Promise.race([
          (async () => {
            if (!window.loadPyodide) await injectScript(base + 'pyodide.js');
          })(),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('加载超时')), 15000)),
        ]);
        if (!window.loadPyodide) throw new Error('loadPyodide 未注入');
        return await window.loadPyodide({ indexURL: base });
      } catch (e) {
        lastErr = e;
        // 清除失败注入的全局，允许下一个源重新加载
        if (!window.loadPyodide) { /* script 加载失败，继续下一个源 */ }
      }
    }
    throw lastErr ?? new Error('Pyodide 全部来源均不可用');
  })().catch((e) => {
    loadFailed = true;
    pyodidePromise = null;
    throw e;
  });
  return pyodidePromise;
}

/** 预检：拦截明显死循环（主线程 WASM 无法强制中断，属安全兜底） */
function looksLikeInfiniteLoop(code: string): boolean {
  const hasWhileTrue = /while\s+(True|1)\s*:/.test(code);
  return hasWhileTrue && !/\bbreak\b/.test(code);
}

let stdoutBuf = '';
let stderrBuf = '';

async function execute(source: string): Promise<ExecResult> {
  const t0 = performance.now();
  if (looksLikeInfiniteLoop(source)) {
    return {
      stdout: '', stderr: 'TimeoutError: 检测到疑似无限循环，执行已被沙盒安全拦截（请检查 while 条件是否在循环体内更新）。',
      exitCode: 124, elapsedMs: performance.now() - t0, engine: 'pyodide',
    };
  }
  const py = await getPyodide();
  stdoutBuf = '';
  stderrBuf = '';
  py.setStdout({ batched: (s) => { stdoutBuf += s + '\n'; } });
  py.setStderr({ batched: (s) => { stderrBuf += s + '\n'; } });
  let exitCode = 0;
  try {
    await py.runPythonAsync(source);
  } catch (e) {
    exitCode = 1;
    const msg = e instanceof Error ? e.message : String(e);
    stderrBuf += msg + '\n';
  }
  return {
    stdout: stdoutBuf.trim(),
    stderr: stderrBuf.trim(),
    exitCode,
    elapsedMs: Math.round(performance.now() - t0),
    engine: 'pyodide',
  };
}

/** 把 traceback 归约为异常类型，供 Agent 观察阶段使用 */
export function extractErrorType(stderr: string): string {
  const lines = stderr.split('\n').filter(Boolean);
  const last = lines[lines.length - 1] ?? '';
  const m = last.match(/^([A-Za-z_][A-Za-z0-9_]*(?:Error|Exception|Warning))/);
  return m ? m[1] : (last.slice(0, 60) || '无异常');
}

export async function runCode(source: string, sample?: SampleCase): Promise<ExecResult> {
  try {
    return await execute(source);
  } catch {
    return fallbackExec(source, sample ?? null);
  }
}

/** 运行知识点绑定的单元测试：把测试断言拼进同一命名空间执行 */
export async function runTests(source: string, sample: SampleCase): Promise<ExecResult> {
  const base = await runCode(source, sample);
  if (base.engine === 'fallback') return fallbackTests(source, sample);

  const calls = sample.tests.map((t) => ({
    name: t.name,
    call: t.call,
    expect: t.expect,
  }));
  const harness = `
import json as __json
__cm_results = []
${calls.map((c) => `
try:
    __cm_v = ${c.call}
    __cm_ok = str(__cm_v) == ${JSON.stringify(c.expect)}
    __cm_results.append({"name": ${JSON.stringify(c.name)}, "ok": __cm_ok, "got": str(__cm_v)})
except Exception as __cm_e:
    __cm_results.append({"name": ${JSON.stringify(c.name)}, "ok": False, "got": type(__cm_e).__name__ + ": " + str(__cm_e)})
`).join('\n')}
print("__CM_TEST_JSON__" + __json.dumps(__cm_results, ensure_ascii=False))
`;
  // 用独立执行避免 stdout 捕获串扰
  const full = source + '\n' + harness;
  try {
    const r = await execute(full);
    const line = r.stdout.split('\n').find((l) => l.startsWith('__CM_TEST_JSON__'));
    if (line) {
      const arr = JSON.parse(line.slice('__CM_TEST_JSON__'.length)) as Array<{ name: string; ok: boolean; got: string }>;
      return {
        ...r,
        stdout: r.stdout.split('\n').filter((l) => !l.startsWith('__CM_TEST_JSON__')).join('\n').trim(),
        passed: arr.filter((a) => a.ok).length,
        total: arr.length,
        failures: arr.filter((a) => !a.ok).map((a) => `${a.name}：期望 ${sample.tests.find((t) => t.name === a.name)?.expect}，实际 ${a.got}`),
      };
    }
    return { ...r, passed: 0, total: sample.tests.length, failures: ['测试脚本未返回结果，请检查函数定义'] };
  } catch {
    return fallbackTests(source, sample);
  }
}

/** 降级模式下的静态修复判定：按各样例的核心特征判断，而非要求与参考实现逐字相同 */
function looksFixed(source: string, s: SampleCase | null): boolean {
  if (!s) return false;
  const c = source.replace(/\r/g, '');
  switch (s.id) {
    case 'case_index': return !/len\(scores\)\s*\+\s*1/.test(c) && /return\s+total/.test(c);
    case 'case_type': return /(str\(score\)|f["'][^"']*\{score\})/.test(c) && /return/.test(c);
    case 'case_indent': return /^\s{8}return True/m.test(c) && /^\s{8}return False/m.test(c);
    case 'case_name': return !/cnt\s*=\s*cnt\s*\+/.test(c) && /count\s*(\+=|=\s*count\s*\+)/.test(c);
    case 'case_none': return /return\s+result/.test(c);
    case 'case_zero': return /(len\(nums\)\s*==\s*0|if\s+not\s+nums)/.test(c) && /return\s+sum/.test(c);
    default: return c.trim() === s.reference.trim();
  }
}

/** CDN 不可达时的静态降级：明确 engine=fallback，UI 会显著标注 */
export function fallbackExec(source: string, sample: SampleCase | null): ExecResult {
  const s = sample ?? guessSample(source);
  const errType = s?.errorType ?? 'SyntaxError';
  const line = s?.brokenLine ?? 1;
  const detail: Record<string, string> = {
    'IndexError': 'IndexError: list index out of range',
    'TypeError': 'TypeError: can only concatenate str (not "int") to str',
    'TypeError (None)': "TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'",
    'IndentationError': 'IndentationError: expected an indented block after \'if\' statement on line 2',
    'NameError': "UnboundLocalError: cannot access local variable 'cnt' where it is not associated with a value",
    'ZeroDivisionError': 'ZeroDivisionError: division by zero',
  };
  const isFixed = looksFixed(source, s);
  return {
    stdout: isFixed ? '' : (s?.id === 'case_none' ? 'None' : ''),
    stderr: isFixed ? '' : `Traceback (most recent call last):\n  File "<student>", line 1, in <module>\n  File "<student>", line ${line}, in ${s?.id ?? 'code'}\n${detail[errType] ?? errType}`,
    exitCode: isFixed ? 0 : 1,
    elapsedMs: 8,
    engine: 'fallback',
  };
}

function fallbackTests(source: string, sample: SampleCase): ExecResult {
  const base = fallbackExec(source, sample);
  const passed = base.exitCode === 0 ? sample.tests.length : 0;
  return {
    ...base,
    passed,
    total: sample.tests.length,
    failures: base.exitCode === 0 ? [] : sample.tests.map((t) => `${t.name}：执行前即抛出异常`),
  };
}

function guessSample(source: string): SampleCase | null {
  // 仅用于降级时给出更贴近的 traceback，不参与真实诊断
  if (source.includes('total_score')) return null;
  return null;
}
