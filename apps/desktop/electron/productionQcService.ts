import crypto from 'node:crypto';
import { getDatabase } from './database';
import { ensureRuntimeMigrations } from './runtimeMigrations';

export type CreateProductionBatchInput = {
  mixDesignId: string;
  batchCode: string;
  producedAt: string;
  batchQuantityM3: number;
  plantName?: string;
  ticketNumber?: string;
  truckNumber?: string;
  operatorName?: string;
  slumpMm?: number | null;
  airContentPercent?: number | null;
  concreteTemperatureC?: number | null;
  freshDensityKgM3?: number | null;
  notes?: string;
  actorName?: string;
};

export type SaveProductionMaterialActualInput = {
  productionBatchId: string;
  materialRole: 'cement' | 'scm' | 'water' | 'fine_aggregate' | 'coarse_aggregate' | 'admixture' | 'fiber' | 'other';
  materialReferenceId?: string | null;
  materialName: string;
  targetMassKg?: number | null;
  batchedMassKg: number;
  moisturePercent?: number | null;
  absorptionPercent?: number | null;
  snapshot?: unknown;
  actorName?: string;
};

export type SaveProductionSpecimenInput = {
  productionBatchId: string;
  specimenCode: string;
  specimenType: 'cube' | 'cylinder' | 'beam' | 'other';
  castAt: string;
  targetTestAgeDays?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  lengthMm?: number | null;
  diameterMm?: number | null;
  curingCondition?: string | null;
  notes?: string | null;
  actorName?: string;
};

export type SaveProductionStrengthResultInput = {
  specimenId: string;
  testedAt: string;
  testAgeDays: number;
  maximumLoadKn: number;
  loadedAreaMm2: number;
  standardReference?: string | null;
  machineReference?: string | null;
  failureMode?: string | null;
  testedBy?: string | null;
  notes?: string | null;
  actorName?: string;
};

function db() {
  const database = getDatabase();
  ensureRuntimeMigrations(database);
  return database;
}

function nonEmpty(value: unknown, message: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value.trim();
}

function finitePositive(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} باید عدد مثبت باشد.`);
  return parsed;
}

function finiteNonNegativeOrNull(value: unknown, label: string) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} باید عدد نامنفی باشد.`);
  return parsed;
}

function percentOrNull(value: unknown, label: string) {
  const parsed = finiteNonNegativeOrNull(value, label);
  if (parsed != null && parsed > 100) throw new Error(`${label} باید بین ۰ تا ۱۰۰ باشد.`);
  return parsed;
}

function assertProductionWritableForMix(mixDesignId: string) {
  const database = db();
  const row = database.prepare('SELECT revision_number AS revisionNumber, status FROM mix_designs WHERE id = ?').get(mixDesignId) as { revisionNumber: number; status: string } | undefined;
  if (!row) throw new Error('طرح اختلاط برای Production پیدا نشد.');
  if (String(row.status).toLowerCase() !== 'production') throw new Error('ثبت Production فقط برای طرح اختلاط با وضعیت production مجاز است.');
  return { database, revisionNumber: Number(row.revisionNumber) };
}

function assertProductionBatchWritable(productionBatchId: string) {
  const database = db();
  const row = database.prepare(`
    SELECT b.id, b.mix_design_id AS mixDesignId, b.revision_number AS revisionNumber,
      m.revision_number AS currentRevisionNumber, m.status
    FROM production_batches b
    JOIN mix_designs m ON m.id = b.mix_design_id
    WHERE b.id = ?
  `).get(productionBatchId) as { id: string; mixDesignId: string; revisionNumber: number; currentRevisionNumber: number; status: string } | undefined;
  if (!row) throw new Error('Production Batch پیدا نشد.');
  if (Number(row.revisionNumber) !== Number(row.currentRevisionNumber)) throw new Error('Production Batch تاریخی فقط‌خواندنی است.');
  if (String(row.status).toLowerCase() !== 'production') throw new Error('ویرایش Production فقط در وضعیت production مجاز است.');
  return { database, row };
}

