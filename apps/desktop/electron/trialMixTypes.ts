export type TrialMaterialRole =
  | 'cement'
  | 'scm'
  | 'water'
  | 'fine_aggregate'
  | 'coarse_aggregate'
  | 'admixture'
  | 'fiber'
  | 'other';

export type TrialEvaluationOutcome = 'pending' | 'pass' | 'needs_adjustment' | 'fail';

export type TrialBatchComponent = {
  id: string;
  trialMixRecordId: string;
  materialRole: TrialMaterialRole;
  materialSnapshotId?: string | null;
  materialNameSnapshot?: string | null;
  designedMassKg?: number | null;
  actualMassKg?: number | null;
  designedDosage?: number | null;
  actualDosage?: number | null;
  dosageUnit?: string | null;
};

export type TrialTargets = {
  trialMixRecordId: string;
  targetSlumpMm?: number | null;
  targetAirContentPercent?: number | null;
  targetFreshDensityKgM3?: number | null;
  targetStrength7dMpa?: number | null;
  targetStrength28dMpa?: number | null;
};

export type TrialStrengthSpecimen = {
  id: string;
  trialMixRecordId: string;
  ageDays: number;
  specimenLabel?: string | null;
  specimenType?: string | null;
  measuredStrengthMpa?: number | null;
  testedAt?: string | null;
  notes?: string | null;
};

export type TrialEvaluation = {
  trialMixRecordId: string;
  outcome: TrialEvaluationOutcome;
  slumpDeviationMm?: number | null;
  airDeviationPercent?: number | null;
  freshDensityDeviationKgM3?: number | null;
  strength7dDeviationMpa?: number | null;
  strength28dDeviationMpa?: number | null;
  interpretation?: string | null;
  evaluatedBy?: string | null;
  evaluatedAt?: string | null;
};

export type TrialMixV2Snapshot = {
  trialMixRecordId: string;
  revisionNumber: number;
  components: TrialBatchComponent[];
  targets?: TrialTargets | null;
  specimens: TrialStrengthSpecimen[];
  evaluation?: TrialEvaluation | null;
};
