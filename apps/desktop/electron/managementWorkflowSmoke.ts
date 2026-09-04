import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = process.cwd();
const databaseSource = readFileSync(path.join(root, 'apps/desktop/electron/database.ts'), 'utf-8');
const managementSource = readFileSync(path.join(root, 'apps/desktop/electron/mixDesignRevisionStore.ts'), 'utf-8');

for (const migration of [
  '016_mix_design_revision_control',
  '017_mix_design_management_workflow',
  '018_mix_design_engineering_identity',
]) {
  if (!databaseSource.includes(`'${migration}'`)) throw new Error(`Central migration runner is missing ${migration}`);
}
if (managementSource.includes('ensureManagementMigrations') || managementSource.includes('const MIGRATIONS')) {
  throw new Error('Management store must not own a second migration runner');
}
if (!managementSource.includes("draft: ['trial_required']")
  || !managementSource.includes("trial_required: ['trial_completed']")
  || !managementSource.includes("trial_completed: ['under_review']")
  || !managementSource.includes("under_review: ['approved']")
  || !managementSource.includes("approved: ['production']")
  || !managementSource.includes("production: ['superseded']")) {
  throw new Error('Controlled management workflow state machine is incomplete');
}
for (const contract of [
  'p.location_description AS locationDescription',
  'p.structure_type AS structureType',
  'p.element_type AS elementType',
  'p.client_name AS clientName',
  'p.contractor_name AS contractorName',
  'p.consultant_name AS consultantName',
  'l.lab_name AS laboratoryName',
  'l.license_number AS laboratoryLicenseNumber',
  'd.full_name AS designerFullName',
  'd.license_or_membership_number AS designerLicenseNumber',
  'LEFT JOIN laboratories l ON l.id = md.laboratory_id',
  'LEFT JOIN designers d ON d.id = md.designer_id',
  'UPDATE laboratories SET lab_name = ?',
  'UPDATE designers SET full_name = ?',
  'md.design_standard AS designStandard',
  'md.engineer_notes AS engineerNotes',
  'design_standard = ?',
  'engineer_notes = ?'
]) {
  if (!managementSource.includes(contract)) throw new Error(`Workspace persistence contract missing: ${contract}`);
}

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');
const migrationsDir = path.join(root, 'database/migrations');
const migrations = readdirSync(migrationsDir).filter(file => /^\d{3}_.+\.sql$/.test(file)).sort();
for (const migration of migrations) db.exec(readFileSync(path.join(migrationsDir, migration), 'utf-8'));

const requiredMixColumns = ['revision_number', 'source_mix_design_id', 'archived_from_status', 'archived_at', 'customer_name', 'client_name', 'project_code', 'project_location', 'design_standard', 'exposure_class', 'engineer_notes'];
const mixColumns = new Set((db.prepare('PRAGMA table_info(mix_designs)').all() as Array<{ name: string }>).map(row => row.name));
for (const column of requiredMixColumns) if (!mixColumns.has(column)) throw new Error(`Management schema missing mix_designs.${column}`);
for (const table of ['mix_design_revision_snapshots', 'mix_design_audit_log', 'mix_design_status_history']) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(table) as { name?: string } | undefined;
  if (!row) throw new Error(`Management schema missing ${table}`);
}

