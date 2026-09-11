export type RequirementResolution = 'minimum' | 'maximum' | 'exact' | 'descriptive';

export type EngineeringRequirement = {
  key: string;
  domain: 'project' | 'exposure' | 'strength' | 'workability' | 'placement' | 'temperature' | 'profile';
  resolution: RequirementResolution;
  numericValue?: number | null;
  textValue?: string | null;
  unit?: string | null;
  sourceKind: 'project_specification' | 'standard_profile' | 'client' | 'consultant' | 'laboratory' | 'engineer' | 'other';
  sourceReference: string;
  evidenceId?: string | null;
  note?: string | null;
};

export type RequirementResolutionRow = {
  key: string;
  unit: string | null;
  resolution: RequirementResolution;
  value: number | string | null;
  sourceRequirementIndexes: number[];
  conflict: boolean;
  conflictReason: string | null;
};

function required(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`);
}

function validate(requirement: EngineeringRequirement, index: number) {
  required(requirement.key, `requirements[${index}].key`);
  required(requirement.domain, `requirements[${index}].domain`);
  required(requirement.resolution, `requirements[${index}].resolution`);
  required(requirement.sourceKind, `requirements[${index}].sourceKind`);
  required(requirement.sourceReference, `requirements[${index}].sourceReference`);
  const hasNumber = typeof requirement.numericValue === 'number' && Number.isFinite(requirement.numericValue);
  const hasText = typeof requirement.textValue === 'string' && Boolean(requirement.textValue.trim());
  if (hasNumber === hasText) throw new Error(`requirements[${index}] must define exactly one value.`);
  if (hasNumber && requirement.resolution === 'descriptive') throw new Error(`requirements[${index}] numeric requirement cannot be descriptive.`);
  if (hasText && !['exact', 'descriptive'].includes(requirement.resolution)) throw new Error(`requirements[${index}] text requirement must be exact or descriptive.`);
}

export function resolveEngineeringRequirements(requirements: EngineeringRequirement[]) {
  if (!requirements.length) throw new Error('At least one engineering requirement is required.');
  requirements.forEach(validate);
  const groups = new Map<string, Array<{ requirement: EngineeringRequirement; index: number }>>();
  requirements.forEach((requirement, index) => {
    const key = `${requirement.key.trim()}\u0000${requirement.unit?.trim() || ''}\u0000${requirement.resolution}`;
    const group = groups.get(key) ?? [];
    group.push({ requirement, index });
    groups.set(key, group);
  });

  const rows: RequirementResolutionRow[] = [];
  for (const items of groups.values()) {
    const first = items[0].requirement;
    const indexes = items.map(item => item.index);
    const numeric = items.every(item => typeof item.requirement.numericValue === 'number' && Number.isFinite(item.requirement.numericValue));
    if (numeric) {
      const values = items.map(item => Number(item.requirement.numericValue));
      let value: number | null = null;
      let conflict = false;
      if (first.resolution === 'minimum') value = Math.max(...values);
      if (first.resolution === 'maximum') value = Math.min(...values);
      if (first.resolution === 'exact') {
        value = values[0];
        conflict = values.some(candidate => candidate !== value);
      }
      rows.push({ key: first.key.trim(), unit: first.unit?.trim() || null, resolution: first.resolution, value, sourceRequirementIndexes: indexes, conflict, conflictReason: conflict ? 'Conflicting exact numeric requirements.' : null });
      continue;
    }
    const values = items.map(item => item.requirement.textValue?.trim() || '');
    const unique = [...new Set(values)];
    const conflict = first.resolution === 'exact' && unique.length > 1;
    rows.push({ key: first.key.trim(), unit: first.unit?.trim() || null, resolution: first.resolution, value: first.resolution === 'descriptive' ? unique.join(' | ') : unique[0] || null, sourceRequirementIndexes: indexes, conflict, conflictReason: conflict ? 'Conflicting exact text requirements.' : null });
  }
  rows.sort((a, b) => `${a.key}|${a.unit ?? ''}|${a.resolution}`.localeCompare(`${b.key}|${b.unit ?? ''}|${b.resolution}`));
  return { method: { version: 'requirement-resolution-v1', silentOverrideApplied: false, standardsAcceptanceInferred: false }, rows, conflicts: rows.filter(row => row.conflict) };
}
