import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { resolveEngineeringRequirements } from './requirementsDomain';

const root = process.cwd();
const runtimeMigrationSource = readFileSync(path.join(root, 'apps/desktop/electron/runtimeMigrations.ts'), 'utf-8');
const storeSource = readFileSync(path.join(root, 'apps/desktop/electron/requirementsApprovalStore.ts'), 'utf-8');
if (!runtimeMigrationSource.includes("'028_requirements_formal_approval'")) throw new Error('Runtime migration list is missing G05 migration 028.');
for (const contract of [
  'Requirement snapshot revision is stale.',
  'Approval event revision is stale.',
  'Approval event requirement snapshot identity mismatch.',
  'Engineering review cannot start while requirement conflicts remain unresolved.',
  "['engineering_review', 'lab_verified', 'approved', 'production_authorized']",
  "engineering_review: ['under_review']",
  "approved: ['approved']",
  "production_authorized: ['production']"
]) if (!storeSource.includes(contract)) throw new Error(`G05 persistence guard missing: ${contract}`);

const minimum = resolveEngineeringRequirements([
  { key: 'strength', domain: 'strength', resolution: 'minimum', numericValue: 35, unit: 'MPa', sourceKind: 'project_specification', sourceReference: 'spec-A' },
  { key: 'strength', domain: 'strength', resolution: 'minimum', numericValue: 40, unit: 'MPa', sourceKind: 'consultant', sourceReference: 'RFI-12' }
]);
if (minimum.rows[0]?.value !== 40 || minimum.conflicts.length) throw new Error('Minimum governing-value resolution is not deterministic.');

const maximum = resolveEngineeringRequirements([
  { key: 'w_cm', domain: 'exposure', resolution: 'maximum', numericValue: 0.50, unit: 'ratio', sourceKind: 'project_specification', sourceReference: 'spec-A' },
  { key: 'w_cm', domain: 'exposure', resolution: 'maximum', numericValue: 0.45, unit: 'ratio', sourceKind: 'engineer', sourceReference: 'eng-1' }
]);
if (maximum.rows[0]?.value !== 0.45) throw new Error('Maximum governing-value resolution is not deterministic.');

const conflict = resolveEngineeringRequirements([
  { key: 'placement', domain: 'placement', resolution: 'exact', textValue: 'pump', sourceKind: 'project_specification', sourceReference: 'spec-A' },
  { key: 'placement', domain: 'placement', resolution: 'exact', textValue: 'chute', sourceKind: 'consultant', sourceReference: 'RFI-13' }
]);
if (conflict.conflicts.length !== 1) throw new Error('Exact requirement conflict was not surfaced.');
if (conflict.method.silentOverrideApplied || conflict.method.standardsAcceptanceInferred) throw new Error('Requirement resolver must not silently override or infer standards acceptance.');

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');
const migrationsDir = path.join(root, 'database/migrations');
const migrations = readdirSync(migrationsDir).filter(file => /^\d{3}_.+\.sql$/.test(file)).sort();
for (const migration of migrations) db.exec(readFileSync(path.join(migrationsDir, migration), 'utf-8'));
for (const table of ['engineering_requirement_snapshots', 'mix_design_approval_events']) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(table) as { name?: string } | undefined;
  if (!row) throw new Error(`G05 schema missing ${table}`);
}

const now = '2026-09-12T00:00:00.000Z';
db.prepare('INSERT INTO projects (id, project_name, city, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('p1', 'G05 Project', 'Yazd', now, now);
db.prepare(`INSERT INTO mix_designs (id, project_id, concrete_type, target_strength_mpa, required_slump_mm, max_aggregate_size_mm, exposure_summary, status, engine_version, standards_version, revision_number, created_at, updated_at)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('m1', 'p1', 'normal_weight', 40, 120, 19, 'G05', 'under_review', '0.3.0', 'profile-v1', 2, now, now);
db.prepare(`INSERT INTO engineering_requirement_snapshots (id, mix_design_id, revision_number, snapshot_json, resolution_json, created_by, created_at)
 VALUES (?, ?, ?, ?, ?, ?, ?)`).run('req-1', 'm1', 2, JSON.stringify({ revisionNumber: 2 }), JSON.stringify({ conflicts: [] }), 'CI Engineer', now);
db.prepare(`INSERT INTO mix_design_approval_events (id, mix_design_id, revision_number, requirements_snapshot_id, event_type, reason, evidence_ids_json, actor_name, created_at)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('ev-1', 'm1', 2, 'req-1', 'engineering_review', 'Review started', JSON.stringify(['trial-1']), 'CI Engineer', now);
let deleteBlocked = false;
try { db.prepare('DELETE FROM engineering_requirement_snapshots WHERE id = ?').run('req-1'); } catch { deleteBlocked = true; }
if (!deleteBlocked) throw new Error('Approval evidence foreign key must protect referenced requirement snapshot history.');

const event = db.prepare('SELECT revision_number AS revisionNumber, event_type AS eventType, actor_name AS actorName FROM mix_design_approval_events WHERE id = ?').get('ev-1') as { revisionNumber: number; eventType: string; actorName: string };
if (event.revisionNumber !== 2 || event.eventType !== 'engineering_review' || event.actorName !== 'CI Engineer') throw new Error('Approval evidence identity persistence failed.');
db.close();
console.log(`G05 requirements/formal approval smoke passed: ${migrations.length} migrations, deterministic resolution, conflict visibility, revision-bound immutable evidence verified.`);
