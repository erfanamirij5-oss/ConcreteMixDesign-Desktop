import { createNewMixDesignRevision, getMixDesignManagementRecord } from './mixDesignRevisionStore';
import { createTrialRevisionProposal, type RevisionProposalMetric, type TrialRevisionProposal } from './trialMixV2RevisionProposal';
import { getTrialSessionRevisionFeedback, type RevisionFeedbackObservation } from './trialMixV2RevisionFeedbackService';

export type BuildTrialRevisionProposalInput = {
  trialSessionId: string;
  metrics: Array<Omit<RevisionProposalMetric, 'delta'>>;
  warnings?: string[];
};

export type ApplyTrialRevisionProposalInput = {
  proposal: TrialRevisionProposal;
  changeReason: string;
  actorName?: string;
};

function nonEmpty(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

export function collectRevisionFeedbackEvidenceIds(input: {
  observations: RevisionFeedbackObservation[];
  calibrationDesignResultId?: string | null;
  moistureDesignResultId?: string | null;
}) {
  const ids = new Set<string>();
  for (const observation of input.observations ?? []) {
    for (const id of observation.sourceIds ?? []) if (typeof id === 'string' && id.trim()) ids.add(id.trim());
  }
  for (const id of [input.calibrationDesignResultId, input.moistureDesignResultId]) {
    if (typeof id === 'string' && id.trim()) ids.add(id.trim());
  }
  return [...ids].sort();
}

export function assertProposalEvidenceTraceable(metrics: Array<Omit<RevisionProposalMetric, 'delta'>>, evidenceIds: string[]) {
  const evidence = new Set(evidenceIds);
  for (const metric of metrics) {
    if (!Array.isArray(metric.sourceIds) || metric.sourceIds.length === 0) {
      throw new Error(`Proposal metric ${metric.key} must reference at least one Trial/Lab evidence source.`);
    }
    for (const sourceId of metric.sourceIds) {
      if (!evidence.has(sourceId)) throw new Error(`Proposal metric ${metric.key} references evidence outside the Trial Revision Feedback package: ${sourceId}`);
    }
  }
}

export function assertProposalMatchesFeedbackSnapshot(input: {
  proposal: TrialRevisionProposal;
  feedbackSession: { id: string; mixDesignId: string; revisionNumber: number };
  evidenceIds: string[];
}) {
  const { proposal, feedbackSession } = input;
  if (proposal.source.trialSessionId !== feedbackSession.id) throw new Error('Revision Proposal Trial Session identity mismatch.');
  if (proposal.source.mixDesignId !== feedbackSession.mixDesignId) throw new Error('Revision Proposal feedback mix design identity mismatch.');
  if (proposal.source.revisionNumber !== Number(feedbackSession.revisionNumber)) throw new Error('Revision Proposal feedback revision identity mismatch.');
  assertProposalEvidenceTraceable(proposal.metrics, input.evidenceIds);
  const proposedEvidence = [...new Set(proposal.source.evidenceIds)].sort();
  const currentEvidence = [...new Set(input.evidenceIds)].sort();
  if (proposedEvidence.length !== currentEvidence.length || proposedEvidence.some((id, index) => id !== currentEvidence[index])) {
    throw new Error('Revision Proposal evidence snapshot is stale or has been altered.');
  }
}

export function assertControlledRevisionApplication(input: {
  proposal: TrialRevisionProposal;
  currentMixDesignId: string;
  currentRevisionNumber: number;
  trialSessionStatus: string;
}) {
  if (input.proposal.source.mixDesignId !== input.currentMixDesignId) throw new Error('Revision Proposal mix design identity mismatch.');
  if (input.proposal.source.revisionNumber !== input.currentRevisionNumber) throw new Error('Revision Proposal is stale because the mix design revision has changed.');
  if (input.trialSessionStatus !== 'completed') throw new Error('Only a completed Trial Session can be used to create a controlled mix revision.');
  if (input.proposal.method.automaticMixMutationApplied !== false || input.proposal.method.acceptanceCriteriaApplied !== false) {
    throw new Error('Revision Proposal safety contract is invalid.');
  }
}

function feedbackEvidenceIds(feedback: ReturnType<typeof getTrialSessionRevisionFeedback>['feedback']) {
  return collectRevisionFeedbackEvidenceIds({
    observations: feedback.observations,
    calibrationDesignResultId: feedback.sourceIdentity.calibrationDesignResultId,
    moistureDesignResultId: feedback.sourceIdentity.moistureDesignResultId
  });
}

export function buildTrialRevisionProposalFromFeedback(input: BuildTrialRevisionProposalInput) {
  const sessionId = nonEmpty(input.trialSessionId, 'trialSessionId');
  const feedback = getTrialSessionRevisionFeedback(sessionId).feedback;
  if (feedback.session.status !== 'completed') throw new Error('Revision Proposal requires a completed Trial Session.');

  const evidenceIds = feedbackEvidenceIds(feedback);
  assertProposalEvidenceTraceable(input.metrics, evidenceIds);

  const warnings = [...(input.warnings ?? [])];
  if (!feedback.sourceIdentity.sameDesignResult) warnings.push('Calibration and moisture feedback resolved different design-result identities; engineering review is required.');
  if (feedback.observations.some(item => item.severity === 'warning')) warnings.push('Revision Feedback contains completeness warnings that require engineering review.');

  return {
    status: 'pass' as const,
    proposal: createTrialRevisionProposal({
      trialSessionId: feedback.session.id,
      mixDesignId: feedback.session.mixDesignId,
      revisionNumber: Number(feedback.session.revisionNumber),
      evidenceIds,
      metrics: input.metrics,
      warnings
    }),
    feedbackMethod: feedback.method.version
  };
}

export function applyTrialRevisionProposal(input: ApplyTrialRevisionProposalInput) {
  const reason = nonEmpty(input.changeReason, 'changeReason');
  const proposal = input.proposal;
  const feedback = getTrialSessionRevisionFeedback(proposal.source.trialSessionId).feedback;
  const evidenceIds = feedbackEvidenceIds(feedback);
  const current = getMixDesignManagementRecord(proposal.source.mixDesignId) as { mixDesignId: string; revisionNumber: number };

  assertProposalMatchesFeedbackSnapshot({
    proposal,
    feedbackSession: feedback.session,
    evidenceIds
  });
  assertControlledRevisionApplication({
    proposal,
    currentMixDesignId: current.mixDesignId,
    currentRevisionNumber: Number(current.revisionNumber),
    trialSessionStatus: feedback.session.status
  });

  const revision = createNewMixDesignRevision({
    mixDesignId: proposal.source.mixDesignId,
    changeReason: `Trial calibration proposal ${proposal.source.trialSessionId}: ${reason}`,
    actorName: input.actorName
  });

  return {
    status: 'pass' as const,
    revisionNumber: revision.revisionNumber,
    record: revision.record,
    appliedProposal: proposal,
    application: {
      sourceRevisionNumber: proposal.source.revisionNumber,
      newRevisionNumber: revision.revisionNumber,
      trialSessionId: proposal.source.trialSessionId,
      evidenceIds,
      automaticMetricMutationApplied: false as const,
      automaticApprovalApplied: false as const,
      standardsAcceptanceInferred: false as const
    }
  };
}
