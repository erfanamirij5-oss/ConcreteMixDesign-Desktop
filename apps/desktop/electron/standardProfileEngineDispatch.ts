import { resolveStandardProfileChain, type StandardProfile } from './standardProfile';

export const LEGACY_V11_ENGINE_STANDARD_IDS = [
  'ACI_PRC_211_1_22','ACI_CODE_318_25','ACI_301','ASTM_C150','ASTM_C595','ASTM_C1157','ASTM_C618','ASTM_C989','ASTM_C1240','ASTM_C1012','ASTM_C1260','ASTM_C1293','ASTM_C1567','ASTM_C1778','ASTM_C494','ASTM_C260','ASTM_C1602','ASTM_C1603','ASTM_C1218','ASTM_C29','ASTM_C33','ASTM_C117','ASTM_C127','ASTM_C128','ASTM_C136','ASTM_C131','ASTM_C535','ASTM_C88','ASTM_C142','ASTM_C123','ASTM_D4791','ASTM_D5821',
] as const;

export const LEGACY_V11_PROFILE: StandardProfile = {
  profileId: 'tolou-aci-astm-legacy',
  profileVersion: '1.1.0-compat',
  displayName: 'Tolou v1.1 ACI/ASTM compatibility profile',
  scope: 'authoritative_standard',
  applicability: { concreteTypes: ['normal_weight', 'pumped'], jurisdictions: [] },
  references: [
    { authority: 'ACI', designation: 'PRC-211.1', edition: '2022', title: 'Selecting Proportions for Normal-Density and High-Density Concrete' },
    { authority: 'ACI', designation: 'CODE-318', edition: '2025', title: 'Building Code Requirements for Structural Concrete' },
  ],
  overrides: [],
};

export type EngineStandardProfileEnvelope = {
  profile_id: string;
  profile_version: string;
  display_name: string;
  scope: StandardProfile['scope'];
  applicability: { concrete_types: readonly string[]; jurisdictions: readonly string[]; effective_from?: string | null; effective_to?: string | null };
  chain: ReadonlyArray<{ profile_id: string; profile_version: string; scope: StandardProfile['scope'] }>;
  references: ReadonlyArray<{ authority: string; designation: string; edition: string }>;
  selection_source: 'v1.1_legacy_compatibility_mapping';
};

export function prepareEnginePayloadForCommand(command: string, payload?: unknown): unknown {
  if (command !== 'calculate-normal-mix') return payload;
  const input = isPlainRecord(payload) ? payload : {};
  const resolved = resolveStandardProfileChain([LEGACY_V11_PROFILE], LEGACY_V11_PROFILE.profileId, LEGACY_V11_PROFILE.profileVersion);
  const standardProfile: EngineStandardProfileEnvelope = {
    profile_id: resolved.profileId,
    profile_version: resolved.profileVersion,
    display_name: resolved.displayName,
    scope: resolved.scope,
    applicability: {
      concrete_types: [...resolved.applicability.concreteTypes],
      jurisdictions: [...resolved.applicability.jurisdictions],
      effective_from: resolved.applicability.effectiveFrom ?? null,
      effective_to: resolved.applicability.effectiveTo ?? null,
    },
    chain: resolved.chain.map(item => ({ profile_id: item.profileId, profile_version: item.profileVersion, scope: item.scope })),
    references: resolved.references.map(reference => ({ authority: reference.authority, designation: reference.designation, edition: reference.edition })),
    selection_source: 'v1.1_legacy_compatibility_mapping',
  };
  return { ...input, standards: [...LEGACY_V11_ENGINE_STANDARD_IDS], standard_profile: standardProfile };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
