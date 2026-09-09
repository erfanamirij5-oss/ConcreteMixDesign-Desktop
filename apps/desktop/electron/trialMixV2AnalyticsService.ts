import { getDatabase } from './database';
import { ensureRuntimeMigrations } from './runtimeMigrations';

export type StrengthAnalyticsPoint = {
  resultId: string;
  specimenId: string;
  specimenCode: string;
  batchId: string;
  batchSequence: number;
  testedAt: string;
  testAgeDays: number;
  strengthMpa: number;
};

export type StrengthStatistics = {
  count: number;
  minimumMpa: number | null;
  maximumMpa: number | null;
  meanMpa: number | null;
  populationStandardDeviationMpa: number | null;
  sampleStandardDeviationMpa: number | null;
  sampleCoefficientOfVariationPercent: number | null;
};

export type StrengthAgeGroup = StrengthStatistics & {
  testAgeDays: number;
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

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function statistics(values: number[]): StrengthStatistics {
  if (values.length === 0) {
    return {
      count: 0,
      minimumMpa: null,
      maximumMpa: null,
      meanMpa: null,
      populationStandardDeviationMpa: null,
      sampleStandardDeviationMpa: null,
      sampleCoefficientOfVariationPercent: null
    };
  }

  const count = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const squaredDeviationSum = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0);
  const populationSd = Math.sqrt(squaredDeviationSum / count);
  const sampleSd = count >= 2 ? Math.sqrt(squaredDeviationSum / (count - 1)) : null;
  const sampleCv = sampleSd != null && mean !== 0 ? (sampleSd / Math.abs(mean)) * 100 : null;

  return {
    count,
    minimumMpa: round(Math.min(...values)),
    maximumMpa: round(Math.max(...values)),
    meanMpa: round(mean),
    populationStandardDeviationMpa: round(populationSd),
    sampleStandardDeviationMpa: sampleSd == null ? null : round(sampleSd),
    sampleCoefficientOfVariationPercent: sampleCv == null ? null : round(sampleCv)
  };
}

export function getTrialSessionStrengthAnalytics(sessionIdInput: string) {
  const database = db();
  const sessionId = nonEmpty(sessionIdInput, 'شناسه Trial Session الزامی است.');
  const session = database.prepare(`
    SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber,
      session_code AS sessionCode, status
    FROM trial_mix_sessions
    WHERE id = ?
  `).get(sessionId) as {
    id: string;
    mixDesignId: string;
    revisionNumber: number;
    sessionCode: string;
    status: string;
  } | undefined;
  if (!session) throw new Error('Trial Session پیدا نشد.');

  const points = database.prepare(`
    SELECT
      r.id AS resultId,
      sp.id AS specimenId,
      sp.specimen_code AS specimenCode,
      tr.id AS batchId,
      sr.batch_sequence AS batchSequence,
      r.tested_at AS testedAt,
      r.test_age_days AS testAgeDays,
      r.strength_mpa AS strengthMpa
    FROM trial_mix_session_records sr
    JOIN trial_mix_records tr ON tr.id = sr.trial_mix_record_id
    JOIN trial_mix_specimens sp ON sp.trial_mix_record_id = tr.id
    JOIN trial_mix_compressive_strength_results r ON r.specimen_id = sp.id
    WHERE sr.session_id = ?
    ORDER BY r.test_age_days ASC, r.tested_at ASC, sr.batch_sequence ASC, sp.specimen_code ASC
  `).all(sessionId) as StrengthAnalyticsPoint[];

  const overall = statistics(points.map(point => Number(point.strengthMpa)));
  const grouped = new Map<number, number[]>();
  for (const point of points) {
    const age = Number(point.testAgeDays);
    const group = grouped.get(age) ?? [];
    group.push(Number(point.strengthMpa));
    grouped.set(age, group);
  }
  const byTestAge: StrengthAgeGroup[] = [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([testAgeDays, values]) => ({ testAgeDays, ...statistics(values) }));

  return {
    status: 'pass' as const,
    analytics: {
      session: {
        id: session.id,
        mixDesignId: session.mixDesignId,
        revisionNumber: session.revisionNumber,
        sessionCode: session.sessionCode,
        status: session.status
      },
      method: {
        version: 'trial-strength-descriptive-v1',
        populationStandardDeviation: 'sqrt(sum((x-mean)^2)/n)',
        sampleStandardDeviation: 'sqrt(sum((x-mean)^2)/(n-1)); available when n >= 2',
        sampleCoefficientOfVariationPercent: 'sampleStandardDeviation/abs(mean)*100; available when n >= 2 and mean != 0',
        acceptanceCriteriaApplied: false
      },
      overall,
      byTestAge,
      points
    }
  };
}
