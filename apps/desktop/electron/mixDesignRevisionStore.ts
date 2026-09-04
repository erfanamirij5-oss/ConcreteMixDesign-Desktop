import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';

type MixDesignEditInput = {
  mixDesignId: string;
  projectName: string;
  city: string;
  locationDescription?: string;
  structureType?: string;
  elementType?: string;
  clientName?: string;
  contractorName?: string;
  consultantName?: string;
  laboratoryName?: string;
  laboratoryLicenseNumber?: string;
  laboratoryAddress?: string;
  laboratoryPhone?: string;
  designerFullName?: string;
  designerRole?: string;
  designerLicenseNumber?: string;
  designerPhone?: string;
  designerEmail?: string;
  concreteType: string;
  targetStrengthMpa: number;
  requiredSlumpMm: number;
  maxAggregateSizeMm: number;
  exposureSummary: string;
  designStandard?: string;
  engineerNotes?: string;
  actorName?: string;
};

type NewRevisionInput = { mixDesignId: string; changeReason: string; actorName?: string; };
type StatusTransitionInput = { mixDesignId: string; toStatus: string; reason?: string; actorName?: string; };
type DuplicateInput = { mixDesignId: string; projectName?: string; actorName?: string; };

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['trial_required'],
  trial_required: ['trial_completed'],
  trial_completed: ['under_review'],
  under_review: ['approved'],
  approved: ['production'],
  production: ['superseded'],
  superseded: []
};

export function getMixDesignManagementRecord(mixDesignId: string) {
  const database = managementDatabase();
  const row = database.prepare(`
    SELECT md.id AS mixDesignId, md.project_id AS projectId, md.laboratory_id AS laboratoryId, md.designer_id AS designerId,
      p.project_name AS projectName, p.city,
      p.location_description AS locationDescription, p.structure_type AS structureType, p.element_type AS elementType,
      p.client_name AS clientName, p.contractor_name AS contractorName, p.consultant_name AS consultantName,
      l.lab_name AS laboratoryName, l.license_number AS laboratoryLicenseNumber, l.address AS laboratoryAddress, l.phone AS laboratoryPhone,
      d.full_name AS designerFullName, d.role AS designerRole, d.license_or_membership_number AS designerLicenseNumber,
      d.phone AS designerPhone, d.email AS designerEmail,
      md.concrete_type AS concreteType, md.target_strength_mpa AS targetStrengthMpa,
      md.required_slump_mm AS requiredSlumpMm, md.max_aggregate_size_mm AS maxAggregateSizeMm,
      md.exposure_summary AS exposureSummary, md.design_standard AS designStandard, md.engineer_notes AS engineerNotes,
      md.status, md.revision_number AS revisionNumber,
      md.source_mix_design_id AS sourceMixDesignId, md.archived_from_status AS archivedFromStatus,
      md.archived_at AS archivedAt, md.engine_version AS engineVersion, md.standards_version AS standardsVersion,
      md.created_at AS createdAt, md.updated_at AS updatedAt
    FROM mix_designs md
    INNER JOIN projects p ON p.id = md.project_id
    LEFT JOIN laboratories l ON l.id = md.laboratory_id
    LEFT JOIN designers d ON d.id = md.designer_id
    WHERE md.id = ?
  `).get(mixDesignId);
  if (!row) throw new Error('طرح اختلاط موردنظر پیدا نشد.');
  return row;
}