const now = '2026-09-04T00:00:00.000Z';
db.prepare('INSERT INTO projects (id, project_name, city, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('project-1', 'CI Project', 'Yazd', now, now);
db.prepare(`INSERT INTO mix_designs (id, project_id, concrete_type, target_strength_mpa, required_slump_mm, max_aggregate_size_mm, exposure_summary, status, engine_version, standards_version, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('mix-1', 'project-1', 'normal_weight', 35, 100, 19, 'CI', 'draft', '0.3.0', 'ACI', now, now);

const transition = (from: string, to: string, reason: string) => {
  const current = db.prepare('SELECT status FROM mix_designs WHERE id = ?').get('mix-1') as { status: string };
  if (current.status !== from) throw new Error(`Expected ${from}, found ${current.status}`);
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE mix_designs SET status = ?, updated_at = ? WHERE id = ?').run(to, now, 'mix-1');
    db.prepare('INSERT INTO mix_design_status_history (id, mix_design_id, from_status, to_status, reason, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(`status-${from}-${to}`, 'mix-1', from, to, reason, 'CI Engineer', now);
    db.prepare('INSERT INTO mix_design_audit_log (id, mix_design_id, action, details_json, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(`audit-${from}-${to}`, 'mix-1', 'status_transition', JSON.stringify({ fromStatus: from, toStatus: to, reason }), 'CI Engineer', now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

transition('draft', 'trial_required', 'Trial required');
transition('trial_required', 'trial_completed', 'Trial completed');
transition('trial_completed', 'under_review', 'Engineering review');
transition('under_review', 'approved', 'Approved');

const approved = db.prepare('SELECT status FROM mix_designs WHERE id = ?').get('mix-1') as { status: string };
if (approved.status !== 'approved') throw new Error('Workflow did not reach approved state');

// Archive must preserve the prior controlled status and Restore must return to it.
db.prepare("UPDATE mix_designs SET status = 'archived', archived_from_status = 'approved', archived_at = ?, updated_at = ? WHERE id = ?").run(now, now, 'mix-1');
db.prepare('INSERT INTO mix_design_audit_log (id, mix_design_id, action, details_json, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('audit-archive', 'mix-1', 'mix_design_archived', JSON.stringify({ previousStatus: 'approved' }), 'CI Engineer', now);
const archived = db.prepare('SELECT status, archived_from_status AS archivedFromStatus FROM mix_designs WHERE id = ?').get('mix-1') as { status: string; archivedFromStatus: string };
if (archived.status !== 'archived' || archived.archivedFromStatus !== 'approved') throw new Error('Archive did not retain previous status');
db.prepare("UPDATE mix_designs SET status = archived_from_status, archived_from_status = NULL, archived_at = NULL, updated_at = ? WHERE id = ?").run(now, 'mix-1');
const restored = db.prepare('SELECT status, archived_from_status AS archivedFromStatus, archived_at AS archivedAt FROM mix_designs WHERE id = ?').get('mix-1') as { status: string; archivedFromStatus: string | null; archivedAt: string | null };
if (restored.status !== 'approved' || restored.archivedFromStatus !== null || restored.archivedAt !== null) throw new Error('Restore did not recover approved status cleanly');

// Revision snapshot is immutable by the unique (mix_design_id, revision_number) contract.
db.prepare('INSERT INTO mix_design_revision_snapshots (id, mix_design_id, revision_number, snapshot_json, change_reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('snapshot-0', 'mix-1', 0, JSON.stringify({ status: 'approved' }), 'CI revision', 'CI Engineer', now);
let duplicateSnapshotRejected = false;
try {
  db.prepare('INSERT INTO mix_design_revision_snapshots (id, mix_design_id, revision_number, snapshot_json, change_reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('snapshot-0b', 'mix-1', 0, '{}', 'duplicate', 'CI Engineer', now);
} catch {
  duplicateSnapshotRejected = true;
}
if (!duplicateSnapshotRejected) throw new Error('Revision snapshot uniqueness is not enforced');
db.prepare("UPDATE mix_designs SET revision_number = 1, status = 'draft', updated_at = ? WHERE id = ?").run(now, 'mix-1');
db.prepare('INSERT INTO mix_design_audit_log (id, mix_design_id, action, details_json, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('audit-revision', 'mix-1', 'revision_created', JSON.stringify({ fromRevision: 0, toRevision: 1 }), 'CI Engineer', now);

const finalMix = db.prepare('SELECT revision_number AS revisionNumber, status FROM mix_designs WHERE id = ?').get('mix-1') as { revisionNumber: number; status: string };
const auditCount = (db.prepare('SELECT COUNT(*) AS count FROM mix_design_audit_log WHERE mix_design_id = ?').get('mix-1') as { count: number }).count;
const historyCount = (db.prepare('SELECT COUNT(*) AS count FROM mix_design_status_history WHERE mix_design_id = ?').get('mix-1') as { count: number }).count;
if (finalMix.revisionNumber !== 1 || finalMix.status !== 'draft') throw new Error('Revision did not reset the working record to draft revision 1');
if (auditCount < 6 || historyCount !== 4) throw new Error(`Audit/history contract incomplete: audit=${auditCount}, statusHistory=${historyCount}`);

db.close();
console.log(`Management workflow smoke passed: ${migrations.length} migrations, controlled transitions, complete project/lab/designer workspace identity, archive/restore, revision uniqueness and audit verified.`);