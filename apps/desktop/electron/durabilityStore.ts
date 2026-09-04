import { getDatabase } from './database';

export type DurabilityInput = {
  mixDesignId: string;
  freezeThawExposure: boolean;
  freezeWaterExposure: 'limited' | 'frequent';
  soilWaterSolubleSulfatePercent: number | null;
  waterDissolvedSulfatePpm: number | null;
  seawaterExposure: boolean;
  waterContact: boolean;
  lowPermeabilityRequired: boolean;
  moistureExposure: boolean;
  externalChlorideExposure: boolean;
  reinforcedOrEmbeddedMetal: boolean;
  prestressedConcrete: boolean;
};

export function saveDurabilityInput(input: DurabilityInput) {
  validateDurabilityInput(input);
  const database = getDatabase();
  database.prepare(`
    INSERT INTO durability_inputs (
      mix_design_id, freeze_thaw_exposure, freeze_water_exposure,
      soil_water_soluble_sulfate_percent, water_dissolved_sulfate_ppm,
      seawater_exposure, water_contact, low_permeability_required,
      moisture_exposure, external_chloride_exposure,
      reinforced_or_embedded_metal, prestressed_concrete, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mix_design_id) DO UPDATE SET
      freeze_thaw_exposure = excluded.freeze_thaw_exposure,
      freeze_water_exposure = excluded.freeze_water_exposure,
      soil_water_soluble_sulfate_percent = excluded.soil_water_soluble_sulfate_percent,
      water_dissolved_sulfate_ppm = excluded.water_dissolved_sulfate_ppm,
      seawater_exposure = excluded.seawater_exposure,
      water_contact = excluded.water_contact,
      low_permeability_required = excluded.low_permeability_required,
      moisture_exposure = excluded.moisture_exposure,
      external_chloride_exposure = excluded.external_chloride_exposure,
      reinforced_or_embedded_metal = excluded.reinforced_or_embedded_metal,
      prestressed_concrete = excluded.prestressed_concrete,
      updated_at = excluded.updated_at
  `).run(
    input.mixDesignId,
    input.freezeThawExposure ? 1 : 0,
    input.freezeWaterExposure,
    input.soilWaterSolubleSulfatePercent,
    input.waterDissolvedSulfatePpm,
    input.seawaterExposure ? 1 : 0,
    input.waterContact ? 1 : 0,
    input.lowPermeabilityRequired ? 1 : 0,
    input.moistureExposure ? 1 : 0,
    input.externalChlorideExposure ? 1 : 0,
    input.reinforcedOrEmbeddedMetal ? 1 : 0,
    input.prestressedConcrete ? 1 : 0,
    new Date().toISOString()
  );
  return { status: 'pass' as const };
}

export function getDurabilityInput(mixDesignId: string) {
  if (!mixDesignId.trim()) return null;
  const database = getDatabase();
  const row = database.prepare(`
    SELECT
      mix_design_id AS mixDesignId,
      freeze_thaw_exposure AS freezeThawExposure,
      freeze_water_exposure AS freezeWaterExposure,
      soil_water_soluble_sulfate_percent AS soilWaterSolubleSulfatePercent,
      water_dissolved_sulfate_ppm AS waterDissolvedSulfatePpm,
      seawater_exposure AS seawaterExposure,
      water_contact AS waterContact,
      low_permeability_required AS lowPermeabilityRequired,
      moisture_exposure AS moistureExposure,
      external_chloride_exposure AS externalChlorideExposure,
      reinforced_or_embedded_metal AS reinforcedOrEmbeddedMetal,
      prestressed_concrete AS prestressedConcrete,
      updated_at AS updatedAt
    FROM durability_inputs
    WHERE mix_design_id = ?
  `).get(mixDesignId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    ...row,
    freezeThawExposure: Boolean(row.freezeThawExposure),
    seawaterExposure: Boolean(row.seawaterExposure),
    waterContact: Boolean(row.waterContact),
    lowPermeabilityRequired: Boolean(row.lowPermeabilityRequired),
    moistureExposure: Boolean(row.moistureExposure),
    externalChlorideExposure: Boolean(row.externalChlorideExposure),
    reinforcedOrEmbeddedMetal: Boolean(row.reinforcedOrEmbeddedMetal),
    prestressedConcrete: Boolean(row.prestressedConcrete)
  };
}

function validateDurabilityInput(input: DurabilityInput) {
  if (!input.mixDesignId.trim()) throw new Error('شناسه طرح اختلاط برای ثبت دوام الزامی است.');
  if (!['limited', 'frequent'].includes(input.freezeWaterExposure)) throw new Error('وضعیت تماس آب در چرخه یخ‌زدگی معتبر نیست.');
  if (input.soilWaterSolubleSulfatePercent !== null && input.soilWaterSolubleSulfatePercent < 0) throw new Error('درصد سولفات محلول خاک نمی‌تواند منفی باشد.');
  if (input.waterDissolvedSulfatePpm !== null && input.waterDissolvedSulfatePpm < 0) throw new Error('سولفات آب نمی‌تواند منفی باشد.');
}
