import assert from 'node:assert/strict';
import { closeDatabaseSafely, runStartupSequence } from './runtimeLifecycle';

async function main() {
  const order: string[] = [];
  await runStartupSequence([
    { name: 'database', run: () => { order.push('database'); } },
    { name: 'licensing', run: async () => { order.push('licensing'); } },
    { name: 'security', run: () => { order.push('security'); } }
  ]);
  assert.deepEqual(order, ['database', 'licensing', 'security']);

  let reachedAfterFailure = false;
  await assert.rejects(
    runStartupSequence([
      { name: 'first', run: () => undefined },
      { name: 'critical-component', run: () => { throw new Error('boom'); } },
      { name: 'must-not-run', run: () => { reachedAfterFailure = true; } }
    ]),
    /Runtime startup failed at critical-component: boom/
  );
  assert.equal(reachedAfterFailure, false);

  const lifecycle: string[] = [];
  const closed = closeDatabaseSafely({
    pragma: statement => { lifecycle.push(statement); },
    close: () => { lifecycle.push('close'); }
  });
  assert.deepEqual(lifecycle, ['wal_checkpoint(TRUNCATE)', 'close']);
  assert.deepEqual(closed, { closed: true });

  const checkpointFailure = closeDatabaseSafely({
    pragma: () => { throw new Error('checkpoint failed'); },
    close: () => { lifecycle.push('close-after-checkpoint-failure'); }
  });
  assert.equal(checkpointFailure.closed, true);
  assert.match(checkpointFailure.error ?? '', /checkpoint failed/);

  const closeFailure = closeDatabaseSafely({
    pragma: () => undefined,
    close: () => { throw new Error('close failed'); }
  });
  assert.equal(closeFailure.closed, false);
  assert.match(closeFailure.error ?? '', /close failed/);

  assert.deepEqual(closeDatabaseSafely(null), { closed: false });
  console.log('Gate 11 runtime lifecycle smoke passed: startup is ordered/fail-closed and database shutdown checkpoints and closes deterministically.');
}

void main();
