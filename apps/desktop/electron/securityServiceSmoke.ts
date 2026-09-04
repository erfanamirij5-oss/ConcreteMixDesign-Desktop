import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SecurityService } from './securityService';
import { SECURITY_MIGRATION_ID } from './securityMigration';

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tolou-security-'));
const databasePath = path.join(tempDir, 'security.sqlite');

try {
  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  const security = new SecurityService(database);

  assert.equal((database.prepare('SELECT COUNT(*) AS count FROM schema_migrations WHERE id = ?').get(SECURITY_MIGRATION_ID) as { count: number }).count, 1);
  assert.equal(security.hasUsers(), false);

  const admin = security.bootstrapFirstAdministrator('Admin.User', 'Administrator', 'Strong-Admin-Password-2026');
  assert.equal(admin.username, 'admin.user');
  assert.equal(security.hasUsers(), true);
  assert.throws(() => security.bootstrapFirstAdministrator('second-admin', 'Second', 'Strong-Admin-Password-2026'), /already complete/i);

  const storedAdmin = database.prepare('SELECT password_salt AS salt, password_verifier AS verifier FROM security_users WHERE id = ?').get(admin.id) as { salt: string; verifier: string };
  assert.notEqual(storedAdmin.verifier, 'Strong-Admin-Password-2026');
  assert.ok(storedAdmin.salt.length >= 32);
  assert.ok(storedAdmin.verifier.length >= 64);

  assert.throws(() => security.authenticate('admin.user', 'wrong-password'), /نام کاربری یا رمز عبور معتبر نیست/);
  assert.throws(() => security.authenticate('unknown-user', 'wrong-password'), /نام کاربری یا رمز عبور معتبر نیست/);

  const adminSession = security.authenticate('ADMIN.USER', 'Strong-Admin-Password-2026');
  security.requirePermission(adminSession.id, 'security.users.manage');
  security.requirePermission(adminSession.id, 'engineering.write');

  const engineer = security.createUser(adminSession.id, 'engineer.one', 'Engineer One', 'Engineer-Password-2026', 'engineer');
  const viewer = security.createUser(adminSession.id, 'viewer.one', 'Viewer One', 'Viewer-Password-2026', 'viewer');
  const samePasswordUser = security.createUser(adminSession.id, 'engineer.two', 'Engineer Two', 'Engineer-Password-2026', 'engineer');

  const verifierRows = database.prepare('SELECT password_salt AS salt, password_verifier AS verifier FROM security_users WHERE id IN (?, ?) ORDER BY id').all(engineer.id, samePasswordUser.id) as Array<{ salt: string; verifier: string }>;
  assert.equal(verifierRows.length, 2);
  assert.notEqual(verifierRows[0].salt, verifierRows[1].salt);
  assert.notEqual(verifierRows[0].verifier, verifierRows[1].verifier);

  const engineerSession = security.authenticate('engineer.one', 'Engineer-Password-2026');
  security.requirePermission(engineerSession.id, 'engineering.write');
  assert.throws(() => security.requirePermission(engineerSession.id, 'security.users.manage'), /permission denied/i);

  const viewerSession = security.authenticate('viewer.one', 'Viewer-Password-2026');
  security.requirePermission(viewerSession.id, 'engineering.read');
  assert.throws(() => security.requirePermission(viewerSession.id, 'engineering.write'), /permission denied/i);

  assert.throws(() => security.setUserActive(adminSession.id, admin.id, false), /last active administrator/i);
  assert.throws(() => security.assignRole(adminSession.id, admin.id, 'engineer'), /last active administrator/i);

  security.setUserActive(adminSession.id, engineer.id, false);
  assert.throws(() => security.authenticate('engineer.one', 'Engineer-Password-2026'), /نام کاربری یا رمز عبور معتبر نیست/);
  assert.throws(() => security.requirePermission(engineerSession.id, 'engineering.read'), /authentication required/i, 'Disabling a user must invalidate active sessions');

  security.assignRole(adminSession.id, viewer.id, 'engineer');
  security.requirePermission(viewerSession.id, 'engineering.write');
  security.assignRole(adminSession.id, viewer.id, 'viewer');
  assert.throws(() => security.requirePermission(viewerSession.id, 'engineering.write'), /permission denied/i, 'Role changes must take effect without stale authorization');

  const audit = security.listAudit(adminSession.id, 500) as Array<{ action: string; outcome: string; detailJson: string }>;
  assert.ok(audit.some(event => event.action === 'security.bootstrap' && event.outcome === 'success'));
  assert.ok(audit.some(event => event.action === 'security.authenticate' && event.outcome === 'failure'));
  assert.ok(audit.some(event => event.action === 'security.authorize' && event.outcome === 'denied'));
  assert.ok(audit.some(event => event.action === 'security.user.create' && event.outcome === 'success'));
  for (const event of audit) {
    const serialized = event.detailJson.toLowerCase();
    assert.ok(!serialized.includes('strong-admin-password-2026'));
    assert.ok(!serialized.includes('engineer-password-2026'));
    assert.ok(!serialized.includes('viewer-password-2026'));
  }

  assert.throws(() => database.prepare('UPDATE security_audit_events SET action = ? WHERE 1 = 0').run('tamper'), /never-match-security-audit-immutability/, 'placeholder');

  assert.equal(database.pragma('quick_check', { simple: true }), 'ok');
  assert.equal((database.pragma('foreign_key_check') as unknown[]).length, 0);
  database.close();
  console.log('Gate 09 security smoke passed: bootstrap, scrypt credentials, RBAC, disabled-user enforcement, last-admin protection, live role checks and audit traceability verified.');
} catch (error) {
  // The immutability assertion above intentionally needs a database-level guard before Gate 09 can close.
  if (error instanceof assert.AssertionError && String(error.message).includes('never-match-security-audit-immutability')) {
    console.error('Security audit immutability guard is not implemented yet.');
  } else {
    console.error(error);
  }
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
