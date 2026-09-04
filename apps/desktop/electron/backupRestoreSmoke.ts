import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  commitPreparedRestore,
  createValidatedBackup,
  prepareValidatedRestore,
  restoreValidatedBackup,
  validateBackupCandidate
} from './backupRestoreService';

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tolou-backup-restore-'));
const activePath = path.join(tempDir, 'active.sqlite');
const backupPath = path.join(tempDir, 'backup.sqlite');
const corruptPath = path.join(tempDir, 'corrupt.sqlite');

const migrationIds = [
  '001_initial_schema','002_manual_gradation_controls','003_aggregate_material_fields','004_sieve_labels','005_durability_inputs','006_cementitious_material_fields','007_full_chloride_inputs','008_sulfate_cementitious_compliance','009_asr_alkali_inputs','010_mixing_water_c1602','011_recycled_water_monitoring','012_aggregate_quality_inputs','013_advanced_aggregate_quality','014_aggregate_shape_texture','015_aggregate_blend_optimizer_criteria','016_mix_design_revision_control','017_mix_design_management_workflow','018_mix_design_engineering_identity','019_professional_material_library','020_minimum_trial_mix','021_report_center_snapshots'
];

function seedCurrentSchema(database: Database.Database) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL);
  `);
  const insert = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
  for (const id of migrationIds) insert.run(id, new Date().toISOString());
}

function cloneBackup(source: string, destination: string) {
  copyFileSync(source, destination);
  copyFileSync(`${source}.manifest.json`, `${destination}.manifest.json`);
}

function assertProject(databasePath: string, expectedId: string) {
  const database = new Database(databasePath, { readonly: true });
  try {
    assert.equal((database.prepare('SELECT id FROM projects').get() as { id: string }).id, expectedId);
    assert.equal(database.pragma('quick_check', { simple: true }), 'ok');
  } finally {
    database.close();
  }
}

async function run() {
  try {
    const active = new Database(activePath);
    active.pragma('journal_mode = WAL');
    seedCurrentSchema(active);
    active.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run('project-before', 'Before restore');

    const manifest = await createValidatedBackup(active, backupPath);
    assert.equal(manifest.formatVersion, 1);
    assert.equal(manifest.schemaMigrations.at(-1), '021_report_center_snapshots');
    assert.match(manifest.sha256, /^[a-f0-9]{64}$/);
    assert.ok(manifest.sizeBytes > 0);
    assert.deepEqual(validateBackupCandidate(backupPath).sha256, manifest.sha256);

    active.prepare('DELETE FROM projects');
    active.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run('project-after', 'After backup');

    const restored = await restoreValidatedBackup(backupPath, activePath, active);
    assert.ok(restored.recoveryPath.includes('.pre-restore-'));
    assert.throws(() => active.prepare('SELECT 1').get(), /closed|not open/i, 'Restore must close the active SQLite connection before file replacement');
    assertProject(activePath, 'project-before');
    assertProject(restored.recoveryPath, 'project-after');

    const activeBeforeRejectedRestore = readFileSync(activePath);
    writeFileSync(corruptPath, Buffer.from('not a sqlite database'));
    const activeForRejectedRestore = new Database(activePath);
    activeForRejectedRestore.pragma('journal_mode = WAL');
    assert.throws(() => validateBackupCandidate(corruptPath));
    await assert.rejects(() => restoreValidatedBackup(corruptPath, activePath, activeForRejectedRestore));
    assert.deepEqual(readFileSync(activePath), activeBeforeRejectedRestore, 'Rejected restore must not modify active DB bytes');
    const healthRow = activeForRejectedRestore.prepare('SELECT 1 AS value').get() as { value: number };
    assert.equal(healthRow.value, 1, 'Pre-validation failure must leave active connection open');
    activeForRejectedRestore.close();

    const missingManifestPath = path.join(tempDir, 'missing-manifest.sqlite');
    copyFileSync(backupPath, missingManifestPath);
    assert.throws(() => validateBackupCandidate(missingManifestPath), /manifest is missing/i);

    const futureSchemaPath = path.join(tempDir, 'future-schema.sqlite');
    cloneBackup(backupPath, futureSchemaPath);
    const futureDatabase = new Database(futureSchemaPath);
    futureDatabase.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run('999_future_schema', new Date().toISOString());
    futureDatabase.close();
    assert.throws(() => validateBackupCandidate(futureSchemaPath), /unknown|migration|newer|compatib/i, 'Future/unknown schema must be rejected');

    const fkInvalidPath = path.join(tempDir, 'fk-invalid.sqlite');
    cloneBackup(backupPath, fkInvalidPath);
    const fkDatabase = new Database(fkInvalidPath);
    fkDatabase.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE parent_probe (id TEXT PRIMARY KEY);
      CREATE TABLE child_probe (id TEXT PRIMARY KEY, parent_id TEXT NOT NULL REFERENCES parent_probe(id));
      INSERT INTO child_probe (id, parent_id) VALUES ('orphan', 'missing-parent');
    `);
    fkDatabase.close();
    assert.throws(() => validateBackupCandidate(fkInvalidPath), /foreign|integrity|constraint/i, 'FK-invalid backup must be rejected');

    const badDigestManifestPath = path.join(tempDir, 'bad-digest.sqlite');
    cloneBackup(backupPath, badDigestManifestPath);
    const badDigestManifest = JSON.parse(readFileSync(`${badDigestManifestPath}.manifest.json`, 'utf8')) as { sha256: string };
    badDigestManifest.sha256 = '0'.repeat(64);
    writeFileSync(`${badDigestManifestPath}.manifest.json`, JSON.stringify(badDigestManifest, null, 2));
    assert.throws(() => validateBackupCandidate(badDigestManifestPath), /digest/i);

    const badSizeManifestPath = path.join(tempDir, 'bad-size.sqlite');
    cloneBackup(backupPath, badSizeManifestPath);
    const badSizeManifest = JSON.parse(readFileSync(`${badSizeManifestPath}.manifest.json`, 'utf8')) as { sizeBytes: number };
    badSizeManifest.sizeBytes += 1;
    writeFileSync(`${badSizeManifestPath}.manifest.json`, JSON.stringify(badSizeManifest, null, 2));
    assert.throws(() => validateBackupCandidate(badSizeManifestPath), /size/i);

    const badSchemaManifestPath = path.join(tempDir, 'bad-schema-list.sqlite');
    cloneBackup(backupPath, badSchemaManifestPath);
    const badSchemaManifest = JSON.parse(readFileSync(`${badSchemaManifestPath}.manifest.json`, 'utf8')) as { schemaMigrations: string[] };
    badSchemaManifest.schemaMigrations = badSchemaManifest.schemaMigrations.slice(0, -1);
    writeFileSync(`${badSchemaManifestPath}.manifest.json`, JSON.stringify(badSchemaManifest, null, 2));
    assert.throws(() => validateBackupCandidate(badSchemaManifestPath), /schema migration list/i);

    const rollbackActivePath = path.join(tempDir, 'rollback-active.sqlite');
    copyFileSync(activePath, rollbackActivePath);
    const rollbackActive = new Database(rollbackActivePath);
    rollbackActive.pragma('journal_mode = WAL');
    rollbackActive.prepare('DELETE FROM projects');
    rollbackActive.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run('rollback-current', 'Rollback current');
    const prepared = await prepareValidatedRestore(backupPath, rollbackActivePath, rollbackActive);
    writeFileSync(prepared.incomingPath, Buffer.from('forced post-replacement validation failure'));
    assert.throws(() => commitPreparedRestore(prepared, rollbackActive), /database|sqlite|malformed|disk image|file is not/i);
    assertProject(rollbackActivePath, 'rollback-current');
    assertProject(prepared.recoveryPath, 'rollback-current');
    assert.throws(() => rollbackActive.prepare('SELECT 1').get(), /closed|not open/i, 'Destructive-boundary failure must leave the old connection closed');

    const cyclePath = path.join(tempDir, 'cycle-active.sqlite');
    copyFileSync(activePath, cyclePath);
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      const cycleDatabase = new Database(cyclePath);
      cycleDatabase.pragma('journal_mode = WAL');
      cycleDatabase.prepare('DELETE FROM projects');
      cycleDatabase.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(`cycle-${cycle}`, `Cycle ${cycle}`);
      const cycleBackupPath = path.join(tempDir, `cycle-${cycle}.sqlite`);
      await createValidatedBackup(cycleDatabase, cycleBackupPath);
      cycleDatabase.prepare('UPDATE projects SET name = ?').run(`Mutated ${cycle}`);
      const cycleResult = await restoreValidatedBackup(cycleBackupPath, cyclePath, cycleDatabase);
      assertProject(cyclePath, `cycle-${cycle}`);
      assertProject(cycleResult.recoveryPath, `cycle-${cycle}`);
    }

    const originalBackup = readFileSync(backupPath);
    const tampered = Buffer.from(originalBackup);
    tampered[tampered.length - 1] ^= 0xff;
    writeFileSync(backupPath, tampered);
    assert.throws(() => validateBackupCandidate(backupPath), /digest|database|malformed|disk image/i);

    console.log('Backup/restore destructive safety smoke passed: WAL roundtrip, manifest integrity, schema/FK rejection, rollback and repeated cycles verified.');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
