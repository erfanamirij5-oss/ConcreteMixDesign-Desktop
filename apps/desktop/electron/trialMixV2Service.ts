import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';
import { ensureRuntimeMigrations } from './runtimeMigrations';

export type TrialSessionStatus = 'planned' | 'in_progress' | 'completed' | 'void';
export type TrialMaterialRole = 'cement' | 'scm' | 'water' | 'fine_aggregate' | 'coarse_aggregate' | 'admixture' | 'fiber' | 'other';
export type TrialSpecimenType = 'cube' | 'cylinder' | 'beam' | 'other';

export type CreateTrialSessionInput = {
  mixDesignId: string;
  sessionCode: string;
  trialDate: string;
  status?: TrialSessionStatus;
  objective?: string | null;
  location?: string | null;
  leadEngineer?: string | null;
  actorName?: string | null;
};

export type LinkTrialRecordInput = {
  sessionId: string;
  trialMixRecordId: string;
  batchSequence: number;
  actorName?: string | null;
};

export type SaveTrialMaterialActualInput = {
  trialMixRecordId: string;
  materialRole: TrialMaterialRole;
  materialReferenceId?: string | null;
  materialName: string;
  targetMassKg?: number | null;
  batchedMassKg: number;
  moisturePercent?: number | null;
  absorptionPercent?: number | null;
  moistureCorrectionKg?: number | null;
  snapshot?: Record<string, unknown> | null;
  actorName?: string | null;
};

export type SaveTrialSpecimenInput = {
  trialMixRecordId: string;
  specimenCode: string;
  specimenType: TrialSpecimenType;
  castAt: string;
  targetTestAgeDays?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  lengthMm?: number | null;
  diameterMm?: number | null;
  curingCondition?: string | null;
  notes?: string | null;
  actorName?: string | null;
};

export type SaveCompressiveStrengthResultInput = {
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
  actorName?: string | null;
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

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function validDate(value: unknown, message: string) {
  const text = nonEmpty(value, message);
  if (Number.isNaN(Date.parse(text))) throw new Error(message);
  return text;
}

function finite(value: unknown, message: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(message);
  return value;
}

function currentMix(database: Database.Database, mixDesignId: string) {
  const row = database.prepare('SELECT id, status, COALESCE(revision_number, 0) AS revisionNumber FROM mix_designs WHERE id = ?').get(mixDesignId) as { id: string; status: string; revisionNumber: number } | undefined;
  if (!row) throw new Error('طرح اختلاط موردنظر پیدا نشد.');
  return row;
}

function audit(database: Database.Database, mixDesignId: string, action: string, details: Record<string, unknown>, actorName?: string | null) {
  database.prepare(`
    INSERT INTO audit_logs (id, mix_design_id, action, details_json, actor_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), mixDesignId, action, JSON.stringify(details), optionalText(actorName), new Date().toISOString());
}

export function createTrialSession(input: CreateTrialSessionInput) {
  const database = db();
  const mixDesignId = nonEmpty(input.mixDesignId, 'شناسه طرح اختلاط الزامی است.');
  const sessionCode = nonEmpty(input.sessionCode, 'کد Trial Session الزامی است.');
  const trialDate = validDate(input.trialDate, 'تاریخ Trial Session معتبر نیست.');
  const mix = currentMix(database, mixDesignId);
  if (!['trial_required', 'trial_completed'].includes(mix.status)) throw new Error('ایجاد Trial Session فقط در workflow آزمایش مجاز است.');
  const status = input.status ?? 'planned';
  if (!['planned', 'in_progress', 'completed', 'void'].includes(status)) throw new Error('وضعیت Trial Session معتبر نیست.');

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  database.transaction(() => {
    database.prepare(`
      INSERT INTO trial_mix_sessions (
        id, mix_design_id, revision_number, session_code, trial_date, status,
        objective, location, lead_engineer, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, mixDesignId, mix.revisionNumber, sessionCode, trialDate, status,
      optionalText(input.objective), optionalText(input.location), optionalText(input.leadEngineer),
      optionalText(input.actorName), now, now
    );
    audit(database, mixDesignId, 'trial_mix_v2_session_created', { sessionId: id, revisionNumber: mix.revisionNumber, sessionCode, trialDate, status }, input.actorName);
  })();
  return { status: 'pass' as const, session: getTrialSessionDetailFromDatabase(database, id) };
}

