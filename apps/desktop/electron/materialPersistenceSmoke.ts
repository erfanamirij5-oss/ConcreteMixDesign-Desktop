import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const repositoryRoot = process.cwd();
const databaseSourcePath = path.join(repositoryRoot, 'apps/desktop/electron/database.ts');
const databaseSource = readFileSync(databaseSourcePath, 'utf-8');

const insertMatch = databaseSource.match(
  /INSERT INTO materials \(([\s\S]*?)\) VALUES \(\$\{Array\.from\(\{ length: (\d+) \}/,
);
if (!insertMatch) throw new Error('Unable to locate the materials INSERT contract in database.ts');

const insertColumns = insertMatch[1].split(',').map((item) => item.trim()).filter(Boolean);
const placeholderCount = Number(insertMatch[2]);

const saveMaterialStart = databaseSource.indexOf('export function saveMaterial');
const saveMaterialEnd = databaseSource.indexOf('export function saveGradation', saveMaterialStart);
if (saveMaterialStart < 0 || saveMaterialEnd < 0) {
  throw new Error('Unable to isolate saveMaterial implementation in database.ts');
}

const saveMaterialSource = databaseSource.slice(saveMaterialStart, saveMaterialEnd);
const insertPosition = saveMaterialSource.indexOf('INSERT INTO materials');
const runMarker = ').run(';
const runStart = saveMaterialSource.indexOf(runMarker, insertPosition);
if (insertPosition < 0 || runStart < 0) throw new Error('Unable to locate saveMaterial material INSERT run(...) call');

const argumentStart = runStart + runMarker.length;
let runEnd = -1;
let depth = 0;
let quote: "'" | '"' | '`' | null = null;
let escaped = false;
for (let index = argumentStart; index < saveMaterialSource.length; index += 1) {
  const character = saveMaterialSource[index];
  if (quote) {
    if (escaped) { escaped = false; continue; }
    if (character === '\\') { escaped = true; continue; }
    if (character === quote) quote = null;
    continue;
  }
  if (character === "'" || character === '"' || character === '`') { quote = character; continue; }
  if (character === '(' || character === '[' || character === '{') { depth += 1; continue; }
  if (character === ')' || character === ']' || character === '}') {
    if (character === ')' && depth === 0) { runEnd = index; break; }
    depth -= 1;
  }
}
if (runEnd < 0) throw new Error('Unable to determine saveMaterial run(...) argument boundary');

const runArgumentsText = saveMaterialSource.slice(argumentStart, runEnd).trim();
let saveMaterialRunArgumentCount = runArgumentsText ? 1 : 0;
let argumentDepth = 0;
let argumentQuote: "'" | '"' | '`' | null = null;
let argumentEscaped = false;
for (const character of runArgumentsText) {
  if (argumentQuote) {
    if (argumentEscaped) { argumentEscaped = false; continue; }
    if (character === '\\') { argumentEscaped = true; continue; }
    if (character === argumentQuote) argumentQuote = null;
    continue;
  }
  if (character === "'" || character === '"' || character === '`') { argumentQuote = character; continue; }
  if (character === '(' || character === '[' || character === '{') argumentDepth += 1;
  else if (character === ')' || character === ']' || character === '}') argumentDepth -= 1;
  else if (character === ',' && argumentDepth === 0) saveMaterialRunArgumentCount += 1;
}

if (insertColumns.length !== placeholderCount || placeholderCount !== saveMaterialRunArgumentCount) {
  throw new Error(`Material INSERT contract mismatch: columns=${insertColumns.length}, placeholders=${placeholderCount}, values=${saveMaterialRunArgumentCount}`);
}

if (!databaseSource.includes("'015_aggregate_blend_optimizer_criteria'")) {
  throw new Error('database.ts runMigrations does not include migration 015_aggregate_blend_optimizer_criteria');
}

const database = new DatabaseSync(':memory:');
database.exec('PRAGMA foreign_keys = OFF;');
const migrationsDirectory = path.join(repositoryRoot, 'database/migrations');
const migrationFiles = readdirSync(migrationsDirectory).filter((file) => /^\d{3}_.+\.sql$/.test(file)).sort();
if (!migrationFiles.includes('014_aggregate_shape_texture.sql')) throw new Error('Migration 014_aggregate_shape_texture.sql is missing from the migration set');
if (!migrationFiles.includes('015_aggregate_blend_optimizer_criteria.sql')) throw new Error('Migration 015_aggregate_blend_optimizer_criteria.sql is missing from the migration set');
for (const migrationFile of migrationFiles) database.exec(readFileSync(path.join(migrationsDirectory, migrationFile), 'utf-8'));

const schemaColumns = new Set((database.prepare('PRAGMA table_info(materials)').all() as Array<{ name: string }>).map((row) => row.name));
const missingColumns = insertColumns.filter((column) => !schemaColumns.has(column));
if (missingColumns.length) throw new Error(`Material INSERT references columns missing from migrated schema: ${missingColumns.join(', ')}`);

const smokeValues: Record<string, string | number | null> = {
  id: 'smoke-material', mix_design_id: 'smoke-mix', material_type: 'coarse_aggregate', aggregate_role: 'primary_coarse',
  nominal_size_mm: 19, fractured_face_percent: 85, moisture_condition: 'ssd', name: 'CI smoke coarse aggregate', source: 'CI',
  specific_gravity: 2.68, absorption_percent: 0.8, moisture_percent: 1.2, unit_weight_kg_m3: 1600, notes: 'SQLite material persistence smoke test',
  astm_d4791_flat_elongated_percent: 12, flat_elongated_limit_percent: 15, astm_d4791_dimensional_ratio: '5:1',
  astm_d5821_fractured_particles_percent: 90, fractured_particles_min_percent: 75, fractured_faces_required: 1,
  shape_texture_evidence_ref: 'CI-SMOKE-014',
};
const values = insertColumns.map((column) => smokeValues[column] ?? null);
const sql = `INSERT INTO materials (${insertColumns.join(', ')}) VALUES (${Array.from({ length: placeholderCount }, () => '?').join(', ')})`;
database.prepare(sql).run(...values);

const saved = database.prepare(`
  SELECT id, material_type, nominal_size_mm,
         astm_d4791_flat_elongated_percent, astm_d4791_dimensional_ratio,
         astm_d5821_fractured_particles_percent, fractured_faces_required,
         shape_texture_evidence_ref
  FROM materials WHERE id = ?
`).get('smoke-material') as Record<string, unknown> | undefined;

if (!saved || saved.id !== 'smoke-material' || saved.material_type !== 'coarse_aggregate') throw new Error('Material row was not persisted by the smoke INSERT');
if (
  saved.astm_d4791_flat_elongated_percent !== 12 || saved.astm_d4791_dimensional_ratio !== '5:1'
  || saved.astm_d5821_fractured_particles_percent !== 90 || saved.fractured_faces_required !== 1
  || saved.shape_texture_evidence_ref !== 'CI-SMOKE-014'
) throw new Error('Migration 014 aggregate shape/texture fields did not round-trip correctly');

database.prepare(`INSERT INTO aggregate_blend_optimizer_settings (mix_design_id, enabled, step_percent, fine_share_min_percent, fine_share_max_percent, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run('smoke-mix', 1, 5, 35, 50, 'CI');
database.prepare(`INSERT INTO aggregate_blend_constraints (id, mix_design_id, material_id, min_percent, max_percent, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run('constraint-1', 'smoke-mix', 'smoke-material', 20, 65, 'CI');
database.prepare(`INSERT INTO combined_gradation_limits (id, mix_design_id, sieve_size_mm, lower_percent, upper_percent, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run('limit-1', 'smoke-mix', 4.75, 35, 55, 'CI');

const optimizerSaved = database.prepare(`SELECT enabled, step_percent, fine_share_min_percent, fine_share_max_percent FROM aggregate_blend_optimizer_settings WHERE mix_design_id = ?`).get('smoke-mix') as Record<string, unknown> | undefined;
const constraintSaved = database.prepare(`SELECT min_percent, max_percent FROM aggregate_blend_constraints WHERE mix_design_id = ? AND material_id = ?`).get('smoke-mix', 'smoke-material') as Record<string, unknown> | undefined;
const limitSaved = database.prepare(`SELECT lower_percent, upper_percent FROM combined_gradation_limits WHERE mix_design_id = ? AND sieve_size_mm = ?`).get('smoke-mix', 4.75) as Record<string, unknown> | undefined;
if (!optimizerSaved || optimizerSaved.enabled !== 1 || optimizerSaved.step_percent !== 5 || optimizerSaved.fine_share_min_percent !== 35 || optimizerSaved.fine_share_max_percent !== 50) throw new Error('Migration 015 optimizer settings did not round-trip correctly');
if (!constraintSaved || constraintSaved.min_percent !== 20 || constraintSaved.max_percent !== 65) throw new Error('Migration 015 source constraints did not round-trip correctly');
if (!limitSaved || limitSaved.lower_percent !== 35 || limitSaved.upper_percent !== 55) throw new Error('Migration 015 combined gradation limits did not round-trip correctly');

database.close();
console.log(`SQLite persistence smoke passed: ${migrationFiles.length} migrations, ${insertColumns.length} material columns, optimizer criteria round-trip verified.`);
