import path from 'node:path';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';

const legacyMigrations = [
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
  '015_aggregate_blend_optimizer_criteria'
];
const upgradeMigrations = [
  '016_mix_design_revision_control',
  '017_mix_design_management_workflow',
  '018_mix_design_engineering_identity'
];

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec('CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');

function applyMigration(migrationId: string) {
  const sql = readFileSync(path.join(process.cwd(), `database/migrations/${migrationId}.sql`), 'utf-8');
  database.transaction(() => {
    database.exec(sql);
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migrationId, new Date().toISOString());
  })();
}

for (const migrationId of legacyMigrations) applyMigration(migrationId);

const now = new Date().toISOString();
database.prepare('INSERT INTO projects (id, project_name, city, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('project-v03', 'Legacy v0.3 Project', 'Yazd', now, now);
database.prepare('INSERT INTO laboratories (id, lab_name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('lab-v03', 'Legacy Lab', now, now);
database.prepare('INSERT INTO designers (id, full_name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('designer-v03', 'Legacy Engineer', now, now);
database.prepare(`INSERT INTO mix_designs (
  id, project_id, laboratory_id, designer_id, concrete_type, target_strength_mpa, required_slump_mm,
  max_aggregate_size_mm, exposure_summary, status, engine_version, standards_version, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  'mix-v03', 'project-v03', 'lab-v03', 'designer-v03', 'normal_weight', 35, 100, 19,
  'legacy exposure', 'draft', '0.3.0', 'ACI_CODE_318_25|ACI_PRC_211_1_22|ASTM', now, now
);
database.prepare('INSERT INTO materials (id, mix_design_id, material_type, name, source, specific_gravity, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run('cement-v03', 'mix-v03', 'cement', 'Legacy Cement', 'Legacy Source', 3.15, 'preserve me');
database.prepare('INSERT INTO mix_results (id, mix_design_id, cementitious_content_kg_m3, water_content_kg_m3, w_cm_ratio, notes) VALUES (?, ?, ?, ?, ?, ?)').run('result-v03', 'mix-v03', 400, 180, 0.45, 'legacy result');

for (const migrationId of upgradeMigrations) applyMigration(migrationId);

const upgraded = database.prepare(`SELECT md.id, md.revision_number AS revisionNumber, md.status, md.project_id AS projectId,
  p.project_name AS projectName, p.city FROM mix_designs md JOIN projects p ON p.id = md.project_id WHERE md.id = ?`).get('mix-v03') as {
  id: string; revisionNumber: number; status: string; projectId: string; projectName: string; city: string;
};
if (!upgraded || upgraded.id !== 'mix-v03' || upgraded.projectId !== 'project-v03') throw new Error('Legacy mix design identity was not preserved during upgrade.');
if (upgraded.projectName !== 'Legacy v0.3 Project' || upgraded.city !== 'Yazd') throw new Error('Legacy project data changed during upgrade.');
if (Number(upgraded.revisionNumber) !== 0 || upgraded.status !== 'draft') throw new Error('Management defaults were not applied safely during upgrade.');

const material = database.prepare('SELECT name, source, specific_gravity AS specificGravity, notes FROM materials WHERE id = ?').get('cement-v03') as { name: string; source: string; specificGravity: number; notes: string };
if (!material || material.name !== 'Legacy Cement' || material.source !== 'Legacy Source' || material.specificGravity !== 3.15 || material.notes !== 'preserve me') throw new Error('Legacy material data was not preserved during upgrade.');
const result = database.prepare('SELECT cementitious_content_kg_m3 AS cementitious, water_content_kg_m3 AS water, w_cm_ratio AS wcm, notes FROM mix_results WHERE id = ?').get('result-v03') as { cementitious: number; water: number; wcm: number; notes: string };
if (!result || result.cementitious !== 400 || result.water !== 180 || result.wcm !== 0.45 || result.notes !== 'legacy result') throw new Error('Legacy engineering result data was not preserved during upgrade.');

const foreignKeyViolations = database.prepare('PRAGMA foreign_key_check').all();
if (foreignKeyViolations.length) throw new Error(`Foreign key violations found after upgrade: ${JSON.stringify(foreignKeyViolations)}`);

let rollbackTriggered = false;
try {
  database.transaction(() => {
    database.exec('ALTER TABLE projects ADD COLUMN __rollback_probe TEXT;');
    database.exec('THIS IS NOT VALID SQL;');
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run('999_intentional_failure', new Date().toISOString());
  })();
} catch {
  rollbackTriggered = true;
}
if (!rollbackTriggered) throw new Error('Intentional migration failure did not throw.');
const rollbackColumns = database.prepare("PRAGMA table_info('projects')").all() as Array<{ name: string }>;
if (rollbackColumns.some(column => column.name === '__rollback_probe')) throw new Error('Failed migration left partial schema changes behind.');
const failedMigrationRecord = database.prepare('SELECT id FROM schema_migrations WHERE id = ?').get('999_intentional_failure');
if (failedMigrationRecord) throw new Error('Failed migration was incorrectly recorded as applied.');

const applied = database.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as Array<{ id: string }>;
if (applied.length !== 18 || applied.at(-1)?.id !== '018_mix_design_engineering_identity') throw new Error('Upgrade chain did not finish through migration 018.');

database.close();
console.log('Data integrity upgrade smoke passed: v0.3 data preserved, foreign keys clean, failed migration rolled back.');
