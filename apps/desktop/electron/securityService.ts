import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { ensureSecurityMigration, type SecurityPermission } from './securityMigration';

const KDF_NAME = 'scrypt-N16384-r8-p1';
const SCRYPT_KEY_LENGTH = 64;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,64}$/;
const FORBIDDEN_AUDIT_KEYS = /password|verifier|salt|token|secret|credential/i;

type SecurityUserRow = {
  id: string;
  username: string;
  displayName: string;
  passwordSalt: string;
  passwordVerifier: string;
  passwordKdf: string;
  passwordChangedAt: string;
  isActive: number;
};

export type SecuritySession = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  authenticatedAt: string;
};

export type SecurityAuditInput = {
  actorUserId?: string | null;
  actorUsername: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  outcome: 'success' | 'denied' | 'failure';
  detail?: Record<string, unknown>;
};

export class SecurityService {
  private readonly sessions = new Map<string, SecuritySession>();

  constructor(private readonly database: Database.Database) {
    ensureSecurityMigration(database);
  }

  hasUsers(): boolean {
    const row = this.database.prepare('SELECT COUNT(*) AS count FROM security_users').get() as { count: number };
    return row.count > 0;
  }

  bootstrapFirstAdministrator(username: string, displayName: string, password: string) {
    if (this.hasUsers()) throw new Error('Security bootstrap is already complete.');
    return this.database.transaction(() => {
      const user = this.createUserInternal(username, displayName, password, 'administrator');
      this.writeAudit({ actorUserId: user.id, actorUsername: user.username, action: 'security.bootstrap', targetType: 'user', targetId: user.id, outcome: 'success', detail: { role: 'administrator' } });
      return publicUser(user);
    })();
  }

  authenticate(username: string, password: string): SecuritySession {
    const normalized = normalizeUsername(username);
    const row = this.getUserByUsername(normalized);
    const genericError = new Error('نام کاربری یا رمز عبور معتبر نیست.');
    if (!row) {
      this.writeAudit({ actorUsername: normalized || '<invalid>', action: 'security.authenticate', outcome: 'failure', detail: { reason: 'invalid_credentials' } });
      throw genericError;
    }
    if (!row.isActive) {
      this.writeAudit({ actorUserId: row.id, actorUsername: row.username, action: 'security.authenticate', targetType: 'user', targetId: row.id, outcome: 'denied', detail: { reason: 'invalid_credentials' } });
      throw genericError;
    }
    const actual = derivePasswordVerifier(password, Buffer.from(row.passwordSalt, 'hex'));
    const expected = Buffer.from(row.passwordVerifier, 'hex');
    if (row.passwordKdf !== KDF_NAME || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
      this.writeAudit({ actorUserId: row.id, actorUsername: row.username, action: 'security.authenticate', targetType: 'user', targetId: row.id, outcome: 'failure', detail: { reason: 'invalid_credentials' } });
      throw genericError;
    }
    const session: SecuritySession = { id: crypto.randomUUID(), userId: row.id, username: row.username, displayName: row.displayName, authenticatedAt: new Date().toISOString() };
    this.sessions.set(session.id, session);
    this.writeAudit({ actorUserId: row.id, actorUsername: row.username, action: 'security.authenticate', targetType: 'session', targetId: session.id, outcome: 'success' });
    return session;
  }

  logout(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.delete(sessionId);
    this.writeAudit({ actorUserId: session.userId, actorUsername: session.username, action: 'security.logout', targetType: 'session', targetId: sessionId, outcome: 'success' });
  }

