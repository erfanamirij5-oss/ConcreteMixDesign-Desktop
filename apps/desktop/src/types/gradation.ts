export type SieveRow = {
  sieveSizeMm: number;
  label: string;
  percentPassing: number;
  standardMin: number | null;
  standardMax: number | null;
  status: 'pass' | 'low' | 'high' | 'not_checked';
};

export type AggregateBlendShare = {
  materialId: string;
  materialName: string;
  sharePercent: number;
};

export type AggregateGradationInput = {
  materialId: string;
  manualLimitOverride: boolean;
  manualBlendEnabled: boolean;
  blendShares: AggregateBlendShare[];
  rows: SieveRow[];
};

export type GradationSummary = {
  finenessModulus: number | null;
  passedCount: number;
  warningCount: number;
  recommendation: string;
  correctionHints: string[];
  manualNotes: string[];
};

export type SaveGradationResponse = {
  status: 'pass' | 'fail';
  summary?: GradationSummary;
  error?: string;
};
