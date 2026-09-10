import Database from 'better-sqlite3';
import {
  addMaterialQualificationEvent,
  addMaterialTestObservation,
  getMaterialVariabilitySummaries,
  listMaterialQualificationEvents,
  listMaterialTestObservations
} from './materialIntelligenceStore';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE material_library (id TEXT PRIMARY KEY);
  CREATE TABLE material_test_observations (
    id TEXT PRIMARY KEY,
    material_library_id TEXT NOT NULL REFERENCES material_library(id) ON DELETE RESTRICT,
    observed_at TEXT NOT NULL,
    property_key TEXT NOT NULL,
    numeric_value REAL,
    text_value TEXT,
    unit TEXT,
    method_reference TEXT,
    standard_edition TEXT,
    laboratory_name TEXT,
    report_number TEXT,
    evidence_ref TEXT,
    source_kind TEXT NOT NULL DEFAULT 'measured' CHECK (source_kind IN ('measured', 'certificate', 'historical_import')),
    notes TEXT,
    created_at TEXT NOT NULL,
    CHECK ((numeric_value IS NOT NULL AND text_value IS NULL) OR (numeric_value IS NULL AND text_value IS NOT NULL))
  );
  CREATE TABLE material_qualification_events (
    id TEXT PRIMARY KEY,
    material_library_id TEXT NOT NULL REFERENCES material_library(id) ON DELETE RESTRICT,
    event_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('qualified', 'needs_review', 'rejected', 'expired')),
    basis TEXT NOT NULL,
    standard_reference TEXT,
    standard_edition TEXT,
    evidence_ref TEXT,
    actor TEXT,
    reason TEXT,
    created_at TEXT NOT NULL
  );
`);
database.prepare("INSERT INTO material_library (id) VALUES ('mat-1')").run();

addMaterialTestObservation(database, { id: 'o1', materialLibraryId: 'mat-1', observedAt: '2026-09-01T00:00:00Z', propertyKey: 'densityKgM3', numericValue: 1000, unit: 'kg/m3', evidenceRef: 'LAB-1' });
addMaterialTestObservation(database, { id: 'o2', materialLibraryId: 'mat-1', observedAt: '2026-09-02T00:00:00Z', propertyKey: 'densityKgM3', numericValue: 1010, unit: 'kg/m3', evidenceRef: 'LAB-2' });
addMaterialTestObservation(database, { id: 'o3', materialLibraryId: 'mat-1', observedAt: '2026-09-03T00:00:00Z', propertyKey: 'densityKgM3', numericValue: 1.02, unit: 'g/cm3', evidenceRef: 'LAB-3' });
addMaterialTestObservation(database, { id: 'o4', materialLibraryId: 'mat-1', observedAt: '2026-09-04T00:00:00Z', propertyKey: 'appearance', textValue: 'clear', evidenceRef: 'LAB-4' });
addMaterialTestObservation(database, { id: 'o5', materialLibraryId: 'mat-1', observedAt: '2026-09-05T00:00:00Z', propertyKey: 'zeroMean', numericValue: -1, unit: 'u' });
addMaterialTestObservation(database, { id: 'o6', materialLibraryId: 'mat-1', observedAt: '2026-09-06T00:00:00Z', propertyKey: 'zeroMean', numericValue: 1, unit: 'u' });

const summaries = getMaterialVariabilitySummaries(database, 'mat-1');
const density = summaries.find(item => item.propertyKey === 'densityKgM3' && item.unit === 'kg/m3');
if (!density || density.count !== 2 || density.minimum !== 1000 || density.maximum !== 1010 || density.mean !== 1005) throw new Error('G03 variability grouping/basic statistics failed.');
if (Math.abs((density.sampleStandardDeviation ?? 0) - Math.sqrt(50)) > 1e-12) throw new Error('G03 sample SD must use n-1.');
if (Math.abs((density.coefficientOfVariationPercent ?? 0) - (Math.sqrt(50) / 1005 * 100)) > 1e-12) throw new Error('G03 CV calculation failed.');
if (density.observedFrom !== '2026-09-01T00:00:00Z' || density.observedTo !== '2026-09-02T00:00:00Z' || density.observationIds.join(',') !== 'o1,o2') throw new Error('G03 variability provenance/date range failed.');
const alternateUnit = summaries.find(item => item.propertyKey === 'densityKgM3' && item.unit === 'g/cm3');
if (!alternateUnit || alternateUnit.count !== 1 || alternateUnit.sampleStandardDeviation !== null || alternateUnit.coefficientOfVariationPercent !== null) throw new Error('G03 mixed-unit isolation/single-observation contract failed.');
if (summaries.some(item => item.propertyKey === 'appearance')) throw new Error('Text observations leaked into numeric variability analytics.');
const zeroMean = summaries.find(item => item.propertyKey === 'zeroMean');
if (!zeroMean || zeroMean.mean !== 0 || zeroMean.coefficientOfVariationPercent !== null) throw new Error('Zero-mean CV must be null.');

addMaterialQualificationEvent(database, { id: 'q1', materialLibraryId: 'mat-1', eventAt: '2026-09-01T00:00:00Z', status: 'qualified', basis: 'Lab evidence reviewed', evidenceRef: 'LAB-Q1', actor: 'qa-1' });
addMaterialQualificationEvent(database, { id: 'q2', materialLibraryId: 'mat-1', eventAt: '2026-09-07T00:00:00Z', status: 'needs_review', basis: 'New evidence pending review', evidenceRef: 'LAB-Q2', actor: 'qa-2' });
const qualifications = listMaterialQualificationEvents(database, 'mat-1') as Array<{ id: string }>;
if (qualifications.length !== 2 || qualifications[0].id !== 'q2' || qualifications[1].id !== 'q1') throw new Error('Qualification history must remain append-only and ordered newest-first.');
const observations = listMaterialTestObservations(database, 'mat-1') as Array<{ id: string }>;
if (observations.length !== 6) throw new Error('Observation history was not preserved.');

let missingMaterialRejected = false;
try { addMaterialTestObservation(database, { materialLibraryId: 'missing', observedAt: '2026-09-08', propertyKey: 'x', numericValue: 1 }); } catch { missingMaterialRejected = true; }
if (!missingMaterialRejected) throw new Error('Observation accepted an unknown material.');
let ambiguousValueRejected = false;
try { addMaterialTestObservation(database, { materialLibraryId: 'mat-1', observedAt: '2026-09-08', propertyKey: 'x', numericValue: 1, textValue: '1' }); } catch { ambiguousValueRejected = true; }
if (!ambiguousValueRejected) throw new Error('Observation accepted both numeric and text values.');

database.close();
console.log('G03 Material Intelligence smoke passed: append-only history, provenance, unit isolation and deterministic variability contracts are enforced.');
