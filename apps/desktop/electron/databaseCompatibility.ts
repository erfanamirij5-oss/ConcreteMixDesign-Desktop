import type Database from 'better-sqlite3';

export const KNOWN_MIGRATIONS = [
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
  '021_report_center_snapshots'
] as const;

export function assertDatabaseSchemaCompatibility(database: Database.Database) {
  const schemaTable = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get();
  if (!schemaTable) return;

  const applied = database.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as Array<{ id: string }>;
  const known = new Set<string>(KNOWN_MIGRATIONS);
  const unknown = applied.map(row => row.id).filter(id => !known.has(id));
  if (unknown.length) {
    throw new Error(`Database schema is newer or incompatible with this application build. Unknown migrations: ${unknown.join(', ')}`);
  }
}

export function assertDatabaseHealth(database: Database.Database) {
  const quickCheck = database.pragma('quick_check') as Array<Record<string, unknown>>;
  const quickCheckValues = quickCheck.flatMap(row => Object.values(row).map(value => String(value)));
  if (quickCheckValues.length !== 1 || quickCheckValues[0].toLowerCase() !== 'ok') {
    throw new Error(`Database integrity check failed: ${quickCheckValues.join('; ') || 'no quick_check result'}`);
  }

  const foreignKeyViolations = database.pragma('foreign_key_check') as Array<Record<string, unknown>>;
  if (foreignKeyViolations.length) {
    throw new Error(`Database foreign key integrity check failed with ${foreignKeyViolations.length} violation(s).`);
  }
}

export function assertDatabaseReadyForRuntime(database: Database.Database) {
  assertDatabaseSchemaCompatibility(database);
  assertDatabaseHealth(database);
}
