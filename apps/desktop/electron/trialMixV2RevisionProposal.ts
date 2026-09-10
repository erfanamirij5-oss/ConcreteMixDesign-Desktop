export type RevisionProposalMetric = {
  key: string;
  unit: string;
  currentValue: number;
  proposedValue: number;
  delta: number;
  sourceIds: string[];
  rationale: string;
};

export type TrialRevisionProposal = {
  method: {
    version: 'trial-revision-proposal-v1';
    scope: 'explicit reviewable proposal only';
    automaticMixMutationApplied: false;
    acceptanceCriteriaApplied: false;
  };
  source: {
    trialSessionId: string;
    mixDesignId: string;
    revisionNumber: number;
    evidenceIds: string[];
  };
  metrics: RevisionProposalMetric[];
  warnings: string[];
};

function finite(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${field} must be a finite number.`);
  return value;
}

function nonEmpty(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

export function createTrialRevisionProposal(input: {
  trialSessionId: string;
  mixDesignId: string;
  revisionNumber: number;
  evidenceIds: string[];
  metrics: Array<Omit<RevisionProposalMetric, 'delta'>>;
  warnings?: string[];
}): TrialRevisionProposal {
  const revisionNumber = finite(input.revisionNumber, 'revisionNumber');
  if (!Number.isInteger(revisionNumber) || revisionNumber < 1) throw new Error('revisionNumber must be a positive integer.');
  if (!Array.isArray(input.metrics) || input.metrics.length === 0) throw new Error('At least one proposed metric is required.');

  const evidenceIds = [...new Set((input.evidenceIds ?? []).map(id => nonEmpty(id, 'evidenceId')))];
  const metrics = input.metrics.map(item => {
    const currentValue = finite(item.currentValue, `${item.key}.currentValue`);
    const proposedValue = finite(item.proposedValue, `${item.key}.proposedValue`);
    return {
      key: nonEmpty(item.key, 'metric.key'),
      unit: nonEmpty(item.unit, 'metric.unit'),
      currentValue,
      proposedValue,
      delta: proposedValue - currentValue,
      sourceIds: [...new Set((item.sourceIds ?? []).map(id => nonEmpty(id, 'metric.sourceId'))) ],
      rationale: nonEmpty(item.rationale, 'metric.rationale')
    };
  });

  return {
    method: {
      version: 'trial-revision-proposal-v1',
      scope: 'explicit reviewable proposal only',
      automaticMixMutationApplied: false,
      acceptanceCriteriaApplied: false
    },
    source: {
      trialSessionId: nonEmpty(input.trialSessionId, 'trialSessionId'),
      mixDesignId: nonEmpty(input.mixDesignId, 'mixDesignId'),
      revisionNumber,
      evidenceIds
    },
    metrics,
    warnings: [...new Set((input.warnings ?? []).map(warning => nonEmpty(warning, 'warning')))]
  };
}