export function updateMixDesignBasics(input: MixDesignEditInput) {
  validateEdit(input);
  const database = managementDatabase();
  const current = getMixDesignManagementRecord(input.mixDesignId) as { projectId: string; laboratoryId?: string | null; designerId?: string | null; status: string; revisionNumber: number };
  if (isLockedStatus(current.status)) throw new Error('این نسخه برای ویرایش مستقیم قفل است. ابتدا Revision جدید ایجاد کنید.');
  const now = new Date().toISOString();
  database.transaction(() => {
    database.prepare(`
      UPDATE projects SET project_name = ?, city = ?, location_description = ?, structure_type = ?, element_type = ?,
        client_name = ?, contractor_name = ?, consultant_name = ?, updated_at = ? WHERE id = ?
    `).run(
      input.projectName.trim(), input.city?.trim() || null, input.locationDescription?.trim() || null,
      input.structureType?.trim() || null, input.elementType?.trim() || null, input.clientName?.trim() || null,
      input.contractorName?.trim() || null, input.consultantName?.trim() || null, now, current.projectId
    );
    if (current.laboratoryId) {
      database.prepare('UPDATE laboratories SET lab_name = ?, license_number = ?, address = ?, phone = ?, updated_at = ? WHERE id = ?').run(input.laboratoryName?.trim() || '', input.laboratoryLicenseNumber?.trim() || null, input.laboratoryAddress?.trim() || null, input.laboratoryPhone?.trim() || null, now, current.laboratoryId);
    }
    if (current.designerId) {
      database.prepare('UPDATE designers SET full_name = ?, role = ?, license_or_membership_number = ?, phone = ?, email = ?, updated_at = ? WHERE id = ?').run(input.designerFullName?.trim() || '', input.designerRole?.trim() || null, input.designerLicenseNumber?.trim() || null, input.designerPhone?.trim() || null, input.designerEmail?.trim() || null, now, current.designerId);
    }
    database.prepare('UPDATE mix_designs SET concrete_type = ?, target_strength_mpa = ?, required_slump_mm = ?, max_aggregate_size_mm = ?, exposure_summary = ?, design_standard = ?, engineer_notes = ?, updated_at = ? WHERE id = ?').run(input.concreteType, input.targetStrengthMpa, input.requiredSlumpMm, input.maxAggregateSizeMm, input.exposureSummary.trim(), input.designStandard?.trim() || null, input.engineerNotes?.trim() || null, now, input.mixDesignId);
    insertAudit(database, input.mixDesignId, 'mix_design_basics_updated', {
      revisionNumber: current.revisionNumber,
      projectName: input.projectName.trim(), city: input.city?.trim() || null,
      locationDescription: input.locationDescription?.trim() || null, structureType: input.structureType?.trim() || null,
      elementType: input.elementType?.trim() || null, clientName: input.clientName?.trim() || null,
      contractorName: input.contractorName?.trim() || null, consultantName: input.consultantName?.trim() || null,
      laboratoryName: input.laboratoryName?.trim() || null, laboratoryLicenseNumber: input.laboratoryLicenseNumber?.trim() || null,
      designerFullName: input.designerFullName?.trim() || null, designerRole: input.designerRole?.trim() || null,
      concreteType: input.concreteType, targetStrengthMpa: input.targetStrengthMpa,
      requiredSlumpMm: input.requiredSlumpMm, maxAggregateSizeMm: input.maxAggregateSizeMm,
      designStandard: input.designStandard?.trim() || null, engineerNotes: input.engineerNotes?.trim() || null
    }, input.actorName, now);
  })();
  return { status: 'pass' as const, record: getMixDesignManagementRecord(input.mixDesignId) };
}

export function createNewMixDesignRevision(input: NewRevisionInput) {
  if (!input.mixDesignId?.trim()) throw new Error('شناسه طرح اختلاط الزامی است.');
  if (!input.changeReason?.trim()) throw new Error('دلیل ایجاد Revision باید ثبت شود.');
  const database = managementDatabase();
  const current = getMixDesignManagementRecord(input.mixDesignId) as { revisionNumber: number; status: string };
  const now = new Date().toISOString();
  const snapshot = buildFullSnapshot(database, input.mixDesignId);
  const currentRevision = Number(current.revisionNumber ?? 0);
  const nextRevision = currentRevision + 1;
  database.transaction(() => {
    const existing = database.prepare('SELECT id FROM mix_design_revision_snapshots WHERE mix_design_id = ? AND revision_number = ?').get(input.mixDesignId, currentRevision);
    if (!existing) database.prepare('INSERT INTO mix_design_revision_snapshots (id, mix_design_id, revision_number, snapshot_json, change_reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), input.mixDesignId, currentRevision, JSON.stringify(snapshot), input.changeReason.trim(), input.actorName?.trim() || null, now);
    database.prepare("UPDATE mix_designs SET revision_number = ?, status = 'draft', archived_from_status = NULL, archived_at = NULL, updated_at = ? WHERE id = ?").run(nextRevision, now, input.mixDesignId);
    insertStatusHistory(database, input.mixDesignId, current.status, 'draft', `Revision: ${input.changeReason.trim()}`, input.actorName, now);
    insertAudit(database, input.mixDesignId, 'revision_created', { fromRevision: currentRevision, toRevision: nextRevision, previousStatus: current.status, reason: input.changeReason.trim() }, input.actorName, now);
  })();
  return { status: 'pass' as const, revisionNumber: nextRevision, record: getMixDesignManagementRecord(input.mixDesignId) };
}

export function transitionMixDesignStatus(input: StatusTransitionInput) {
  if (!input.mixDesignId?.trim()) throw new Error('شناسه طرح اختلاط الزامی است.');
  const database = managementDatabase();
  const current = getMixDesignManagementRecord(input.mixDesignId) as { status: string; revisionNumber: number };
  const fromStatus = canonicalStatus(current.status);
  const toStatus = canonicalStatus(input.toStatus);
  if (fromStatus === 'archived') throw new Error('پرونده بایگانی‌شده ابتدا باید Restore شود.');
  if (toStatus === 'archived') throw new Error('برای بایگانی از عملیات Archive استفاده کنید.');
  const allowed = STATUS_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) throw new Error(`انتقال وضعیت از ${fromStatus} به ${toStatus} مجاز نیست.`);
  const now = new Date().toISOString();
  database.transaction(() => {
    database.prepare('UPDATE mix_designs SET status = ?, updated_at = ? WHERE id = ?').run(toStatus, now, input.mixDesignId);
    insertStatusHistory(database, input.mixDesignId, fromStatus, toStatus, input.reason, input.actorName, now);
    insertAudit(database, input.mixDesignId, 'status_transition', { fromStatus, toStatus, revisionNumber: current.revisionNumber, reason: input.reason?.trim() || null }, input.actorName, now);
  })();
  return { status: 'pass' as const, record: getMixDesignManagementRecord(input.mixDesignId), allowedNextStatuses: STATUS_TRANSITIONS[toStatus] ?? [] };
}

