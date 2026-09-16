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
      // Windows: .cmd shims cannot be spawned directly (EINVAL);
      // route through cmd.exe so PATH lookup works like the user's shell.
      child = spawn('cmd.exe', ['/d', '/s', '/c', 'dsh', ...spawnArgs], {
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
