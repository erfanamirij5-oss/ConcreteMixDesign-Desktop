import { readFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';

export const RUNTIME_MIGRATION_IDS = [
  '020_minimum_trial_mix',
  '021_report_center_snapshots',
  '022_users_roles_audit_security',
  '023_trial_mix_v2_foundation',
  '024_production_qc_foundation',
  '025_cost_engine_foundation',
  '026_material_intelligence_history',
  '027_material_library_extended_types',
  '028_requirements_formal_approval'
] as const;

export type RuntimeMigrationId = typeof RUNTIME_MIGRATION_IDS[number];

export function ensureRuntimeMigration(database: Database.Database, migrationId: RuntimeMigrationId) {
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');
  const applied = database.prepare('SELECT 1 FROM schema_migrations WHERE id = ?').get(migrationId);
  if (applied) return;

  const migrationPath = path.join(process.cwd(), `database/migrations/${migrationId}.sql`);
  const sql = readFileSync(migrationPath, 'utf-8');

  if (migrationId === '027_material_library_extended_types') {
    const foreignKeysWereEnabled = Number(database.pragma('foreign_keys', { simple: true })) === 1;
    if (database.inTransaction) throw new Error('Migration 027 cannot run inside an existing transaction.');
    if (foreignKeysWereEnabled) database.pragma('foreign_keys = OFF');
    try {
      database.transaction(() => {
        database.exec(sql);
        database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migrationId, new Date().toISOString());
      })();
    } finally {
      if (foreignKeysWereEnabled) database.pragma('foreign_keys = ON');
    }
    const violations = database.pragma('foreign_key_check') as Array<Record<string, unknown>>;
    if (violations.length) throw new Error(`Migration 027 foreign key integrity check failed with ${violations.length} violation(s).`);
    return;
  }

  database.transaction(() => {
    database.exec(sql);
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migrationId, new Date().toISOString());
  })();
}

export function ensureRuntimeMigrations(database: Database.Database) {
  for (const migrationId of RUNTIME_MIGRATION_IDS) ensureRuntimeMigration(database, migrationId);
}
