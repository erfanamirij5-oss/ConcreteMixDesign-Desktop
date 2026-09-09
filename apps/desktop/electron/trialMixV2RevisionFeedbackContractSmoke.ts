import {
  assertRevisionFeedbackSourceIdentity,
  buildRevisionFeedbackMethod
} from './trialMixV2RevisionFeedbackService';

const reference = {
  id: 'session-1',
  mixDesignId: 'mix-1',
  revisionNumber: 3
};

assertRevisionFeedbackSourceIdentity(reference, reference, reference);

let mismatchRejected = false;
try {
  assertRevisionFeedbackSourceIdentity(
    reference,
    { ...reference, revisionNumber: 2 },
    reference
  );
} catch (error) {
  mismatchRejected = String(error).includes('Revision Feedback source identity mismatch detected.');
}
if (!mismatchRejected) {
  throw new Error('Revision Feedback source identity mismatch was not rejected.');
}

const sourceMethods = [
  'trial-calibration-comparison-v1',
  'trial-moisture-correction-v1',
  'trial-strength-descriptive-v1'
];
const method = buildRevisionFeedbackMethod(sourceMethods);

if (method.version !== 'trial-revision-feedback-v1') {
  throw new Error(`Unexpected Revision Feedback method version: ${method.version}`);
}
if (method.scope !== 'traceable factual aggregation only') {
  throw new Error(`Unexpected Revision Feedback scope: ${method.scope}`);
}
if (method.recommendationEngineApplied !== false) {
  throw new Error('Revision Feedback contract must not apply a recommendation engine.');
}
if (method.automaticMixMutationApplied !== false) {
  throw new Error('Revision Feedback contract must not automatically mutate mix designs.');
}
if (method.acceptanceCriteriaApplied !== false) {
  throw new Error('Revision Feedback contract must not apply acceptance criteria.');
}
if (method.sourceMethods.length !== sourceMethods.length || method.sourceMethods.some((value, index) => value !== sourceMethods[index])) {
  throw new Error('Revision Feedback source method traceability was not preserved.');
}

sourceMethods[0] = 'mutated-after-build';
if (method.sourceMethods[0] !== 'trial-calibration-comparison-v1') {
  throw new Error('Revision Feedback method must snapshot source method traceability.');
}

console.log('Trial Mix v2 Revision Feedback contract smoke passed: identity guard and read-only policy are enforced.');
