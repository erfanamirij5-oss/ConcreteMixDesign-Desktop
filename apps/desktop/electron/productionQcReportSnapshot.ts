import type Database from 'better-sqlite3';

export type ProductionQcReportSnapshot = {
  method: {
    version: 'production-qc-report-snapshot-v1';
    scope: 'persisted production and descriptive strength evidence only';
    acceptanceCriteriaApplied: false;
    passFailApplied: false;
    standardComplianceInferred: false;
  };
  batches: Array<Record<string, unknown>>;
  materials: Array<Record<string, unknown>>;
  specimens: Array<Record<string, unknown>>;
  strengthResults: Array<Record<string, unknown>>;
  overallStrength: {
    count: number;
    min: number | null;
    max: number | null;
    mean: number | null;
    populationStandardDeviation: number | null;
    sampleStandardDeviation: number | null;
    sampleCoefficientOfVariationPercent: number | null;
  };
};

function stats(values: number[]) {
  if (!values.length) return { count: 0, min: null, max: null, mean: null, populationStandardDeviation: null, sampleStandardDeviation: null, sampleCoefficientOfVariationPercent: null };
  const count = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const squared = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0);
  const populationStandardDeviation = Math.sqrt(squared / count);
  const sampleStandardDeviation = count > 1 ? Math.sqrt(squared / (count - 1)) : null;
  const sampleCoefficientOfVariationPercent = sampleStandardDeviation != null && mean !== 0 ? (sampleStandardDeviation / Math.abs(mean)) * 100 : null;
  return { count, min: Math.min(...values), max: Math.max(...values), mean, populationStandardDeviation, sampleStandardDeviation, sampleCoefficientOfVariationPercent };
}

function rows(database: Database.Database, sql: string, ...params: unknown[]) {
  try { return database.prepare(sql).all(...params) as Array<Record<string, unknown>>; }
  catch (error) { if (String(error).includes('no such table')) return []; throw error; }
}

export function buildProductionQcReportSnapshot(database: Database.Database, mixDesignId: string): ProductionQcReportSnapshot {
  const batches = rows(database, `SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, batch_code AS batchCode, produced_at AS producedAt, batch_quantity_m3 AS batchQuantityM3, plant_name AS plantName, ticket_number AS ticketNumber, truck_number AS truckNumber, operator_name AS operatorName, slump_mm AS slumpMm, air_content_percent AS airContentPercent, concrete_temperature_c AS concreteTemperatureC, fresh_density_kg_m3 AS freshDensityKgM3, notes, created_by AS createdBy, created_at AS createdAt FROM production_batches WHERE mix_design_id = ? ORDER BY produced_at, created_at`, mixDesignId);
  const batchIds = batches.map(row => String(row.id));
  const materials = batchIds.length ? rows(database, `SELECT id, production_batch_id AS productionBatchId, material_role AS materialRole, material_reference_id AS materialReferenceId, material_name AS materialName, target_mass_kg AS targetMassKg, batched_mass_kg AS batchedMassKg, moisture_percent AS moisturePercent, absorption_percent AS absorptionPercent, created_at AS createdAt FROM production_material_actuals WHERE production_batch_id IN (${batchIds.map(() => '?').join(',')}) ORDER BY created_at, id`, ...batchIds) : [];
  const specimens = batchIds.length ? rows(database, `SELECT id, production_batch_id AS productionBatchId, specimen_code AS specimenCode, specimen_type AS specimenType, cast_at AS castAt, target_test_age_days AS targetTestAgeDays, width_mm AS widthMm, height_mm AS heightMm, length_mm AS lengthMm, diameter_mm AS diameterMm, curing_condition AS curingCondition, notes, created_at AS createdAt FROM production_specimens WHERE production_batch_id IN (${batchIds.map(() => '?').join(',')}) ORDER BY created_at, specimen_code`, ...batchIds) : [];
  const specimenIds = specimens.map(row => String(row.id));
  const strengthResults = specimenIds.length ? rows(database, `SELECT id, specimen_id AS specimenId, tested_at AS testedAt, test_age_days AS testAgeDays, maximum_load_kn AS maximumLoadKn, loaded_area_mm2 AS loadedAreaMm2, strength_mpa AS strengthMpa, calculation_method AS calculationMethod, standard_reference AS standardReference, machine_reference AS machineReference, failure_mode AS failureMode, tested_by AS testedBy, notes, created_at AS createdAt FROM production_compressive_strength_results WHERE specimen_id IN (${specimenIds.map(() => '?').join(',')}) ORDER BY tested_at, id`, ...specimenIds) : [];
  const values = strengthResults.map(row => Number(row.strengthMpa)).filter(Number.isFinite);
  return {
    method: { version: 'production-qc-report-snapshot-v1', scope: 'persisted production and descriptive strength evidence only', acceptanceCriteriaApplied: false, passFailApplied: false, standardComplianceInferred: false },
    batches, materials, specimens, strengthResults, overallStrength: stats(values)
  };
}
