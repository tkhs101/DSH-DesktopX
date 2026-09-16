# DSH-DesktopX Electron 套壳实现计划

## Goal
Windows x64 双击 EXE → Splash“正在启动 DeepSeek Harness 后端…”→ 独立 Electron 窗口载入本机 `dsh web` 带 token URL；关窗缩托盘后端常驻；NSIS 安装包 unsigned 首版发 GitHub Release。上游零修改。

## Architecture
Electron 主进程做 supervisor：spawn 本机 `dsh.cmd web --no-open --port 0` → 逐行扫描 stdout 正则 `^dsh web:\s*(http://127\.0\.0\.1:\d+/\?token=\S+)` 取 URL → Splash 切主窗 `loadURL`。分进程与后端交互，无 ABI 耦合；唯一契约是 URL 行。关窗 hide + 托盘；彻底退出 SIGTERM 优雅 5s 后强杀进程树。单实例锁。

## Tech Stack
Electron（pinned 版本，`electron` + `electron-builder` NSIS per-user）、TypeScript、Node 22+ 构建。目标 OS：Windows 10/11 x64。preload 最小暴露，无 node 进 renderer。

## Baseline/Authority Refs
- Required（已读，计划引用）：
  - 上游 `packages/bundle/web-app/src/index.ts` + `src/startup.ts`：`--no-open --port 0` 合法；URL 行是 readiness 信号；`--host 0.0.0.0` 拒绝。
  - 上游 `apps/cli/reference/README.md`：SIGTERM=正常停机 exit 0，SIGINT=130；web alias 语义。
  - 上游 `apps/desktop/README.md`：版本绑定思想借鉴（本项目只做 README 置顶已验证版本，不锁死代码）。
  - 本工作区 `docs/aegis/baseline/2026-09-16-initial-baseline.md`：需求/架构双基线。
- Missing：无（Electron API 用官方文档，构建时查）。

## Compatibility Boundary
- 不动上游、不动 `$DSH_HOME` 数据；只读 stdout，不写 dsh 配置。
- 只绑 loopback；token 内存化；卸载/彻底退出无 `node(dsh)` 残留。
- DSH preview 期：README 置顶“已验证 DSH 版本”，URL 行格式变化时只改解析器。

## TDD Route
- Mode: off
- Decision: skipped
- Strict authority: not applicable
- Strict signals: 无（新仓库绿地脚手架，无既有行为/契约/持久化回归面）
- Light eligibility: 不适用（off 模式不走 light）
- TDD-fit exception: 无
- Test posture: post-change regression（每 Task 后跑构建+冒烟探针）
- Reason: TDD off 默认；绿地壳工程以“构建成功 + 启动探针冒烟”验证为主。
- Verification: `npm run build` 全绿；`scripts/smoke-startup.mjs` 在本机 180s 内抓到 URL 行；关窗/退出无残留进程。

## Verification（全局）
- `npm run build`（tsc + electron-builder --dir）成功。
- `node scripts/smoke-startup.mjs`：spawn 真实 `dsh web --no-open --port 0`，180s 内匹配 URL 行则 pass（复用本机已验证正则）。
- 手工验收：安装包安装→双击→Splash→进 WebUI 可对话；X 关窗托盘在；彻底退出 `Get-Process node` 无 dsh 残留；占用 3080 仍可起。

