import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';

export type PersistedCalculationInput = {
  status?: string;
  calculation_method?: string;
  mix_proportions?: {
    cementitious_kg_m3?: number | null;
    water_kg_m3?: number | null;
    w_cm_ratio?: number | null;
    fine_aggregate_kg_m3?: number | null;
    coarse_aggregate_kg_m3?: number | null;
    air_content_percent?: number | null;
  };
  engineering_notes?: string[];
  warnings?: unknown[];
  standard_references?: string[];
  assumptions?: string[];
  limitations?: string[];
  [key: string]: unknown;
};

export type PersistedCalculationRecord = {
  id: string;
  mixDesignId: string;
  cementitiousContentKgM3: number | null;
  waterContentKgM3: number | null;
  wCmRatio: number | null;
  fineAggregateKgM3: number | null;
  coarseAggregateKgM3: number | null;
  airContentPercent: number | null;
  notes: string | null;
  traceability: unknown;
};

export function persistCalculatedMixResult(database: Database.Database, mixDesignId: string, result: PersistedCalculationInput): PersistedCalculationRecord | null {
  if (!mixDesignId.trim()) throw new Error('شناسه طرح اختلاط برای ذخیره نتیجه محاسبه الزامی است.');
  if (result.status && result.status !== 'pass') throw new Error('نتیجه ناموفق موتور نباید به‌عنوان نتیجه معتبر طرح ذخیره شود.');

  const mix = result.mix_proportions ?? {};
  const traceability = {
    calculationMethod: result.calculation_method ?? null,
    engineeringNotes: result.engineering_notes ?? [],
    standardReferences: result.standard_references ?? [],
    warnings: result.warnings ?? [],
    assumptions: result.assumptions ?? [],
    limitations: result.limitations ?? [],
    engineeringOutput: result
  };

  database.transaction(() => {
    const exists = database.prepare('SELECT id FROM mix_designs WHERE id = ?').get(mixDesignId);
    if (!exists) throw new Error('طرح اختلاط برای ذخیره نتیجه محاسبه یافت نشد.');

    // mix_results represents the current revision only. Previous revision results are retained
    // inside the immutable revision snapshot before a new revision is created.
    database.prepare('DELETE FROM mix_results WHERE mix_design_id = ?').run(mixDesignId);
    database.prepare(`
      INSERT INTO mix_results (
        id, mix_design_id, cementitious_content_kg_m3, water_content_kg_m3, w_cm_ratio,
        fine_aggregate_kg_m3, coarse_aggregate_kg_m3, air_content_percent, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      mixDesignId,
      mix.cementitious_kg_m3 ?? null,
      mix.water_kg_m3 ?? null,
      mix.w_cm_ratio ?? null,
      mix.fine_aggregate_kg_m3 ?? null,
      mix.coarse_aggregate_kg_m3 ?? null,
      mix.air_content_percent ?? null,
      JSON.stringify(traceability)
    );
  })();

  return getLatestCalculatedMixResult(database, mixDesignId);
}

export function getLatestCalculatedMixResult(database: Database.Database, mixDesignId: string): PersistedCalculationRecord | null {
  const row = database.prepare(`
    SELECT id, mix_design_id AS mixDesignId,
      cementitious_content_kg_m3 AS cementitiousContentKgM3,
      water_content_kg_m3 AS waterContentKgM3,
      w_cm_ratio AS wCmRatio,
      fine_aggregate_kg_m3 AS fineAggregateKgM3,
      coarse_aggregate_kg_m3 AS coarseAggregateKgM3,
      air_content_percent AS airContentPercent,
      notes
    FROM mix_results WHERE mix_design_id = ? ORDER BY rowid DESC LIMIT 1
  `).get(mixDesignId) as Omit<PersistedCalculationRecord, 'traceability'> | undefined;
  if (!row) return null;

  let traceability: unknown = null;
  if (typeof row.notes === 'string' && row.notes) {
    try { traceability = JSON.parse(row.notes); } catch { traceability = { legacyNotes: row.notes }; }
  }
  return { ...row, traceability };
}

export function saveCalculatedMixResult(mixDesignId: string, result: PersistedCalculationInput) {
  return persistCalculatedMixResult(getDatabase(), mixDesignId, result);
}

export function loadCalculatedMixResult(mixDesignId: string) {
  return getLatestCalculatedMixResult(getDatabase(), mixDesignId);
}
