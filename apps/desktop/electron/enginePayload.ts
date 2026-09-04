import { getDatabase } from './database';

type MixDesignEngineRow = {
  mixDesignId: string;
  concreteType: string;
  targetStrengthMpa: number;
  requiredSlumpMm: number;
  maxAggregateSizeMm: number;
  exposureSummary: string | null;
  projectName: string;
  city: string | null;
  locationDescription: string | null;
  structureType: string | null;
  elementType: string | null;
  clientName: string | null;
  contractorName: string | null;
  consultantName: string | null;
  labName: string | null;
  labLicenseNumber: string | null;
  labAddress: string | null;
  labPhone: string | null;
  designerName: string | null;
  designerRole: string | null;
  designerLicenseNumber: string | null;
  designerPhone: string | null;
  designerEmail: string | null;
};

type AggregateEngineRow = {
  id: string;
  name: string;
  material_type: string;
  aggregate_role: string | null;
  nominal_size_mm: number | null;
  specific_gravity: number | null;
  absorption_percent: number | null;
  moisture_percent: number | null;
  unit_weight_kg_m3: number | null;
  source: string | null;
  fineness_modulus?: number | null;
};

type BlendEngineRow = { material_id: string; material_name: string; share_percent: number; };
type SievePassingRow = { sieveSizeMm: number; percentPassing: number; };
type DurabilityEngineRow = {
  freeze_thaw_exposure: number;
  freeze_water_exposure: string;
  soil_water_soluble_sulfate_percent: number | null;
  water_dissolved_sulfate_ppm: number | null;
  seawater_exposure: number;
  water_contact: number;
  low_permeability_required: number;
  moisture_exposure: number;
  external_chloride_exposure: number;
  reinforced_or_embedded_metal: number;
  prestressed_concrete: number;
};

const FM_SIEVES_MM = [4.75, 2.36, 1.18, 0.6, 0.3, 0.15];

