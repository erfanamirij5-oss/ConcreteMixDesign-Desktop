-- Gate 09 — Users / Roles / Audit Security

CREATE TABLE IF NOT EXISTS security_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_permissions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_role_permissions (
  role_id TEXT NOT NULL REFERENCES security_roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES security_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS security_users (
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

CREATE TABLE IF NOT EXISTS security_user_roles (
  user_id TEXT NOT NULL REFERENCES security_users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES security_roles(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS security_audit_events (
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

CREATE INDEX IF NOT EXISTS idx_security_audit_occurred_at ON security_audit_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_actor ON security_audit_events(actor_user_id, occurred_at DESC);

CREATE TRIGGER IF NOT EXISTS security_audit_no_update
BEFORE UPDATE ON security_audit_events
BEGIN
  SELECT RAISE(ABORT, 'security audit is append-only');
END;

CREATE TRIGGER IF NOT EXISTS security_audit_no_delete
BEFORE DELETE ON security_audit_events
BEGIN
  SELECT RAISE(ABORT, 'security audit is append-only');
END;

INSERT OR IGNORE INTO security_roles (id, name, is_system, created_at) VALUES
  ('administrator', 'Administrator', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('engineer', 'Engineer', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('viewer', 'Viewer', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));

INSERT OR IGNORE INTO security_permissions (id, description) VALUES
  ('security.users.manage', 'Manage users and role assignments'),
  ('security.audit.view', 'View security audit events'),
  ('engineering.read', 'Read engineering records and reports'),
  ('engineering.write', 'Create and modify engineering records'),
  ('engineering.calculate', 'Execute engineering calculations'),
  ('engineering.trial.manage', 'Create and manage trial mix records'),
  ('engineering.report.generate', 'Generate engineering reports');

INSERT OR IGNORE INTO security_role_permissions (role_id, permission_id)
SELECT 'administrator', id FROM security_permissions;

INSERT OR IGNORE INTO security_role_permissions (role_id, permission_id) VALUES
  ('engineer', 'engineering.read'),
  ('engineer', 'engineering.write'),
  ('engineer', 'engineering.calculate'),
  ('engineer', 'engineering.trial.manage'),
  ('engineer', 'engineering.report.generate'),
  ('viewer', 'engineering.read');
