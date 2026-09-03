import { app } from 'electron';
import path from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

type ProjectIntake = {
  project: { projectName: string; city: string; locationDescription: string; structureType: string; elementType: string; clientName: string; contractorName: string; consultantName: string; };
  laboratory: { labName: string; licenseNumber: string; address: string; phone: string; logoPath?: string; };
  designer: { fullName: string; role: string; licenseOrMembershipNumber: string; phone: string; email: string; };
  mixDesign: { concreteType: string; targetStrengthMpa: number; requiredSlumpMm: number; maxAggregateSizeMm: number; exposureSummary: string; };
};

type MaterialInput = { mixDesignId: string; materialType: string; name: string; source: string; specificGravity: number | null; absorptionPercent: number | null; moisturePercent: number | null; unitWeightKgM3: number | null; notes: string; };
type SieveRow = { sieveSizeMm: number; label: string; percentPassing: number; standardMin: number | null; standardMax: number | null; status: 'pass' | 'low' | 'high' | 'not_checked'; };
type AggregateBlendShare = { materialId: string; materialName: string; sharePercent: number; };
type AggregateGradationInput = { materialId: string; manualLimitOverride: boolean; manualBlendEnabled: boolean; blendShares: AggregateBlendShare[]; rows: SieveRow[]; };

let db: Database.Database | null = null;

export function getDatabasePath(): string {
  const dir = path.join(app.getPath('userData'), 'data');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, 'tolou-concrete-mix.sqlite');
}

