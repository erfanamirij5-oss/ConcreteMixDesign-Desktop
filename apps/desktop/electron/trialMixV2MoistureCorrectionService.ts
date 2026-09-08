import { getDatabase } from './database';
import { ensureRuntimeMigrations } from './runtimeMigrations';
import { resolveTrialRevisionDesignResult } from './trialMixV2RevisionDesignResolver';

export type AggregateMoistureCorrectionInput = {
  targetSsdMassKg: number;
  totalMoisturePercent: number;
  absorptionPercent: number;
};

export type AggregateMoistureCorrectionResult = {
  targetSsdMassKg: number;
  ovenDryEquivalentKg: number;
  totalMoisturePercent: number;
  absorptionPercent: number;
  freeMoisturePercentOdBasis: number;
  freeWaterKg: number;
  correctedWetAggregateMassKg: number;
};

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function finiteNonNegative(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} باید عددی متناهی و نامنفی باشد.`);
  return parsed;
}

export function calculateAggregateMoistureCorrection(input: AggregateMoistureCorrectionInput): AggregateMoistureCorrectionResult {
  const targetSsdMassKg = finiteNonNegative(input.targetSsdMassKg, 'جرم SSD هدف');
  const totalMoisturePercent = finiteNonNegative(input.totalMoisturePercent, 'رطوبت کل');
  const absorptionPercent = finiteNonNegative(input.absorptionPercent, 'جذب آب');
  if (totalMoisturePercent > 100 || absorptionPercent > 100) throw new Error('رطوبت کل و جذب آب نمی‌توانند بیش از 100 درصد باشند.');

  const absorptionFraction = absorptionPercent / 100;
  const totalMoistureFraction = totalMoisturePercent / 100;
  const ovenDryEquivalentKg = targetSsdMassKg / (1 + absorptionFraction);
  const freeMoisturePercentOdBasis = totalMoisturePercent - absorptionPercent;
  const freeWaterKg = ovenDryEquivalentKg * (totalMoistureFraction - absorptionFraction);
  const correctedWetAggregateMassKg = ovenDryEquivalentKg * (1 + totalMoistureFraction);

  return {
    targetSsdMassKg: round(targetSsdMassKg),
    ovenDryEquivalentKg: round(ovenDryEquivalentKg),
    totalMoisturePercent: round(totalMoisturePercent),
    absorptionPercent: round(absorptionPercent),
    freeMoisturePercentOdBasis: round(freeMoisturePercentOdBasis),
    freeWaterKg: round(freeWaterKg),
    correctedWetAggregateMassKg: round(correctedWetAggregateMassKg)
  };
}

export function getTrialSessionMoistureCorrection(sessionIdInput: string) {
  const sessionId = String(sessionIdInput ?? '').trim();
  if (!sessionId) throw new Error('شناسه Trial Session الزامی است.');

  const database = getDatabase();
  ensureRuntimeMigrations(database);

  const session = database.prepare(`
    SELECT s.id, s.mix_design_id AS mixDesignId, s.revision_number AS revisionNumber,
      s.session_code AS sessionCode, m.revision_number AS currentRevisionNumber
    FROM trial_mix_sessions s
    JOIN mix_designs m ON m.id = s.mix_design_id
    WHERE s.id = ?
  `).get(sessionId) as {
    id: string;
    mixDesignId: string;
    revisionNumber: number;
    sessionCode: string;
    currentRevisionNumber: number;
  } | undefined;
  if (!session) throw new Error('Trial Session پیدا نشد.');

  const design = resolveTrialRevisionDesignResult(
    database,
    session.mixDesignId,
    Number(session.revisionNumber),
    Number(session.currentRevisionNumber)
  );
  if (design.waterKgM3 == null) throw new Error(`آب طراحی ذخیره‌شده برای Revision ${session.revisionNumber} پیدا نشد.`);

  const batches = database.prepare(`
    SELECT sr.batch_sequence AS batchSequence, r.id AS batchId, r.batch_quantity_m3 AS batchQuantityM3
    FROM trial_mix_session_records sr
    JOIN trial_mix_records r ON r.id = sr.trial_mix_record_id
    WHERE sr.session_id = ?
    ORDER BY sr.batch_sequence
  `).all(sessionId) as Array<{ batchSequence: number; batchId: string; batchQuantityM3: number }>;

  const correctedBatches = batches.map(batch => {
    const batchQuantityM3 = Number(batch.batchQuantityM3);
    if (!(batchQuantityM3 > 0)) throw new Error(`حجم Batch ${batch.batchSequence} برای Moisture Correction باید مثبت باشد.`);

    const aggregateRows = database.prepare(`
      SELECT id, material_role AS materialRole, material_name AS materialName,
        target_mass_kg AS targetMassKg, moisture_percent AS moisturePercent,
        absorption_percent AS absorptionPercent
      FROM trial_mix_material_actuals
      WHERE trial_mix_record_id = ?
        AND material_role IN ('fine_aggregate', 'coarse_aggregate')
      ORDER BY created_at, id
    `).all(batch.batchId) as Array<{
      id: string;
      materialRole: 'fine_aggregate' | 'coarse_aggregate';
      materialName: string;
      targetMassKg: number | null;
      moisturePercent: number | null;
      absorptionPercent: number | null;
    }>;

    const aggregates = aggregateRows.map(row => {
      if (row.targetMassKg == null || row.moisturePercent == null || row.absorptionPercent == null) {
        return {
          id: row.id,
          materialRole: row.materialRole,
          materialName: row.materialName,
          comparable: false as const,
          reason: 'target SSD mass, total moisture, and absorption are all required'
        };
      }
      return {
        id: row.id,
        materialRole: row.materialRole,
        materialName: row.materialName,
        comparable: true as const,
        correction: calculateAggregateMoistureCorrection({
          targetSsdMassKg: Number(row.targetMassKg),
          totalMoisturePercent: Number(row.moisturePercent),
          absorptionPercent: Number(row.absorptionPercent)
        })
      };
    });

    const comparableCorrections = aggregates.filter(item => item.comparable).map(item => item.correction);
    const allAggregateInputsComplete = aggregateRows.length > 0 && aggregates.every(item => item.comparable);
    const totalFreeWaterKg = allAggregateInputsComplete
      ? comparableCorrections.reduce((sum, item) => sum + item.freeWaterKg, 0)
      : null;
    const designBatchWaterKg = Number(design.waterKgM3) * batchQuantityM3;
    const correctedBatchWaterKg = totalFreeWaterKg == null ? null : designBatchWaterKg - totalFreeWaterKg;

    return {
      batchId: batch.batchId,
      batchSequence: Number(batch.batchSequence),
      batchQuantityM3: round(batchQuantityM3),
      designBatchWaterKg: round(designBatchWaterKg),
      totalAggregateFreeWaterKg: totalFreeWaterKg == null ? null : round(totalFreeWaterKg),
      correctedBatchWaterKg: correctedBatchWaterKg == null ? null : round(correctedBatchWaterKg),
      comparable: allAggregateInputsComplete,
      aggregates
    };
  });

  return {
    status: 'pass' as const,
    moistureCorrection: {
      method: {
        version: 'aggregate-moisture-correction-v2',
        basis: 'SSD design mass converted to oven-dry basis before moisture adjustment',
        freeMoistureDefinition: 'total moisture percent minus absorption percent, oven-dry mass basis',
        batchWaterRule: 'design batch water minus aggregate free-water contribution; negative free water adds batch water',
        revisionDesignResolution: 'current revision uses current mix_results; historical revision uses immutable mix_design_revision_snapshots snapshot_json.mixResults',
        references: ['NRMCA TIP 6 - Aggregate Moisture and Making Adjustments to Concrete Mixtures', 'ACI E1-16 Aggregates for Concrete'],
        writesMixDesign: false,
        acceptanceCriteriaApplied: false
      },
      session: {
        id: session.id,
        mixDesignId: session.mixDesignId,
        revisionNumber: session.revisionNumber,
        sessionCode: session.sessionCode
      },
      design: {
        resultId: design.id,
        source: design.source,
        snapshotId: design.snapshotId,
        snapshotRevisionNumber: design.snapshotRevisionNumber,
        waterKgM3: round(Number(design.waterKgM3))
      },
      batches: correctedBatches
    }
  };
}
