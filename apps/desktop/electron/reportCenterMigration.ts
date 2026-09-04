import { readFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';

const MIGRATION_ID = '021_report_center_snapshots';

export function ensureReportCenterMigration(database: Database.Database) {
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');
  const applied = database.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(MIGRATION_ID);
  if (applied) return;
  const migrationPath = path.join(process.cwd(), `database/migrations/${MIGRATION_ID}.sql`);
  database.transaction(() => {
    database.exec(readFileSync(migrationPath, 'utf-8'));
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(MIGRATION_ID, new Date().toISOString());
  })();
}