## Task 1 — 仓库脚手架与构建链
Files:
- create `package.json`（electron pinned，如 `^38.x` 构建时取最新 38；scripts：`dev/start/build/pack/smoke`）
- create `tsconfig.json`（strict，main+preload）
- create `electron-builder.yml`（appId 反向域名占位 `com.example.dshdesktopx` 待用户改；win x64；nsis per-user；unsigned 不配 certificateSubjectName；files 含 `dist/main/**`、`dist/preload/**`、`assets/**`；`extraMetadata` 无）
- create `.gitignore`（node_modules/dist/release/.desktop-build）
- create `README.md`（用途、依赖 Node+dsh、unsigned 蓝框引导、已验证 DSH 版本占位、非目标列表）
Why: 可构建、可打包是后续一切的前提；用户价值=从源码到安装包链路跑通。
Change Necessity: code-change 不适用——本 Task 是新仓库脚手架，无既有代码；最小边界=上述 5 个文件。
Impact/Compatibility: 新增文件，不碰上游；appId 占位需用户发布前替换。
Verification: `npm install && npm run build` 成功，`release/`（或 dist）出现未签名安装包。
Steps:
1. 写 `package.json`（完整可粘贴，版本号 0.1.0，author 占位）：
```json
{
  "name": "dsh-desktopx",
  "version": "0.1.0",
  "private": true,
  "description": "Lightweight Electron shell for local dsh web (backend not bundled)",
  "main": "dist/main/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "npm run build && electron .",
    "start": "electron .",
    "pack": "npm run build && electron-builder --win nsis --publish never",
    "smoke": "node scripts/smoke-startup.mjs"
  },
  "devDependencies": {
    "electron": "^38.0.0",
    "electron-builder": "^26.0.0",
    "typescript": "^5.6.0"
  }
}
```
2. 写 `tsconfig.json`：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```
3. 写 `electron-builder.yml`：
```yaml
appId: com.example.dshdesktopx
productName: DSH-DesktopX
copyright: Copyright © 2026
directories:
  output: release
files:
  - dist/**/*
  - assets/**/*
  - package.json
win:
  target:
    - target: nsis
      arch: [x64]
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
```
4. 写 `.gitignore`：`node_modules/ dist/ release/`
5. 写 `README.md`（含 unsigned 蓝框“更多信息→仍要运行”引导 + “已验证 DSH 版本：待填” + 非目标：自动更新/LAN/插件管理/签名）。
6. 跑 `npm install`，再跑 `npm run build`（此时 src 为空会过，Task 2 起有代码后复验）。

## Task 2 — 后端 supervisor（spawn + URL 解析 + 健康）
Files:
- create `src/main/backend.ts`（spawn/解析/stop Der全）
- create `scripts/smoke-startup.mjs`（冒烟探针，复用同正则）
Why: 壳的核心契约；DSH 升级唯一影响面收敛在这一个文件。
Change Necessity: code-change；无现成可复用（官方 desktop 走 framed pipe，本项目走 stdout 行）；最小边界=`backend.ts` + 冒烟脚本。
Impact/Compatibility: 只读 stdout；token 打码记日志；`--port 0` 防 3080 占用。
Verification: `node scripts/smoke-startup.mjs` 180s 内 pass（本机已验证格式）。
Steps:
1. 写 `src/main/backend.ts`（完整可粘贴）：
```ts
import { spawn, type ChildProcess } from 'node:child_process';

/** Upstream readiness contract: stdout line `dsh web: <authenticatedUrl>`. */
export const WEB_READY_RE = /^dsh web:\s*(http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/u;
export const STARTUP_TIMEOUT_MS = 180_000;
export const GRACEFUL_STOP_MS = 5_000;

export interface BackendHandle {
  child: ChildProcess;
  url: string;
}

/** Mask token before any logging. */
export function maskUrl(url: string): string {
  return url.replace(/(\?token=)[^\s&]+/u, '$1***');
}

/**
 * Spawn local `dsh web --no-open --port 0` and resolve once the readiness
 * line is observed. Rejects on: dsh missing, non-zero early exit, timeout.
 */
export function startBackend(): Promise<BackendHandle> {
  return new Promise((resolve, reject) => {
    const spawnArgs = ['web', '--no-open', '--port', '0'];
    let child: ChildProcess;
    try {
      // Windows: resolve via cmd shim so PATH lookup works like the user's shell.
      child = spawn('dsh.cmd', spawnArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (error) {
      reject(new Error(`spawn-failed: ${(error as Error).message}; 请先 npm i -g @deepseek-ai/dsh`));
      return;
    }
    let settled = false;
    let stderrTail = '';
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill(); } catch { /* already gone */ }
      reject(new Error(`startup-timeout(${STARTUP_TIMEOUT_MS}ms)。stderr 尾部: ${stderrTail.slice(-500) || '(空)'}`));
    }, STARTUP_TIMEOUT_MS);
    const done = (fn: () => void): void => { if (!settled) { settled = true; clearTimeout(timer); fn(); } };
    child.stdout?.setEncoding('utf8');
    let buf = '';
    child.stdout?.on('data', (chunk: string) => {
      buf += chunk;
      let idx: number;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).replace(/\r$/, '');
        buf = buf.slice(idx + 1);
        const m = WEB_READY_RE.exec(line);
        if (m?.[1] !== undefined) {
          const url = m[1];
          done(() => resolve({ child, url }));
          return;
        }
      }
    });
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => { stderrTail = (stderrTail + chunk).slice(-2000); });
    child.on('error', (error: Error) => {
      done(() => reject(new Error(`后端启动失败: ${error.message}；未找到 dsh？请先 npm i -g @deepseek-ai/dsh`)));
    });
    child.on('exit', (code) => {
      done(() => reject(new Error(`后端提前退出 code=${String(code)}。stderr 尾部: ${stderrTail.slice(-500) || '(空)'}`)));
    });
  });
}

