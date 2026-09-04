import path from 'node:path';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';

const migrations = [
  '001_initial_schema', '002_manual_gradation_controls', '003_aggregate_material_fields', '004_sieve_labels',
  '005_durability_inputs', '006_cementitious_material_fields', '007_full_chloride_inputs',
  '008_sulfate_cementitious_compliance', '009_asr_alkali_inputs', '010_mixing_water_c1602',
  '011_recycled_water_monitoring', '012_aggregate_quality_inputs', '013_advanced_aggregate_quality',
  '014_aggregate_shape_texture', '015_aggregate_blend_optimizer_criteria', '016_mix_design_revision_control',
  '017_mix_design_management_workflow', '018_mix_design_engineering_identity'
];

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec('CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');
for (const migrationId of migrations) {
  const sql = readFileSync(path.join(process.cwd(), `database/migrations/${migrationId}.sql`), 'utf-8');
  database.transaction(() => {
    database.exec(sql);
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migrationId, new Date().toISOString());
  })();
}

const now = new Date().toISOString();
let failed = false;
try {
  database.transaction(() => {
    database.prepare('INSERT INTO projects (id, project_name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('atomic-project', 'Atomic Project', now, now);
    database.prepare('INSERT INTO laboratories (id, lab_name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('atomic-lab', 'Atomic Lab', now, now);
    database.prepare(`INSERT INTO mix_designs (id, project_id, concrete_type, status, engine_version, standards_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('atomic-mix', 'missing-project', 'normal_weight', 'draft', '0.3.0', 'ASTM', now, now);
  })();
} catch (error) {
  if (error instanceof Error && /FOREIGN KEY constraint failed/i.test(error.message)) failed = true;
  else throw error;
}
if (!failed) throw new Error('Intentional multi-step save failure did not trigger.');
if (database.prepare('SELECT id FROM projects WHERE id = ?').get('atomic-project')) throw new Error('Project row survived a failed multi-step transaction.');
if (database.prepare('SELECT id FROM laboratories WHERE id = ?').get('atomic-lab')) throw new Error('Laboratory row survived a failed multi-step transaction.');
if (database.prepare('SELECT id FROM mix_designs WHERE id = ?').get('atomic-mix')) throw new Error('Mix design row survived a failed multi-step transaction.');

database.prepare('INSERT INTO projects (id, project_name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('project-1', 'Existing Project', now, now);
database.prepare(`INSERT INTO mix_designs (id, project_id, concrete_type, status, engine_version, standards_version, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('mix-1', 'project-1', 'normal_weight', 'draft', '0.3.0', 'ASTM', now, now);
database.prepare('INSERT INTO materials (id, mix_design_id, material_type, name) VALUES (?, ?, ?, ?)').run('material-1', 'mix-1', 'fine_aggregate', 'Existing Sand');
database.prepare('INSERT INTO aggregate_sieve_results (id, material_id, sieve_size_mm, label, percent_passing, status) VALUES (?, ?, ?, ?, ?, ?)').run('sieve-old', 'material-1', 4.75, 'No. 4', 95, 'pass');

failed = false;
try {
  database.transaction(() => {
    database.prepare('DELETE FROM aggregate_sieve_results WHERE material_id = ?').run('material-1');
    database.prepare('INSERT INTO aggregate_sieve_results (id, material_id, sieve_size_mm, label, percent_passing, status) VALUES (?, ?, ?, ?, ?, ?)').run('sieve-new', 'missing-material', 2.36, 'No. 8', 80, 'pass');
  })();
} catch (error) {
  if (error instanceof Error && /FOREIGN KEY constraint failed/i.test(error.message)) failed = true;
  else throw error;
}
if (!failed) throw new Error('Intentional gradation replacement failure did not trigger.');
const oldSieve = database.prepare('SELECT id, percent_passing AS percentPassing FROM aggregate_sieve_results WHERE id = ?').get('sieve-old') as { id: string; percentPassing: number } | undefined;
if (!oldSieve || oldSieve.percentPassing !== 95) throw new Error('Existing gradation data was lost after failed replacement transaction.');
if (database.prepare('SELECT id FROM aggregate_sieve_results WHERE id = ?').get('sieve-new')) throw new Error('Invalid replacement row survived rollback.');

const source = readFileSync(path.join(process.cwd(), 'apps/desktop/electron/database.ts'), 'utf-8');
for (const required of [
  'export function saveProjectIntake',
  'export function saveGradation',
  'export function saveAggregateBlendOptimizer'
]) {
  if (!source.includes(required)) throw new Error(`Expected transactional save function missing from database.ts: ${required}`);
}
if ((source.match(/database\.transaction\(\(\) =>/g) ?? []).length < 4) throw new Error('Expected transactional save boundaries are missing from database.ts.');

const violations = database.prepare('PRAGMA foreign_key_check').all();
if (violations.length) throw new Error(`Foreign key violations remained after rollback tests: ${JSON.stringify(violations)}`);

database.close();
console.log('Data integrity atomicity smoke passed: failed multi-step saves roll back without partial data loss.');
