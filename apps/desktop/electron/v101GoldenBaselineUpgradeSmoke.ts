import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createValidatedBackup } from './backupRestoreService';
import { ensureRuntimeMigrations } from './runtimeMigrations';

const GOLDEN_BASELINE_MIGRATIONS = [
  '001_initial_schema',
  '002_manual_gradation_controls',
  '003_aggregate_material_fields',
  '004_sieve_labels',
  '005_durability_inputs',
  '006_cementitious_material_fields',
  '007_full_chloride_inputs',
  '008_sulfate_cementitious_compliance',
  '009_asr_alkali_inputs',
  '010_mixing_water_c1602',
  '011_recycled_water_monitoring',
  '012_aggregate_quality_inputs',
  '013_advanced_aggregate_quality',
  '014_aggregate_shape_texture',
  '015_aggregate_blend_optimizer_criteria',
  '016_mix_design_revision_control',
  '017_mix_design_management_workflow',
  '018_mix_design_engineering_identity',
  '019_professional_material_library',
  '020_minimum_trial_mix',
  '021_report_center_snapshots',
  '022_users_roles_audit_security'
] as const;

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tolou-v101-golden-upgrade-'));
const databasePath = path.join(tempDir, 'accepted-v1.0.1.sqlite');
const backupPath = path.join(tempDir, 'accepted-v1.0.1.pre-upgrade.sqlite');

async function run() {
  let database: Database.Database | undefined;
  try {
    database = new Database(databasePath);
    database.pragma('foreign_keys = ON');
    database.exec('CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');
    const insertMigration = database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');

    for (const migrationId of GOLDEN_BASELINE_MIGRATIONS) {
      const migrationPath = path.join(process.cwd(), `database/migrations/${migrationId}.sql`);
      assert.ok(existsSync(migrationPath), `Golden baseline migration is missing: ${migrationId}`);
      database.transaction(() => {
        database!.exec(readFileSync(migrationPath, 'utf8'));
        insertMigration.run(migrationId, new Date().toISOString());
      })();
    }

    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO projects (id, project_name, city, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('g00-project', 'پروژه مرجع ارتقای v1.0.1', 'Yazd', now, now);

    database.prepare(`
      INSERT INTO mix_designs (
        id, project_id, concrete_type, target_strength_mpa, required_slump_mm,
        max_aggregate_size_mm, status, engine_version, standards_version,
        created_at, updated_at, revision_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'g00-mix', 'g00-project', 'normal', 35, 100, 19,
      'draft', '1.0.0', 'accepted-v1.0.1', now, now, 0
    );

    database.prepare(`
      INSERT INTO materials (
        id, mix_design_id, material_type, name, source,
        specific_gravity, absorption_percent, moisture_percent, unit_weight_kg_m3, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'g00-aggregate', 'g00-mix', 'coarse_aggregate', 'سنگدانه مرجع', 'Golden baseline',
      2.65, 1.2, 0.6, 1600, 'sentinel-user-data'
    );

    database.prepare(`
      INSERT INTO mix_results (
        id, mix_design_id, cementitious_content_kg_m3, water_content_kg_m3,
        w_cm_ratio, fine_aggregate_kg_m3, coarse_aggregate_kg_m3,
        air_content_percent, density_kg_m3, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'g00-result', 'g00-mix', 400, 180, 0.45, 750, 1050, 2, 2380,
      JSON.stringify({ goldenBaseline: true, marker: 'preserve-me' })
    );

    const preUpgradeSnapshot = {
      project: database.prepare('SELECT project_name AS projectName, city FROM projects WHERE id = ?').get('g00-project'),
      mix: database.prepare('SELECT concrete_type AS concreteType, target_strength_mpa AS strength, revision_number AS revision FROM mix_designs WHERE id = ?').get('g00-mix'),
      material: database.prepare('SELECT name, specific_gravity AS specificGravity, absorption_percent AS absorption, moisture_percent AS moisture, notes FROM materials WHERE id = ?').get('g00-aggregate'),
      result: database.prepare('SELECT cementitious_content_kg_m3 AS binder, water_content_kg_m3 AS water, w_cm_ratio AS wCm, notes FROM mix_results WHERE id = ?').get('g00-result')
    };

    const backupManifest = await createValidatedBackup(database, backupPath);
    assert.ok(existsSync(backupPath), 'Validated pre-upgrade backup was not created.');
    assert.equal(backupManifest.schemaMigrations.at(-1), '022_users_roles_audit_security');
    assert.equal(backupManifest.schemaMigrations.length, GOLDEN_BASELINE_MIGRATIONS.length);

    ensureRuntimeMigrations(database);
    ensureRuntimeMigrations(database);

    const postUpgradeSnapshot = {
      project: database.prepare('SELECT project_name AS projectName, city FROM projects WHERE id = ?').get('g00-project'),
      mix: database.prepare('SELECT concrete_type AS concreteType, target_strength_mpa AS strength, revision_number AS revision FROM mix_designs WHERE id = ?').get('g00-mix'),
      material: database.prepare('SELECT name, specific_gravity AS specificGravity, absorption_percent AS absorption, moisture_percent AS moisture, notes FROM materials WHERE id = ?').get('g00-aggregate'),
      result: database.prepare('SELECT cementitious_content_kg_m3 AS binder, water_content_kg_m3 AS water, w_cm_ratio AS wCm, notes FROM mix_results WHERE id = ?').get('g00-result')
    };

    assert.deepEqual(postUpgradeSnapshot, preUpgradeSnapshot, 'Accepted v1.0.1 user engineering data changed during upgrade.');
    assert.equal(database.pragma('quick_check', { simple: true }), 'ok', 'SQLite quick_check failed after upgrade.');
    assert.deepEqual(database.pragma('foreign_key_check'), [], 'Foreign-key integrity failed after upgrade.');

    const migrationRows = database.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as Array<{ id: string }>;
    const migrationIds = migrationRows.map(row => row.id);
    for (const migrationId of GOLDEN_BASELINE_MIGRATIONS) {
      assert.equal(migrationIds.filter(id => id === migrationId).length, 1, `Golden migration must remain applied exactly once: ${migrationId}`);
    }

    console.log(`Accepted v1.0.1 golden baseline upgrade smoke passed: backup created, ${migrationIds.length} migrations present, representative engineering data preserved, integrity clean.`);
  } finally {
    database?.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