export function listTrialSessions(mixDesignId: string) {
  const database = db();
  const id = nonEmpty(mixDesignId, 'شناسه طرح اختلاط الزامی است.');
  return database.prepare(`
    SELECT s.id, s.mix_design_id AS mixDesignId, s.revision_number AS revisionNumber,
      s.session_code AS sessionCode, s.trial_date AS trialDate, s.status, s.objective,
      s.location, s.lead_engineer AS leadEngineer, s.created_by AS createdBy,
      s.created_at AS createdAt, s.updated_at AS updatedAt,
      COUNT(sr.trial_mix_record_id) AS batchCount
    FROM trial_mix_sessions s
    LEFT JOIN trial_mix_session_records sr ON sr.session_id = s.id
    WHERE s.mix_design_id = ?
    GROUP BY s.id
    ORDER BY s.revision_number DESC, s.trial_date DESC, s.created_at DESC
  `).all(id);
}

export function linkTrialRecordToSession(input: LinkTrialRecordInput) {
  const database = db();
  const sessionId = nonEmpty(input.sessionId, 'شناسه Trial Session الزامی است.');
  const trialMixRecordId = nonEmpty(input.trialMixRecordId, 'شناسه Trial Mix record الزامی است.');
  const batchSequence = finite(input.batchSequence, 'شماره بچ باید عدد معتبر باشد.');
  if (!Number.isInteger(batchSequence) || batchSequence <= 0) throw new Error('شماره بچ باید عدد صحیح مثبت باشد.');

  const session = database.prepare('SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, status FROM trial_mix_sessions WHERE id = ?').get(sessionId) as { id: string; mixDesignId: string; revisionNumber: number; status: string } | undefined;
  if (!session) throw new Error('Trial Session پیدا نشد.');
  if (session.status === 'void') throw new Error('اتصال رکورد به Trial Session باطل‌شده مجاز نیست.');
  const record = database.prepare('SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber FROM trial_mix_records WHERE id = ?').get(trialMixRecordId) as { id: string; mixDesignId: string; revisionNumber: number } | undefined;
  if (!record) throw new Error('Trial Mix record پیدا نشد.');
  if (record.mixDesignId !== session.mixDesignId || record.revisionNumber !== session.revisionNumber) throw new Error('Trial Mix record و Trial Session باید متعلق به همان طرح و همان Revision باشند.');

  database.transaction(() => {
    database.prepare('INSERT INTO trial_mix_session_records (session_id, trial_mix_record_id, batch_sequence, linked_at) VALUES (?, ?, ?, ?)').run(sessionId, trialMixRecordId, batchSequence, new Date().toISOString());
    audit(database, session.mixDesignId, 'trial_mix_v2_record_linked', { sessionId, trialMixRecordId, revisionNumber: session.revisionNumber, batchSequence }, input.actorName);
  })();
  return { status: 'pass' as const, session: getTrialSessionDetailFromDatabase(database, sessionId) };
}

