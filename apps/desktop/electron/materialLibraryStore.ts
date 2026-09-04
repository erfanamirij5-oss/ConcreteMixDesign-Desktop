import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';

export type MaterialLibraryType = 'cement' | 'scm' | 'fine_aggregate' | 'coarse_aggregate' | 'water' | 'admixture';
export type MaterialLibraryStatus = 'active' | 'expired' | 'inactive';

export type MaterialLibraryInput = {
  id?: string; materialType: MaterialLibraryType; name: string; materialSubtype?: string | null;
  manufacturer?: string | null; source?: string | null; productCode?: string | null; standardDesignation?: string | null;
  status?: MaterialLibraryStatus; testDate?: string | null; validUntil?: string | null;
  laboratoryName?: string | null; laboratoryReportNumber?: string | null;
  properties?: Record<string, unknown>; notes?: string | null;
};

const PROPERTY_COLUMN_MAP: Record<string, string> = {
  aggregateRole: 'aggregate_role', nominalSizeMm: 'nominal_size_mm', fracturedFacePercent: 'fractured_face_percent', moistureCondition: 'moisture_condition',
  specificGravity: 'specific_gravity', absorptionPercent: 'absorption_percent', moisturePercent: 'moisture_percent', unitWeightKgM3: 'unit_weight_kg_m3',
  densityKgM3: 'density_kg_m3', dosageValue: 'dosage_value', dosageUnit: 'dosage_unit', binderSharePercent: 'binder_share_percent', replacementPercent: 'replacement_percent',
  solidsPercent: 'solids_percent', chloridePercent: 'chloride_percent', chlorideMgL: 'chloride_mg_l', waterSharePercent: 'water_share_percent', alkaliPercent: 'alkali_percent',
  sulfateMgL: 'sulfate_mg_l', totalSolidsMgL: 'total_solids_mg_l', alkalisNa2oeqMgL: 'alkalis_na2oeq_mg_l',
  c1602StrengthRatio7dPercent: 'c1602_strength_ratio_7d_percent', c1602SettingTimeDeviationMin: 'c1602_setting_time_deviation_min', c1602PerformanceEvidenceRef: 'c1602_performance_evidence_ref',
  waterSourceClass: 'water_source_class', c1602LastQualificationDate: 'c1602_last_qualification_date', c1602LastDensityCheckDate: 'c1602_last_density_check_date',
  c1602DensityMonitoringMethod: 'c1602_density_monitoring_method', c1602MonitoringEvidenceRef: 'c1602_monitoring_evidence_ref',
  astmC117Finer75umPercent: 'astm_c117_finer_75um_percent', finer75umLimitPercent: 'finer_75um_limit_percent', aggregateTestEvidenceRef: 'aggregate_test_evidence_ref',
  astmC29RoddedUnitWeightKgM3: 'astm_c29_rodded_unit_weight_kg_m3', astmC127C128SsdSpecificGravity: 'astm_c127_c128_ssd_specific_gravity', astmC127C128AbsorptionPercent: 'astm_c127_c128_absorption_percent', aggregateQualityStandard: 'aggregate_quality_standard',
  laAbrasionMethod: 'la_abrasion_method', laAbrasionLossPercent: 'la_abrasion_loss_percent', laAbrasionLimitPercent: 'la_abrasion_limit_percent', soundnessSalt: 'soundness_salt',
  astmC88SoundnessLossPercent: 'astm_c88_soundness_loss_percent', soundnessLimitPercent: 'soundness_limit_percent', astmC142ClayLumpsPercent: 'astm_c142_clay_lumps_percent', clayLumpsLimitPercent: 'clay_lumps_limit_percent',
  astmC123LightweightParticlesPercent: 'astm_c123_lightweight_particles_percent', lightweightParticlesLimitPercent: 'lightweight_particles_limit_percent', advancedAggregateEvidenceRef: 'advanced_aggregate_evidence_ref',
  astmD4791FlatElongatedPercent: 'astm_d4791_flat_elongated_percent', flatElongatedLimitPercent: 'flat_elongated_limit_percent', astmD4791DimensionalRatio: 'astm_d4791_dimensional_ratio',
  astmD5821FracturedParticlesPercent: 'astm_d5821_fractured_particles_percent', fracturedParticlesMinPercent: 'fractured_particles_min_percent', fracturedFacesRequired: 'fractured_faces_required', shapeTextureEvidenceRef: 'shape_texture_evidence_ref',
  lossOnIgnitionPercent: 'loss_on_ignition_percent', activityIndexPercent: 'activity_index_percent', sulfateResistanceClass: 'sulfate_resistance_class', sulfateQualificationMethod: 'sulfate_qualification_method',
  astmC1012Expansion6mPercent: 'astm_c1012_expansion_6m_percent', astmC1012Expansion12mPercent: 'astm_c1012_expansion_12m_percent', sulfatePerformanceEvidenceRef: 'sulfate_performance_evidence_ref',
  asrReactivityClass: 'asr_reactivity_class', asrQualificationMethod: 'asr_qualification_method', astmC1260Expansion14dPercent: 'astm_c1260_expansion_14d_percent',
  astmC1293Expansion1yPercent: 'astm_c1293_expansion_1y_percent', astmC1567Expansion14dPercent: 'astm_c1567_expansion_14d_percent', asrPerformanceEvidenceRef: 'asr_performance_evidence_ref'
};

