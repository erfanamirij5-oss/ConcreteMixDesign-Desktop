import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createValidatedBackup, restoreValidatedBackup } from './backupRestoreService';
import { ensureRuntimeMigrations } from './runtimeMigrations';
import { SecurityService } from './securityService';

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tolou-gate09-upgrade-'));
const activePath = path.join(tempDir, 'gate08.sqlite');
const backupPath = path.join(tempDir, 'gate09-backup.sqlite');
const gate08Migrations = [
  '001_initial_schema','002_manual_gradation_controls','003_aggregate_material_fields','004_sieve_labels','005_durability_inputs','006_cementitious_material_fields','007_full_chloride_inputs','008_sulfate_cementitious_compliance','009_asr_alkali_inputs','010_mixing_water_c1602','011_recycled_water_monitoring','012_aggregate_quality_inputs','013_advanced_aggregate_quality','014_aggregate_shape_texture','015_aggregate_blend_optimizer_criteria','016_mix_design_revision_control','017_mix_design_management_workflow','018_mix_design_engineering_identity','019_professional_material_library','020_minimum_trial_mix','021_report_center_snapshots'
];

async function run() {
  try {
    const database = new Database(activePath);
    database.pragma('foreign_keys = ON');
    database.exec('CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');
    const insert = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
    for (const id of gate08Migrations) {
      const migrationPath = path.join(process.cwd(), `database/migrations/${id}.sql`);
      database.transaction(() => {
        database.exec(readFileSync(migrationPath, 'utf8'));
        insert.run(id, new Date().toISOString());
      })();
    }

    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'mix_designs'").get() as { count: number }).count, 1, 'Representative Gate08 baseline must contain engineering schema, not migration markers only');
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'report_snapshots'").get() as { count: number }).count, 1, 'Representative Gate08 baseline must include Gate07 report snapshots');
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'trial_mix_records'").get() as { count: number }).count, 1, 'Representative Gate08 baseline must include minimum Trial Mix schema');

    ensureRuntimeMigrations(database);
    ensureRuntimeMigrations(database);

    const migrations = database.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as Array<{ id: string }>;
    assert.equal(migrations.length, 22, 'Gate08 upgrade must append exactly migration 022');
    assert.equal(migrations.at(-1)?.id, '022_users_roles_audit_security');
    assert.equal((database.prepare('SELECT COUNT(*) AS count FROM security_roles').get() as { count: number }).count, 3);
    assert.equal((database.prepare('SELECT COUNT(*) AS count FROM security_permissions').get() as { count: number }).count, 7);
    assert.equal((database.prepare("SELECT COUNT(*) AS count FROM security_role_permissions WHERE role_id = 'administrator'").get() as { count: number }).count, 7);

    const security = new SecurityService(database);
    const admin = security.bootstrapFirstAdministrator('gate09.admin', 'Gate 09 Administrator', 'Strong-Gate09-Password-2026');
    const session = security.authenticate('gate09.admin', 'Strong-Gate09-Password-2026');
    security.createUser(session.id, 'gate09.viewer', 'Gate 09 Viewer', 'Strong-Viewer-Password-2026', 'viewer');
    const auditBefore = (database.prepare('SELECT COUNT(*) AS count FROM security_audit_events').get() as { count: number }).count;
    assert.ok(auditBefore >= 3, 'Security audit must contain bootstrap/auth/user-management events before backup');

    const manifest = await createValidatedBackup(database, backupPath);
    assert.equal(manifest.schemaMigrations.at(-1), '022_users_roles_audit_security');

    database.prepare("UPDATE security_users SET display_name = 'Mutated after backup' WHERE id = ?").run(admin.id);
    const restored = await restoreValidatedBackup(backupPath, activePath, database);
    assert.ok(restored.recoveryPath.includes('.pre-restore-'));

    const restoredDatabase = new Database(activePath, { readonly: true });
    try {
      const restoredAdmin = restoredDatabase.prepare('SELECT username, display_name AS displayName, password_verifier AS verifier FROM security_users WHERE id = ?').get(admin.id) as { username: string; displayName: string; verifier: string };
      assert.equal(restoredAdmin.username, 'gate09.admin');
      assert.equal(restoredAdmin.displayName, 'Gate 09 Administrator');
      assert.notEqual(restoredAdmin.verifier, 'Strong-Gate09-Password-2026');
      assert.equal((restoredDatabase.prepare('SELECT COUNT(*) AS count FROM security_users').get() as { count: number }).count, 2);
      assert.equal((restoredDatabase.prepare('SELECT COUNT(*) AS count FROM security_audit_events').get() as { count: number }).count, auditBefore);
      assert.equal(restoredDatabase.pragma('quick_check', { simple: true }), 'ok');
      assert.deepEqual(restoredDatabase.pragma('foreign_key_check'), []);
    } finally {
      restoredDatabase.close();
    }

    console.log('Gate 09 upgrade/backup smoke passed: representative Gate08 schema upgrades once to 022 and users, password verifiers, roles and append-only audit survive validated backup/restore.');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });