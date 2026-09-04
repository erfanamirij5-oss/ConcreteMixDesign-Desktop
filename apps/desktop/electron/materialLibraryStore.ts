import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';

export type MaterialLibraryType = 'cement' | 'scm' | 'fine_aggregate' | 'coarse_aggregate' | 'water' | 'admixture';
export type MaterialLibraryStatus = 'active' | 'expired' | 'inactive';

export type MaterialLibraryInput = {
  id?: string;
  materialType: MaterialLibraryType;
  name: string;
  materialSubtype?: string | null;
  manufacturer?: string | null;
  source?: string | null;
  productCode?: string | null;
  standardDesignation?: string | null;
  status?: MaterialLibraryStatus;
  testDate?: string | null;
  validUntil?: string | null;
  laboratoryName?: string | null;
  laboratoryReportNumber?: string | null;
  properties?: Record<string, unknown>;
  notes?: string | null;
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
      material_type = excluded.material_type,
      name = excluded.name,
      material_subtype = excluded.material_subtype,
      manufacturer = excluded.manufacturer,
      source = excluded.source,
      product_code = excluded.product_code,
      standard_designation = excluded.standard_designation,
      status = excluded.status,
      test_date = excluded.test_date,
      valid_until = excluded.valid_until,
      laboratory_name = excluded.laboratory_name,
      laboratory_report_number = excluded.laboratory_report_number,
      properties_json = excluded.properties_json,
      notes = excluded.notes,
      updated_at = excluded.updated_at
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
  const existing = database.prepare('SELECT id FROM material_library WHERE id = ?').get(id);
  if (!existing) throw new Error('رکورد کتابخانه مصالح پیدا نشد.');
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
  return database.prepare(`
    SELECT id, name, material_type AS materialType,
      library_material_id AS libraryMaterialId,
      library_snapshot_at AS librarySnapshotAt,
      CASE WHEN library_material_id IS NULL THEN 'manual' ELSE 'library_snapshot' END AS provenance
    FROM materials
    WHERE mix_design_id = ?
    ORDER BY rowid DESC
  `).all(mixDesignId) as Array<{
    id: string;
    name: string;
    materialType: string;
    libraryMaterialId: string | null;
    librarySnapshotAt: string | null;
    provenance: 'manual' | 'library_snapshot';
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

  const properties = library.properties as Record<string, unknown>;
  const snapshotAt = new Date().toISOString();
  const snapshot = { ...library, snapshotAt };
  const materialId = crypto.randomUUID();
  database.prepare(`
    INSERT INTO materials (
      id, mix_design_id, material_type, aggregate_role, nominal_size_mm, moisture_condition,
      name, source, specific_gravity, absorption_percent, moisture_percent, unit_weight_kg_m3,
      notes, material_subtype, standard_designation, density_kg_m3, dosage_value, dosage_unit,
      binder_share_percent, replacement_percent, solids_percent, chloride_percent, alkali_percent,
      manufacturer, product_code, library_material_id, library_snapshot_json, library_snapshot_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    materialId, mixDesignId, library.materialType,
    valueOrNull(properties.aggregateRole), numberOrNull(properties.nominalSizeMm), valueOrNull(properties.moistureCondition),
    library.name, library.source, numberOrNull(properties.specificGravity), numberOrNull(properties.absorptionPercent),
    numberOrNull(properties.moisturePercent), numberOrNull(properties.unitWeightKgM3), library.notes,
    library.materialSubtype, library.standardDesignation, numberOrNull(properties.densityKgM3),
    numberOrNull(properties.dosageValue), valueOrNull(properties.dosageUnit), numberOrNull(properties.binderSharePercent),
    numberOrNull(properties.replacementPercent), numberOrNull(properties.solidsPercent), numberOrNull(properties.chloridePercent),
    numberOrNull(properties.alkaliPercent), library.manufacturer, library.productCode,
    library.id, JSON.stringify(snapshot), snapshotAt
  );
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
    number('specificGravity', 1.5, 4.0, true);
    number('alkaliPercent', 0, 10);
    if (type === 'scm') { number('activityIndexPercent', 0, 200); number('lossOnIgnitionPercent', 0, 30); }
  }
  if (type === 'fine_aggregate' || type === 'coarse_aggregate') {
    number('specificGravity', 1.5, 4.0, true);
    number('absorptionPercent', 0, 20, true);
    number('moisturePercent', -5, 30);
    number('unitWeightKgM3', 500, 2500);
    number('nominalSizeMm', 0.075, 150);
  }
  if (type === 'water') {
    number('densityKgM3', 900, 1100);
    number('chlorideMgL', 0, 100000);
    number('sulfateMgL', 0, 100000);
    number('totalSolidsMgL', 0, 200000);
  }
  if (type === 'admixture') {
    number('densityKgM3', 500, 2500, true);
    number('dosageValue', 0, 100000);
    number('solidsPercent', 0, 100);
    number('chloridePercent', 0, 100);
  }
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

function numberOrNull(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
function valueOrNull(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
