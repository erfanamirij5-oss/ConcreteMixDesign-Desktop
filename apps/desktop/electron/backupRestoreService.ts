import crypto from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { assertDatabaseReadyForRuntime } from './databaseCompatibility';

export type BackupManifest = {
  formatVersion: 1;
  createdAt: string;
  schemaMigrations: string[];
  sha256: string;
  sizeBytes: number;
};

export async function createValidatedBackup(database: Database.Database, destination: string): Promise<BackupManifest> {
  assertDatabaseReadyForRuntime(database);
  mkdirSync(path.dirname(destination), { recursive: true });
  const temp = `${destination}.tmp`;
  rmIfExists(temp);
  await database.backup(temp);
  validateDatabaseFile(temp);
  const manifest = buildManifest(temp);
  rmIfExists(destination);
  renameSync(temp, destination);
  writeFileSync(`${destination}.manifest.json`, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

export function validateBackupCandidate(candidate: string): BackupManifest {
  if (!existsSync(candidate)) throw new Error('Backup file does not exist.');
  const database = new Database(candidate, { readonly: true, fileMustExist: true });
  try { assertDatabaseReadyForRuntime(database); }
  finally { database.close(); }
  return buildManifest(candidate);
}

export function restoreValidatedBackup(candidate: string, activePath: string): { recoveryPath: string; manifest: BackupManifest } {
  const manifest = validateBackupCandidate(candidate);
  mkdirSync(path.dirname(activePath), { recursive: true });
  const recoveryPath = `${activePath}.pre-restore-${timestampToken()}.sqlite`;
  const incoming = `${activePath}.restore-incoming`;
  rmIfExists(incoming);
  copyFileSync(candidate, incoming);
  validateDatabaseFile(incoming);
  if (existsSync(activePath)) copyFileSync(activePath, recoveryPath);
  removeSidecars(activePath);
  try {
    rmIfExists(activePath);
    renameSync(incoming, activePath);
    validateDatabaseFile(activePath);
  } catch (error) {
    rmIfExists(activePath);
    if (existsSync(recoveryPath)) {
      copyFileSync(recoveryPath, activePath);
      validateDatabaseFile(activePath);
    }
    removeSidecars(activePath);
    throw error;
  } finally {
    rmIfExists(incoming);
  }
  return { recoveryPath, manifest };
}

function validateDatabaseFile(filePath: string) {
  const database = new Database(filePath, { readonly: true, fileMustExist: true });
  try { assertDatabaseReadyForRuntime(database); }
  finally { database.close(); }
}

function buildManifest(filePath: string): BackupManifest {
  const database = new Database(filePath, { readonly: true, fileMustExist: true });
  let schemaMigrations: string[] = [];
  try {
    const hasTable = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
    if (hasTable) schemaMigrations = (database.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as Array<{ id: string }>).map(row => row.id);
  } finally { database.close(); }
  const bytes = readFileSync(filePath);
  return { formatVersion: 1, createdAt: new Date().toISOString(), schemaMigrations, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), sizeBytes: statSync(filePath).size };
}

function removeSidecars(databasePath: string) {
  rmIfExists(`${databasePath}-wal`);
  rmIfExists(`${databasePath}-shm`);
}
function rmIfExists(filePath: string) { if (existsSync(filePath)) rmSync(filePath, { force: true }); }
function timestampToken() { return new Date().toISOString().replace(/[:.]/g, '-'); }
