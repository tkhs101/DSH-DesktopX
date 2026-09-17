// Startup probe: time `dsh web` readiness and log every stdout line with a
// timestamp, so boot phases are visible.
//
// Usage:
//   node scripts/measure-startup.mjs <runs> [-- <extra dsh args...>]
//   node scripts/measure-startup.mjs 3
//   node scripts/measure-startup.mjs 3 -- --patch C:/tmp/disable-hindsight.yml
import { spawn } from 'node:child_process';

const RE = /^dsh web:\s*(http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/u;
const argv = process.argv.slice(2);
const dashDash = argv.indexOf('--');
const extra = dashDash >= 0 ? argv.slice(dashDash + 1) : [];
const RUNS = Number((dashDash >= 0 ? argv.slice(0, dashDash) : argv)[0] ?? 3);

const args = ['/d', '/s', '/c', 'dsh', 'web', '--no-open', '--port', '0', ...extra];

function once() {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const child = spawn('cmd.exe', args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const ms = () => (performance.now() - t0).toFixed(0).padStart(6);
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (c) => {
      stderr = (stderr + c).slice(-1500);
      for (const line of String(c).split(/\r?\n/u)) if (line.trim() !== '') console.log(`${ms()}ms [err] ${line}`);
    });
    child.stdout.setEncoding('utf8');
    let buf = '';
    let finished = false;
    child.stdout.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, '');
        buf = buf.slice(i + 1);
        const m = RE.exec(line);
        console.log(`${ms()}ms [out] ${line.replace(/(\?token=)\S+/u, '$1***')}`);
        if (m && !finished) {
          finished = true;
          console.log(`>>> READY at ${ms()}ms port=${new URL(m[1]).port}`);
          child.kill('SIGTERM');
          setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } resolve(); }, 1200);
          return;
        }
      }
    });
    child.on('exit', (code) => {
      if (finished) return;
      finished = true;
      console.log(`>>> EXIT code=${code} after ${ms()}ms; stderr=${stderr.slice(-300)}`);
      resolve();
    });
    setTimeout(() => { if (!finished) { finished = true; console.log('>>> TIMEOUT'); child.kill(); resolve(); } }, 180_000);
  });
}

console.log(`### ${RUNS} run(s); extra args: ${extra.length ? extra.join(' ') : '(none)'}`);
for (let i = 0; i < RUNS; i++) {
  console.log(`\n--- run ${i + 1} ---`);
  await once();
}
process.exit(0);
