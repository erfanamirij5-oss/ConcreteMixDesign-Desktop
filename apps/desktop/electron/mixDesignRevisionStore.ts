import crypto from 'node:crypto';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';

type MixDesignEditInput = {
  mixDesignId: string;
  projectName: string;
  city: string;
  concreteType: string;
  targetStrengthMpa: number;
  requiredSlumpMm: number;
  maxAggregateSizeMm: number;
  exposureSummary: string;
  actorName?: string;
};

type NewRevisionInput = {
  mixDesignId: string;
  changeReason: string;
  actorName?: string;
};

const MIGRATION_ID = '016_mix_design_revision_control';

export function getMixDesignManagementRecord(mixDesignId: string) {
  const database = revisionDatabase();
  const row = database.prepare(`
    SELECT
      md.id AS mixDesignId,
      md.project_id AS projectId,
      p.project_name AS projectName,
      p.city,
      md.concrete_type AS concreteType,
      md.target_strength_mpa AS targetStrengthMpa,
      md.required_slump_mm AS requiredSlumpMm,
      md.max_aggregate_size_mm AS maxAggregateSizeMm,
      md.exposure_summary AS exposureSummary,
      md.status,
      md.revision_number AS revisionNumber,
      md.engine_version AS engineVersion,
      md.standards_version AS standardsVersion,
      md.created_at AS createdAt,
      md.updated_at AS updatedAt
    FROM mix_designs md
    INNER JOIN projects p ON p.id = md.project_id
    WHERE md.id = ?
  `).get(mixDesignId);
  if (!row) throw new Error('طرح اختلاط موردنظر پیدا نشد.');
  return row;
}

export function updateMixDesignBasics(input: MixDesignEditInput) {
  validateEdit(input);
  const database = revisionDatabase();
  const current = getMixDesignManagementRecord(input.mixDesignId) as { projectId: string; status: string; revisionNumber: number };
  const locked = ['approved', 'production', 'superseded', 'archived'].includes(String(current.status).toLowerCase());
  if (locked) throw new Error('این نسخه برای ویرایش مستقیم قفل است. ابتدا Revision جدید ایجاد کنید.');

  const now = new Date().toISOString();
  database.transaction(() => {
    database.prepare(`UPDATE projects SET project_name = ?, city = ?, updated_at = ? WHERE id = ?`).run(input.projectName.trim(), input.city.trim(), now, current.projectId);
    database.prepare(`UPDATE mix_designs SET concrete_type = ?, target_strength_mpa = ?, required_slump_mm = ?, max_aggregate_size_mm = ?, exposure_summary = ?, updated_at = ? WHERE id = ?`).run(input.concreteType, input.targetStrengthMpa, input.requiredSlumpMm, input.maxAggregateSizeMm, input.exposureSummary.trim(), now, input.mixDesignId);
    insertAudit(database, input.mixDesignId, 'mix_design_basics_updated', {
      revisionNumber: current.revisionNumber,
      projectName: input.projectName.trim(),
      city: input.city.trim(),
      concreteType: input.concreteType,
      targetStrengthMpa: input.targetStrengthMpa,
      requiredSlumpMm: input.requiredSlumpMm,
      maxAggregateSizeMm: input.maxAggregateSizeMm
    }, input.actorName, now);
  })();
  return { status: 'pass' as const, record: getMixDesignManagementRecord(input.mixDesignId) };
}