export function saveTrialMaterialActual(input: SaveTrialMaterialActualInput) {
  const database = db();
  const trialMixRecordId = nonEmpty(input.trialMixRecordId, 'شناسه Trial Mix record الزامی است.');
  const materialName = nonEmpty(input.materialName, 'نام ماده الزامی است.');
  const roles = ['cement', 'scm', 'water', 'fine_aggregate', 'coarse_aggregate', 'admixture', 'fiber', 'other'];
  if (!roles.includes(input.materialRole)) throw new Error('نقش ماده معتبر نیست.');
  const batchedMassKg = finite(input.batchedMassKg, 'جرم واقعی بچ‌شده باید عدد معتبر باشد.');
  if (batchedMassKg < 0) throw new Error('جرم واقعی بچ‌شده نمی‌تواند منفی باشد.');
  for (const [value, label] of [[input.targetMassKg, 'جرم هدف'], [input.moisturePercent, 'رطوبت'], [input.absorptionPercent, 'جذب آب']] as const) {
    if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) throw new Error(`${label} معتبر نیست.`);
  }
  if (input.moisturePercent != null && input.moisturePercent > 100) throw new Error('رطوبت باید بین صفر تا ۱۰۰ درصد باشد.');
  if (input.absorptionPercent != null && input.absorptionPercent > 100) throw new Error('جذب آب باید بین صفر تا ۱۰۰ درصد باشد.');
  if (input.moistureCorrectionKg != null && !Number.isFinite(input.moistureCorrectionKg)) throw new Error('تصحیح رطوبت باید عدد معتبر باشد.');

  const record = database.prepare('SELECT mix_design_id AS mixDesignId, revision_number AS revisionNumber FROM trial_mix_records WHERE id = ?').get(trialMixRecordId) as { mixDesignId: string; revisionNumber: number } | undefined;
  if (!record) throw new Error('Trial Mix record پیدا نشد.');
  const id = crypto.randomUUID();
  database.transaction(() => {
    database.prepare(`
      INSERT INTO trial_mix_material_actuals (
        id, trial_mix_record_id, material_role, material_reference_id, material_name,
        target_mass_kg, batched_mass_kg, moisture_percent, absorption_percent,
        moisture_correction_kg, snapshot_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, trialMixRecordId, input.materialRole, optionalText(input.materialReferenceId), materialName,
      input.targetMassKg ?? null, batchedMassKg, input.moisturePercent ?? null, input.absorptionPercent ?? null,
      input.moistureCorrectionKg ?? null, JSON.stringify(input.snapshot ?? {}), new Date().toISOString()
    );
    audit(database, record.mixDesignId, 'trial_mix_v2_material_actual_created', { materialActualId: id, trialMixRecordId, revisionNumber: record.revisionNumber, materialRole: input.materialRole, materialName, batchedMassKg }, input.actorName);
  })();
  return { status: 'pass' as const, material: database.prepare('SELECT * FROM trial_mix_material_actuals WHERE id = ?').get(id) };
}

export function saveTrialSpecimen(input: SaveTrialSpecimenInput) {
  const database = db();
  const trialMixRecordId = nonEmpty(input.trialMixRecordId, 'شناسه Trial Mix record الزامی است.');
  const specimenCode = nonEmpty(input.specimenCode, 'کد نمونه الزامی است.');
  const castAt = validDate(input.castAt, 'زمان ساخت نمونه معتبر نیست.');
  const types = ['cube', 'cylinder', 'beam', 'other'];
  if (!types.includes(input.specimenType)) throw new Error('نوع نمونه معتبر نیست.');
  if (input.targetTestAgeDays != null && (!Number.isInteger(input.targetTestAgeDays) || input.targetTestAgeDays <= 0)) throw new Error('سن هدف آزمون باید عدد صحیح مثبت باشد.');
  for (const [value, label] of [[input.widthMm, 'عرض'], [input.heightMm, 'ارتفاع'], [input.lengthMm, 'طول'], [input.diameterMm, 'قطر']] as const) {
    if (value != null && (!Number.isFinite(value) || value <= 0)) throw new Error(`${label} نمونه باید عدد مثبت باشد.`);
  }
  const record = database.prepare('SELECT mix_design_id AS mixDesignId, revision_number AS revisionNumber FROM trial_mix_records WHERE id = ?').get(trialMixRecordId) as { mixDesignId: string; revisionNumber: number } | undefined;
  if (!record) throw new Error('Trial Mix record پیدا نشد.');

  const id = crypto.randomUUID();
  database.transaction(() => {
    database.prepare(`
      INSERT INTO trial_mix_specimens (
        id, trial_mix_record_id, specimen_code, specimen_type, cast_at, target_test_age_days,
        width_mm, height_mm, length_mm, diameter_mm, curing_condition, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, trialMixRecordId, specimenCode, input.specimenType, castAt, input.targetTestAgeDays ?? null,
      input.widthMm ?? null, input.heightMm ?? null, input.lengthMm ?? null, input.diameterMm ?? null,
      optionalText(input.curingCondition), optionalText(input.notes), new Date().toISOString()
    );
    audit(database, record.mixDesignId, 'trial_mix_v2_specimen_created', { specimenId: id, trialMixRecordId, revisionNumber: record.revisionNumber, specimenCode, specimenType: input.specimenType }, input.actorName);
  })();
  return { status: 'pass' as const, specimen: database.prepare('SELECT * FROM trial_mix_specimens WHERE id = ?').get(id) };
}

