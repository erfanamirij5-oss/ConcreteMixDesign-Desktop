import { readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createReportSnapshotInDatabase, getReportSnapshotFromDatabase, listReportSnapshotsFromDatabase, type ReportType } from './reportCenterStore';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE projects (
    id TEXT PRIMARY KEY, project_name TEXT NOT NULL, city TEXT, location_description TEXT,
    structure_type TEXT, element_type TEXT, client_name TEXT, contractor_name TEXT, consultant_name TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE laboratories (
    id TEXT PRIMARY KEY, lab_name TEXT NOT NULL, license_number TEXT, address TEXT, phone TEXT, logo_path TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE designers (
    id TEXT PRIMARY KEY, full_name TEXT NOT NULL, role TEXT, license_or_membership_number TEXT, phone TEXT, email TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE mix_designs (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, laboratory_id TEXT, designer_id TEXT,
    concrete_type TEXT NOT NULL, target_strength_mpa REAL, required_slump_mm REAL,
    max_aggregate_size_mm REAL, exposure_summary TEXT, design_standard TEXT, engineer_notes TEXT,
    status TEXT NOT NULL, revision_number INTEGER NOT NULL DEFAULT 0, engine_version TEXT NOT NULL,
    standards_version TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id), FOREIGN KEY(laboratory_id) REFERENCES laboratories(id),
    FOREIGN KEY(designer_id) REFERENCES designers(id)
  );
  CREATE TABLE materials (
    id TEXT PRIMARY KEY, mix_design_id TEXT NOT NULL, material_type TEXT NOT NULL, name TEXT NOT NULL,
    source TEXT, specific_gravity REAL, absorption_percent REAL, moisture_percent REAL,
    FOREIGN KEY(mix_design_id) REFERENCES mix_designs(id)
  );
  CREATE TABLE aggregate_sieve_results (
    id TEXT PRIMARY KEY, material_id TEXT NOT NULL, sieve_size_mm REAL NOT NULL, percent_passing REAL NOT NULL,
    standard_min REAL, standard_max REAL, status TEXT NOT NULL,
    FOREIGN KEY(material_id) REFERENCES materials(id)
  );
  CREATE TABLE mix_results (
    id TEXT PRIMARY KEY, mix_design_id TEXT NOT NULL, cementitious_content_kg_m3 REAL,
    water_content_kg_m3 REAL, w_cm_ratio REAL, fine_aggregate_kg_m3 REAL,
    coarse_aggregate_kg_m3 REAL, air_content_percent REAL, notes TEXT,
    FOREIGN KEY(mix_design_id) REFERENCES mix_designs(id)
  );
  CREATE TABLE trial_mix_records (
    id TEXT PRIMARY KEY, mix_design_id TEXT NOT NULL, revision_number INTEGER NOT NULL,
    trial_date TEXT NOT NULL, batch_quantity_m3 REAL NOT NULL, actual_slump_mm REAL NOT NULL,
    air_content_percent REAL NOT NULL, concrete_temperature_c REAL NOT NULL, fresh_density_kg_m3 REAL NOT NULL,
    strength_7d_mpa REAL, strength_28d_mpa REAL, notes TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY(mix_design_id) REFERENCES mix_designs(id)
  );
  CREATE TABLE production_batches (
    id TEXT PRIMARY KEY, mix_design_id TEXT NOT NULL, revision_number INTEGER NOT NULL, batch_code TEXT NOT NULL,
    produced_at TEXT NOT NULL, batch_quantity_m3 REAL NOT NULL, plant_name TEXT, ticket_number TEXT, truck_number TEXT,
    operator_name TEXT, slump_mm REAL, air_content_percent REAL, concrete_temperature_c REAL, fresh_density_kg_m3 REAL,
    notes TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE production_material_actuals (
    id TEXT PRIMARY KEY, production_batch_id TEXT NOT NULL, material_role TEXT NOT NULL, material_reference_id TEXT,
    material_name TEXT NOT NULL, target_mass_kg REAL, batched_mass_kg REAL NOT NULL, moisture_percent REAL,
    absorption_percent REAL, snapshot_json TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE production_specimens (
    id TEXT PRIMARY KEY, production_batch_id TEXT NOT NULL, specimen_code TEXT NOT NULL, specimen_type TEXT NOT NULL,
    cast_at TEXT NOT NULL, target_test_age_days REAL, width_mm REAL, height_mm REAL, length_mm REAL, diameter_mm REAL,
    curing_condition TEXT, notes TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE production_compressive_strength_results (
    id TEXT PRIMARY KEY, specimen_id TEXT NOT NULL, tested_at TEXT NOT NULL, test_age_days REAL NOT NULL,
    maximum_load_kn REAL NOT NULL, loaded_area_mm2 REAL NOT NULL, strength_mpa REAL NOT NULL,
    calculation_method TEXT NOT NULL, standard_reference TEXT, machine_reference TEXT, failure_mode TEXT,
    tested_by TEXT, notes TEXT, created_at TEXT NOT NULL
  );
`);
database.exec(readFileSync(path.join(process.cwd(), 'database/migrations/021_report_center_snapshots.sql'), 'utf-8'));

const now = '2026-09-04T00:00:00.000Z';
database.prepare('INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  'p1', 'Tolou Commercial Project', 'Yazd', 'Industrial site', 'RC building', 'Foundation', 'Client A', 'Contractor A', 'Consultant A', now, now
);
database.prepare('INSERT INTO laboratories VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('l1', 'Tolou Concrete Lab', 'LAB-001', 'Yazd', '035', null, now, now);
database.prepare('INSERT INTO designers VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('d1', 'Engineer Test', 'Mix Designer', 'ENG-1', '0913', 'engineer@example.com', now, now);
database.prepare(`INSERT INTO mix_designs (
  id, project_id, laboratory_id, designer_id, concrete_type, target_strength_mpa, required_slump_mm,
  max_aggregate_size_mm, exposure_summary, design_standard, engineer_notes, status, revision_number,
  engine_version, standards_version, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  'm1', 'p1', 'l1', 'd1', 'normal_weight', 35, 100, 19, 'F2/S1', 'ACI 211.1', 'CI report', 'production', 2,
  '0.3.0', 'ACI_CODE_318_25|ACI_PRC_211_1_22|ASTM', now, now
);
database.prepare('INSERT INTO materials VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('mat1', 'm1', 'cement', 'Type II Cement', 'Plant A', 3.15, 0, 0);
database.prepare('INSERT INTO mix_results VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  'r1', 'm1', 400, 180, 0.45, 680, 1050, 2,
  JSON.stringify({ calculationMethod: 'absolute_volume', standardReferences: ['ACI PRC-211.1-22'], assumptions: ['SSD basis'], warnings: [], limitations: [] })
);
database.prepare('INSERT INTO trial_mix_records VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  't1', 'm1', 2, '2026-09-04', 0.08, 95, 2.1, 26, 2390, 30, 42, 'CI trial', 'CI Engineer', now, now
);
database.prepare('INSERT INTO production_batches VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  'pb1', 'm1', 2, 'B-001', now, 6, 'Plant A', 'TK-1', 'TR-1', 'Operator A', 100, 2.0, 27, 2385, 'CI production', 'CI Engineer', now, now
);
database.prepare('INSERT INTO production_material_actuals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  'pm1', 'pb1', 'cement', 'mat1', 'Type II Cement', 2400, 2405, 0, 0, '{}', now
);
database.prepare('INSERT INTO production_specimens VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  'ps1', 'pb1', 'C-28-001', 'cube', now, 28, 150, 150, 150, null, 'water curing', null, now
);
database.prepare('INSERT INTO production_compressive_strength_results VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  'pr1', 'ps1', now, 28, 945, 22500, 42, 'load_kn_x_1000_div_area_mm2', null, 'M-01', 'normal', 'CI Tester', null, now
);

const types: ReportType[] = [
  'mix_design', 'engineering_calculation', 'material_summary', 'durability_compliance',
  'gradation_blend', 'revision_identity', 'production_sheet'
];
let firstId = '';
let productionId = '';
for (const [index, reportType] of types.entries()) {
  const created = createReportSnapshotInDatabase(database, { mixDesignId: 'm1', reportType, language: index % 2 ? 'en' : 'fa', generatedBy: 'CI Engineer' });
  if (created.revisionNumber !== 2) throw new Error(`${reportType} did not preserve revision identity.`);
  if (created.snapshot.identity.projectName !== 'Tolou Commercial Project') throw new Error(`${reportType} did not capture project identity.`);
  if (created.snapshot.materials.length !== 1) throw new Error(`${reportType} did not capture persisted materials.`);
  if (created.snapshot.trialMix.length !== 1) throw new Error(`${reportType} did not capture current-revision Trial Mix evidence.`);
  if (!created.snapshot.standards.includes('ACI PRC-211.1-22')) throw new Error(`${reportType} lost engineering traceability standards.`);
  if (created.snapshot.productionQc.batches.length !== 1) throw new Error(`${reportType} did not capture Production Batch evidence.`);
  if (created.snapshot.productionQc.strengthResults.length !== 1) throw new Error(`${reportType} did not capture Production strength evidence.`);
  if (created.snapshot.productionQc.overallStrength.mean !== 42) throw new Error(`${reportType} descriptive Production strength mean is incorrect.`);
  if (created.snapshot.productionQc.method.acceptanceCriteriaApplied || created.snapshot.productionQc.method.passFailApplied || created.snapshot.productionQc.method.standardComplianceInferred) throw new Error(`${reportType} inferred prohibited Production/QC acceptance semantics.`);
  if (index === 0) firstId = created.id;
  if (reportType === 'production_sheet') productionId = created.id;
}

const listed = listReportSnapshotsFromDatabase(database, 'm1') as Array<Record<string, unknown>>;
if (listed.length !== 7) throw new Error(`Expected 7 report snapshots, found ${listed.length}.`);

database.prepare("UPDATE projects SET project_name = 'Changed Live Project' WHERE id = 'p1'").run();
database.prepare("UPDATE mix_results SET w_cm_ratio = 0.60 WHERE id = 'r1'").run();
database.prepare("UPDATE production_compressive_strength_results SET strength_mpa = 55 WHERE id = 'pr1'").run();
const historical = getReportSnapshotFromDatabase(database, firstId) as { snapshot: { identity: Record<string, unknown>; calculation: Record<string, unknown> | null } } | null;
if (!historical) throw new Error('Historical report snapshot could not be reopened.');
if (historical.snapshot.identity.projectName !== 'Tolou Commercial Project') throw new Error('Historical report snapshot mutated after live project edit.');
if (historical.snapshot.calculation?.w_cm_ratio !== 0.45) throw new Error('Historical report snapshot mutated after live calculation edit.');
const productionHistorical = getReportSnapshotFromDatabase(database, productionId) as { snapshot: { productionQc: { strengthResults: Array<Record<string, unknown>> } } } | null;
if (!productionHistorical) throw new Error('Historical production report snapshot could not be reopened.');
if (productionHistorical.snapshot.productionQc.strengthResults[0]?.strengthMpa !== 42) throw new Error('Historical Production/QC snapshot mutated after live strength edit.');

database.close();
console.log('Report Center smoke passed: all seven report types preserve immutable identity, engineering traceability and Production/QC evidence without acceptance inference.');
