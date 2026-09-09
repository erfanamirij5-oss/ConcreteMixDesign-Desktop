import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';
import { buildProductionQcReportSnapshot, type ProductionQcReportSnapshot } from './productionQcReportSnapshot';

export type ReportType = 'mix_design' | 'engineering_calculation' | 'material_summary' | 'durability_compliance' | 'gradation_blend' | 'revision_identity' | 'production_sheet';
export type ReportLanguage = 'fa' | 'en';
export type ReportSnapshot = {
  schemaVersion: 1; reportType: ReportType; language: ReportLanguage; generatedAt: string;
  identity: Record<string, unknown>; materials: Array<Record<string, unknown>>; gradation: Array<Record<string, unknown>>;
  durability: Record<string, unknown> | null; blend: Record<string, unknown>; calculation: Record<string, unknown> | null;
  trialMix: Array<Record<string, unknown>>; productionQc: ProductionQcReportSnapshot; standards: string[];
  signatures: { preparedBy: string | null; reviewedBy: string | null; approvedBy: string | null };
};

type CreateReportInput = { mixDesignId: string; reportType: ReportType; language: ReportLanguage; generatedBy: string };

export function ensureReportCenterMigration(database: Database.Database) {
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);');
  const applied = database.prepare('SELECT id FROM schema_migrations WHERE id = ?').get('021_report_center_snapshots');
  if (applied) return;
  const migrationPath = path.join(process.cwd(), 'database/migrations/021_report_center_snapshots.sql');
  database.transaction(() => {
    database.exec(readFileSync(migrationPath, 'utf-8'));
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run('021_report_center_snapshots', new Date().toISOString());
  })();
}

