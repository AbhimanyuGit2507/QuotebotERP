import { spawn, ChildProcess } from 'child_process';

const SIDECAR_DIR = 'item-intelligence-service';
const PY_CMD = process.env.PYTHON_CMD || 'python';

function waitForSidecar(url: string, timeout = 10000) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const tick = async () => {
      try {
        // @ts-ignore
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch (e) {
        // ignore
      }

      if (Date.now() - start > timeout) return reject(new Error('sidecar did not start')); 
      setTimeout(tick, 200);
    };
    tick();
  });
}

describe('Item intelligence sidecar (contract)', () => {
  let proc: ChildProcess | null = null;

  beforeAll(async () => {
    proc = spawn(PY_CMD, ['-m', 'uvicorn', 'app.main:app', '--port', '3801'], { cwd: SIDECAR_DIR, stdio: 'ignore' });
    await waitForSidecar('http://127.0.0.1:3801/health', 12000);
  }, 20000);

  afterAll(() => {
    if (proc && !proc.killed) proc.kill();
  });

  test('sidecar health is ok', async () => {
    // @ts-ignore
    const res = await fetch('http://127.0.0.1:3801/health');
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
