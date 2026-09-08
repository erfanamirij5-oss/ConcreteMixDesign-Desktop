import { getDatabase } from './database';
import { ensureRuntimeMigrations } from './runtimeMigrations';

export type DescriptiveStatistics = {
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  populationStandardDeviation: number | null;
  sampleStandardDeviation: number | null;
  sampleCoefficientOfVariationPercent: number | null;
};

type StrengthPoint = {
  resultId: string;
  specimenId: string;
  specimenCode: string;
  productionBatchId: string;
  batchCode: string;
  revisionNumber: number;
  producedAt: string;
  testedAt: string;
  testAgeDays: number;
  maximumLoadKn: number;
  loadedAreaMm2: number;
  strengthMpa: number;
  calculationMethod: string;
};

function db() {
  const database = getDatabase();
  ensureRuntimeMigrations(database);
  return database;
}

function requiredId(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} الزامی است.`);
  return value.trim();
}

function stats(values: number[]): DescriptiveStatistics {
  if (!values.length) {
    return { count: 0, min: null, max: null, mean: null, populationStandardDeviation: null, sampleStandardDeviation: null, sampleCoefficientOfVariationPercent: null };
  }
  const count = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const squared = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0);
  const populationStandardDeviation = Math.sqrt(squared / count);
  const sampleStandardDeviation = count > 1 ? Math.sqrt(squared / (count - 1)) : null;
  const sampleCoefficientOfVariationPercent = sampleStandardDeviation != null && mean !== 0
    ? (sampleStandardDeviation / Math.abs(mean)) * 100
    : null;
  return {
    count,
    min: Math.min(...values),
    max: Math.max(...values),
    mean,
    populationStandardDeviation,
    sampleStandardDeviation,
    sampleCoefficientOfVariationPercent
  };
}

export function getProductionQcStrengthAnalytics(mixDesignIdInput: string) {
  const mixDesignId = requiredId(mixDesignIdInput, 'شناسه طرح اختلاط');
  const rows = db().prepare(`
    SELECT r.id AS resultId,
      s.id AS specimenId,
      s.specimen_code AS specimenCode,
      b.id AS productionBatchId,
      b.batch_code AS batchCode,
      b.revision_number AS revisionNumber,
      b.produced_at AS producedAt,
      r.tested_at AS testedAt,
      r.test_age_days AS testAgeDays,
      r.maximum_load_kn AS maximumLoadKn,
      r.loaded_area_mm2 AS loadedAreaMm2,
      r.strength_mpa AS strengthMpa,
      r.calculation_method AS calculationMethod
    FROM production_compressive_strength_results r
    JOIN production_specimens s ON s.id = r.specimen_id
    JOIN production_batches b ON b.id = s.production_batch_id
    WHERE b.mix_design_id = ?
    ORDER BY r.test_age_days, r.tested_at, r.id
  `).all(mixDesignId) as StrengthPoint[];

  const byAge = new Map<number, StrengthPoint[]>();
  const byRevision = new Map<number, StrengthPoint[]>();
  for (const row of rows) {
    const age = Number(row.testAgeDays);
    const revision = Number(row.revisionNumber);
    byAge.set(age, [...(byAge.get(age) ?? []), row]);
    byRevision.set(revision, [...(byRevision.get(revision) ?? []), row]);
  }

  return {
    status: 'pass' as const,
    method: {
      version: 'production-qc-descriptive-strength-v1',
      scope: 'descriptive statistics only',
      formulas: {
        mean: 'sum(x) / n',
        populationStandardDeviation: 'sqrt(sum((x-mean)^2) / n)',
        sampleStandardDeviation: 'sqrt(sum((x-mean)^2) / (n-1)) for n > 1',
        sampleCoefficientOfVariationPercent: 'sampleStandardDeviation / abs(mean) * 100'
      },
      acceptanceCriteriaApplied: false,
      passFailApplied: false,
      standardComplianceInferred: false
    },
    mixDesignId,
    overall: stats(rows.map(row => Number(row.strengthMpa))),
    byTestAgeDays: [...byAge.entries()].sort((a, b) => a[0] - b[0]).map(([testAgeDays, points]) => ({
      testAgeDays,
      statistics: stats(points.map(point => Number(point.strengthMpa))),
      resultIds: points.map(point => point.resultId)
    })),
    byRevision: [...byRevision.entries()].sort((a, b) => a[0] - b[0]).map(([revisionNumber, points]) => ({
      revisionNumber,
      statistics: stats(points.map(point => Number(point.strengthMpa))),
      resultIds: points.map(point => point.resultId)
    })),
    points: rows.map(row => ({ ...row, revisionNumber: Number(row.revisionNumber), testAgeDays: Number(row.testAgeDays), maximumLoadKn: Number(row.maximumLoadKn), loadedAreaMm2: Number(row.loadedAreaMm2), strengthMpa: Number(row.strengthMpa) }))
  };
}
