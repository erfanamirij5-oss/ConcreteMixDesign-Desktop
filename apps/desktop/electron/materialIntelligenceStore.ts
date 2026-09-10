import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';

export type MaterialObservationSourceKind = 'measured' | 'certificate' | 'historical_import';
export type MaterialQualificationStatus = 'qualified' | 'needs_review' | 'rejected' | 'expired';

export type MaterialTestObservationInput = {
  id?: string;
  materialLibraryId: string;
  observedAt: string;
  propertyKey: string;
  numericValue?: number | null;
  textValue?: string | null;
  unit?: string | null;
  methodReference?: string | null;
  standardEdition?: string | null;
  laboratoryName?: string | null;
  reportNumber?: string | null;
  evidenceRef?: string | null;
  sourceKind?: MaterialObservationSourceKind;
  notes?: string | null;
};

export type MaterialQualificationEventInput = {
  id?: string;
  materialLibraryId: string;
  eventAt: string;
  status: MaterialQualificationStatus;
  basis: string;
  standardReference?: string | null;
  standardEdition?: string | null;
  evidenceRef?: string | null;
  actor?: string | null;
  reason?: string | null;
};

export type MaterialVariabilitySummary = {
  propertyKey: string;
  unit: string | null;
  count: number;
  minimum: number;
  maximum: number;
  mean: number;
  sampleStandardDeviation: number | null;
  coefficientOfVariationPercent: number | null;
  observedFrom: string;
  observedTo: string;
  observationIds: string[];
};

export function addMaterialTestObservation(database: Database.Database, input: MaterialTestObservationInput) {
  assertMaterialExists(database, input.materialLibraryId);
  validateIsoDate(input.observedAt, 'observedAt');
  if (!input.propertyKey.trim()) throw new Error('propertyKey الزامی است.');
  const hasNumeric = input.numericValue != null;
  const hasText = Boolean(input.textValue?.trim());
  if (hasNumeric === hasText) throw new Error('هر Observation باید دقیقاً یک مقدار عددی یا متنی داشته باشد.');
  if (hasNumeric && !Number.isFinite(input.numericValue)) throw new Error('numericValue باید عدد محدود باشد.');

  const id = input.id?.trim() || crypto.randomUUID();
  const createdAt = new Date().toISOString();
  database.prepare(`INSERT INTO material_test_observations (
    id, material_library_id, observed_at, property_key, numeric_value, text_value, unit,
    method_reference, standard_edition, laboratory_name, report_number, evidence_ref,
    source_kind, notes, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.materialLibraryId, input.observedAt, input.propertyKey.trim(), input.numericValue ?? null,
      input.textValue?.trim() || null, input.unit?.trim() || null, input.methodReference?.trim() || null,
      input.standardEdition?.trim() || null, input.laboratoryName?.trim() || null, input.reportNumber?.trim() || null,
      input.evidenceRef?.trim() || null, input.sourceKind ?? 'measured', input.notes?.trim() || null, createdAt);
  return getMaterialTestObservation(database, id);
}

export function addMaterialQualificationEvent(database: Database.Database, input: MaterialQualificationEventInput) {
  assertMaterialExists(database, input.materialLibraryId);
  validateIsoDate(input.eventAt, 'eventAt');
  if (!input.basis.trim()) throw new Error('مبنای Qualification الزامی است.');
  if (!['qualified', 'needs_review', 'rejected', 'expired'].includes(input.status)) throw new Error('وضعیت Qualification معتبر نیست.');
  const id = input.id?.trim() || crypto.randomUUID();
  const createdAt = new Date().toISOString();
  database.prepare(`INSERT INTO material_qualification_events (
    id, material_library_id, event_at, status, basis, standard_reference,
    standard_edition, evidence_ref, actor, reason, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.materialLibraryId, input.eventAt, input.status, input.basis.trim(), input.standardReference?.trim() || null,
      input.standardEdition?.trim() || null, input.evidenceRef?.trim() || null, input.actor?.trim() || null,
      input.reason?.trim() || null, createdAt);
  return getMaterialQualificationEvent(database, id);
}

export function listMaterialTestObservations(database: Database.Database, materialLibraryId: string) {
  assertMaterialExists(database, materialLibraryId);
  return database.prepare(`SELECT id, material_library_id AS materialLibraryId, observed_at AS observedAt,
      property_key AS propertyKey, numeric_value AS numericValue, text_value AS textValue, unit,
      method_reference AS methodReference, standard_edition AS standardEdition, laboratory_name AS laboratoryName,
      report_number AS reportNumber, evidence_ref AS evidenceRef, source_kind AS sourceKind, notes, created_at AS createdAt
    FROM material_test_observations WHERE material_library_id = ? ORDER BY observed_at DESC, created_at DESC`).all(materialLibraryId);
}

export function listMaterialQualificationEvents(database: Database.Database, materialLibraryId: string) {
  assertMaterialExists(database, materialLibraryId);
  return database.prepare(`SELECT id, material_library_id AS materialLibraryId, event_at AS eventAt, status, basis,
      standard_reference AS standardReference, standard_edition AS standardEdition, evidence_ref AS evidenceRef,
      actor, reason, created_at AS createdAt FROM material_qualification_events
    WHERE material_library_id = ? ORDER BY event_at DESC, created_at DESC`).all(materialLibraryId);
}

export function getMaterialVariabilitySummaries(database: Database.Database, materialLibraryId: string): MaterialVariabilitySummary[] {
  assertMaterialExists(database, materialLibraryId);
  const rows = database.prepare(`SELECT id, observed_at AS observedAt, property_key AS propertyKey,
      numeric_value AS numericValue, unit FROM material_test_observations
    WHERE material_library_id = ? AND numeric_value IS NOT NULL
    ORDER BY property_key, unit, observed_at, created_at`).all(materialLibraryId) as Array<{
      id: string; observedAt: string; propertyKey: string; numericValue: number; unit: string | null;
    }>;
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = JSON.stringify([row.propertyKey, row.unit ?? null]);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => {
    const values = group.map(row => row.numericValue);
    const count = values.length;
    const mean = values.reduce((sum, value) => sum + value, 0) / count;
    const sampleVariance = count > 1
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1)
      : null;
    const sampleStandardDeviation = sampleVariance == null ? null : Math.sqrt(sampleVariance);
    const coefficientOfVariationPercent = sampleStandardDeviation == null || mean === 0
      ? null
      : Math.abs(sampleStandardDeviation / mean) * 100;
    return {
      propertyKey: group[0].propertyKey,
      unit: group[0].unit,
      count,
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      mean,
      sampleStandardDeviation,
      coefficientOfVariationPercent,
      observedFrom: group[0].observedAt,
      observedTo: group[group.length - 1].observedAt,
      observationIds: group.map(row => row.id)
    };
  });
}