export function saveCompressiveStrengthResult(input: SaveCompressiveStrengthResultInput) {
  const database = db();
  const specimenId = nonEmpty(input.specimenId, 'شناسه نمونه الزامی است.');
  const testedAt = validDate(input.testedAt, 'زمان آزمون معتبر نیست.');
  const testAgeDays = finite(input.testAgeDays, 'سن آزمون باید عدد معتبر باشد.');
  const maximumLoadKn = finite(input.maximumLoadKn, 'بار بیشینه باید عدد معتبر باشد.');
  const loadedAreaMm2 = finite(input.loadedAreaMm2, 'سطح بارگذاری باید عدد معتبر باشد.');
  if (testAgeDays < 0) throw new Error('سن آزمون نمی‌تواند منفی باشد.');
  if (maximumLoadKn <= 0 || loadedAreaMm2 <= 0) throw new Error('بار بیشینه و سطح بارگذاری باید مثبت باشند.');
  const strengthMpa = maximumLoadKn * 1000 / loadedAreaMm2;

  const specimen = database.prepare(`
    SELECT s.id, s.trial_mix_record_id AS trialMixRecordId, r.mix_design_id AS mixDesignId, r.revision_number AS revisionNumber
    FROM trial_mix_specimens s
    JOIN trial_mix_records r ON r.id = s.trial_mix_record_id
    WHERE s.id = ?
  `).get(specimenId) as { id: string; trialMixRecordId: string; mixDesignId: string; revisionNumber: number } | undefined;
  if (!specimen) throw new Error('نمونه موردنظر پیدا نشد.');

  const id = crypto.randomUUID();
  database.transaction(() => {
    database.prepare(`
      INSERT INTO trial_mix_compressive_strength_results (
        id, specimen_id, tested_at, test_age_days, maximum_load_kn, loaded_area_mm2,
        strength_mpa, standard_reference, machine_reference, failure_mode, tested_by, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, specimenId, testedAt, testAgeDays, maximumLoadKn, loadedAreaMm2, strengthMpa,
      optionalText(input.standardReference), optionalText(input.machineReference), optionalText(input.failureMode),
      optionalText(input.testedBy), optionalText(input.notes), new Date().toISOString()
    );
    audit(database, specimen.mixDesignId, 'trial_mix_v2_strength_result_created', { resultId: id, specimenId, trialMixRecordId: specimen.trialMixRecordId, revisionNumber: specimen.revisionNumber, testAgeDays, maximumLoadKn, loadedAreaMm2, strengthMpa }, input.actorName);
  })();
  return { status: 'pass' as const, result: database.prepare('SELECT * FROM trial_mix_compressive_strength_results WHERE id = ?').get(id) };
}

export function getTrialSessionDetail(sessionId: string) {
  const database = db();
  return getTrialSessionDetailFromDatabase(database, nonEmpty(sessionId, 'شناسه Trial Session الزامی است.'));
}

export function getTrialSessionDetailFromDatabase(database: Database.Database, sessionId: string) {
  const session = database.prepare(`
    SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, session_code AS sessionCode,
      trial_date AS trialDate, status, objective, location, lead_engineer AS leadEngineer,
      created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
    FROM trial_mix_sessions WHERE id = ?
  `).get(sessionId) as Record<string, unknown> | undefined;
  if (!session) throw new Error('Trial Session پیدا نشد.');
  const records = database.prepare(`
    SELECT sr.batch_sequence AS batchSequence, sr.linked_at AS linkedAt,
      r.id, r.trial_date AS trialDate, r.batch_quantity_m3 AS batchQuantityM3,
      r.actual_slump_mm AS actualSlumpMm, r.air_content_percent AS airContentPercent,
      r.concrete_temperature_c AS concreteTemperatureC, r.fresh_density_kg_m3 AS freshDensityKgM3,
      r.strength_7d_mpa AS strength7dMpa, r.strength_28d_mpa AS strength28dMpa, r.notes
    FROM trial_mix_session_records sr
    JOIN trial_mix_records r ON r.id = sr.trial_mix_record_id
    WHERE sr.session_id = ? ORDER BY sr.batch_sequence
  `).all(sessionId) as Array<Record<string, unknown>>;
  const batches = records.map(record => {
    const trialMixRecordId = String(record.id);
    const materials = database.prepare(`
      SELECT id, material_role AS materialRole, material_reference_id AS materialReferenceId, material_name AS materialName,
        target_mass_kg AS targetMassKg, batched_mass_kg AS batchedMassKg, moisture_percent AS moisturePercent,
        absorption_percent AS absorptionPercent, moisture_correction_kg AS moistureCorrectionKg, snapshot_json AS snapshotJson,
        created_at AS createdAt FROM trial_mix_material_actuals WHERE trial_mix_record_id = ? ORDER BY created_at, material_role, material_name
    `).all(trialMixRecordId);
    const specimens = database.prepare(`
      SELECT id, specimen_code AS specimenCode, specimen_type AS specimenType, cast_at AS castAt,
        target_test_age_days AS targetTestAgeDays, width_mm AS widthMm, height_mm AS heightMm, length_mm AS lengthMm,
        diameter_mm AS diameterMm, curing_condition AS curingCondition, notes, created_at AS createdAt
      FROM trial_mix_specimens WHERE trial_mix_record_id = ? ORDER BY target_test_age_days, specimen_code
    `).all(trialMixRecordId) as Array<Record<string, unknown>>;
    const specimensWithResults = specimens.map(specimen => ({
      ...specimen,
      results: database.prepare(`
        SELECT id, tested_at AS testedAt, test_age_days AS testAgeDays, maximum_load_kn AS maximumLoadKn,
          loaded_area_mm2 AS loadedAreaMm2, strength_mpa AS strengthMpa, calculation_method AS calculationMethod,
          standard_reference AS standardReference, machine_reference AS machineReference, failure_mode AS failureMode,
          tested_by AS testedBy, notes, created_at AS createdAt
        FROM trial_mix_compressive_strength_results WHERE specimen_id = ? ORDER BY tested_at DESC
      `).all(String(specimen.id))
    }));
    return { ...record, materials, specimens: specimensWithResults };
  });
  return { ...session, batches };
}
