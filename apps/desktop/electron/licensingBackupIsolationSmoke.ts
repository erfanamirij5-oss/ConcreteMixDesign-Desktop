import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createValidatedBackup, restoreValidatedBackup } from './backupRestoreService';
import { KNOWN_MIGRATIONS } from './databaseCompatibility';
import { buildLicensingPaths } from './licensingPaths';

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tolou-license-backup-isolation-'));
const activePath = path.join(tempDir, 'data', 'tolou-concrete-mix.sqlite');
const backupPath = path.join(tempDir, 'backup.sqlite');
const licensing = buildLicensingPaths(tempDir);

async function run() {
  try {
    const database = new Database(activePath);
    database.pragma('foreign_keys = ON');
    database.exec(`
      CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE marker (id TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    const insertMigration = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
    for (const id of KNOWN_MIGRATIONS) insertMigration.run(id, new Date().toISOString());
    database.prepare('INSERT INTO marker (id, value) VALUES (?, ?)').run('engineering', 'before-backup');

    writeFileSync(licensing.licensePath, 'license-before-backup', { encoding: 'utf8', flag: 'w' });
    await createValidatedBackup(database, backupPath);

    database.prepare('UPDATE marker SET value = ? WHERE id = ?').run('after-backup', 'engineering');
    writeFileSync(licensing.licensePath, 'license-after-backup', 'utf8');

    await restoreValidatedBackup(backupPath, activePath, database);

    const restored = new Database(activePath, { readonly: true });
    try {
      const marker = restored.prepare('SELECT value FROM marker WHERE id = ?').get('engineering') as { value: string };
      assert.equal(marker.value, 'before-backup', 'Engineering DB must restore from backup.');
    } finally {
      restored.close();
    }

    assert.equal(readFileSync(licensing.licensePath, 'utf8'), 'license-after-backup', 'Engineering restore must not overwrite machine-local licensing state.');
    assert.ok(!path.resolve(licensing.licensePath).startsWith(path.resolve(path.dirname(activePath)) + path.sep), 'License file must live outside the engineering SQLite data directory.');
    console.log('Gate 10 backup isolation smoke passed: engineering backup/restore leaves machine-local license state untouched.');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
