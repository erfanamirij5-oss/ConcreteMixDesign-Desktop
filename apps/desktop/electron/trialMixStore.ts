import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';

type TrialMixInput = {
  mixDesignId: string;
  trialDate: string;
  batchQuantityM3: number;
  actualSlumpMm: number;
  airContentPercent: number;
  concreteTemperatureC: number;
  freshDensityKgM3: number;
  strength7dMpa?: number | null;
  strength28dMpa?: number | null;
  notes?: string;
  actorName?: string;
};

export function saveTrialMixRecordToDatabase(database: Database.Database, input: TrialMixInput) {
  validateTrialMixInput(input);
  const mix = database.prepare('SELECT id, status FROM mix_designs WHERE id = ?').get(input.mixDesignId) as { id: string; status: string } | undefined;
  if (!mix) throw new Error('طرح اختلاط موردنظر پیدا نشد.');
  if (!['trial_required', 'trial_completed'].includes(String(mix.status))) {
    throw new Error('ثبت Trial Mix فقط در وضعیت trial_required یا trial_completed مجاز است.');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  database.transaction(() => {
    database.prepare(`
      INSERT INTO trial_mix_records (
        id, mix_design_id, trial_date, batch_quantity_m3, actual_slump_mm,
        air_content_percent, concrete_temperature_c, fresh_density_kg_m3,
        strength_7d_mpa, strength_28d_mpa, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, input.mixDesignId, input.trialDate.trim(), input.batchQuantityM3,
      input.actualSlumpMm, input.airContentPercent, input.concreteTemperatureC,
      input.freshDensityKgM3, input.strength7dMpa ?? null, input.strength28dMpa ?? null,
      input.notes?.trim() || null, input.actorName?.trim() || null, now, now
    );

    database.prepare(`
      INSERT INTO audit_logs (id, mix_design_id, action, details_json, actor_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(), input.mixDesignId, 'trial_mix_record_created',
      JSON.stringify({
        trialMixRecordId: id,
        trialDate: input.trialDate.trim(),
        batchQuantityM3: input.batchQuantityM3,
        actualSlumpMm: input.actualSlumpMm,
        airContentPercent: input.airContentPercent,
        concreteTemperatureC: input.concreteTemperatureC,
        freshDensityKgM3: input.freshDensityKgM3,
        strength7dMpa: input.strength7dMpa ?? null,
        strength28dMpa: input.strength28dMpa ?? null
      }),
      input.actorName?.trim() || null, now
    );
  })();

  return { status: 'pass' as const, record: getTrialMixRecordFromDatabase(database, id) };
}

export function listTrialMixRecordsFromDatabase(database: Database.Database, mixDesignId: string) {
  if (!mixDesignId.trim()) return [];
  return database.prepare(`
    SELECT id, mix_design_id AS mixDesignId, trial_date AS trialDate,
      batch_quantity_m3 AS batchQuantityM3, actual_slump_mm AS actualSlumpMm,
      air_content_percent AS airContentPercent, concrete_temperature_c AS concreteTemperatureC,
      fresh_density_kg_m3 AS freshDensityKgM3, strength_7d_mpa AS strength7dMpa,
      strength_28d_mpa AS strength28dMpa, notes, created_by AS createdBy,
      created_at AS createdAt, updated_at AS updatedAt
    FROM trial_mix_records
    WHERE mix_design_id = ?
    ORDER BY trial_date DESC, created_at DESC
  `).all(mixDesignId);
}

export function hasCompletedTrialMixRecordInDatabase(database: Database.Database, mixDesignId: string) {
  if (!mixDesignId.trim()) return false;
  const row = database.prepare(`
    SELECT id FROM trial_mix_records
    WHERE mix_design_id = ?
      AND batch_quantity_m3 > 0
      AND actual_slump_mm >= 0
      AND air_content_percent BETWEEN 0 AND 100
      AND fresh_density_kg_m3 > 0
    LIMIT 1
  `).get(mixDesignId);
  return Boolean(row);
}

export function saveTrialMixRecord(input: TrialMixInput) {
  return saveTrialMixRecordToDatabase(getDatabase(), input);
}

export function listTrialMixRecords(mixDesignId: string) {
  return listTrialMixRecordsFromDatabase(getDatabase(), mixDesignId);
}

export function hasCompletedTrialMixRecord(mixDesignId: string) {
  return hasCompletedTrialMixRecordInDatabase(getDatabase(), mixDesignId);
}

function getTrialMixRecordFromDatabase(database: Database.Database, id: string) {
  return database.prepare(`
    SELECT id, mix_design_id AS mixDesignId, trial_date AS trialDate,
      batch_quantity_m3 AS batchQuantityM3, actual_slump_mm AS actualSlumpMm,
      air_content_percent AS airContentPercent, concrete_temperature_c AS concreteTemperatureC,
      fresh_density_kg_m3 AS freshDensityKgM3, strength_7d_mpa AS strength7dMpa,
      strength_28d_mpa AS strength28dMpa, notes, created_by AS createdBy,
      created_at AS createdAt, updated_at AS updatedAt
    FROM trial_mix_records WHERE id = ?
  `).get(id);
}

function validateTrialMixInput(input: TrialMixInput) {
  if (!input.mixDesignId?.trim()) throw new Error('شناسه طرح اختلاط الزامی است.');
  if (!input.trialDate?.trim() || Number.isNaN(Date.parse(input.trialDate))) throw new Error('تاریخ Trial Mix معتبر نیست.');
  if (!Number.isFinite(input.batchQuantityM3) || input.batchQuantityM3 <= 0) throw new Error('حجم بچ Trial Mix باید عدد مثبت باشد.');
  if (!Number.isFinite(input.actualSlumpMm) || input.actualSlumpMm < 0) throw new Error('اسلامپ واقعی باید عدد نامنفی باشد.');
  if (!Number.isFinite(input.airContentPercent) || input.airContentPercent < 0 || input.airContentPercent > 100) throw new Error('درصد هوای واقعی باید بین ۰ تا ۱۰۰ باشد.');
  if (!Number.isFinite(input.concreteTemperatureC)) throw new Error('دمای بتن تازه باید عدد معتبر باشد.');
  if (!Number.isFinite(input.freshDensityKgM3) || input.freshDensityKgM3 <= 0) throw new Error('چگالی بتن تازه باید عدد مثبت باشد.');
  for (const strength of [input.strength7dMpa, input.strength28dMpa]) {
    if (strength !== null && strength !== undefined && (!Number.isFinite(strength) || strength < 0)) {
      throw new Error('مقاومت فشاری Trial Mix باید عدد نامنفی باشد.');
    }
  }
}