export function buildNormalMixPayload(mixDesignId: string) {
  if (!mixDesignId.trim()) throw new Error('شناسه طرح اختلاط برای محاسبه الزامی است.');

  const database = getDatabase();
  const mix = database.prepare(`
    SELECT
      md.id AS mixDesignId, md.concrete_type AS concreteType,
      md.target_strength_mpa AS targetStrengthMpa, md.required_slump_mm AS requiredSlumpMm,
      md.max_aggregate_size_mm AS maxAggregateSizeMm, md.exposure_summary AS exposureSummary,
      p.project_name AS projectName, p.city AS city, p.location_description AS locationDescription,
      p.structure_type AS structureType, p.element_type AS elementType,
      p.client_name AS clientName, p.contractor_name AS contractorName, p.consultant_name AS consultantName,
      l.lab_name AS labName, l.license_number AS labLicenseNumber, l.address AS labAddress, l.phone AS labPhone,
      d.full_name AS designerName, d.role AS designerRole,
      d.license_or_membership_number AS designerLicenseNumber, d.phone AS designerPhone, d.email AS designerEmail
    FROM mix_designs md
    INNER JOIN projects p ON p.id = md.project_id
    LEFT JOIN laboratories l ON l.id = md.laboratory_id
    LEFT JOIN designers d ON d.id = md.designer_id
    WHERE md.id = ?
  `).get(mixDesignId) as MixDesignEngineRow | undefined;

  if (!mix) throw new Error('طرح اختلاط انتخاب‌شده در دیتابیس پیدا نشد.');

  const aggregates = database.prepare(`
    SELECT id, name, material_type, aggregate_role, nominal_size_mm, specific_gravity,
      absorption_percent, moisture_percent, unit_weight_kg_m3, source
    FROM materials
    WHERE mix_design_id = ? AND material_type IN ('fine_aggregate', 'coarse_aggregate')
    ORDER BY rowid
  `).all(mixDesignId) as AggregateEngineRow[];

  for (const aggregate of aggregates) {
    if (aggregate.material_type !== 'fine_aggregate') continue;
    const rows = database.prepare(`
      SELECT sieve_size_mm AS sieveSizeMm, percent_passing AS percentPassing
      FROM aggregate_sieve_results WHERE material_id = ? ORDER BY sieve_size_mm DESC
    `).all(aggregate.id) as SievePassingRow[];
    aggregate.fineness_modulus = calculateFinenessModulus(rows);
  }

  const aggregateBlendShares = database.prepare(`
    SELECT material_id, material_name, share_percent
    FROM aggregate_blend_shares
    WHERE mix_design_id = ? AND share_percent > 0
    ORDER BY rowid
  `).all(mixDesignId) as BlendEngineRow[];

  const manualBlendRow = database.prepare(`
    SELECT MAX(COALESCE(agc.manual_blend_enabled, 0)) AS manualBlendEnabled
    FROM materials m
    LEFT JOIN aggregate_gradation_controls agc ON agc.material_id = m.id
    WHERE m.mix_design_id = ?
  `).get(mixDesignId) as { manualBlendEnabled?: number | null } | undefined;
  const manualBlendEnabled = Boolean(manualBlendRow?.manualBlendEnabled);

  const durability = database.prepare(`
    SELECT freeze_thaw_exposure, freeze_water_exposure,
      soil_water_soluble_sulfate_percent, water_dissolved_sulfate_ppm,
      seawater_exposure, water_contact, low_permeability_required,
      moisture_exposure, external_chloride_exposure,
      reinforced_or_embedded_metal, prestressed_concrete
    FROM durability_inputs WHERE mix_design_id = ?
  `).get(mixDesignId) as DurabilityEngineRow | undefined;

  const durabilityConditions = durability ? {
    freeze_thaw_exposure: Boolean(durability.freeze_thaw_exposure),
    freeze_water_exposure: durability.freeze_water_exposure,
    soil_water_soluble_sulfate_percent: durability.soil_water_soluble_sulfate_percent,
    water_dissolved_sulfate_ppm: durability.water_dissolved_sulfate_ppm,
    seawater_exposure: Boolean(durability.seawater_exposure),
    water_contact: Boolean(durability.water_contact),
    low_permeability_required: Boolean(durability.low_permeability_required),
    moisture_exposure: Boolean(durability.moisture_exposure),
    external_chloride_exposure: Boolean(durability.external_chloride_exposure),
    reinforced_or_embedded_metal: Boolean(durability.reinforced_or_embedded_metal),
    prestressed_concrete: Boolean(durability.prestressed_concrete)
  } : {};

  return {
    project: {
      name: mix.projectName, city: mix.city, location_description: mix.locationDescription,
      structure_type: mix.structureType, element_type: mix.elementType,
      client_name: mix.clientName, contractor_name: mix.contractorName, consultant_name: mix.consultantName
    },
    lab: { name: mix.labName, license_number: mix.labLicenseNumber, address: mix.labAddress, phone: mix.labPhone },
    designer: {
      full_name: mix.designerName, role: mix.designerRole,
      license_or_membership_number: mix.designerLicenseNumber, phone: mix.designerPhone, email: mix.designerEmail
    },
    concrete_type: mix.concreteType,
    standards: ['ACI_PRC_211_1_22', 'ACI_CODE_318_25', 'ACI_301', 'ASTM_C29', 'ASTM_C33', 'ASTM_C127', 'ASTM_C128', 'ASTM_C136'],
    materials: { aggregates, aggregate_blend_shares: aggregateBlendShares },
    exposure: { summary: mix.exposureSummary },
    durability_conditions: durabilityConditions,
    requirements: {
      target_strength_mpa: mix.targetStrengthMpa,
      slump_mm: mix.requiredSlumpMm,
      max_aggregate_size_mm: mix.maxAggregateSizeMm,
      w_cm_ratio: 0.45,
      air_entrained: false,
      air_content_percent: 2.0
    },
    calculation_options: {
      source: 'sqlite_saved_mix_design', mix_design_id: mix.mixDesignId,
      preliminary_w_cm_ratio: true, preliminary_air_content: true,
      manual_blend_enabled: manualBlendEnabled,
      aggregate_proportioning_mode: manualBlendEnabled ? 'manual_absolute_volume' : 'aci_coarse_volume'
    }
  };
}

function calculateFinenessModulus(rows: SievePassingRow[]): number | null {
  const passingBySieve = new Map<number, number>();
  for (const row of rows) passingBySieve.set(roundSieve(row.sieveSizeMm), row.percentPassing);
  let cumulativeRetainedSum = 0;
  for (const sieve of FM_SIEVES_MM) {
    const passing = passingBySieve.get(roundSieve(sieve));
    if (passing === undefined || !Number.isFinite(passing)) return null;
    cumulativeRetainedSum += 100 - passing;
  }
  return Math.round((cumulativeRetainedSum / 100) * 1000) / 1000;
}

function roundSieve(value: number): number {
  return Math.round(value * 1000) / 1000;
}