export function createNewMixDesignRevision(input: NewRevisionInput) {
  if (!input.mixDesignId?.trim()) throw new Error('شناسه طرح اختلاط الزامی است.');
  if (!input.changeReason?.trim()) throw new Error('دلیل ایجاد Revision باید ثبت شود.');
  const database = revisionDatabase();
  const current = getMixDesignManagementRecord(input.mixDesignId) as { revisionNumber: number; status: string };
  const now = new Date().toISOString();
  const snapshot = buildFullSnapshot(database, input.mixDesignId);
  const currentRevision = Number(current.revisionNumber ?? 0);
  const nextRevision = currentRevision + 1;

  database.transaction(() => {
    const existing = database.prepare('SELECT id FROM mix_design_revision_snapshots WHERE mix_design_id = ? AND revision_number = ?').get(input.mixDesignId, currentRevision);
    if (!existing) {
      database.prepare(`INSERT INTO mix_design_revision_snapshots (id, mix_design_id, revision_number, snapshot_json, change_reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        crypto.randomUUID(), input.mixDesignId, currentRevision, JSON.stringify(snapshot), input.changeReason.trim(), input.actorName?.trim() || null, now
      );
    }
    database.prepare(`UPDATE mix_designs SET revision_number = ?, status = 'draft', updated_at = ? WHERE id = ?`).run(nextRevision, now, input.mixDesignId);
    insertAudit(database, input.mixDesignId, 'revision_created', { fromRevision: currentRevision, toRevision: nextRevision, previousStatus: current.status, reason: input.changeReason.trim() }, input.actorName, now);
  })();

  return { status: 'pass' as const, revisionNumber: nextRevision, record: getMixDesignManagementRecord(input.mixDesignId) };
}

export function listMixDesignRevisionHistory(mixDesignId: string) {
  const database = revisionDatabase();
  const current = getMixDesignManagementRecord(mixDesignId) as Record<string, unknown>;
  const snapshots = database.prepare(`
    SELECT id, revision_number AS revisionNumber, change_reason AS changeReason, created_by AS createdBy, created_at AS createdAt
    FROM mix_design_revision_snapshots
    WHERE mix_design_id = ?
    ORDER BY revision_number DESC
  `).all(mixDesignId);
  const audit = database.prepare(`
    SELECT id, action, details_json AS detailsJson, actor_name AS actorName, created_at AS createdAt
    FROM mix_design_audit_log
    WHERE mix_design_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(mixDesignId);
  return { current, snapshots, audit };
}

export function archiveMixDesign(mixDesignId: string, actorName?: string) {
  const database = revisionDatabase();
  const current = getMixDesignManagementRecord(mixDesignId) as { status: string; revisionNumber: number };
  if (String(current.status).toLowerCase() === 'archived') return { status: 'pass' as const, record: current };
  const now = new Date().toISOString();
  const snapshot = buildFullSnapshot(database, mixDesignId);
  database.transaction(() => {
    const existing = database.prepare('SELECT id FROM mix_design_revision_snapshots WHERE mix_design_id = ? AND revision_number = ?').get(mixDesignId, current.revisionNumber);
    if (!existing) database.prepare(`INSERT INTO mix_design_revision_snapshots (id, mix_design_id, revision_number, snapshot_json, change_reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), mixDesignId, current.revisionNumber, JSON.stringify(snapshot), 'Archive snapshot', actorName?.trim() || null, now);
    database.prepare(`UPDATE mix_designs SET status = 'archived', updated_at = ? WHERE id = ?`).run(now, mixDesignId);
    insertAudit(database, mixDesignId, 'mix_design_archived', { revisionNumber: current.revisionNumber }, actorName, now);
  })();
  return { status: 'pass' as const, record: getMixDesignManagementRecord(mixDesignId) };
}

function revisionDatabase() {
  const database = getDatabase();
  ensureRevisionMigration(database);
  return database;
}

function ensureRevisionMigration(database: Database.Database) {
  const applied = database.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(MIGRATION_ID);
  if (applied) return;
  const migrationPath = path.join(process.cwd(), `database/migrations/${MIGRATION_ID}.sql`);
  database.transaction(() => {
    database.exec(readFileSync(migrationPath, 'utf-8'));
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(MIGRATION_ID, new Date().toISOString());
  })();
}

function validateEdit(input: MixDesignEditInput) {
  if (!input.mixDesignId?.trim()) throw new Error('شناسه طرح اختلاط الزامی است.');
  if (!input.projectName?.trim()) throw new Error('نام پروژه الزامی است.');
  if (!['normal_weight', 'pumped'].includes(input.concreteType)) throw new Error('در نسخه فعلی فقط بتن معمولی و پمپی قابل ویرایش هستند.');
  if (!Number.isFinite(input.targetStrengthMpa) || input.targetStrengthMpa <= 0) throw new Error('مقاومت هدف باید عدد مثبت باشد.');
  if (!Number.isFinite(input.requiredSlumpMm) || input.requiredSlumpMm < 0) throw new Error('اسلامپ باید عدد نامنفی باشد.');
  if (!Number.isFinite(input.maxAggregateSizeMm) || input.maxAggregateSizeMm <= 0) throw new Error('حداکثر اندازه سنگدانه باید عدد مثبت باشد.');
}

function insertAudit(database: Database.Database, mixDesignId: string, action: string, details: unknown, actorName: string | undefined, createdAt: string) {
  database.prepare(`INSERT INTO mix_design_audit_log (id, mix_design_id, action, details_json, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), mixDesignId, action, JSON.stringify(details ?? {}), actorName?.trim() || null, createdAt);
}

function buildFullSnapshot(database: Database.Database, mixDesignId: string) {
  const mix = database.prepare('SELECT * FROM mix_designs WHERE id = ?').get(mixDesignId) as { project_id?: string; laboratory_id?: string; designer_id?: string } | undefined;
  if (!mix) throw new Error('طرح اختلاط برای Snapshot پیدا نشد.');
  const project = mix.project_id ? database.prepare('SELECT * FROM projects WHERE id = ?').get(mix.project_id) : null;
  const laboratory = mix.laboratory_id ? database.prepare('SELECT * FROM laboratories WHERE id = ?').get(mix.laboratory_id) : null;
  const designer = mix.designer_id ? database.prepare('SELECT * FROM designers WHERE id = ?').get(mix.designer_id) : null;
  const materials = database.prepare('SELECT * FROM materials WHERE mix_design_id = ? ORDER BY rowid').all(mixDesignId) as Array<{ id: string }>;
  const materialIds = materials.map(item => item.id);
  const gradation = materialIds.length ? database.prepare(`SELECT * FROM aggregate_sieve_results WHERE material_id IN (${materialIds.map(() => '?').join(',')}) ORDER BY material_id, sieve_size_mm DESC`).all(...materialIds) : [];
  const durabilityInput = database.prepare('SELECT * FROM durability_inputs WHERE mix_design_id = ?').get(mixDesignId) ?? null;
  const blendShares = database.prepare('SELECT * FROM aggregate_blend_shares WHERE mix_design_id = ? ORDER BY rowid').all(mixDesignId);
  const optimizerSettings = database.prepare('SELECT * FROM aggregate_blend_optimizer_settings WHERE mix_design_id = ?').get(mixDesignId) ?? null;
  const optimizerConstraints = database.prepare('SELECT * FROM aggregate_blend_constraints WHERE mix_design_id = ? ORDER BY rowid').all(mixDesignId);
  const combinedLimits = database.prepare('SELECT * FROM combined_gradation_limits WHERE mix_design_id = ? ORDER BY sieve_size_mm DESC').all(mixDesignId);
  const mixResults = database.prepare('SELECT * FROM mix_results WHERE mix_design_id = ? ORDER BY rowid').all(mixDesignId);
  const durabilityChecks = database.prepare('SELECT * FROM durability_checks WHERE mix_design_id = ? ORDER BY rowid').all(mixDesignId);
  return { schema: 'tolou.mix-design.snapshot.v1', capturedAt: new Date().toISOString(), mix, project, laboratory, designer, materials, gradation, durabilityInput, blendShares, optimizerSettings, optimizerConstraints, combinedLimits, mixResults, durabilityChecks };
}