/** Graceful stop: SIGTERM + 5s, then SIGKILL whole tree. */
export async function stopBackend(child: ChildProcess | undefined): Promise<void> {
  if (child === undefined || child.exitCode !== null) return;
  child.kill('SIGTERM');
  const exited = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), GRACEFUL_STOP_MS);
    child.once('exit', () => { clearTimeout(t); resolve(true); });
  });
  if (!exited) {
    try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']) : child.kill('SIGKILL'); }
    catch { /* best effort */ }
  }
}
```
2. 写 `scripts/smoke-startup.mjs`（用同正则真实 spawn 验证，不依赖 Electron）：
```js
// Smoke: spawn real `dsh web --no-open --port 0`, expect readiness line within 180s.
import { spawn } from 'node:child_process';
const RE = /^dsh web:\s*(http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/u;
const child = spawn('dsh.cmd', ['web', '--no-open', '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
let stderrTail = '';
child.stderr.setEncoding('utf8');
child.stderr.on('data', (c) => { stderrTail = (stderrTail + c).slice(-2000); });
const timer = setTimeout(() => { console.error('SMOKE FAIL: timeout. stderr tail:', stderrTail.slice(-500)); child.kill(); process.exit(1); }, 180_000);
child.stdout.setEncoding('utf8');
let buf = '';
child.stdout.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).replace(/\r$/, '');
    buf = buf.slice(i + 1);
    const m = RE.exec(line);
    if (m) {
      clearTimeout(timer);
      console.log('SMOKE PASS: got readiness line, port =', new URL(m[1]).port);
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} process.exit(0); }, 3000);
      return;
    }
  }
});
child.on('exit', (code) => { clearTimeout(timer); console.error(`SMOKE FAIL: early exit ${code}. stderr:`, stderrTail.slice(-500)); process.exit(1); });
```
3. 跑 `npm run smoke`，期望 180s 内 `SMOKE PASS`（本机 2026-09-16 已验证同格式 pass）。

## Task 3 — 窗口：Splash + 主窗 + 外链策略
Files:
- create `src/main/windows.ts`（splash/main BrowserWindow 工厂）
- create `src/preload/preload.ts`（最小暴露：`windowClose` 请求 + 版本号，无 node）
- create `assets/splash.html`（“正在启动 DeepSeek Harness 后端…”+ spinner + 关闭按钮 + 超时文案位）
- create `assets/error.html`（中文错误页 + 重试按钮位）
Why: 独立窗口是用户核心诉求（隔离浏览器标签页）；Splash 覆盖实测几十秒冷启动。
Change Necessity: code-change；最小边界=窗口工厂+两静态页+最小 preload。
Impact/Compatibility: 主窗只 load 内存 URL；外链弹系统浏览器；DevTools 默认关。
Verification: `npm run dev` 手工：Splash→主窗；外链弹系统浏览器；F5 刷新。
Steps:
1. 写 `src/preload/preload.ts`：
```ts
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('desktopx', {
  /** Ask main to hide (tray) instead of quitting. */
  hideWindow: (): void => { ipcRenderer.send('window:hide'); },
  appVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
});
```
2. 写 `assets/splash.html`（静态，含 `#status` 文案位 + `#close` 按钮发 `window:hide` 不可用时直接 `window.close()` 占位——主进程接管）：
```html
<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>DSH-DesktopX</title>
<style>body{font-family:system-ui;display:flex;height:100vh;margin:0;align-items:center;justify-content:center;background:#0f1115;color:#e8eaf0}.box{text-align:center}.spin{width:36px;height:36px;border:4px solid #333;border-top-color:#4da3ff;border-radius:50%;margin:0 auto 16px;animation:s 1s linear infinite}@keyframes s{to{transform:rotate(360deg)}}</style>
</head><body><div class="box"><div class="spin"></div><div id="status">正在启动 DeepSeek Harness 后端…</div></div></body></html>
```
3. 写 `assets/error.html`（占位，主进程用 query 传 `msg`，页面 JS 渲染 + 重试按钮发 IPC `backend:retry`）：
```html
<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>启动失败 - DSH-DesktopX</title>
<style>body{font-family:system-ui;background:#0f1115;color:#e8eaf0;display:flex;height:100vh;margin:0;align-items:center;justify-content:center}.box{max-width:520px}button{padding:8px 20px;font-size:14px}</style>
</head><body><div class="box"><h2>后端启动失败</h2><pre id="msg"></pre><button id="retry">重试</button></div>
<script>document.getElementById('msg').textContent = new URLSearchParams(location.search).get('msg') || '未知错误';</script></body></html>
```
4. 写 `src/main/windows.ts`：
```ts
import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

export function createSplash(): BrowserWindow {
  const win = new BrowserWindow({ width: 420, height: 300, frame: false, resizable: false, alwaysOnTop: true, center: true });
  void win.loadFile(join(__dirname, '../../assets/splash.html'));
  return win;
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280, height: 860, show: false, center: true,
    webPreferences: { preload: join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  // Keep the shell window on the local GUI: external links go to the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/u.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!/^http:\/\/127\.0\.0\.1:/u.test(url)) { event.preventDefault(); void shell.openExternal(url); }
  });
  return win;
}
```