export function getAllowedNextStatuses(mixDesignId: string) {
  const current = getMixDesignManagementRecord(mixDesignId) as { status: string };
  const status = canonicalStatus(current.status);
  return { currentStatus: status, nextStatuses: status === 'archived' ? [] : (STATUS_TRANSITIONS[status] ?? []) };
}

export function archiveMixDesign(mixDesignId: string, actorName?: string) {
  const database = managementDatabase();
  const current = getMixDesignManagementRecord(mixDesignId) as { status: string; revisionNumber: number };
  if (canonicalStatus(current.status) === 'archived') return { status: 'pass' as const, record: getMixDesignManagementRecord(mixDesignId) };
  const now = new Date().toISOString();
  const snapshot = buildFullSnapshot(database, mixDesignId);
  const previousStatus = canonicalStatus(current.status);
  database.transaction(() => {
    const existing = database.prepare('SELECT id FROM mix_design_revision_snapshots WHERE mix_design_id = ? AND revision_number = ?').get(mixDesignId, current.revisionNumber);
    if (!existing) database.prepare('INSERT INTO mix_design_revision_snapshots (id, mix_design_id, revision_number, snapshot_json, change_reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), mixDesignId, current.revisionNumber, JSON.stringify(snapshot), 'Archive snapshot', actorName?.trim() || null, now);
    database.prepare("UPDATE mix_designs SET status = 'archived', archived_from_status = ?, archived_at = ?, updated_at = ? WHERE id = ?").run(previousStatus, now, now, mixDesignId);
    insertStatusHistory(database, mixDesignId, previousStatus, 'archived', 'Archive', actorName, now);
    insertAudit(database, mixDesignId, 'mix_design_archived', { revisionNumber: current.revisionNumber, previousStatus }, actorName, now);
  })();
  return { status: 'pass' as const, record: getMixDesignManagementRecord(mixDesignId) };
}

export function restoreMixDesign(mixDesignId: string, actorName?: string) {
  const database = managementDatabase();
  const current = getMixDesignManagementRecord(mixDesignId) as { status: string; archivedFromStatus?: string | null; revisionNumber: number };
  if (canonicalStatus(current.status) !== 'archived') throw new Error('این پرونده در وضعیت بایگانی نیست.');
  const restoreStatus = canonicalStatus(current.archivedFromStatus || 'draft');
  const validRestoreStatus = restoreStatus === 'archived' ? 'draft' : restoreStatus;
  const now = new Date().toISOString();
  database.transaction(() => {
    database.prepare('UPDATE mix_designs SET status = ?, archived_from_status = NULL, archived_at = NULL, updated_at = ? WHERE id = ?').run(validRestoreStatus, now, mixDesignId);
    insertStatusHistory(database, mixDesignId, 'archived', validRestoreStatus, 'Restore from archive', actorName, now);
    insertAudit(database, mixDesignId, 'mix_design_restored', { revisionNumber: current.revisionNumber, restoredStatus: validRestoreStatus }, actorName, now);
  })();
  return { status: 'pass' as const, record: getMixDesignManagementRecord(mixDesignId) };
}

export function duplicateMixDesign(input: DuplicateInput) {
  if (!input.mixDesignId?.trim()) throw new Error('شناسه طرح اختلاط مبدا الزامی است.');
  const database = managementDatabase();
  const source = database.prepare('SELECT * FROM mix_designs WHERE id = ?').get(input.mixDesignId) as Record<string, unknown> | undefined;
  if (!source) throw new Error('طرح اختلاط مبدا پیدا نشد.');
  const sourceProject = database.prepare('SELECT * FROM projects WHERE id = ?').get(source.project_id) as Record<string, unknown> | undefined;
  const sourceLab = source.laboratory_id ? database.prepare('SELECT * FROM laboratories WHERE id = ?').get(source.laboratory_id) as Record<string, unknown> | undefined : undefined;
  const sourceDesigner = source.designer_id ? database.prepare('SELECT * FROM designers WHERE id = ?').get(source.designer_id) as Record<string, unknown> | undefined : undefined;
  if (!sourceProject) throw new Error('پروژه مبدا برای Duplicate پیدا نشد.');

  const now = new Date().toISOString();
  const newProjectId = crypto.randomUUID();
  const newLabId = sourceLab ? crypto.randomUUID() : null;
  const newDesignerId = sourceDesigner ? crypto.randomUUID() : null;
  const newMixDesignId = crypto.randomUUID();
  const newProjectName = input.projectName?.trim() || `${String(sourceProject.project_name ?? 'طرح اختلاط')} - کپی`;

  database.transaction(() => {
    insertClonedRow(database, 'projects', sourceProject, { id: newProjectId, project_name: newProjectName, created_at: now, updated_at: now });
    if (sourceLab && newLabId) insertClonedRow(database, 'laboratories', sourceLab, { id: newLabId, created_at: now, updated_at: now });
    if (sourceDesigner && newDesignerId) insertClonedRow(database, 'designers', sourceDesigner, { id: newDesignerId, created_at: now, updated_at: now });
    insertClonedRow(database, 'mix_designs', source, { id: newMixDesignId, project_id: newProjectId, laboratory_id: newLabId, designer_id: newDesignerId, status: 'draft', revision_number: 0, source_mix_design_id: input.mixDesignId, archived_from_status: null, archived_at: null, created_at: now, updated_at: now });

    const sourceMaterials = database.prepare('SELECT * FROM materials WHERE mix_design_id = ? ORDER BY rowid').all(input.mixDesignId) as Array<Record<string, unknown>>;
    const materialMap = new Map<string, string>();
    for (const material of sourceMaterials) {
      const oldId = String(material.id); const newId = crypto.randomUUID(); materialMap.set(oldId, newId);
      insertClonedRow(database, 'materials', material, { id: newId, mix_design_id: newMixDesignId });
    }
    for (const [oldMaterialId, newMaterialId] of materialMap) {
      const sieveRows = database.prepare('SELECT * FROM aggregate_sieve_results WHERE material_id = ?').all(oldMaterialId) as Array<Record<string, unknown>>;
      for (const row of sieveRows) insertClonedRow(database, 'aggregate_sieve_results', row, { id: crypto.randomUUID(), material_id: newMaterialId });
      const control = database.prepare('SELECT * FROM aggregate_gradation_controls WHERE material_id = ?').get(oldMaterialId) as Record<string, unknown> | undefined;
      if (control) insertClonedRow(database, 'aggregate_gradation_controls', control, { material_id: newMaterialId, updated_at: now });
    }

    const durability = database.prepare('SELECT * FROM durability_inputs WHERE mix_design_id = ?').get(input.mixDesignId) as Record<string, unknown> | undefined;
    if (durability) insertClonedRow(database, 'durability_inputs', durability, { mix_design_id: newMixDesignId, updated_at: now });
    const optimizer = database.prepare('SELECT * FROM aggregate_blend_optimizer_settings WHERE mix_design_id = ?').get(input.mixDesignId) as Record<string, unknown> | undefined;
    if (optimizer) insertClonedRow(database, 'aggregate_blend_optimizer_settings', optimizer, { mix_design_id: newMixDesignId, updated_at: now });

    const shareRows = database.prepare('SELECT * FROM aggregate_blend_shares WHERE mix_design_id = ?').all(input.mixDesignId) as Array<Record<string, unknown>>;
    for (const row of shareRows) insertClonedRow(database, 'aggregate_blend_shares', row, { id: crypto.randomUUID(), mix_design_id: newMixDesignId, material_id: materialMap.get(String(row.material_id)) ?? row.material_id, updated_at: now });
    const constraints = database.prepare('SELECT * FROM aggregate_blend_constraints WHERE mix_design_id = ?').all(input.mixDesignId) as Array<Record<string, unknown>>;
    for (const row of constraints) insertClonedRow(database, 'aggregate_blend_constraints', row, { id: crypto.randomUUID(), mix_design_id: newMixDesignId, material_id: materialMap.get(String(row.material_id)) ?? row.material_id, updated_at: now });
    const limits = database.prepare('SELECT * FROM combined_gradation_limits WHERE mix_design_id = ?').all(input.mixDesignId) as Array<Record<string, unknown>>;
    for (const row of limits) insertClonedRow(database, 'combined_gradation_limits', row, { id: crypto.randomUUID(), mix_design_id: newMixDesignId, updated_at: now });

    insertAudit(database, newMixDesignId, 'mix_design_duplicated', { sourceMixDesignId: input.mixDesignId, sourceRevision: source.revision_number ?? 0 }, input.actorName, now);
    insertStatusHistory(database, newMixDesignId, null, 'draft', 'Created by duplicate', input.actorName, now);
  })();
  return { status: 'pass' as const, mixDesignId: newMixDesignId, record: getMixDesignManagementRecord(newMixDesignId) };
}

export function listMixDesignRevisionHistory(mixDesignId: string) {
  const database = managementDatabase();
  const current = getMixDesignManagementRecord(mixDesignId) as Record<string, unknown>;
  const snapshots = database.prepare('SELECT id, revision_number AS revisionNumber, change_reason AS changeReason, created_by AS createdBy, created_at AS createdAt FROM mix_design_revision_snapshots WHERE mix_design_id = ? ORDER BY revision_number DESC').all(mixDesignId);
  const audit = database.prepare('SELECT id, action, details_json AS detailsJson, actor_name AS actorName, created_at AS createdAt FROM mix_design_audit_log WHERE mix_design_id = ? ORDER BY created_at DESC LIMIT 100').all(mixDesignId);
  const statusHistory = database.prepare('SELECT id, from_status AS fromStatus, to_status AS toStatus, reason, actor_name AS actorName, created_at AS createdAt FROM mix_design_status_history WHERE mix_design_id = ? ORDER BY created_at DESC LIMIT 100').all(mixDesignId);
  return { current, snapshots, audit, statusHistory };
}

function managementDatabase() { return getDatabase(); }

function validateEdit(input: MixDesignEditInput) {
  if (!input.mixDesignId?.trim()) throw new Error('شناسه طرح اختلاط الزامی است.');
  if (!input.projectName?.trim()) throw new Error('نام پروژه الزامی است.');
  if (!['normal_weight', 'pumped'].includes(input.concreteType)) throw new Error('در نسخه فعلی فقط بتن معمولی و پمپی قابل ویرایش هستند.');
  if (!Number.isFinite(input.targetStrengthMpa) || input.targetStrengthMpa <= 0) throw new Error('مقاومت هدف باید عدد مثبت باشد.');
  if (!Number.isFinite(input.requiredSlumpMm) || input.requiredSlumpMm < 0) throw new Error('اسلامپ باید عدد نامنفی باشد.');
  if (!Number.isFinite(input.maxAggregateSizeMm) || input.maxAggregateSizeMm <= 0) throw new Error('حداکثر اندازه سنگدانه باید عدد مثبت باشد.');
}

function canonicalStatus(status: string) {
  const value = String(status || 'draft').toLowerCase();
  if (value === 'trial') return 'trial_required';
  if (value === 'review' || value === 'needs_review') return 'under_review';
  return value;
}
function isLockedStatus(status: string) { return ['approved', 'production', 'superseded', 'archived'].includes(canonicalStatus(status)); }
function insertAudit(database: Database.Database, mixDesignId: string, action: string, details: unknown, actorName: string | undefined, createdAt: string) { database.prepare('INSERT INTO mix_design_audit_log (id, mix_design_id, action, details_json, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), mixDesignId, action, JSON.stringify(details ?? {}), actorName?.trim() || null, createdAt); }
function insertStatusHistory(database: Database.Database, mixDesignId: string, fromStatus: string | null, toStatus: string, reason: string | undefined, actorName: string | undefined, createdAt: string) { database.prepare('INSERT INTO mix_design_status_history (id, mix_design_id, from_status, to_status, reason, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), mixDesignId, fromStatus, toStatus, reason?.trim() || null, actorName?.trim() || null, createdAt); }

function insertClonedRow(database: Database.Database, table: string, source: Record<string, unknown>, overrides: Record<string, unknown>) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const allowed = new Set(columns.map(column => column.name));
  const row = { ...source, ...overrides };
  const keys = Object.keys(row).filter(key => allowed.has(key));
  const sql = `INSERT INTO ${table} (${keys.map(key => `"${key}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
  database.prepare(sql).run(...keys.map(key => row[key] ?? null));
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
