import Database from 'better-sqlite3';
import { attachLibraryMaterialToMixDesign, saveMaterialLibraryRecord } from './materialLibraryStore';
import { addMaterialQualificationEvent, addMaterialTestObservation } from './materialIntelligenceStore';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE mix_designs (id TEXT PRIMARY KEY, status TEXT NOT NULL);
  CREATE TABLE material_library (
    id TEXT PRIMARY KEY, material_type TEXT NOT NULL, name TEXT NOT NULL, material_subtype TEXT,
    manufacturer TEXT, source TEXT, product_code TEXT, standard_designation TEXT, status TEXT NOT NULL,
    test_date TEXT, valid_until TEXT, laboratory_name TEXT, laboratory_report_number TEXT,
    properties_json TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE material_test_observations (
    id TEXT PRIMARY KEY, material_library_id TEXT NOT NULL, observed_at TEXT NOT NULL, property_key TEXT NOT NULL,
    numeric_value REAL, text_value TEXT, unit TEXT, method_reference TEXT, standard_edition TEXT,
    laboratory_name TEXT, report_number TEXT, evidence_ref TEXT, source_kind TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL,
    FOREIGN KEY (material_library_id) REFERENCES material_library(id) ON DELETE RESTRICT,
    CHECK ((numeric_value IS NOT NULL AND text_value IS NULL) OR (numeric_value IS NULL AND text_value IS NOT NULL))
  );
  CREATE TABLE material_qualification_events (
    id TEXT PRIMARY KEY, material_library_id TEXT NOT NULL, event_at TEXT NOT NULL, status TEXT NOT NULL,
    basis TEXT NOT NULL, standard_reference TEXT, standard_edition TEXT, evidence_ref TEXT, actor TEXT, reason TEXT, created_at TEXT NOT NULL,
    FOREIGN KEY (material_library_id) REFERENCES material_library(id) ON DELETE RESTRICT
  );
  CREATE TABLE materials (
    id TEXT PRIMARY KEY, mix_design_id TEXT NOT NULL, material_type TEXT NOT NULL, name TEXT NOT NULL, source TEXT, notes TEXT,
    material_subtype TEXT, standard_designation TEXT, manufacturer TEXT, product_code TEXT,
    library_material_id TEXT, library_snapshot_json TEXT, library_snapshot_at TEXT,
    FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id), FOREIGN KEY (library_material_id) REFERENCES material_library(id) ON DELETE SET NULL
  );
`);
database.prepare("INSERT INTO mix_designs (id, status) VALUES ('mix-1', 'draft')").run();
saveMaterialLibraryRecord(database, {
  id: 'lib-1', materialType: 'fiber', name: 'Macro Fiber', manufacturer: 'Maker A', source: 'Plant A', productCode: 'MF-01',
  standardDesignation: 'supplier-declared', laboratoryName: 'Tolou Lab', laboratoryReportNumber: 'REP-01', properties: { dosageValue: 3.5 }
});
addMaterialTestObservation(database, {
  id: 'obs-1', materialLibraryId: 'lib-1', observedAt: '2026-09-01T08:00:00Z', propertyKey: 'densityKgM3', numericValue: 910,
  unit: 'kg/m3', methodReference: 'supplier method', standardEdition: 'declared', laboratoryName: 'Tolou Lab', reportNumber: 'REP-01',
  evidenceRef: 'evidence://REP-01', sourceKind: 'certificate'
});
addMaterialQualificationEvent(database, {
  id: 'qual-1', materialLibraryId: 'lib-1', eventAt: '2026-09-02T08:00:00Z', status: 'needs_review', basis: 'Evidence recorded; no compliance inference',
  standardReference: 'supplier-declared', standardEdition: 'declared', evidenceRef: 'evidence://REP-01', actor: 'engineer'
});
const attached = attachLibraryMaterialToMixDesign(database, 'mix-1', 'lib-1');
const frozen = JSON.parse((database.prepare('SELECT library_snapshot_json AS snapshot FROM materials WHERE id = ?').get(attached.materialId) as { snapshot: string }).snapshot) as any;
if (frozen.manufacturer !== 'Maker A' || frozen.source !== 'Plant A' || frozen.productCode !== 'MF-01') throw new Error('Identity provenance was not frozen.');
if (frozen.intelligence.observations.length !== 1 || frozen.intelligence.observations[0].id !== 'obs-1' || frozen.intelligence.observations[0].evidenceRef !== 'evidence://REP-01') throw new Error('Observation evidence provenance was not frozen.');
if (frozen.intelligence.qualifications.length !== 1 || frozen.intelligence.qualifications[0].id !== 'qual-1' || frozen.intelligence.qualifications[0].status !== 'needs_review') throw new Error('Qualification provenance was not frozen.');

addMaterialTestObservation(database, {
  id: 'obs-2', materialLibraryId: 'lib-1', observedAt: '2026-09-03T08:00:00Z', propertyKey: 'densityKgM3', numericValue: 915, unit: 'kg/m3', sourceKind: 'measured'
});
addMaterialQualificationEvent(database, {
  id: 'qual-2', materialLibraryId: 'lib-1', eventAt: '2026-09-04T08:00:00Z', status: 'qualified', basis: 'Later engineering decision', actor: 'engineer'
});
saveMaterialLibraryRecord(database, { id: 'lib-1', materialType: 'fiber', name: 'Macro Fiber Updated', manufacturer: 'Maker B', source: 'Plant B', properties: { dosageValue: 4 } });
const preserved = JSON.parse((database.prepare('SELECT library_snapshot_json AS snapshot FROM materials WHERE id = ?').get(attached.materialId) as { snapshot: string }).snapshot) as any;
if (preserved.manufacturer !== 'Maker A' || preserved.source !== 'Plant A') throw new Error('Historical identity snapshot mutated after master edit.');
if (preserved.intelligence.observations.length !== 1 || preserved.intelligence.observations[0].id !== 'obs-1') throw new Error('Historical observation snapshot mutated after later evidence.');
if (preserved.intelligence.qualifications.length !== 1 || preserved.intelligence.qualifications[0].id !== 'qual-1') throw new Error('Historical qualification snapshot mutated after later decision.');

database.close();
console.log('G03 Material Intelligence snapshot smoke passed: identity, evidence, observations and qualification provenance are immutable at attachment time.');