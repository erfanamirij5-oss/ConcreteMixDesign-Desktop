import { resolveStandardProfileChain, type StandardProfile } from './standardProfile.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const profiles: StandardProfile[] = [
  {
    profileId: 'aci-base',
    profileVersion: '1.0.0',
    displayName: 'ACI Base',
    scope: 'authoritative_standard',
    applicability: { concreteTypes: ['normal_weight'], jurisdictions: [] },
    references: [{ authority: 'ACI', designation: 'PROFILE-CONTRACT-ONLY', edition: 'UNVERIFIED-NO-RULES', title: 'Architecture placeholder only; contains no engineering rule' }],
    overrides: [],
  },
  {
    profileId: 'regional-yazd-example',
    profileVersion: '1.0.0',
    displayName: 'Regional Example',
    scope: 'regional_profile',
    applicability: { concreteTypes: ['normal_weight'], jurisdictions: ['Yazd'] },
    references: [],
    parentProfileId: 'aci-base',
    parentProfileVersion: '1.0.0',
    overrides: [{ key: 'documentation.local_note_required', value: true, provenance: 'regional_requirement', reason: 'Contract smoke only; not an engineering acceptance rule.' }],
  },
  {
    profileId: 'company-example',
    profileVersion: '1.0.0',
    displayName: 'Company Example',
    scope: 'company_profile',
    applicability: { concreteTypes: ['normal_weight'], jurisdictions: ['Yazd'] },
    references: [],
    parentProfileId: 'regional-yazd-example',
    parentProfileVersion: '1.0.0',
    overrides: [{ key: 'workflow.internal_review_required', value: true, provenance: 'company_policy', reason: 'Contract smoke only; company workflow policy.' }],
  },
];

const resolved = resolveStandardProfileChain(profiles, 'company-example', '1.0.0');
assert(resolved.chain.length === 3, 'expected authoritative -> regional -> company chain');
assert(resolved.chain[0]?.profileId === 'aci-base', 'expected authoritative profile first');
assert(resolved.chain[2]?.profileId === 'company-example', 'expected target profile last');
assert(resolved.applicability.jurisdictions.includes('Yazd'), 'target applicability was not preserved');
assert(resolved.effectiveOverrides['documentation.local_note_required']?.provenance === 'regional_requirement', 'regional provenance lost');
assert(resolved.effectiveOverrides['workflow.internal_review_required']?.provenance === 'company_policy', 'company provenance lost');

let cycleDetected = false;
try {
  resolveStandardProfileChain([
    { ...profiles[1], profileId: 'a', parentProfileId: 'b', parentProfileVersion: '1.0.0' },
    { ...profiles[1], profileId: 'b', parentProfileId: 'a', parentProfileVersion: '1.0.0' },
  ], 'a', '1.0.0');
} catch (error) {
  cycleDetected = error instanceof Error && error.message.includes('cycle detected');
}
assert(cycleDetected, 'profile cycles must be rejected');

let duplicateRejected = false;
try {
  resolveStandardProfileChain([profiles[0], { ...profiles[0] }], 'aci-base', '1.0.0');
} catch (error) {
  duplicateRejected = error instanceof Error && error.message.includes('duplicate standard profile identity');
}
assert(duplicateRejected, 'duplicate profile identity must fail closed instead of silently replacing registry entries');

console.log('G01 standard profile contract smoke passed: applicability, provenance, cycle and identity conflict checks are deterministic.');