function assertProductionSpecimenWritable(specimenId: string) {
  const database = db();
  const row = database.prepare(`
    SELECT s.id, s.production_batch_id AS productionBatchId
    FROM production_specimens s
    WHERE s.id = ?
  `).get(specimenId) as { id: string; productionBatchId: string } | undefined;
  if (!row) throw new Error('Production specimen پیدا نشد.');
  assertProductionBatchWritable(row.productionBatchId);
  return { database, row };
}

function insertAudit(database: ReturnType<typeof db>, mixDesignId: string, action: string, details: unknown, actorName?: string) {
  database.prepare('INSERT INTO mix_design_audit_log (id, mix_design_id, action, details_json, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), mixDesignId, action, JSON.stringify(details ?? {}), actorName?.trim() || null, new Date().toISOString());
}

export function createProductionBatch(input: CreateProductionBatchInput) {
  const mixDesignId = nonEmpty(input.mixDesignId, 'شناسه طرح اختلاط الزامی است.');
  const batchCode = nonEmpty(input.batchCode, 'کد Production Batch الزامی است.');
  const producedAt = nonEmpty(input.producedAt, 'زمان تولید الزامی است.');
  const batchQuantityM3 = finitePositive(input.batchQuantityM3, 'حجم Batch');
  const slumpMm = finiteNonNegativeOrNull(input.slumpMm, 'اسلامپ');
  const airContentPercent = percentOrNull(input.airContentPercent, 'درصد هوا');
  const freshDensityKgM3 = input.freshDensityKgM3 == null ? null : finitePositive(input.freshDensityKgM3, 'چگالی بتن تازه');
  const temperature = input.concreteTemperatureC == null ? null : Number(input.concreteTemperatureC);
  if (temperature != null && !Number.isFinite(temperature)) throw new Error('دمای بتن باید عدد معتبر باشد.');

  const { database, revisionNumber } = assertProductionWritableForMix(mixDesignId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  database.transaction(() => {
    database.prepare(`
      INSERT INTO production_batches (
        id, mix_design_id, revision_number, batch_code, produced_at, batch_quantity_m3,
        plant_name, ticket_number, truck_number, operator_name, slump_mm, air_content_percent,
        concrete_temperature_c, fresh_density_kg_m3, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, mixDesignId, revisionNumber, batchCode, producedAt, batchQuantityM3,
      input.plantName?.trim() || null, input.ticketNumber?.trim() || null, input.truckNumber?.trim() || null,
      input.operatorName?.trim() || null, slumpMm, airContentPercent, temperature, freshDensityKgM3,
      input.notes?.trim() || null, input.actorName?.trim() || null, now, now
    );
    insertAudit(database, mixDesignId, 'production_batch_created', { productionBatchId: id, revisionNumber, batchCode, batchQuantityM3 }, input.actorName);
  })();
  return { status: 'pass' as const, productionBatchId: id, revisionNumber };
}

export function listProductionBatches(mixDesignIdInput: string) {
  const mixDesignId = nonEmpty(mixDesignIdInput, 'شناسه طرح اختلاط الزامی است.');
  return db().prepare(`
    SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, batch_code AS batchCode,
      produced_at AS producedAt, batch_quantity_m3 AS batchQuantityM3, plant_name AS plantName,
      ticket_number AS ticketNumber, truck_number AS truckNumber, operator_name AS operatorName,
      slump_mm AS slumpMm, air_content_percent AS airContentPercent, concrete_temperature_c AS concreteTemperatureC,
      fresh_density_kg_m3 AS freshDensityKgM3, notes, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
    FROM production_batches WHERE mix_design_id = ? ORDER BY produced_at DESC, created_at DESC
  `).all(mixDesignId);
}

export function getProductionBatchDetail(productionBatchIdInput: string) {
  const productionBatchId = nonEmpty(productionBatchIdInput, 'شناسه Production Batch الزامی است.');
  const database = db();
  const batch = database.prepare(`
    SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, batch_code AS batchCode,
      produced_at AS producedAt, batch_quantity_m3 AS batchQuantityM3, plant_name AS plantName,
      ticket_number AS ticketNumber, truck_number AS truckNumber, operator_name AS operatorName,
      slump_mm AS slumpMm, air_content_percent AS airContentPercent, concrete_temperature_c AS concreteTemperatureC,
      fresh_density_kg_m3 AS freshDensityKgM3, notes, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
    FROM production_batches WHERE id = ?
  `).get(productionBatchId);
  if (!batch) throw new Error('Production Batch پیدا نشد.');
  const materials = database.prepare(`SELECT id, material_role AS materialRole, material_reference_id AS materialReferenceId, material_name AS materialName, target_mass_kg AS targetMassKg, batched_mass_kg AS batchedMassKg, moisture_percent AS moisturePercent, absorption_percent AS absorptionPercent, snapshot_json AS snapshotJson, created_at AS createdAt FROM production_material_actuals WHERE production_batch_id = ? ORDER BY created_at, id`).all(productionBatchId);
  const specimens = database.prepare(`SELECT id, specimen_code AS specimenCode, specimen_type AS specimenType, cast_at AS castAt, target_test_age_days AS targetTestAgeDays, width_mm AS widthMm, height_mm AS heightMm, length_mm AS lengthMm, diameter_mm AS diameterMm, curing_condition AS curingCondition, notes, created_at AS createdAt FROM production_specimens WHERE production_batch_id = ? ORDER BY created_at, specimen_code`).all(productionBatchId) as Array<{ id: string }>;
  const results = specimens.length ? database.prepare(`SELECT id, specimen_id AS specimenId, tested_at AS testedAt, test_age_days AS testAgeDays, maximum_load_kn AS maximumLoadKn, loaded_area_mm2 AS loadedAreaMm2, strength_mpa AS strengthMpa, calculation_method AS calculationMethod, standard_reference AS standardReference, machine_reference AS machineReference, failure_mode AS failureMode, tested_by AS testedBy, notes, created_at AS createdAt FROM production_compressive_strength_results WHERE specimen_id IN (${specimens.map(() => '?').join(',')}) ORDER BY tested_at, id`).all(...specimens.map(item => item.id)) : [];
  return { batch, materials, specimens, strengthResults: results };
}

export function saveProductionMaterialActual(input: SaveProductionMaterialActualInput) {
  const productionBatchId = nonEmpty(input.productionBatchId, 'شناسه Production Batch الزامی است.');
  const materialName = nonEmpty(input.materialName, 'نام مصالح الزامی است.');
  const targetMassKg = finiteNonNegativeOrNull(input.targetMassKg, 'جرم هدف');
  const batchedMassKg = finiteNonNegativeOrNull(input.batchedMassKg, 'جرم واقعی');
  if (batchedMassKg == null) throw new Error('جرم واقعی مصالح الزامی است.');
  const moisturePercent = percentOrNull(input.moisturePercent, 'رطوبت');
  const absorptionPercent = percentOrNull(input.absorptionPercent, 'جذب آب');
  const { database, row } = assertProductionBatchWritable(productionBatchId);
  const id = crypto.randomUUID();
  database.transaction(() => {
    database.prepare(`INSERT INTO production_material_actuals (id, production_batch_id, material_role, material_reference_id, material_name, target_mass_kg, batched_mass_kg, moisture_percent, absorption_percent, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, productionBatchId, input.materialRole, input.materialReferenceId?.trim() || null, materialName, targetMassKg, batchedMassKg, moisturePercent, absorptionPercent, JSON.stringify(input.snapshot ?? {}), new Date().toISOString()
    );
    insertAudit(database, row.mixDesignId, 'production_material_actual_saved', { productionBatchId, materialActualId: id, materialRole: input.materialRole, materialName }, input.actorName);
  })();
  return { status: 'pass' as const, materialActualId: id };
}

export function saveProductionSpecimen(input: SaveProductionSpecimenInput) {
  const productionBatchId = nonEmpty(input.productionBatchId, 'شناسه Production Batch الزامی است.');
  const specimenCode = nonEmpty(input.specimenCode, 'کد نمونه الزامی است.');
  const castAt = nonEmpty(input.castAt, 'زمان ساخت نمونه الزامی است.');
  const targetTestAgeDays = input.targetTestAgeDays == null ? null : finitePositive(input.targetTestAgeDays, 'سن هدف آزمون');
  const dimension = (value: unknown, label: string) => value == null ? null : finitePositive(value, label);
  const { database, row } = assertProductionBatchWritable(productionBatchId);
  const id = crypto.randomUUID();
  database.transaction(() => {
    database.prepare(`INSERT INTO production_specimens (id, production_batch_id, specimen_code, specimen_type, cast_at, target_test_age_days, width_mm, height_mm, length_mm, diameter_mm, curing_condition, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, productionBatchId, specimenCode, input.specimenType, castAt, targetTestAgeDays,
      dimension(input.widthMm, 'عرض'), dimension(input.heightMm, 'ارتفاع'), dimension(input.lengthMm, 'طول'), dimension(input.diameterMm, 'قطر'),
      input.curingCondition?.trim() || null, input.notes?.trim() || null, new Date().toISOString()
    );
    insertAudit(database, row.mixDesignId, 'production_specimen_saved', { productionBatchId, specimenId: id, specimenCode, specimenType: input.specimenType }, input.actorName);
  })();
  return { status: 'pass' as const, specimenId: id };
}

export function saveProductionStrengthResult(input: SaveProductionStrengthResultInput) {
  const specimenId = nonEmpty(input.specimenId, 'شناسه نمونه الزامی است.');
  const testedAt = nonEmpty(input.testedAt, 'زمان آزمون الزامی است.');
  const testAgeDays = finiteNonNegativeOrNull(input.testAgeDays, 'سن آزمون');
  if (testAgeDays == null) throw new Error('سن آزمون الزامی است.');
  const maximumLoadKn = finitePositive(input.maximumLoadKn, 'حداکثر بار');
  const loadedAreaMm2 = finitePositive(input.loadedAreaMm2, 'سطح بارگذاری');
  const strengthMpa = Math.round(((maximumLoadKn * 1000) / loadedAreaMm2) * 1_000_000) / 1_000_000;
  const { database, row } = assertProductionSpecimenWritable(specimenId);
  const batch = database.prepare('SELECT mix_design_id AS mixDesignId FROM production_batches WHERE id = ?').get(row.productionBatchId) as { mixDesignId: string };
  const id = crypto.randomUUID();
  database.transaction(() => {
    database.prepare(`INSERT INTO production_compressive_strength_results (id, specimen_id, tested_at, test_age_days, maximum_load_kn, loaded_area_mm2, strength_mpa, calculation_method, standard_reference, machine_reference, failure_mode, tested_by, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, specimenId, testedAt, testAgeDays, maximumLoadKn, loadedAreaMm2, strengthMpa,
      'strength_mpa = maximum_load_kn * 1000 / loaded_area_mm2', input.standardReference?.trim() || null,
      input.machineReference?.trim() || null, input.failureMode?.trim() || null, input.testedBy?.trim() || null,
      input.notes?.trim() || null, new Date().toISOString()
    );
    insertAudit(database, batch.mixDesignId, 'production_strength_result_saved', { productionBatchId: row.productionBatchId, specimenId, strengthResultId: id, strengthMpa }, input.actorName);
  })();
  return { status: 'pass' as const, strengthResultId: id, strengthMpa, calculationMethod: 'strength_mpa = maximum_load_kn * 1000 / loaded_area_mm2', acceptanceCriteriaApplied: false };
}
