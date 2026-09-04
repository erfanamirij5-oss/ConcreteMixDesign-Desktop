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
database.prepare('INSERT INTO projects (id, project_name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('project-1', 'Integrity Project', now, now);
database.prepare(`INSERT INTO mix_designs (id, project_id, concrete_type, status, engine_version, standards_version, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('mix-1', 'project-1', 'normal_weight', 'draft', '0.3.0', 'ASTM', now, now);
database.prepare('INSERT INTO materials (id, mix_design_id, material_type, name) VALUES (?, ?, ?, ?)').run('material-1', 'mix-1', 'cement', 'Integrity Cement');
database.prepare('INSERT INTO aggregate_sieve_results (id, material_id, sieve_size_mm, label, percent_passing, status) VALUES (?, ?, ?, ?, ?, ?)').run('sieve-1', 'material-1', 4.75, 'No. 4', 100, 'pass');
database.prepare('INSERT INTO mix_design_audit_log (id, mix_design_id, action, actor_name, created_at) VALUES (?, ?, ?, ?, ?)').run('audit-1', 'mix-1', 'seed', 'Integrity Test', now);
database.prepare('INSERT INTO mix_design_status_history (id, mix_design_id, to_status, actor_name, created_at) VALUES (?, ?, ?, ?, ?)').run('history-1', 'mix-1', 'draft', 'Integrity Test', now);

function expectForeignKeyBlock(sql: string, id: string, label: string) {
  let blocked = false;
  try { database.prepare(sql).run(id); } catch (error) {
    if (error instanceof Error && /FOREIGN KEY constraint failed/i.test(error.message)) blocked = true;
    else throw error;
  }
  if (!blocked) throw new Error(`${label} deletion was not blocked by referential integrity.`);
}

expectForeignKeyBlock('DELETE FROM projects WHERE id = ?', 'project-1', 'Project');
expectForeignKeyBlock('DELETE FROM mix_designs WHERE id = ?', 'mix-1', 'Mix design with engineering children');
expectForeignKeyBlock('DELETE FROM materials WHERE id = ?', 'material-1', 'Material with sieve results');

if (!database.prepare('SELECT id FROM projects WHERE id = ?').get('project-1')) throw new Error('Project disappeared after blocked delete.');
if (!database.prepare('SELECT id FROM mix_designs WHERE id = ?').get('mix-1')) throw new Error('Mix design disappeared after blocked delete.');
if (!database.prepare('SELECT id FROM materials WHERE id = ?').get('material-1')) throw new Error('Material disappeared after blocked delete.');
if (!database.prepare('SELECT id FROM aggregate_sieve_results WHERE id = ?').get('sieve-1')) throw new Error('Sieve result disappeared after blocked delete.');

const violations = database.prepare('PRAGMA foreign_key_check').all();
if (violations.length) throw new Error(`Referential integrity violations found: ${JSON.stringify(violations)}`);

database.close();
console.log('Data integrity constraint smoke passed: parent deletes are blocked while dependent engineering data exists.');