export function addMaterialObservation(input: MaterialTestObservationInput) { return addMaterialTestObservation(getDatabase(), input); }
export function addMaterialQualification(input: MaterialQualificationEventInput) { return addMaterialQualificationEvent(getDatabase(), input); }
export function listMaterialObservations(materialLibraryId: string) { return listMaterialTestObservations(getDatabase(), materialLibraryId); }
export function listMaterialQualifications(materialLibraryId: string) { return listMaterialQualificationEvents(getDatabase(), materialLibraryId); }
export function getMaterialVariability(materialLibraryId: string) { return getMaterialVariabilitySummaries(getDatabase(), materialLibraryId); }

function getMaterialTestObservation(database: Database.Database, id: string) {
  return database.prepare(`SELECT id, material_library_id AS materialLibraryId, observed_at AS observedAt,
    property_key AS propertyKey, numeric_value AS numericValue, text_value AS textValue, unit,
    method_reference AS methodReference, standard_edition AS standardEdition, laboratory_name AS laboratoryName,
    report_number AS reportNumber, evidence_ref AS evidenceRef, source_kind AS sourceKind, notes,
    created_at AS createdAt FROM material_test_observations WHERE id = ?`).get(id);
}
function getMaterialQualificationEvent(database: Database.Database, id: string) {
  return database.prepare(`SELECT id, material_library_id AS materialLibraryId, event_at AS eventAt, status, basis,
    standard_reference AS standardReference, standard_edition AS standardEdition, evidence_ref AS evidenceRef,
    actor, reason, created_at AS createdAt FROM material_qualification_events WHERE id = ?`).get(id);
}
function assertMaterialExists(database: Database.Database, materialLibraryId: string) {
  if (!materialLibraryId.trim()) throw new Error('materialLibraryId الزامی است.');
  const row = database.prepare('SELECT id FROM material_library WHERE id = ?').get(materialLibraryId);
  if (!row) throw new Error('رکورد Material Library پیدا نشد.');
}
function validateIsoDate(value: string, field: string) {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${field} معتبر نیست.`);
}
