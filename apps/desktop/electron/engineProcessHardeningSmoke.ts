import assert from 'node:assert/strict';
import { runBoundedEngineCommand } from './engineProcess';

async function expectReject(promise: Promise<unknown>, pattern: RegExp) {
  await assert.rejects(promise, pattern);
}

async function main() {
  const ok = await runBoundedEngineCommand(
    { executable: process.execPath, prefixArgs: ['-e', "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write(JSON.stringify({status:'pass'})));" ] },
    'ignored',
    { hello: 'world' },
    { timeoutMs: 2_000, maxStdoutBytes: 1024, maxStderrBytes: 1024 }
  ) as { status?: string };
  assert.equal(ok.status, 'pass');

  await expectReject(
    runBoundedEngineCommand(
      { executable: process.execPath, prefixArgs: ['-e', "setInterval(() => {}, 1000);" ] },
      'ignored',
      {},
      { timeoutMs: 80, maxStdoutBytes: 1024, maxStderrBytes: 1024 }
    ),
    /timed out/i
  );

  await expectReject(
    runBoundedEngineCommand(
      { executable: process.execPath, prefixArgs: ['-e', "process.stdout.write('x'.repeat(4096));" ] },
      'ignored',
      {},
      { timeoutMs: 2_000, maxStdoutBytes: 128, maxStderrBytes: 1024 }
    ),
    /stdout exceeded/i
  );

  await expectReject(
    runBoundedEngineCommand(
      { executable: process.execPath, prefixArgs: ['-e', "process.stderr.write('boom'); process.exit(7);" ] },
      'ignored',
      {},
      { timeoutMs: 2_000, maxStdoutBytes: 1024, maxStderrBytes: 1024 }
    ),
    /boom/i
  );

  await expectReject(
    runBoundedEngineCommand(
      { executable: process.execPath, prefixArgs: ['-e', "process.stdout.write('not-json');" ] },
      'ignored',
      {},
      { timeoutMs: 2_000, maxStdoutBytes: 1024, maxStderrBytes: 1024 }
    ),
    /invalid JSON/i
  );

  console.log('Gate 11 engine process hardening smoke passed: timeout, bounded output, nonzero exit and invalid JSON are fail-closed.');
}

void main();