## Task 4 — 主进程组装：单实例 + 启动序列 + 托盘 + 退出
Files:
- create `src/main/index.ts`（app 生命周期 + IPC + tray）
- create `src/main/tray.ts`（托盘菜单：显示/重启后端/DevTools/彻底退出）
- create `assets/tray.ico`（占位说明：先用 electron 默认图标，发布前替换——步骤内写清用默认图标跑通，换图标为发布前 checklist 项）
Why: 关窗托盘常驻（Q4=B）与单实例是需求 non-negotiable；退出杀干净是验收项。
Change Necessity: code-change；最小边界=组装 + 托盘。
Impact/Compatibility: X=hide；彻底退出=优雅停机；二次启动聚焦。
Verification: 手工：双开聚焦；X 后托盘在、node(dsh) 在；彻底退出无残留。
Steps:
1. 写 `src/main/tray.ts`：
```ts
import { Menu, Tray } from 'electron';

export interface TrayActions {
  onShow: () => void;
  onRestart: () => void;
  onDevTools: () => void;
  onQuit: () => void;
}

export function createTray(actions: TrayActions): Tray {
  const tray = new Tray(process.execPath.endsWith('electron.exe') ? undefined as never : '');
  // NOTE: dev run passes no icon; packager injects assets/tray.ico. Placeholder keeps types green.
  const menu = Menu.buildFromTemplate([
    { label: '显示窗口', click: actions.onShow },
    { label: '重启后端', click: actions.onRestart },
    { label: '打开 DevTools', click: actions.onDevTools },
    { type: 'separator' },
    { label: '彻底退出', click: actions.onQuit },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip('DSH-DesktopX（后端运行中）');
  tray.on('click', actions.onShow);
  return tray;
}
```
（注：Tray 构造需真实图标路径——实现时 `new Tray(join(__dirname,'../../assets/tray.png'))`，先放任意 16x16 png；步骤要求：从 electron 默认图标复制或在线生成 1 张 `assets/tray.png`，ico 发布前由 electron-builder 由 png 生成。）
2. 写 `src/main/index.ts`：
```ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainWindow, createSplash } from './windows.js';
import { startBackend, stopBackend, type BackendHandle } from './backend.js';
import { createTray } from './tray.js';

let mainWin: BrowserWindow | undefined;
let splash: BrowserWindow | undefined;
let backend: BackendHandle | undefined;
let quitting = false;

if (!app.requestSingleInstanceLock()) app.quit();

async function boot(): Promise<void> {
  await app.whenReady();
  splash = createSplash();
  mainWin = createMainWindow();
  mainWin.on('close', (event) => {
    if (!quitting) { event.preventDefault(); mainWin?.hide(); }
  });
  ipcMain.on('window:hide', () => mainWin?.hide());
  ipcMain.handle('app:version', () => app.getVersion());
  createTray({
    onShow: () => { mainWin?.show(); mainWin?.focus(); },
    onRestart: () => void reboot(),
    onDevTools: () => mainWin?.webContents.openDevTools({ mode: 'detach' }),
    onQuit: () => void quitAll(),
  });
  app.on('second-instance', () => { mainWin?.show(); mainWin?.focus(); });
  await reboot();
}

async function reboot(): Promise<void> {
  splash?.show();
  if (backend !== undefined) { await stopBackend(backend.child); backend = undefined; }
  try {
    backend = await startBackend();
    await mainWin?.loadURL(backend.url);
    mainWin?.show();
    splash?.close(); splash = undefined;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await mainWin?.loadFile('assets/error.html', { query: { msg } });
    mainWin?.show(); splash?.close(); splash = undefined;
  }
}

async function quitAll(): Promise<void> {
  quitting = true;
  await stopBackend(backend?.child);
  app.quit();
}

app.on('window-all-closed', () => { /* tray keeps us alive on Windows */ });
void boot();
```
3. 准备 `assets/tray.png`（任意 16x16），并把 `tray.ts` 构造改为真实路径；`npm run dev` 全流程手工走一遍。

