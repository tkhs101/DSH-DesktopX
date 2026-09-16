// Smoke: spawn real `dsh web --no-open --port 0`, expect readiness line within 180s.
import { spawn } from 'node:child_process';
const RE = /^dsh web:\s*(http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/u;
const child = spawn('cmd.exe', ['/d', '/s', '/c', 'dsh', 'web', '--no-open', '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
let stderrTail = '';
let done = false;
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
      done = true;
      clearTimeout(timer);
      console.log('SMOKE PASS: got readiness line, port =', new URL(m[1]).port);
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} process.exit(0); }, 3000);
      return;
    }
  }
});
child.on('exit', (code) => { if (done) return; clearTimeout(timer); console.error(`SMOKE FAIL: early exit ${code}. stderr:`, stderrTail.slice(-500)); process.exit(1); });
