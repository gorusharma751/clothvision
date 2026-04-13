import { execSync } from 'child_process';

const port = Number(process.env.PORT || 5000);

const getPidOnPortWindows = (targetPort) => {
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = out.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('TCP')) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 5) continue;
      const local = parts[1] || '';
      const state = (parts[3] || '').toUpperCase();
      const pidStr = parts[4] || '';
      const localPort = local.split(':').pop();
      if (state === 'LISTENING' && String(targetPort) === localPort) {
        const pid = Number(pidStr);
        if (Number.isFinite(pid) && pid > 0) return pid;
      }
    }
  } catch {
    return null;
  }
  return null;
};

const isNodeProcessWindows = (pid) => {
  try {
    const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (!out || out.startsWith('INFO:')) return false;
    // CSV row format: "Image Name","PID",...
    const first = out.split(',')[0]?.replace(/^"|"$/g, '').toLowerCase();
    return first === 'node.exe';
  } catch {
    return false;
  }
};

const killPidWindows = (pid) => {
  execSync(`taskkill /PID ${pid} /F`, { stdio: ['ignore', 'ignore', 'ignore'] });
};

const main = () => {
  // Keep behavior conservative on non-Windows.
  if (process.platform !== 'win32') return;

  const pid = getPidOnPortWindows(port);
  if (!pid || pid === process.pid) return;

  if (!isNodeProcessWindows(pid)) {
    console.warn(`Port ${port} is in use by PID ${pid} (non-node). Leaving it untouched.`);
    return;
  }

  try {
    killPidWindows(pid);
    console.log(`Freed port ${port} by terminating stale node process PID ${pid}.`);
  } catch (err) {
    console.warn(`Could not free port ${port}: ${err?.message || err}`);
  }
};

main();
