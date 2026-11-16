/**
 * 把 node_modules/pyodide 的运行时资源复制到 public/pyodide/，
 * 让浏览器端 Pyodide 完全离线可用（不依赖 CDN，评审环境断网也能真实执行）。
 * 由 predev / prebuild 自动调用；产物目录已加入 .gitignore，不进代码仓库。
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pyodide');
const dst = join(root, 'public', 'pyodide');

const FILES = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

if (!existsSync(src)) {
  console.error('[copy-pyodide] 未找到 node_modules/pyodide，请先执行 npm install');
  process.exit(1);
}

mkdirSync(dst, { recursive: true });
let total = 0;
for (const f of FILES) {
  const from = join(src, f);
  const to = join(dst, f);
  if (!existsSync(from)) {
    console.error(`[copy-pyodide] 缺少资源 ${f}`);
    process.exit(1);
  }
  // 已存在且大小一致则跳过，避免每次 dev 都复制 10MB
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  copyFileSync(from, to);
  total += statSync(from).size;
}
console.log(`[copy-pyodide] 就绪：${FILES.length} 个资源，本次复制 ${(total / 1024 / 1024).toFixed(1)}MB -> public/pyodide/`);
