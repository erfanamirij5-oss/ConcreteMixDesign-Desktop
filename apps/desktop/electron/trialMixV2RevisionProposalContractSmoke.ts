import assert from 'node:assert/strict';
import { createTrialRevisionProposal } from './trialMixV2RevisionProposal';
import { assertControlledRevisionApplication, assertProposalEvidenceTraceable, collectRevisionFeedbackEvidenceIds } from './trialMixV2RevisionProposalService';

const evidenceIds = collectRevisionFeedbackEvidenceIds({
  observations: [
    { code: 'calibration.water', category: 'calibration', severity: 'info', message: 'water delta', sourceIds: ['trial-record-1', 'water-actual-1'] },
    { code: 'strength.results_available', category: 'strength', severity: 'info', message: 'strength', sourceIds: ['strength-result-1'] }
  ],
  calibrationDesignResultId: 'design-result-1',
  moistureDesignResultId: 'design-result-1'
});
assert.deepEqual(evidenceIds, ['design-result-1', 'strength-result-1', 'trial-record-1', 'water-actual-1']);

const metrics = [{
  key: 'water_content',
  unit: 'kg/m3',
  currentValue: 180,
  proposedValue: 175,
  sourceIds: ['trial-record-1', 'water-actual-1'],
  rationale: 'Engineer-reviewed adjustment based on completed trial evidence.'
}];
assert.doesNotThrow(() => assertProposalEvidenceTraceable(metrics, evidenceIds));
assert.throws(() => assertProposalEvidenceTraceable([{ ...metrics[0], sourceIds: ['unknown-evidence'] }], evidenceIds), /outside the Trial Revision Feedback package/);
assert.throws(() => assertProposalEvidenceTraceable([{ ...metrics[0], sourceIds: [] }], evidenceIds), /at least one Trial\/Lab evidence source/);

const proposal = createTrialRevisionProposal({
  trialSessionId: 'session-1',
  mixDesignId: 'mix-1',
  revisionNumber: 4,
  evidenceIds,
  metrics
});
assert.equal(proposal.metrics[0].delta, -5);
assert.equal(proposal.method.automaticMixMutationApplied, false);
assert.equal(proposal.method.acceptanceCriteriaApplied, false);

assert.doesNotThrow(() => assertControlledRevisionApplication({
  proposal,
  currentMixDesignId: 'mix-1',
  currentRevisionNumber: 4,
  trialSessionStatus: 'completed'
}));
assert.throws(() => assertControlledRevisionApplication({ proposal, currentMixDesignId: 'mix-1', currentRevisionNumber: 5, trialSessionStatus: 'completed' }), /stale/);
assert.throws(() => assertControlledRevisionApplication({ proposal, currentMixDesignId: 'mix-2', currentRevisionNumber: 4, trialSessionStatus: 'completed' }), /identity mismatch/);
assert.throws(() => assertControlledRevisionApplication({ proposal, currentMixDesignId: 'mix-1', currentRevisionNumber: 4, trialSessionStatus: 'in_progress' }), /completed Trial Session/);

console.log('G04 Trial Revision Proposal controlled-application contract smoke passed.');