## Task 5 — 打包/发布收尾
Files:
- modify `electron-builder.yml`（appId 换用户真实反向域名；nsis 文案）
- modify `README.md`（填已验证 DSH 版本：跑 `dsh --version` 填入；unsigned 蓝框引导；安装/卸载/托盘说明）
- modify `assets/`（正式图标替换占位）
Why: 可发布的 NSIS unsigned 包是 Q5=B 的交付物。
Change Necessity: docs/config-only（无源码逻辑变更）。
Impact/Compatibility: per-user 安装；卸载需提示先“彻底退出”。
Verification: `npm run pack` 产出 `release/*.exe`；全新目录安装→双击→验收清单全过。
Steps:
1. 用户提供反向域名 appId（如 `com.yang.dshdesktopx`），替换 `electron-builder.yml` 占位。
2. `npm run pack`，确认 `release/` 有 setup exe。
3. 按验收清单手工验证 6 项（Task 头 Verification）。
4. 打 git tag `v0.1.0`，GitHub Release 挂 exe + notes（含 unsigned 蓝框引导 + 已验证 DSH 版本）。

## Risks
- 上游 `dsh web:` 行格式变化 → 影响面收敛 `backend.ts` 正则 + 冒烟脚本；README 置顶版本缓解。
- 冷启动慢（实测几十秒）→ 180s 超时 + Splash 可关闭；超时页展示 stderr 尾部。
- `dsh.cmd` 不在 PATH → 中文错误页 + 安装指引。
- unsigned SmartScreen 蓝框 → Release notes 引导；后续 SignPath 排期（非本计划）。
- 进程残留 → SIGTERM 5s + taskkill /T /F；验收含残留检查。

## Retirement
- 无旧 owner（绿地）。占位图标/占位 appId 在 Task 5 替换，不留 fallback。
- 若上游未来提供官方轻量模式，本壳的 spawn 层可整体退役，后端定位只改 `backend.ts`。
