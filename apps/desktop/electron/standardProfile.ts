export type StandardAuthority = 'ACI' | 'ASTM' | 'EN' | 'ISO' | 'ISIRI' | 'REGIONAL' | 'COMPANY';

export type StandardProfileScope = 'authoritative_standard' | 'regional_profile' | 'company_profile';

export type StandardReference = {
  authority: StandardAuthority;
  designation: string;
  edition: string;
  title?: string | null;
  jurisdiction?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  sourceUri?: string | null;
};

export type StandardProfileApplicability = {
  concreteTypes: readonly string[];
  jurisdictions: readonly string[];
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export type StandardProfileIdentity = {
  profileId: string;
  profileVersion: string;
  displayName: string;
  scope: StandardProfileScope;
  references: readonly StandardReference[];
  applicability: StandardProfileApplicability;
};

export type StandardProfileOverride = {
  key: string;
  value: unknown;
  provenance: 'regional_requirement' | 'company_policy';
  reason: string;
  sourceReference?: StandardReference | null;
};

export type StandardProfile = StandardProfileIdentity & {
  parentProfileId?: string | null;
  parentProfileVersion?: string | null;
  overrides: readonly StandardProfileOverride[];
};

export type ResolvedStandardProfile = StandardProfileIdentity & {
  chain: readonly { profileId: string; profileVersion: string; scope: StandardProfileScope }[];
  effectiveOverrides: Readonly<Record<string, StandardProfileOverride>>;
};

function standardProfileIdentityKey(profileId: string, profileVersion: string): string {
  return `${profileId}@${profileVersion}`;
}

export function validateStandardProfile(profile: StandardProfile): string[] {
  const errors: string[] = [];

  if (!profile.profileId.trim()) errors.push('profileId is required');
  if (!profile.profileVersion.trim()) errors.push('profileVersion is required');
  if (!profile.displayName.trim()) errors.push('displayName is required');
  if (!profile.applicability) errors.push('applicability is required');
  if (profile.applicability?.effectiveFrom && profile.applicability?.effectiveTo && profile.applicability.effectiveFrom > profile.applicability.effectiveTo) {
    errors.push('applicability effectiveFrom must not be after effectiveTo');
  }

  if (profile.scope === 'authoritative_standard' && profile.overrides.length > 0) {
    errors.push('authoritative standard profiles cannot contain regional/company overrides');
  }

  const seen = new Set<string>();
  for (const override of profile.overrides) {
    if (!override.key.trim()) errors.push('override key is required');
    if (!override.reason.trim()) errors.push(`override reason is required for ${override.key || '<empty>'}`);
    if (seen.has(override.key)) errors.push(`duplicate override key: ${override.key}`);
    seen.add(override.key);

    if (profile.scope === 'regional_profile' && override.provenance !== 'regional_requirement') {
      errors.push(`regional profile override ${override.key} must use regional_requirement provenance`);
    }
    if (profile.scope === 'company_profile' && override.provenance !== 'company_policy') {
      errors.push(`company profile override ${override.key} must use company_policy provenance`);
    }
  }

  return errors;
}

export function resolveStandardProfileChain(profiles: readonly StandardProfile[], targetProfileId: string, targetProfileVersion: string): ResolvedStandardProfile {
  const byIdentity: Map<string, StandardProfile> = new Map<string, StandardProfile>();
  for (const profile of profiles) {
    const key = standardProfileIdentityKey(profile.profileId, profile.profileVersion);
    if (byIdentity.has(key)) throw new Error(`duplicate standard profile identity: ${key}`);
    byIdentity.set(key, profile);
  }

  const targetKey: string = standardProfileIdentityKey(targetProfileId, targetProfileVersion);
  const target = byIdentity.get(targetKey);
  if (!target) throw new Error(`standard profile not found: ${targetKey}`);

  const chain: StandardProfile[] = [];
  const visited = new Set<string>();
  let current: StandardProfile | undefined = target;

  while (current) {
    const currentKey: string = standardProfileIdentityKey(current.profileId, current.profileVersion);
    if (visited.has(currentKey)) throw new Error(`standard profile cycle detected at ${currentKey}`);
    visited.add(currentKey);

    const validationErrors = validateStandardProfile(current);
    if (validationErrors.length > 0) throw new Error(`invalid standard profile ${currentKey}: ${validationErrors.join('; ')}`);

    chain.unshift(current);

    if (!current.parentProfileId && !current.parentProfileVersion) break;
    if (!current.parentProfileId || !current.parentProfileVersion) {
      throw new Error(`incomplete parent identity for ${currentKey}`);
    }

    const parentKey: string = standardProfileIdentityKey(current.parentProfileId, current.parentProfileVersion);
    const parent = byIdentity.get(parentKey);
    if (!parent) throw new Error(`parent standard profile not found: ${parentKey}`);
    if (current.scope === 'regional_profile' && parent.scope !== 'authoritative_standard') {
      throw new Error(`regional profile ${currentKey} must inherit from an authoritative standard profile`);
    }
    if (current.scope === 'company_profile' && parent.scope === 'company_profile') {
      throw new Error(`company profile ${currentKey} cannot hide policy behind another company profile`);
    }
    current = parent;
  }

  const effectiveOverrides: Record<string, StandardProfileOverride> = {};
  for (const profile of chain) {
    for (const override of profile.overrides) effectiveOverrides[override.key] = override;
  }

  return {
    profileId: target.profileId,
    profileVersion: target.profileVersion,
    displayName: target.displayName,
    scope: target.scope,
    references: target.references,
    applicability: target.applicability,
    chain: chain.map((profile) => ({ profileId: profile.profileId, profileVersion: profile.profileVersion, scope: profile.scope })),
    effectiveOverrides,
  };
}
