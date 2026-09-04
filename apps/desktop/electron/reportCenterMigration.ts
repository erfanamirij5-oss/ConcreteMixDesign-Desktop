import type Database from 'better-sqlite3';
import { ensureRuntimeMigrations } from './runtimeMigrations';

export function ensureReportCenterMigration(database: Database.Database) {
  ensureRuntimeMigrations(database);
}
