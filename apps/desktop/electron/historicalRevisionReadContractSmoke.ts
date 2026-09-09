import Database from 'better-sqlite3';
import { resolveTrialRevisionDesignResult } from './trialMixV2RevisionDesignResolver';

const database = new Database(':memory:');
database.exec(`
  CREATE TABLE mix_results (
    id TEXT PRIMARY KEY,
    mix_design_id TEXT NOT NULL,
    cementitious_content_kg_m3 REAL,
    water_content_kg_m3 REAL,
    w_cm_ratio REAL,
    fine_aggregate_kg_m3 REAL,
    coarse_aggregate_kg_m3 REAL,
    air_content_percent REAL,
    notes TEXT
  );
  CREATE TABLE mix_design_revision_snapshots (
    id TEXT PRIMARY KEY,
    mix_design_id TEXT NOT NULL,
    revision_number INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL
  );
`);

database.prepare(`
  INSERT INTO mix_results (
    id, mix_design_id, cementitious_content_kg_m3, water_content_kg_m3,
    w_cm_ratio, fine_aggregate_kg_m3, coarse_aggregate_kg_m3, air_content_percent, notes
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('current-result', 'mix-1', 420, 168, 0.4, 720, 1040, 2, 'current');

const historicalPayload = {
  schema: 'tolou.mix-design.snapshot.v1',
  mixResults: [{
    id: 'historical-result',
    mix_design_id: 'mix-1',
    cementitious_content_kg_m3: 400,
    water_content_kg_m3: 180,
    w_cm_ratio: 0.45,
    fine_aggregate_kg_m3: 700,
    coarse_aggregate_kg_m3: 1060,
    air_content_percent: 1.5,
    notes: 'historical'
  }]
};

database.prepare(`
  INSERT INTO mix_design_revision_snapshots (id, mix_design_id, revision_number, snapshot_json)
  VALUES (?, ?, ?, ?)
`).run('snapshot-r1', 'mix-1', 1, JSON.stringify(historicalPayload));

const current = resolveTrialRevisionDesignResult(database, 'mix-1', 2, 2);
if (current.source !== 'current_mix_results' || current.id !== 'current-result' || current.snapshotId !== null) {
  throw new Error('Current revision resolver contract must use current mix_results only.');
}
if (current.cementitiousKgM3 !== 420 || current.waterKgM3 !== 168 || current.wCmRatio !== 0.4) {
  throw new Error('Current revision resolver returned unexpected current design values.');
}

const historical = resolveTrialRevisionDesignResult(database, 'mix-1', 1, 2);
if (historical.source !== 'immutable_revision_snapshot' || historical.id !== 'historical-result') {
  throw new Error('Historical revision resolver contract must use immutable revision snapshot.');
}
if (historical.snapshotId !== 'snapshot-r1' || historical.snapshotRevisionNumber !== 1) {
  throw new Error('Historical revision resolver lost snapshot traceability.');
}
if (historical.cementitiousKgM3 !== 400 || historical.waterKgM3 !== 180 || historical.wCmRatio !== 0.45) {
  throw new Error('Historical resolver leaked current design values into historical evidence.');
}

let missingSnapshotRejected = false;
try {
  resolveTrialRevisionDesignResult(database, 'mix-1', 0, 2);
} catch (error) {
  missingSnapshotRejected = error instanceof Error && error.message.includes('Immutable snapshot');
}
if (!missingSnapshotRejected) throw new Error('Missing historical snapshot must be rejected.');

database.prepare(`
  INSERT INTO mix_design_revision_snapshots (id, mix_design_id, revision_number, snapshot_json)
  VALUES (?, ?, ?, ?)
`).run('snapshot-bad-schema', 'mix-1', 3, JSON.stringify({ schema: 'future.schema', mixResults: historicalPayload.mixResults }));
let badSchemaRejected = false;
try {
  resolveTrialRevisionDesignResult(database, 'mix-1', 3, 4);
} catch (error) {
  badSchemaRejected = error instanceof Error && error.message.includes('Snapshot schema');
}
if (!badSchemaRejected) throw new Error('Unsupported historical snapshot schema must be rejected.');

database.prepare(`
  INSERT INTO mix_design_revision_snapshots (id, mix_design_id, revision_number, snapshot_json)
  VALUES (?, ?, ?, ?)
`).run('snapshot-wrong-owner', 'mix-1', 4, JSON.stringify({
  schema: 'tolou.mix-design.snapshot.v1',
  mixResults: [{ ...historicalPayload.mixResults[0], id: 'foreign-result', mix_design_id: 'mix-2' }]
}));
let ownerMismatchRejected = false;
try {
  resolveTrialRevisionDesignResult(database, 'mix-1', 4, 5);
} catch (error) {
  ownerMismatchRejected = error instanceof Error && error.message.includes('Mix Design دیگری');
}
if (!ownerMismatchRejected) throw new Error('Historical snapshot identity mismatch must be rejected.');

database.close();
console.log('Historical revision read contract smoke passed: current reads use live results and historical reads use immutable snapshots with schema and identity guards.');