export function saveMaterialLibraryRecord(database: Database.Database, input: MaterialLibraryInput) {
  validateLibraryInput(input);
  const now = new Date().toISOString();
  const id = input.id?.trim() || crypto.randomUUID();
  database.prepare(`
    INSERT INTO material_library (
      id, material_type, name, material_subtype, manufacturer, source, product_code,
      standard_designation, status, test_date, valid_until, laboratory_name,
      laboratory_report_number, properties_json, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      material_type = excluded.material_type, name = excluded.name, material_subtype = excluded.material_subtype,
      manufacturer = excluded.manufacturer, source = excluded.source, product_code = excluded.product_code,
      standard_designation = excluded.standard_designation, status = excluded.status, test_date = excluded.test_date,
      valid_until = excluded.valid_until, laboratory_name = excluded.laboratory_name,
      laboratory_report_number = excluded.laboratory_report_number, properties_json = excluded.properties_json,
      notes = excluded.notes, updated_at = excluded.updated_at
  `).run(
    id, input.materialType, input.name.trim(), input.materialSubtype?.trim() || null,
    input.manufacturer?.trim() || null, input.source?.trim() || null, input.productCode?.trim() || null,
    input.standardDesignation?.trim() || null, input.status ?? 'active', input.testDate || null,
    input.validUntil || null, input.laboratoryName?.trim() || null,
    input.laboratoryReportNumber?.trim() || null, JSON.stringify(input.properties ?? {}),
    input.notes?.trim() || null, now, now
  );
  return getMaterialLibraryRecord(database, id);
}

