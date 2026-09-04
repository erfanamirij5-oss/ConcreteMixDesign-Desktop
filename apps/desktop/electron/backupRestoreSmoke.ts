import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createValidatedBackup, restoreValidatedBackup, validateBackupCandidate } from './backupRestoreService';

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tolou-backup-restore-'));
const activePath = path.join(tempDir, 'active.sqlite');
const backupPath = path.join(tempDir, 'backup.sqlite');
const corruptPath = path.join(tempDir, 'corrupt.sqlite');

function seedCurrentSchema(database: Database.Database) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL);
  `);
  const migrationIds = [
    '001_initial_schema','002_manual_gradation_controls','003_aggregate_material_fields','004_sieve_labels','005_durability_inputs','006_cementitious_material_fields','007_full_chloride_inputs','008_sulfate_cementitious_compliance','009_asr_alkali_inputs','010_mixing_water_c1602','011_recycled_water_monitoring','012_aggregate_quality_inputs','013_advanced_aggregate_quality','014_aggregate_shape_texture','015_aggregate_blend_optimizer_criteria','016_mix_design_revision_control','017_mix_design_management_workflow','018_mix_design_engineering_identity','019_professional_material_library','020_minimum_trial_mix','021_report_center_snapshots'
  ];
  const insert = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
  for (const id of migrationIds) insert.run(id, new Date().toISOString());
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
    assert.throws(() => active.prepare('SELECT 1').get(), /closed/i, 'Restore must close the active SQLite connection before file replacement');

    const reopened = new Database(activePath, { readonly: true });
    assert.equal((reopened.prepare('SELECT id FROM projects').get() as { id: string }).id, 'project-before');
    assert.equal(reopened.pragma('quick_check', { simple: true }), 'ok');
    reopened.close();

    const recovery = new Database(restored.recoveryPath, { readonly: true });
    assert.equal((recovery.prepare('SELECT id FROM projects').get() as { id: string }).id, 'project-after');
    recovery.close();

    const activeBeforeRejectedRestore = readFileSync(activePath);
    writeFileSync(corruptPath, Buffer.from('not a sqlite database'));
    const activeForRejectedRestore = new Database(activePath);
    activeForRejectedRestore.pragma('journal_mode = WAL');
    assert.throws(() => validateBackupCandidate(corruptPath));
    await assert.rejects(() => restoreValidatedBackup(corruptPath, activePath, activeForRejectedRestore));
    assert.deepEqual(readFileSync(activePath), activeBeforeRejectedRestore, 'Rejected restore must not modify active DB bytes');
    assert.equal(activeForRejectedRestore.prepare('SELECT 1 AS value').get().value, 1, 'Pre-validation failure must leave active connection open');
    activeForRejectedRestore.close();

    const originalBackup = readFileSync(backupPath);
    const tampered = Buffer.from(originalBackup);
    tampered[tampered.length - 1] ^= 0xff;
    writeFileSync(backupPath, tampered);
    assert.throws(() => validateBackupCandidate(backupPath), /digest|database|malformed|disk image/i);

    console.log('Backup/restore destructive safety smoke passed.');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
