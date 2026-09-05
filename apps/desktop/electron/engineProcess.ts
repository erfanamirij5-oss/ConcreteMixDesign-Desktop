import { spawn } from 'node:child_process';

export type EngineLaunch = { executable: string; prefixArgs: string[] };
export type EngineProcessOptions = {
  timeoutMs?: number;
  maxStdoutBytes?: number;
  maxStderrBytes?: number;
};

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_STDOUT_BYTES = 4 * 1024 * 1024;
const DEFAULT_MAX_STDERR_BYTES = 512 * 1024;

export function runBoundedEngineCommand(
  launch: EngineLaunch,
  command: string,
  payload?: unknown,
  options: EngineProcessOptions = {}
): Promise<unknown> {
  const timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const maxStdoutBytes = positiveInteger(options.maxStdoutBytes, DEFAULT_MAX_STDOUT_BYTES);
  const maxStderrBytes = positiveInteger(options.maxStderrBytes, DEFAULT_MAX_STDERR_BYTES);

  return new Promise((resolve, reject) => {
    const child = spawn(launch.executable, [...launch.prefixArgs, command], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    let settled = false;
    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;

    const finish = (error?: Error, value?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
      child.removeAllListeners();
      if (error) reject(error); else resolve(value);
    };

    const terminate = (error: Error) => {
      if (!child.killed) child.kill();
      finish(error);
    };

    const timer = setTimeout(() => {
      terminate(new Error(`Engineering engine timed out after ${timeoutMs} ms.`));
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stdoutBytes += buffer.length;
      if (stdoutBytes > maxStdoutBytes) {
        terminate(new Error(`Engineering engine stdout exceeded ${maxStdoutBytes} bytes.`));
        return;
      }
      stdout += buffer.toString('utf8');
    });

    child.stderr.on('data', chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stderrBytes += buffer.length;
      if (stderrBytes > maxStderrBytes) {
        terminate(new Error(`Engineering engine stderr exceeded ${maxStderrBytes} bytes.`));
        return;
      }
      stderr += buffer.toString('utf8');
    });

    child.on('error', error => finish(error));
    child.on('close', code => {
      if (settled) return;
      if (code !== 0) {
        finish(new Error((stderr || `Engineering engine exited with code ${code}`).trim()));
        return;
      }
      try {
        finish(undefined, JSON.parse(stdout));
      } catch {
        finish(new Error('Engineering engine returned invalid JSON.'));
      }
    });

    try {
      const serialized = JSON.stringify(payload ?? {});
      child.stdin.end(serialized, 'utf8');
    } catch (error) {
      terminate(error instanceof Error ? error : new Error('Engineering engine payload could not be serialized.'));
    }
  });
}

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}
