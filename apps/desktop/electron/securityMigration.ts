import type Database from 'better-sqlite3';

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
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = database.prepare('SELECT 1 FROM schema_migrations WHERE id = ?').get(SECURITY_MIGRATION_ID);
  if (applied) return;

  const migrate = database.transaction(() => {
    database.exec(`
      CREATE TABLE security_roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
        created_at TEXT NOT NULL
      );

      CREATE TABLE security_permissions (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL
      );

      CREATE TABLE security_role_permissions (
        role_id TEXT NOT NULL REFERENCES security_roles(id) ON DELETE CASCADE,
        permission_id TEXT NOT NULL REFERENCES security_permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE security_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        display_name TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        password_verifier TEXT NOT NULL,
        password_kdf TEXT NOT NULL,
        password_changed_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE security_user_roles (
        user_id TEXT NOT NULL REFERENCES security_users(id) ON DELETE CASCADE,
        role_id TEXT NOT NULL REFERENCES security_roles(id) ON DELETE RESTRICT,
        PRIMARY KEY (user_id, role_id)
      );

      CREATE TABLE security_audit_events (
        id TEXT PRIMARY KEY,
        occurred_at TEXT NOT NULL,
        actor_user_id TEXT,
        actor_username TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'failure')),
        detail_json TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX idx_security_audit_occurred_at ON security_audit_events(occurred_at DESC);
      CREATE INDEX idx_security_audit_actor ON security_audit_events(actor_user_id, occurred_at DESC);
    `);

    const now = new Date().toISOString();
    const insertRole = database.prepare('INSERT INTO security_roles (id, name, is_system, created_at) VALUES (?, ?, 1, ?)');
    insertRole.run('administrator', 'Administrator', now);
    insertRole.run('engineer', 'Engineer', now);
    insertRole.run('viewer', 'Viewer', now);

    const insertPermission = database.prepare('INSERT INTO security_permissions (id, description) VALUES (?, ?)');
    const descriptions: Record<SecurityPermission, string> = {
      'security.users.manage': 'Manage users and role assignments',
      'security.audit.view': 'View security audit events',
      'engineering.read': 'Read engineering records and reports',
      'engineering.write': 'Create and modify engineering records',
      'engineering.calculate': 'Execute engineering calculations',
      'engineering.trial.manage': 'Create and manage trial mix records',
      'engineering.report.generate': 'Generate engineering reports'
    };
    for (const permission of SECURITY_PERMISSIONS) insertPermission.run(permission, descriptions[permission]);

    const grant = database.prepare('INSERT INTO security_role_permissions (role_id, permission_id) VALUES (?, ?)');
    for (const permission of SECURITY_PERMISSIONS) grant.run('administrator', permission);
    for (const permission of ['engineering.read', 'engineering.write', 'engineering.calculate', 'engineering.trial.manage', 'engineering.report.generate'] as const) grant.run('engineer', permission);
    grant.run('viewer', 'engineering.read');

    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(SECURITY_MIGRATION_ID, now);
  });

  migrate();
}