import { getDatabase } from './database';
import { ensureRuntimeMigrations } from './runtimeMigrations';

export type CalibrationMetric = {
  metric: string;
  unit: string;
  designedValue: number | null;
  actualValue: number | null;
  absoluteDelta: number | null;
  relativeDeltaPercent: number | null;
  interpretation: 'actual_above_design' | 'actual_below_design' | 'matches_design' | 'not_comparable';
};

export type CalibrationBatchComparison = {
  batchId: string;
  batchSequence: number;
  batchQuantityM3: number;
  metrics: CalibrationMetric[];
  traceability: {
    materialActualIds: string[];
    trialMixRecordId: string;
  };
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

function finiteOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function metric(metricName: string, unit: string, designedValueInput: unknown, actualValueInput: unknown): CalibrationMetric {
  const designedValue = finiteOrNull(designedValueInput);
  const actualValue = finiteOrNull(actualValueInput);
  if (designedValue == null || actualValue == null) {
    return { metric: metricName, unit, designedValue, actualValue, absoluteDelta: null, relativeDeltaPercent: null, interpretation: 'not_comparable' };
  }
  const absoluteDelta = round(actualValue - designedValue);
  const relativeDeltaPercent = designedValue !== 0 ? round((absoluteDelta / Math.abs(designedValue)) * 100) : null;
  const tolerance = 1e-9;
  return {
    metric: metricName,
    unit,
    designedValue: round(designedValue),
    actualValue: round(actualValue),
    absoluteDelta,
    relativeDeltaPercent,
    interpretation: Math.abs(absoluteDelta) <= tolerance ? 'matches_design' : absoluteDelta > 0 ? 'actual_above_design' : 'actual_below_design'
  };
}

export function getTrialSessionCalibrationComparison(sessionIdInput: string) {
  const database = db();
  const sessionId = nonEmpty(sessionIdInput, 'شناسه Trial Session الزامی است.');

  const session = database.prepare(`
    SELECT s.id, s.mix_design_id AS mixDesignId, s.revision_number AS revisionNumber,
      s.session_code AS sessionCode, s.status,
      m.revision_number AS currentRevisionNumber
    FROM trial_mix_sessions s
    JOIN mix_designs m ON m.id = s.mix_design_id
    WHERE s.id = ?
  `).get(sessionId) as {
    id: string;
    mixDesignId: string;
    revisionNumber: number;
    sessionCode: string;
    status: string;
    currentRevisionNumber: number;
  } | undefined;
  if (!session) throw new Error('Trial Session پیدا نشد.');
  if (session.revisionNumber !== session.currentRevisionNumber) {
    throw new Error('Calibration برای Revision تاریخی تا زمان اتصال مستقیم به immutable revision snapshot مجاز نیست.');
  }

  const design = database.prepare(`
    SELECT id,
      cementitious_content_kg_m3 AS cementitiousKgM3,
      water_content_kg_m3 AS waterKgM3,
      w_cm_ratio AS wCmRatio,
      fine_aggregate_kg_m3 AS fineAggregateKgM3,
      coarse_aggregate_kg_m3 AS coarseAggregateKgM3,
      air_content_percent AS airPercent,
      notes
    FROM mix_results
    WHERE mix_design_id = ?
    ORDER BY rowid DESC LIMIT 1
  `).get(session.mixDesignId) as {
    id: string;
    cementitiousKgM3: number | null;
    waterKgM3: number | null;
    wCmRatio: number | null;
    fineAggregateKgM3: number | null;
    coarseAggregateKgM3: number | null;
    airPercent: number | null;
    notes: string | null;
  } | undefined;
  if (!design) throw new Error('نتیجه طراحی ذخیره‌شده برای Revision فعلی پیدا نشد.');

  const batches = database.prepare(`
    SELECT sr.batch_sequence AS batchSequence,
      r.id AS batchId,
      r.batch_quantity_m3 AS batchQuantityM3,
      r.air_content_percent AS actualAirPercent,
      r.actual_slump_mm AS actualSlumpMm,
      r.fresh_density_kg_m3 AS freshDensityKgM3
    FROM trial_mix_session_records sr
    JOIN trial_mix_records r ON r.id = sr.trial_mix_record_id
    WHERE sr.session_id = ?
    ORDER BY sr.batch_sequence
  `).all(sessionId) as Array<{
    batchSequence: number;
    batchId: string;
    batchQuantityM3: number;
    actualAirPercent: number;
    actualSlumpMm: number;
    freshDensityKgM3: number;
  }>;

  const comparisons: CalibrationBatchComparison[] = batches.map(batch => {
    if (!(Number(batch.batchQuantityM3) > 0)) throw new Error(`حجم Batch ${batch.batchSequence} برای Calibration باید مثبت باشد.`);
    const materials = database.prepare(`
      SELECT id, material_role AS materialRole, batched_mass_kg AS batchedMassKg
      FROM trial_mix_material_actuals
      WHERE trial_mix_record_id = ?
      ORDER BY created_at, id
    `).all(batch.batchId) as Array<{ id: string; materialRole: string; batchedMassKg: number }>;

    const massByRole = new Map<string, number>();
    for (const item of materials) {
      massByRole.set(item.materialRole, (massByRole.get(item.materialRole) ?? 0) + Number(item.batchedMassKg));
    }
    const perM3 = (massKg: number | undefined) => massKg == null ? null : massKg / Number(batch.batchQuantityM3);
    const cementitiousActual = perM3((massByRole.get('cement') ?? 0) + (massByRole.get('scm') ?? 0));
    const waterActual = perM3(massByRole.get('water'));
    const fineActual = perM3(massByRole.get('fine_aggregate'));
    const coarseActual = perM3(massByRole.get('coarse_aggregate'));
    const rawBatchedWCm = waterActual != null && cementitiousActual != null && cementitiousActual > 0 ? waterActual / cementitiousActual : null;

    return {
      batchId: batch.batchId,
      batchSequence: Number(batch.batchSequence),
      batchQuantityM3: Number(batch.batchQuantityM3),
      metrics: [
        metric('cementitious_content', 'kg/m3', design.cementitiousKgM3, cementitiousActual),
        metric('water_content_raw_batched', 'kg/m3', design.waterKgM3, waterActual),
        metric('w_cm_ratio_raw_batched', 'ratio', design.wCmRatio, rawBatchedWCm),
        metric('fine_aggregate', 'kg/m3', design.fineAggregateKgM3, fineActual),
        metric('coarse_aggregate', 'kg/m3', design.coarseAggregateKgM3, coarseActual),
        metric('air_content', '%', design.airPercent, Number(batch.actualAirPercent))
      ],
      traceability: {
        materialActualIds: materials.map(item => item.id),
        trialMixRecordId: batch.batchId
      }
    };
  });

  return {
    status: 'pass' as const,
    calibration: {
      method: {
        version: 'trial-calibration-comparison-v1',
        scope: 'descriptive comparison only',
        batchNormalization: 'batched_mass_kg / batch_quantity_m3',
        rawBatchedWCm: 'raw batched water / (cement + scm); moisture/absorption corrections are not applied in v1',
        recommendationEngineApplied: false,
        acceptanceCriteriaApplied: false
      },
      session: {
        id: session.id,
        mixDesignId: session.mixDesignId,
        revisionNumber: session.revisionNumber,
        sessionCode: session.sessionCode,
        status: session.status
      },
      design: {
        resultId: design.id,
        cementitiousKgM3: design.cementitiousKgM3,
        waterKgM3: design.waterKgM3,
        wCmRatio: design.wCmRatio,
        fineAggregateKgM3: design.fineAggregateKgM3,
        coarseAggregateKgM3: design.coarseAggregateKgM3,
        airPercent: design.airPercent
      },
      batches: comparisons
    }
  };
}