export function setMaterialLibraryStatus(database: Database.Database, id: string, status: MaterialLibraryStatus) {
  if (!id.trim()) throw new Error('شناسه رکورد Library الزامی است.');
  if (!['active', 'expired', 'inactive'].includes(status)) throw new Error('وضعیت Library معتبر نیست.');
  if (!database.prepare('SELECT id FROM material_library WHERE id = ?').get(id)) throw new Error('رکورد کتابخانه مصالح پیدا نشد.');
  database.prepare('UPDATE material_library SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), id);
  return getMaterialLibraryRecord(database, id);
}

export function listMaterialLibraryRecords(database: Database.Database, materialType?: MaterialLibraryType) {
  const rows = materialType
    ? database.prepare('SELECT * FROM material_library WHERE material_type = ? ORDER BY name').all(materialType)
    : database.prepare('SELECT * FROM material_library ORDER BY material_type, name').all();
  return (rows as Array<Record<string, unknown>>).map(parseLibraryRow);
}

export function listMixDesignMaterialProvenance(database: Database.Database, mixDesignId: string) {
  if (!mixDesignId.trim()) return [];
  return database.prepare(`SELECT id, name, material_type AS materialType, library_material_id AS libraryMaterialId,
    library_snapshot_at AS librarySnapshotAt, CASE WHEN library_material_id IS NULL THEN 'manual' ELSE 'library_snapshot' END AS provenance
    FROM materials WHERE mix_design_id = ? ORDER BY rowid DESC`).all(mixDesignId) as Array<{
      id: string; name: string; materialType: string; libraryMaterialId: string | null;
      librarySnapshotAt: string | null; provenance: 'manual' | 'library_snapshot';
    }>;
}

export function getMaterialLibraryRecord(database: Database.Database, id: string) {
  const row = database.prepare('SELECT * FROM material_library WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error('رکورد کتابخانه مصالح پیدا نشد.');
  return parseLibraryRow(row);
}

export function attachLibraryMaterialToMixDesign(database: Database.Database, mixDesignId: string, libraryMaterialId: string) {
  const mix = database.prepare('SELECT id, status FROM mix_designs WHERE id = ?').get(mixDesignId) as { id: string; status: string } | undefined;
  if (!mix) throw new Error('طرح اختلاط مقصد پیدا نشد.');
  if (['approved', 'production', 'superseded', 'archived'].includes(String(mix.status).toLowerCase())) throw new Error('نسخه قفل‌شده اجازه افزودن مصالح از Library را ندارد. ابتدا Revision جدید ایجاد کنید.');

  const library = getMaterialLibraryRecord(database, libraryMaterialId);
  if (library.status !== 'active') throw new Error('فقط مصالح فعال Library قابل استفاده در طرح اختلاط هستند.');
  if (library.validUntil && Date.parse(library.validUntil) < Date.now()) throw new Error('اعتبار آزمایش این ماده منقضی شده است.');

  const snapshotAt = new Date().toISOString();
  const snapshot = { ...library, snapshotAt };
  const materialId = crypto.randomUUID();
  const row: Record<string, unknown> = {
    id: materialId, mix_design_id: mixDesignId, material_type: library.materialType,
    name: library.name, source: library.source, notes: library.notes,
    material_subtype: library.materialSubtype, standard_designation: library.standardDesignation,
    manufacturer: library.manufacturer, product_code: library.productCode,
    library_material_id: library.id, library_snapshot_json: JSON.stringify(snapshot), library_snapshot_at: snapshotAt
  };
  for (const [propertyKey, columnName] of Object.entries(PROPERTY_COLUMN_MAP)) {
    if (Object.prototype.hasOwnProperty.call(library.properties, propertyKey)) row[columnName] = normalizePropertyValue(library.properties[propertyKey]);
  }
  insertMaterialRow(database, row);
  return { status: 'pass' as const, materialId, snapshot };
}

export function saveLibraryMaterial(input: MaterialLibraryInput) { return saveMaterialLibraryRecord(getDatabase(), input); }
export function changeLibraryMaterialStatus(id: string, status: MaterialLibraryStatus) { return setMaterialLibraryStatus(getDatabase(), id, status); }
export function listLibraryMaterials(materialType?: MaterialLibraryType) { return listMaterialLibraryRecords(getDatabase(), materialType); }
export function listMaterialProvenance(mixDesignId: string) { return listMixDesignMaterialProvenance(getDatabase(), mixDesignId); }
export function attachLibraryMaterial(mixDesignId: string, libraryMaterialId: string) { return attachLibraryMaterialToMixDesign(getDatabase(), mixDesignId, libraryMaterialId); }

function validateLibraryInput(input: MaterialLibraryInput) {
  const allowed = new Set<MaterialLibraryType>(['cement', 'scm', 'fine_aggregate', 'coarse_aggregate', 'water', 'admixture']);
  if (!allowed.has(input.materialType)) throw new Error('نوع ماده Library معتبر نیست.');
  if (!input.name?.trim()) throw new Error('نام ماده در Library الزامی است.');
  if (input.status && !['active', 'expired', 'inactive'].includes(input.status)) throw new Error('وضعیت Library معتبر نیست.');
  if (input.testDate && Number.isNaN(Date.parse(input.testDate))) throw new Error('تاریخ آزمایش معتبر نیست.');
  if (input.validUntil && Number.isNaN(Date.parse(input.validUntil))) throw new Error('تاریخ اعتبار معتبر نیست.');
  if (input.testDate && input.validUntil && Date.parse(input.validUntil) < Date.parse(input.testDate)) throw new Error('تاریخ پایان اعتبار نمی‌تواند قبل از تاریخ آزمایش باشد.');
  validateMaterialProperties(input.materialType, input.properties ?? {});
}

function validateMaterialProperties(type: MaterialLibraryType, properties: Record<string, unknown>) {
  const number = (key: string, min: number, max: number, required = false) => {
    const value = properties[key];
    if (value == null || value === '') { if (required) throw new Error(`خاصیت ${key} برای این نوع ماده الزامی است.`); return; }
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`مقدار ${key} باید در بازه ${min} تا ${max} باشد.`);
  };
  if (type === 'cement' || type === 'scm') {
    number('specificGravity', 1.5, 4.0, true); number('alkaliPercent', 0, 10);
    if (type === 'scm') { number('activityIndexPercent', 0, 200); number('lossOnIgnitionPercent', 0, 30); }
  }
  if (type === 'fine_aggregate' || type === 'coarse_aggregate') {
    number('specificGravity', 1.5, 4.0, true); number('absorptionPercent', 0, 20, true);
    number('moisturePercent', -5, 30); number('unitWeightKgM3', 500, 2500); number('nominalSizeMm', 0.075, 150);
  }
  if (type === 'water') {
    number('densityKgM3', 900, 1100); number('chlorideMgL', 0, 100000); number('sulfateMgL', 0, 100000); number('totalSolidsMgL', 0, 200000);
  }
  if (type === 'admixture') {
    number('densityKgM3', 500, 2500, true); number('dosageValue', 0, 100000); number('solidsPercent', 0, 100); number('chloridePercent', 0, 100);
  }
}

function insertMaterialRow(database: Database.Database, row: Record<string, unknown>) {
  const columns = database.prepare("PRAGMA table_info('materials')").all() as Array<{ name: string }>;
  const allowed = new Set(columns.map(column => column.name));
  const entries = Object.entries(row).filter(([key]) => allowed.has(key));
  if (!entries.some(([key]) => key === 'id') || !entries.some(([key]) => key === 'mix_design_id')) throw new Error('ساختار جدول materials برای Snapshot Library معتبر نیست.');
  const sql = `INSERT INTO materials (${entries.map(([key]) => `"${key}"`).join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`;
  database.prepare(sql).run(...entries.map(([, value]) => value ?? null));
}

function normalizePropertyValue(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value ?? null;
}

function parseLibraryRow(row: Record<string, unknown>) {
  let properties: Record<string, unknown> = {};
  try { properties = JSON.parse(String(row.properties_json ?? '{}')) as Record<string, unknown>; } catch { properties = {}; }
  return {
    id: String(row.id), materialType: String(row.material_type) as MaterialLibraryType, name: String(row.name),
    materialSubtype: row.material_subtype ? String(row.material_subtype) : null, manufacturer: row.manufacturer ? String(row.manufacturer) : null,
    source: row.source ? String(row.source) : null, productCode: row.product_code ? String(row.product_code) : null,
    standardDesignation: row.standard_designation ? String(row.standard_designation) : null, status: String(row.status) as MaterialLibraryStatus,
    testDate: row.test_date ? String(row.test_date) : null, validUntil: row.valid_until ? String(row.valid_until) : null,
    laboratoryName: row.laboratory_name ? String(row.laboratory_name) : null, laboratoryReportNumber: row.laboratory_report_number ? String(row.laboratory_report_number) : null,
    properties, notes: row.notes ? String(row.notes) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at)
  };
}
