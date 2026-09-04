import type Database from 'better-sqlite3';
import { ensureRuntimeMigrations } from './runtimeMigrations';

export const SECURITY_MIGRATION_ID = '022_users_roles_audit_security';

export const SECURITY_PERMISSIONS = [
  'security.users.manage',
  'security.audit.view',
  'engineering.read',
  'engineering.write',
  'engineering.calculate',
  'engineering.trial.manage',
  'engineering.report.generate'
] as const;

export type SecurityPermission = typeof SECURITY_PERMISSIONS[number];

export function ensureSecurityMigration(database: Database.Database) {
  ensureRuntimeMigrations(database);
}
