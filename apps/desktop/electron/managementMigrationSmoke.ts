import path from 'node:path';
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';

const migrations = [
  '001_initial_schema', '002_manual_gradation_controls', '003_aggregate_material_fields', '004_sieve_labels',
  '005_durability_inputs', '006_cementitious_material_fields', '007_full_chloride_inputs',
  '008_sulfate_cementitious_compliance', '009_asr_alkali_inputs', '010_mixing_water_c1602',
  '011_recycled_water_monitoring', '012_aggregate_quality_inputs', '013_advanced_aggregate_quality',
  '014_aggregate_shape_texture', '015_aggregate_blend_optimizer_criteria', '016_mix_design_revision_control',
  '017_mix_design_management_workflow', '018_mix_design_engineering_identity', '019_professional_material_library'
];

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');

for (const migrationId of migrations) {
  const sql = readFileSync(path.join(process.cwd(), `database/migrations/${migrationId}.sql`), 'utf-8');
  database.transaction(() => {
    database.exec(sql);
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migrationId, new Date().toISOString());
  })();
}

const mixColumns = database.prepare("PRAGMA table_info('mix_designs')").all() as Array<{ name: string }>;
const mixColumnNames = new Set(mixColumns.map(column => column.name));
for (const required of ['revision_number', 'source_mix_design_id', 'archived_from_status', 'archived_at', 'customer_name', 'client_name', 'project_code', 'project_location', 'design_standard', 'exposure_class', 'engineer_notes']) {
  if (!mixColumnNames.has(required)) throw new Error(`Management migration column missing: ${required}`);
}

const materialColumns = database.prepare("PRAGMA table_info('materials')").all() as Array<{ name: string }>;
const materialColumnNames = new Set(materialColumns.map(column => column.name));
for (const required of ['library_material_id', 'library_snapshot_json', 'library_snapshot_at']) {
  if (!materialColumnNames.has(required)) throw new Error(`Material Library migration column missing: ${required}`);
}

for (const table of ['mix_design_revision_snapshots', 'mix_design_audit_log', 'mix_design_status_history', 'material_library']) {
  const row = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  if (!row) throw new Error(`Migration table missing: ${table}`);
}

const applied = database.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as Array<{ id: string }>;
if (applied.length !== migrations.length || applied.at(-1)?.id !== '019_professional_material_library') {
  throw new Error('Migration chain did not apply through migration 019.');
}

database.close();
console.log('Management migration smoke validation passed through migration 019.');
