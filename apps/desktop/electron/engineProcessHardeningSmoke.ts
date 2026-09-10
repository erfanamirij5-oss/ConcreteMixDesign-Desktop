import assert from 'node:assert/strict';
import { runBoundedEngineCommand } from './engineProcess';
import { LEGACY_V11_ENGINE_STANDARD_IDS, LEGACY_V11_PROFILE } from './standardProfileEngineDispatch';

async function expectReject(promise: Promise<unknown>, pattern: RegExp) {
  await assert.rejects(promise, pattern);
}

async function main() {
  const echoScript = "let raw=''; process.stdin.setEncoding('utf8'); process.stdin.on('data', c => raw += c); process.stdin.on('end', () => process.stdout.write(JSON.stringify({status:'pass', payload: JSON.parse(raw), standard_profile:{profile_id:'engine-spoof',profile_version:'0'}})));";

  const profiled = await runBoundedEngineCommand(
    { executable: process.execPath, prefixArgs: ['-e', echoScript] },
    'calculate-normal-mix',
    { hello: 'world', standards: ['renderer-spoofed-standard'] },
    { timeoutMs: 2_000, maxStdoutBytes: 16 * 1024, maxStderrBytes: 1024 }
  ) as { status?: string; payload?: Record<string, unknown>; standard_profile?: Record<string, unknown> };
  assert.equal(profiled.status, 'pass');
  assert.equal(profiled.payload?.hello, 'world');
  assert.deepEqual(profiled.payload?.standards, [...LEGACY_V11_ENGINE_STANDARD_IDS]);
  const dispatchedProfile = profiled.payload?.standard_profile as Record<string, unknown> | undefined;
  assert.equal(dispatchedProfile?.profile_id, LEGACY_V11_PROFILE.profileId);
  assert.equal(dispatchedProfile?.profile_version, LEGACY_V11_PROFILE.profileVersion);
  assert.equal(dispatchedProfile?.selection_source, 'v1.1_legacy_compatibility_mapping');
  assert.equal(profiled.standard_profile?.profile_id, LEGACY_V11_PROFILE.profileId);
  assert.equal(profiled.standard_profile?.profile_version, LEGACY_V11_PROFILE.profileVersion);

  const unrelated = await runBoundedEngineCommand(
    { executable: process.execPath, prefixArgs: ['-e', echoScript] },
    'health-like-test-command',
    { hello: 'world' },
    { timeoutMs: 2_000, maxStdoutBytes: 16 * 1024, maxStderrBytes: 1024 }
  ) as { payload?: Record<string, unknown>; standard_profile?: Record<string, unknown> };
  assert.equal(unrelated.payload?.hello, 'world');
  assert.equal(unrelated.payload?.standard_profile, undefined);
  assert.equal(unrelated.standard_profile?.profile_id, 'engine-spoof');

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

  console.log('G02 engine dispatch smoke passed: dispatched profile evidence is Main-bound to normal-mix results and process hardening remains fail-closed.');
}

void main();
