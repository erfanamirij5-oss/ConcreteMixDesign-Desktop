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

export type PreparedRestore = {
  candidate: string;
  activePath: string;
  incomingPath: string;
  recoveryPath: string;
  manifest: BackupManifest;
};

export async function createValidatedBackup(database: Database.Database, destination: string): Promise<BackupManifest> {
  assertDatabaseReadyForRuntime(database);
  mkdirSync(path.dirname(destination), { recursive: true });
  const temp = `${destination}.tmp`;
  const manifestPath = `${destination}.manifest.json`;
  const tempManifest = `${manifestPath}.tmp`;
  rmIfExists(temp);
  rmIfExists(tempManifest);

  await database.backup(temp);
  validateDatabaseFile(temp);
  const manifest = buildManifest(temp);
  writeFileSync(tempManifest, JSON.stringify(manifest, null, 2), 'utf8');

  rmIfExists(destination);
  rmIfExists(manifestPath);
  renameSync(temp, destination);
  renameSync(tempManifest, manifestPath);
  return manifest;
}

export function validateBackupCandidate(candidate: string): BackupManifest {
  if (!existsSync(candidate)) throw new Error('Backup file does not exist.');
  const manifest = readAndValidateManifest(candidate);
  validateDatabaseFile(candidate);
  const actual = buildManifest(candidate, manifest.createdAt);
  if (actual.sha256 !== manifest.sha256) throw new Error('Backup digest does not match its manifest.');
  if (actual.sizeBytes !== manifest.sizeBytes) throw new Error('Backup size does not match its manifest.');
  if (JSON.stringify(actual.schemaMigrations) !== JSON.stringify(manifest.schemaMigrations)) throw new Error('Backup schema migration list does not match its manifest.');
  return manifest;
}

export async function prepareValidatedRestore(candidate: string, activePath: string, activeDatabase: Database.Database): Promise<PreparedRestore> {
  const manifest = validateBackupCandidate(candidate);
  assertDatabaseReadyForRuntime(activeDatabase);
  mkdirSync(path.dirname(activePath), { recursive: true });

  const recoveryPath = `${activePath}.pre-restore-${timestampToken()}.sqlite`;
  const incomingPath = `${activePath}.restore-incoming`;
  rmIfExists(incomingPath);
  rmIfExists(recoveryPath);

  copyFileSync(candidate, incomingPath);
  validateDatabaseFile(incomingPath);

  await activeDatabase.backup(recoveryPath);
  validateDatabaseFile(recoveryPath);

  return { candidate, activePath, incomingPath, recoveryPath, manifest };
}

export function commitPreparedRestore(prepared: PreparedRestore, activeDatabase: Database.Database): { recoveryPath: string; manifest: BackupManifest } {
  const { activePath, incomingPath, recoveryPath, manifest } = prepared;

  activeDatabase.pragma('wal_checkpoint(TRUNCATE)');
  activeDatabase.close();
  removeSidecars(activePath);

  try {
    rmIfExists(activePath);
    renameSync(incomingPath, activePath);
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
    rmIfExists(incomingPath);
  }

  return { recoveryPath, manifest };
}

export async function restoreValidatedBackup(candidate: string, activePath: string, activeDatabase: Database.Database): Promise<{ recoveryPath: string; manifest: BackupManifest }> {
  const prepared = await prepareValidatedRestore(candidate, activePath, activeDatabase);
  return commitPreparedRestore(prepared, activeDatabase);
}

function validateDatabaseFile(filePath: string) {
  const database = new Database(filePath, { readonly: true, fileMustExist: true });
  try { assertDatabaseReadyForRuntime(database); }
  finally { database.close(); }
}

function buildManifest(filePath: string, createdAt = new Date().toISOString()): BackupManifest {
  const database = new Database(filePath, { readonly: true, fileMustExist: true });
  let schemaMigrations: string[] = [];
  try {
    const hasTable = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
    if (hasTable) schemaMigrations = (database.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as Array<{ id: string }>).map(row => row.id);
  } finally { database.close(); }
  const bytes = readFileSync(filePath);
  return { formatVersion: 1, createdAt, schemaMigrations, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), sizeBytes: statSync(filePath).size };
}

function readAndValidateManifest(candidate: string): BackupManifest {
  const manifestPath = `${candidate}.manifest.json`;
  if (!existsSync(manifestPath)) throw new Error('Backup manifest is missing.');
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(manifestPath, 'utf8')); }
  catch { throw new Error('Backup manifest is not valid JSON.'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('Backup manifest is invalid.');
  const value = parsed as Partial<BackupManifest>;
  if (value.formatVersion !== 1) throw new Error('Unsupported backup manifest format version.');
  if (typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) throw new Error('Backup manifest timestamp is invalid.');
  if (!Array.isArray(value.schemaMigrations) || !value.schemaMigrations.every(item => typeof item === 'string')) throw new Error('Backup manifest schema migration list is invalid.');
  if (typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256)) throw new Error('Backup manifest digest is invalid.');
  if (!Number.isSafeInteger(value.sizeBytes) || (value.sizeBytes ?? 0) <= 0) throw new Error('Backup manifest size is invalid.');
  return value as BackupManifest;
}

function removeSidecars(databasePath: string) {
  rmIfExists(`${databasePath}-wal`);
  rmIfExists(`${databasePath}-shm`);
}
function rmIfExists(filePath: string) { if (existsSync(filePath)) rmSync(filePath, { force: true }); }
function timestampToken() { return new Date().toISOString().replace(/[:.]/g, '-'); }