export function getDatabase(): Database.Database {
  if (db) return db;
  db = new Database(getDatabasePath());
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

export function saveProjectIntake(intake: ProjectIntake) {
  validateProjectIntake(intake);
  const database = getDatabase();
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();
  const labId = crypto.randomUUID();
  const designerId = crypto.randomUUID();
  const mixDesignId = crypto.randomUUID();
  database.transaction(() => {
    database.prepare(`INSERT INTO projects (id, project_name, city, location_description, structure_type, element_type, client_name, contractor_name, consultant_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(projectId, intake.project.projectName, intake.project.city, intake.project.locationDescription, intake.project.structureType, intake.project.elementType, intake.project.clientName, intake.project.contractorName, intake.project.consultantName, now, now);
    database.prepare(`INSERT INTO laboratories (id, lab_name, license_number, address, phone, logo_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(labId, intake.laboratory.labName, intake.laboratory.licenseNumber, intake.laboratory.address, intake.laboratory.phone, intake.laboratory.logoPath ?? '', now, now);
    database.prepare(`INSERT INTO designers (id, full_name, role, license_or_membership_number, phone, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(designerId, intake.designer.fullName, intake.designer.role, intake.designer.licenseOrMembershipNumber, intake.designer.phone, intake.designer.email, now, now);
    database.prepare(`INSERT INTO mix_designs (id, project_id, laboratory_id, designer_id, concrete_type, target_strength_mpa, required_slump_mm, max_aggregate_size_mm, exposure_summary, status, engine_version, standards_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(mixDesignId, projectId, labId, designerId, intake.mixDesign.concreteType, intake.mixDesign.targetStrengthMpa, intake.mixDesign.requiredSlumpMm, intake.mixDesign.maxAggregateSizeMm, intake.mixDesign.exposureSummary, 'draft', '0.1.0', 'ACI/ASTM/EN/ISIRI registry draft', now, now);
  })();
  return { status: 'pass' as const, projectId, mixDesignId, databasePath: getDatabasePath() };
}

export function saveMaterial(input: MaterialInput) {
  validateMaterial(input);
  const database = getDatabase();
  const materialId = crypto.randomUUID();
  database.prepare(`INSERT INTO materials (id, mix_design_id, material_type, name, source, specific_gravity, absorption_percent, moisture_percent, unit_weight_kg_m3, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(materialId, input.mixDesignId, input.materialType, input.name, input.source, input.specificGravity, input.absorptionPercent, input.moisturePercent, input.unitWeightKgM3, input.notes);
  return { status: 'pass' as const, materialId };
}

export function saveGradation(input: AggregateGradationInput) {
  validateGradation(input);
  const database = getDatabase();
  const now = new Date().toISOString();
  const classifiedRows = input.rows.map(row => ({ ...row, status: classifySieve(row) }));
  const mixDesignId = getMixDesignIdForMaterial(database, input.materialId);

  database.transaction(() => {
    database.prepare('DELETE FROM aggregate_sieve_results WHERE material_id = ?').run(input.materialId);
    const insert = database.prepare(`INSERT INTO aggregate_sieve_results (id, material_id, sieve_size, percent_passing, standard_min, standard_max, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const row of classifiedRows) insert.run(crypto.randomUUID(), input.materialId, row.sieveSizeMm, row.percentPassing, row.standardMin, row.standardMax, row.status);

    database.prepare('INSERT OR REPLACE INTO aggregate_gradation_controls (material_id, manual_limit_override, manual_blend_enabled, updated_at) VALUES (?, ?, ?, ?)').run(input.materialId, input.manualLimitOverride ? 1 : 0, input.manualBlendEnabled ? 1 : 0, now);

    if (mixDesignId) {
      database.prepare('DELETE FROM aggregate_blend_shares WHERE mix_design_id = ?').run(mixDesignId);
      const shareInsert = database.prepare('INSERT INTO aggregate_blend_shares (id, mix_design_id, material_id, material_name, share_percent, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
      for (const share of input.blendShares) shareInsert.run(crypto.randomUUID(), mixDesignId, share.materialId, share.materialName, share.sharePercent, now);
    }
  })();

  return { status: 'pass' as const, summary: summarizeGradation(classifiedRows, input.manualLimitOverride, input.manualBlendEnabled, input.blendShares) };
}

export function listGradationByMaterial(materialId: string) {
  if (!materialId.trim()) return [];
  const database = getDatabase();
  return database.prepare(`SELECT sieve_size AS sieveSizeMm, percent_passing AS percentPassing, standard_min AS standardMin, standard_max AS standardMax, status FROM aggregate_sieve_results WHERE material_id = ? ORDER BY sieve_size DESC`).all(materialId);
}

export function listMaterialsByMixDesign(mixDesignId: string) {
  if (!mixDesignId.trim()) return [];
  const database = getDatabase();
  return database.prepare(`SELECT id, mix_design_id AS mixDesignId, material_type AS materialType, name, source, specific_gravity AS specificGravity, absorption_percent AS absorptionPercent, moisture_percent AS moisturePercent, unit_weight_kg_m3 AS unitWeightKgM3, notes FROM materials WHERE mix_design_id = ? ORDER BY rowid DESC`).all(mixDesignId);
}

export function listRecentProjects() {
  const database = getDatabase();
  return database.prepare(`SELECT projects.id, projects.project_name AS projectName, projects.city, mix_designs.id AS mixDesignId, mix_designs.concrete_type AS concreteType, mix_designs.target_strength_mpa AS targetStrengthMpa, mix_designs.status, mix_designs.created_at AS createdAt FROM projects INNER JOIN mix_designs ON mix_designs.project_id = projects.id ORDER BY mix_designs.created_at DESC LIMIT 20`).all();
}

function getMixDesignIdForMaterial(database: Database.Database, materialId: string): string | null {
  const row = database.prepare('SELECT mix_design_id AS mixDesignId FROM materials WHERE id = ?').get(materialId) as { mixDesignId?: string } | undefined;
  return row?.mixDesignId ?? null;
}

function classifySieve(row: SieveRow): SieveRow['status'] {
  if (row.standardMin === null || row.standardMax === null) return 'not_checked';
  if (row.percentPassing < row.standardMin) return 'low';
  if (row.percentPassing > row.standardMax) return 'high';
  return 'pass';
}

function summarizeGradation(rows: SieveRow[], manualLimitOverride: boolean, manualBlendEnabled: boolean, blendShares: AggregateBlendShare[]) {
  const warningRows = rows.filter(row => row.status === 'low' || row.status === 'high');
  const passedCount = rows.filter(row => row.status === 'pass').length;
  const retainedSum = rows.reduce((sum, row) => sum + (100 - row.percentPassing), 0);
  const finenessModulus = rows.length ? Math.round((retainedSum / 100) * 100) / 100 : null;
  const correctionHints = buildCorrectionHints(warningRows);
  const manualNotes = buildManualNotes(manualLimitOverride, manualBlendEnabled, blendShares);
  const recommendation = warningRows.length === 0 ? 'منحنی دانه‌بندی در محدوده‌های واردشده قرار دارد؛ کنترل نهایی با استاندارد انتخابی پروژه انجام شود.' : 'منحنی دانه‌بندی نیاز به اصلاح دارد. پیشنهادهای اولیه زیر باید با ترکیب منابع سنگدانه و بچ آزمایشی کنترل شوند.';
  return { finenessModulus, passedCount, warningCount: warningRows.length, recommendation, correctionHints, manualNotes };
}

function buildCorrectionHints(warningRows: SieveRow[]) {
  if (!warningRows.length) return ['نیاز فوری به اصلاح دانه‌بندی دیده نشد؛ کنترل ریزدانه عبوری از الک 75 میکرون در مرحله بعد اضافه شود.'];
  return warningRows.map(row => row.status === 'high' ? `عبوری الک ${row.label} بالاتر از محدوده است؛ مصالح در این بازه ریزتر از هدف است و باید سهم ذرات درشت‌تر یا منبع درشت‌تر بررسی شود.` : `عبوری الک ${row.label} پایین‌تر از محدوده است؛ مصالح در این بازه درشت‌تر از هدف است و باید سهم ذرات ریزتر یا منبع اصلاحی بررسی شود.`);
}

function buildManualNotes(manualLimitOverride: boolean, manualBlendEnabled: boolean, blendShares: AggregateBlendShare[]) {
  const notes: string[] = [];
  if (manualLimitOverride) notes.push('حدود بالا و پایین دانه‌بندی با تصمیم دستی مهندس تغییر داده شده و باید در گزارش نهایی نمایش داده شود.');
  if (manualBlendEnabled) {
    const total = blendShares.reduce((sum, share) => sum + share.sharePercent, 0);
    notes.push(`حالت سهم دستی سنگدانه فعال است. جمع سهم‌های واردشده: ${Math.round(total * 100) / 100}٪.`);
  }
  if (!notes.length) notes.push('کنترل دانه‌بندی با محدوده فعلی و بدون ثبت override دستی انجام شد.');
  return notes;
}

function runMigrations(database: Database.Database) {
  database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`);
  const migrations = ['001_initial_schema', '002_manual_gradation_controls'];
  for (const migrationId of migrations) {
    const applied = database.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(migrationId);
    if (applied) continue;
    const migrationPath = path.join(process.cwd(), `database/migrations/${migrationId}.sql`);
    const sql = readFileSync(migrationPath, 'utf-8');
    database.exec(sql);
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migrationId, new Date().toISOString());
  }
}

function validateProjectIntake(intake: ProjectIntake) {
  if (!intake.project.projectName.trim()) throw new Error('نام پروژه الزامی است.');
  if (!intake.laboratory.labName.trim()) throw new Error('نام آزمایشگاه الزامی است.');
  if (!intake.designer.fullName.trim()) throw new Error('نام طراح طرح اختلاط الزامی است.');
  if (!Number.isFinite(intake.mixDesign.targetStrengthMpa) || intake.mixDesign.targetStrengthMpa <= 0) throw new Error('مقاومت هدف باید عدد مثبت باشد.');
}

function validateMaterial(input: MaterialInput) {
  if (!input.mixDesignId.trim()) throw new Error('برای ثبت مصالح، ابتدا باید یک طرح اختلاط ذخیره شود.');
  if (!input.name.trim()) throw new Error('نام مصالح الزامی است.');
  if (!input.materialType.trim()) throw new Error('نوع مصالح الزامی است.');
}

function validateGradation(input: AggregateGradationInput) {
  if (!input.materialId.trim()) throw new Error('برای ثبت دانه‌بندی، ابتدا باید یک سنگدانه انتخاب شود.');
  if (!input.rows.length) throw new Error('حداقل یک ردیف الک باید وارد شود.');
  for (const row of input.rows) {
    if (!Number.isFinite(row.percentPassing) || row.percentPassing < 0 || row.percentPassing > 100) throw new Error('درصد عبوری هر الک باید بین ۰ تا ۱۰۰ باشد.');
  }
  if (input.manualBlendEnabled) {
    const total = input.blendShares.reduce((sum, share) => sum + share.sharePercent, 0);
    if (Math.abs(total - 100) > 0.01) throw new Error('در حالت سهم دستی، جمع درصد سنگدانه‌ها باید دقیقاً ۱۰۰٪ باشد.');
  }
}