export function createReportSnapshotInDatabase(database: Database.Database, input: CreateReportInput) {
  if (!input.mixDesignId?.trim()) throw new Error('شناسه طرح اختلاط برای گزارش الزامی است.');
  if (!REPORT_TYPES.has(input.reportType)) throw new Error('نوع گزارش معتبر نیست.');
  if (!['fa', 'en'].includes(input.language)) throw new Error('زبان گزارش باید fa یا en باشد.');
  const generatedBy = input.generatedBy?.trim();
  if (!generatedBy) throw new Error('نام مسئول صدور گزارش برای Traceability الزامی است.');

  const identity = getIdentity(database, input.mixDesignId);
  const revisionNumber = Number(identity.revisionNumber ?? 0);
  const generatedAt = new Date().toISOString();
  const snapshot = buildCanonicalSnapshot(database, input.mixDesignId, input.reportType, input.language, generatedAt, identity, revisionNumber, generatedBy);
  const id = crypto.randomUUID();
  database.prepare(`INSERT INTO report_snapshots (id, mix_design_id, revision_number, report_type, language, snapshot_json, generated_by, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.mixDesignId, revisionNumber, input.reportType, input.language, JSON.stringify(snapshot), generatedBy, generatedAt);
  return { id, mixDesignId: input.mixDesignId, revisionNumber, reportType: input.reportType, language: input.language, generatedAt, snapshot };
}

export function getReportSnapshotFromDatabase(database: Database.Database, id: string) {
  const row = database.prepare(`SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, report_type AS reportType, language, snapshot_json AS snapshotJson, generated_by AS generatedBy, generated_at AS generatedAt FROM report_snapshots WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return { ...row, snapshot: JSON.parse(String(row.snapshotJson)), snapshotJson: undefined };
}

export function listReportSnapshotsFromDatabase(database: Database.Database, mixDesignId: string) {
  return database.prepare(`SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, report_type AS reportType, language, generated_by AS generatedBy, generated_at AS generatedAt FROM report_snapshots WHERE mix_design_id = ? ORDER BY generated_at DESC`).all(mixDesignId);
}

export function createReportSnapshot(input: CreateReportInput) { const database = getDatabase(); ensureReportCenterMigration(database); return createReportSnapshotInDatabase(database, input); }
export function getReportSnapshot(id: string) { const database = getDatabase(); ensureReportCenterMigration(database); return getReportSnapshotFromDatabase(database, id); }
export function listReportSnapshots(mixDesignId: string) { const database = getDatabase(); ensureReportCenterMigration(database); return listReportSnapshotsFromDatabase(database, mixDesignId); }

const REPORT_TYPES = new Set<ReportType>(['mix_design','engineering_calculation','material_summary','durability_compliance','gradation_blend','revision_identity','production_sheet']);

function buildCanonicalSnapshot(database: Database.Database, mixDesignId: string, reportType: ReportType, language: ReportLanguage, generatedAt: string, identity: Record<string, unknown>, revisionNumber: number, generatedBy: string): ReportSnapshot {
  const materials = rows(database, 'SELECT * FROM materials WHERE mix_design_id = ? ORDER BY material_type, name', mixDesignId);
  const gradation = materials.length ? rows(database, `SELECT s.*, m.name AS material_name, m.material_type FROM aggregate_sieve_results s INNER JOIN materials m ON m.id = s.material_id WHERE m.mix_design_id = ? ORDER BY m.name, s.sieve_size_mm DESC`, mixDesignId) : [];
  const durability = one(database, 'SELECT * FROM durability_inputs WHERE mix_design_id = ?', mixDesignId);
  const blend = {
    settings: one(database, 'SELECT * FROM aggregate_blend_optimizer_settings WHERE mix_design_id = ?', mixDesignId),
    shares: rows(database, 'SELECT * FROM aggregate_blend_shares WHERE mix_design_id = ? ORDER BY material_name', mixDesignId),
    constraints: rows(database, 'SELECT * FROM aggregate_blend_constraints WHERE mix_design_id = ?', mixDesignId),
    combinedLimits: rows(database, 'SELECT * FROM combined_gradation_limits WHERE mix_design_id = ? ORDER BY sieve_size_mm DESC', mixDesignId)
  };
  const calculationRow = one(database, 'SELECT * FROM mix_results WHERE mix_design_id = ? ORDER BY rowid DESC LIMIT 1', mixDesignId);
  const calculation = calculationRow ? { ...calculationRow, traceability: parseJson(calculationRow.notes) } : null;
  const trialMix = rows(database, 'SELECT * FROM trial_mix_records WHERE mix_design_id = ? AND revision_number = ? ORDER BY trial_date, created_at', mixDesignId, revisionNumber);
  const productionQc = buildProductionQcReportSnapshot(database, mixDesignId);
  const trace = calculation && typeof calculation.traceability === 'object' && calculation.traceability ? calculation.traceability as Record<string, unknown> : {};
  const standards = uniqueStrings([String(identity.designStandard ?? ''), String(identity.standardsVersion ?? ''), ...asStringArray(trace.standardReferences)]);
  return { schemaVersion: 1, reportType, language, generatedAt, identity, materials, gradation, durability, blend, calculation, trialMix, productionQc, standards, signatures: { preparedBy: generatedBy, reviewedBy: null, approvedBy: null } };
}

function getIdentity(database: Database.Database, mixDesignId: string) {
  const row = database.prepare(`SELECT md.id AS mixDesignId, md.status, md.revision_number AS revisionNumber, md.concrete_type AS concreteType, md.target_strength_mpa AS targetStrengthMpa, md.required_slump_mm AS requiredSlumpMm, md.max_aggregate_size_mm AS maxAggregateSizeMm, md.exposure_summary AS exposureSummary, md.design_standard AS designStandard, md.engineer_notes AS engineerNotes, md.engine_version AS engineVersion, md.standards_version AS standardsVersion, md.created_at AS createdAt, md.updated_at AS updatedAt, p.project_name AS projectName, p.city, p.location_description AS locationDescription, p.structure_type AS structureType, p.element_type AS elementType, p.client_name AS clientName, p.contractor_name AS contractorName, p.consultant_name AS consultantName, l.lab_name AS laboratoryName, l.license_number AS laboratoryLicenseNumber, l.address AS laboratoryAddress, l.phone AS laboratoryPhone, l.logo_path AS laboratoryLogoPath, d.full_name AS designerFullName, d.role AS designerRole, d.license_or_membership_number AS designerLicenseNumber, d.phone AS designerPhone, d.email AS designerEmail FROM mix_designs md INNER JOIN projects p ON p.id = md.project_id LEFT JOIN laboratories l ON l.id = md.laboratory_id LEFT JOIN designers d ON d.id = md.designer_id WHERE md.id = ?`).get(mixDesignId) as Record<string, unknown> | undefined;
  if (!row) throw new Error('طرح اختلاط برای گزارش پیدا نشد.');
  return row;
}
function rows(database: Database.Database, sql: string, ...params: unknown[]) { try { return database.prepare(sql).all(...params) as Array<Record<string, unknown>>; } catch (error) { if (isMissingTable(error)) return []; throw error; } }
function one(database: Database.Database, sql: string, ...params: unknown[]) { try { return database.prepare(sql).get(...params) as Record<string, unknown> | undefined ?? null; } catch (error) { if (isMissingTable(error)) return null; throw error; } }
function isMissingTable(error: unknown) { return String(error).includes('no such table'); }
function parseJson(value: unknown) { if (typeof value !== 'string' || !value) return null; try { return JSON.parse(value); } catch { return { legacyNotes: value }; } }
function asStringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter(item => typeof item === 'string') as string[] : []; }
function uniqueStrings(values: string[]) { return Array.from(new Set(values.map(item => item.trim()).filter(Boolean))); }
