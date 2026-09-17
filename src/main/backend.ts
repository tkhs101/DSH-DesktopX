import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';

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

interface SpawnAttempt {
  command: string;
  args: string[];
}

/**
 * Locate `<prefix>/node_modules/@deepseek-ai/dsh/lib/bin.js` so the backend
 * can be launched as `node <entry> ...` directly, without the npm `cmd.exe`
 * shim (`cmd.exe /d /s /c dsh ...`). The shim costs a console-host hop per
 * boot and — worse — makes `child` the throwaway `cmd.exe` wrapper instead
 * of the node backend, so every downstream signal/kill misses the real
 * process. Resolution: beside each `dsh.cmd` found on PATH, then the usual
 * global-prefix layouts. Returns `undefined` when nothing is found (caller
 * falls back to the legacy shim spawn).
 */
export function resolveDshEntry(): string | undefined {
  const candidates: string[] = [];
  const pathVar = process.env['PATH'] ?? '';
  for (const raw of pathVar.split(delimiter)) {
    const dir = raw.trim().replace(/^"+|"+$/gu, '');
    if (dir === '') continue;
    try {
      if (existsSync(join(dir, 'dsh.cmd'))) {
        candidates.push(resolve(join(dir, 'node_modules/@deepseek-ai/dsh/lib/bin.js')));
      }
    } catch { /* unreadable PATH entry — skip */ }
  }
  for (const base of [process.env['APPDATA'], process.env['ProgramFiles'], process.env['ProgramFiles(x86)']]) {
    if (base === undefined || base === '') continue;
    candidates.push(resolve(join(base, 'npm/node_modules/@deepseek-ai/dsh/lib/bin.js')));
    candidates.push(resolve(join(base, 'nodejs/node_modules/@deepseek-ai/dsh/lib/bin.js')));
  }
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    try {
      if (existsSync(candidate)) return candidate;
    } catch { /* skip */ }
  }
  return undefined;
}

function directAttempt(entry: string): SpawnAttempt {
  // `node` is a real binary (not a shim), so CreateProcess resolves it via
  // PATH directly — no shell, no cmd.exe hop.
  return { command: 'node', args: [entry, 'web', '--no-open', '--port', '0'] };
}

function shimAttempt(): SpawnAttempt {
  // Legacy fallback: .cmd shims cannot be spawned directly (EINVAL);
  // route through cmd.exe so PATH lookup works like the user's shell.
  return { command: 'cmd.exe', args: ['/d', '/s', '/c', 'dsh', 'web', '--no-open', '--port', '0'] };
}

/**
 * Spawn local `dsh web --no-open --port 0` and resolve once the readiness
 * line is observed. Rejects on: dsh missing, non-zero early exit, timeout.
 */
export function startBackend(): Promise<BackendHandle> {
  return new Promise((resolve, reject) => {
    const entry = resolveDshEntry();
    const attempts: SpawnAttempt[] = entry === undefined
      ? [shimAttempt()]
      : [directAttempt(entry), shimAttempt()];
    const timer = setTimeout(() => {
      finish(() => reject(new Error(`startup-timeout(${String(STARTUP_TIMEOUT_MS)}ms)`)));
    }, STARTUP_TIMEOUT_MS);
    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const trySpawn = (index: number): void => {
      if (settled) return;
      const attempt = attempts[index];
      if (attempt === undefined) {
        finish(() => reject(new Error('后端启动失败；未找到 dsh？请先 npm i -g @deepseek-ai/dsh')));
        return;
      }
      let child: ChildProcess;
      try {
        child = spawn(attempt.command, attempt.args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });
      } catch {
        trySpawn(index + 1);
        return;
      }
      let stderrTail = '';
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
            finish(() => resolve({ child, url }));
            return;
          }
        }
      });
      child.stderr?.setEncoding('utf8');
      child.stderr?.on('data', (chunk: string) => { stderrTail = (stderrTail + chunk).slice(-2000); });
      child.on('error', () => {
        // Direct `node` launch failed (e.g. node not on PATH): fall through
        // to the shim once instead of failing outright.
        trySpawn(index + 1);
      });
      child.on('exit', (code) => {
        finish(() => reject(new Error(`后端提前退出 code=${String(code)}。stderr 尾部: ${stderrTail.slice(-500) || '(空)'}`)));
      });
    };
    trySpawn(0);
  });
}

function waitForExit(child: ChildProcess, ms: number): Promise<boolean> {
  if (child.exitCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), ms);
    child.once('exit', () => { clearTimeout(t); resolve(true); });
  });
}

/**
 * Stop the backend by taking down the whole process tree. On Windows the
 * child may be the throwaway `cmd.exe` wrapper (legacy shim path), where a
 * plain kill only removes the wrapper while the real node backend survives
 * as an orphan holding its port (measured: 2ms wrapper exit, backend still
 * serving). `taskkill /T /F` covers both the wrapper and the direct-node
 * child uniformly. (Windows kills are forceful by nature — Node's kill()
 * maps to TerminateProcess there too — so no grace is lost.)
 */
export async function stopBackend(child: ChildProcess | undefined): Promise<void> {
  if (child === undefined || child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } catch { /* best effort */ }
    await waitForExit(child, GRACEFUL_STOP_MS);
    return;
  }
  child.kill('SIGTERM');
  const exited = await waitForExit(child, GRACEFUL_STOP_MS);
  if (!exited) {
    try { child.kill('SIGKILL'); } catch { /* best effort */ }
  }
}
