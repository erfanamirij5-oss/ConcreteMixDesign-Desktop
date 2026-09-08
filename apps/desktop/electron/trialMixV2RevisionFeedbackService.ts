import { getTrialSessionStrengthAnalytics } from './trialMixV2AnalyticsService';
import { getTrialSessionCalibrationComparison } from './trialMixV2CalibrationService';
import { getTrialSessionMoistureCorrection } from './trialMixV2MoistureCorrectionService';

export type RevisionFeedbackObservation = {
  code: string;
  category: 'calibration' | 'moisture' | 'strength' | 'completeness';
  severity: 'info' | 'warning';
  message: string;
  sourceIds: string[];
};

export function getTrialSessionRevisionFeedback(sessionIdInput: string) {
  const sessionId = String(sessionIdInput ?? '').trim();
  if (!sessionId) throw new Error('شناسه Trial Session الزامی است.');

  const calibrationResult = getTrialSessionCalibrationComparison(sessionId);
  const moistureResult = getTrialSessionMoistureCorrection(sessionId);
  const analyticsResult = getTrialSessionStrengthAnalytics(sessionId);

  const calibration = calibrationResult.calibration;
  const moisture = moistureResult.moistureCorrection;
  const analytics = analyticsResult.analytics;

  if (
    calibration.session.id !== moisture.session.id ||
    calibration.session.id !== analytics.session.id ||
    calibration.session.mixDesignId !== moisture.session.mixDesignId ||
    calibration.session.mixDesignId !== analytics.session.mixDesignId ||
    calibration.session.revisionNumber !== moisture.session.revisionNumber ||
    calibration.session.revisionNumber !== analytics.session.revisionNumber
  ) {
    throw new Error('Revision Feedback source identity mismatch detected.');
  }

  const observations: RevisionFeedbackObservation[] = [];
  for (const batch of calibration.batches) {
    for (const item of batch.metrics) {
      if (item.interpretation === 'not_comparable') {
        observations.push({
          code: `calibration.${item.metric}.not_comparable`,
          category: 'completeness',
          severity: 'warning',
          message: `Batch ${batch.batchSequence}: ${item.metric} قابل مقایسه نیست.`,
          sourceIds: [batch.traceability.trialMixRecordId, ...batch.traceability.materialActualIds]
        });
      } else if (item.interpretation !== 'matches_design') {
        observations.push({
          code: `calibration.${item.metric}.${item.interpretation}`,
          category: 'calibration',
          severity: 'info',
          message: `Batch ${batch.batchSequence}: ${item.metric} نسبت به طراحی ${item.interpretation === 'actual_above_design' ? 'بالاتر' : 'پایین‌تر'} است.`,
          sourceIds: [batch.traceability.trialMixRecordId, ...batch.traceability.materialActualIds]
        });
      }
    }
  }

  for (const batch of moisture.batches) {
    if (!batch.comparable) {
      observations.push({
        code: 'moisture.incomplete_inputs',
        category: 'completeness',
        severity: 'warning',
        message: `Batch ${batch.batchSequence}: ورودی‌های Moisture Correction کامل نیستند.`,
        sourceIds: batch.aggregates.map(item => item.id)
      });
    } else {
      observations.push({
        code: 'moisture.correction_available',
        category: 'moisture',
        severity: 'info',
        message: `Batch ${batch.batchSequence}: Moisture Correction قابل محاسبه است.`,
        sourceIds: batch.aggregates.map(item => item.id)
      });
    }
  }

  if (analytics.points.length === 0) {
    observations.push({
      code: 'strength.no_results',
      category: 'completeness',
      severity: 'warning',
      message: 'هیچ نتیجه مقاومت فشاری برای این Session ثبت نشده است.',
      sourceIds: []
    });
  } else {
    observations.push({
      code: 'strength.results_available',
      category: 'strength',
      severity: 'info',
      message: `${analytics.points.length} نتیجه مقاومت فشاری در feedback package موجود است.`,
      sourceIds: analytics.points.map(point => point.resultId)
    });
  }

  const completeness = {
    calibrationComparableBatchCount: calibration.batches.filter(batch => batch.metrics.every(metric => metric.interpretation !== 'not_comparable')).length,
    calibrationBatchCount: calibration.batches.length,
    moistureComparableBatchCount: moisture.batches.filter(batch => batch.comparable).length,
    moistureBatchCount: moisture.batches.length,
    strengthResultCount: analytics.points.length,
    hasStrengthResults: analytics.points.length > 0
  };

  return {
    status: 'pass' as const,
    feedback: {
      method: {
        version: 'trial-revision-feedback-v1',
        scope: 'traceable factual aggregation only',
        recommendationEngineApplied: false,
        automaticMixMutationApplied: false,
        acceptanceCriteriaApplied: false,
        sourceMethods: [
          calibration.method.version,
          moisture.method.version,
          analytics.method.version
        ]
      },
      session: calibration.session,
      sourceIdentity: {
        calibrationDesignResultId: calibration.design.resultId,
        moistureDesignResultId: moisture.design.resultId,
        sameDesignResult: calibration.design.resultId === moisture.design.resultId
      },
      completeness,
      observations,
      calibration,
      moistureCorrection: moisture,
      strengthAnalytics: analytics
    }
  };
}