  requirePermission(sessionId: string, permission: SecurityPermission): SecuritySession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Authentication required.');
    const current = this.getUserById(session.userId);
    if (!current || !current.isActive) {
      this.sessions.delete(sessionId);
      this.writeAudit({ actorUserId: session.userId, actorUsername: session.username, action: 'security.authorize', targetType: 'permission', targetId: permission, outcome: 'denied', detail: { reason: 'inactive_or_missing_user' } });
      throw new Error('Authentication required.');
    }
    const granted = this.database.prepare(`
      SELECT 1
      FROM security_user_roles ur
      JOIN security_role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = ? AND rp.permission_id = ?
      LIMIT 1
    `).get(session.userId, permission);
    if (!granted) {
      this.writeAudit({ actorUserId: current.id, actorUsername: current.username, action: 'security.authorize', targetType: 'permission', targetId: permission, outcome: 'denied' });
      throw new Error('Permission denied.');
    }
    return session;
  }

  createUser(sessionId: string, username: string, displayName: string, password: string, roleId: 'administrator' | 'engineer' | 'viewer') {
    const actor = this.requirePermission(sessionId, 'security.users.manage');
    return this.database.transaction(() => {
      const user = this.createUserInternal(username, displayName, password, roleId);
      this.writeAudit({ actorUserId: actor.userId, actorUsername: actor.username, action: 'security.user.create', targetType: 'user', targetId: user.id, outcome: 'success', detail: { username: user.username, roleId } });
      return publicUser(user);
    })();
  }

  setUserActive(sessionId: string, userId: string, active: boolean) {
    const actor = this.requirePermission(sessionId, 'security.users.manage');
    const target = this.getUserById(userId);
    if (!target) throw new Error('User not found.');
    if (!active && this.isAdministrator(userId) && this.countActiveAdministrators() <= 1) throw new Error('The last active administrator cannot be deactivated.');
    this.database.prepare('UPDATE security_users SET is_active = ?, updated_at = ? WHERE id = ?').run(active ? 1 : 0, new Date().toISOString(), userId);
    if (!active) this.invalidateSessionsForUser(userId);
    this.writeAudit({ actorUserId: actor.userId, actorUsername: actor.username, action: active ? 'security.user.activate' : 'security.user.deactivate', targetType: 'user', targetId: userId, outcome: 'success', detail: { username: target.username } });
  }

  assignRole(sessionId: string, userId: string, roleId: 'administrator' | 'engineer' | 'viewer') {
    const actor = this.requirePermission(sessionId, 'security.users.manage');
    const target = this.getUserById(userId);
    if (!target) throw new Error('User not found.');
    if (this.isAdministrator(userId) && roleId !== 'administrator' && target.isActive && this.countActiveAdministrators() <= 1) throw new Error('The last active administrator cannot be demoted.');
    this.database.transaction(() => {
      this.database.prepare('DELETE FROM security_user_roles WHERE user_id = ?').run(userId);
      this.database.prepare('INSERT INTO security_user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleId);
      this.writeAudit({ actorUserId: actor.userId, actorUsername: actor.username, action: 'security.user.assign-role', targetType: 'user', targetId: userId, outcome: 'success', detail: { username: target.username, roleId } });
    })();
  }

  listUsers(sessionId: string) {
    this.requirePermission(sessionId, 'security.users.manage');
    return this.database.prepare(`
      SELECT u.id, u.username, u.display_name AS displayName, u.is_active AS isActive, r.id AS roleId
      FROM security_users u
      LEFT JOIN security_user_roles ur ON ur.user_id = u.id
      LEFT JOIN security_roles r ON r.id = ur.role_id
      ORDER BY u.username
    `).all().map((row: any) => ({ ...row, isActive: Boolean(row.isActive) }));
  }

  listAudit(sessionId: string, limit = 200) {
    this.requirePermission(sessionId, 'security.audit.view');
    const bounded = Math.max(1, Math.min(500, Math.trunc(limit)));
    return this.database.prepare(`
      SELECT id, occurred_at AS occurredAt, actor_user_id AS actorUserId, actor_username AS actorUsername,
             action, target_type AS targetType, target_id AS targetId, outcome, detail_json AS detailJson
      FROM security_audit_events
      ORDER BY occurred_at DESC, rowid DESC
      LIMIT ?
    `).all(bounded);
  }

  private createUserInternal(username: string, displayName: string, password: string, roleId: 'administrator' | 'engineer' | 'viewer') {
    const normalized = normalizeUsername(username);
    if (!USERNAME_PATTERN.test(normalized)) throw new Error('Username must be 3-64 characters using letters, numbers, dot, underscore or hyphen.');
    if (!displayName.trim()) throw new Error('Display name is required.');
    validatePassword(password);
    const role = this.database.prepare('SELECT id FROM security_roles WHERE id = ?').get(roleId);
    if (!role) throw new Error('Role not found.');
    const now = new Date().toISOString();
    const salt = crypto.randomBytes(16);
    const verifier = derivePasswordVerifier(password, salt);
    const user: SecurityUserRow = {
      id: crypto.randomUUID(), username: normalized, displayName: displayName.trim(), passwordSalt: salt.toString('hex'), passwordVerifier: verifier.toString('hex'), passwordKdf: KDF_NAME, passwordChangedAt: now, isActive: 1
    };
    this.database.prepare(`INSERT INTO security_users (id, username, display_name, password_salt, password_verifier, password_kdf, password_changed_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
      .run(user.id, user.username, user.displayName, user.passwordSalt, user.passwordVerifier, user.passwordKdf, user.passwordChangedAt, now, now);
    this.database.prepare('INSERT INTO security_user_roles (user_id, role_id) VALUES (?, ?)').run(user.id, roleId);
    return user;
  }

  private getUserByUsername(username: string): SecurityUserRow | undefined {
    return this.database.prepare(`SELECT id, username, display_name AS displayName, password_salt AS passwordSalt, password_verifier AS passwordVerifier, password_kdf AS passwordKdf, password_changed_at AS passwordChangedAt, is_active AS isActive FROM security_users WHERE username = ? COLLATE NOCASE`).get(username) as SecurityUserRow | undefined;
  }

  private getUserById(userId: string): SecurityUserRow | undefined {
    return this.database.prepare(`SELECT id, username, display_name AS displayName, password_salt AS passwordSalt, password_verifier AS passwordVerifier, password_kdf AS passwordKdf, password_changed_at AS passwordChangedAt, is_active AS isActive FROM security_users WHERE id = ?`).get(userId) as SecurityUserRow | undefined;
  }

  private isAdministrator(userId: string) {
    return Boolean(this.database.prepare(`SELECT 1 FROM security_user_roles WHERE user_id = ? AND role_id = 'administrator'`).get(userId));
  }

  private countActiveAdministrators() {
    return (this.database.prepare(`SELECT COUNT(*) AS count FROM security_users u JOIN security_user_roles ur ON ur.user_id = u.id WHERE u.is_active = 1 AND ur.role_id = 'administrator'`).get() as { count: number }).count;
  }

  private invalidateSessionsForUser(userId: string) {
    for (const [sessionId, session] of this.sessions) if (session.userId === userId) this.sessions.delete(sessionId);
  }

  private writeAudit(input: SecurityAuditInput) {
    assertSafeAuditDetail(input.detail ?? {});
    this.database.prepare(`INSERT INTO security_audit_events (id, occurred_at, actor_user_id, actor_username, action, target_type, target_id, outcome, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(crypto.randomUUID(), new Date().toISOString(), input.actorUserId ?? null, input.actorUsername, input.action, input.targetType ?? null, input.targetId ?? null, input.outcome, JSON.stringify(input.detail ?? {}));
  }
}

function derivePasswordVerifier(password: string, salt: Buffer) {
  return crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH, { N: 16384, r: 8, p: 1 });
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function validatePassword(password: string) {
  if (password.length < 10 || password.length > 256) throw new Error('Password must be between 10 and 256 characters.');
}

function publicUser(row: SecurityUserRow) {
  return { id: row.id, username: row.username, displayName: row.displayName, isActive: Boolean(row.isActive) };
}

function assertSafeAuditDetail(value: unknown, path = 'detail') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_AUDIT_KEYS.test(key)) throw new Error(`Secret-like audit field is forbidden at ${path}.${key}.`);
    assertSafeAuditDetail(child, `${path}.${key}`);
  }
}