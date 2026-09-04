import Database from 'better-sqlite3';
import { attachLibraryMaterialToMixDesign, saveMaterialLibraryRecord, setMaterialLibraryStatus } from './materialLibraryStore';

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
  CREATE TABLE materials (
    id TEXT PRIMARY KEY, mix_design_id TEXT NOT NULL, material_type TEXT NOT NULL, aggregate_role TEXT,
    nominal_size_mm REAL, fractured_face_percent REAL, moisture_condition TEXT, name TEXT NOT NULL, source TEXT,
    specific_gravity REAL, absorption_percent REAL, moisture_percent REAL, unit_weight_kg_m3 REAL, notes TEXT,
    material_subtype TEXT, standard_designation TEXT, density_kg_m3 REAL, dosage_value REAL, dosage_unit TEXT,
    binder_share_percent REAL, replacement_percent REAL, solids_percent REAL, chloride_percent REAL, chloride_mg_l REAL,
    water_share_percent REAL, alkali_percent REAL, sulfate_mg_l REAL, total_solids_mg_l REAL, alkalis_na2oeq_mg_l REAL,
    water_source_class TEXT, astm_c117_finer_75um_percent REAL, astm_c127_c128_ssd_specific_gravity REAL,
    astm_c127_c128_absorption_percent REAL, aggregate_quality_standard TEXT, aggregate_test_evidence_ref TEXT,
    manufacturer TEXT, product_code TEXT, library_material_id TEXT, library_snapshot_json TEXT, library_snapshot_at TEXT,
    FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id),
    FOREIGN KEY (library_material_id) REFERENCES material_library(id) ON DELETE SET NULL
  );
`);

database.prepare("INSERT INTO mix_designs (id, status) VALUES ('mix-1', 'draft')").run();

saveMaterialLibraryRecord(database, {
  id: 'lib-sand', materialType: 'fine_aggregate', name: 'Natural Sand A', source: 'Yazd Quarry A',
  standardDesignation: 'ASTM C33/C33M-24a', laboratoryName: 'Tolou Lab', laboratoryReportNumber: 'LAB-001',
  testDate: '2026-09-01', validUntil: '2027-09-01',
  properties: {
    aggregateRole: 'natural_sand', specificGravity: 2.65, absorptionPercent: 1.8, moisturePercent: 3.2,
    unitWeightKgM3: 1650, nominalSizeMm: 4.75, astmC117Finer75umPercent: 2.4,
    astmC127C128SsdSpecificGravity: 2.65, astmC127C128AbsorptionPercent: 1.8,
    aggregateQualityStandard: 'ASTM C33/C33M-24a', aggregateTestEvidenceRef: 'LAB-001/C117-C128'
  }
});
const initialMaster = database.prepare('SELECT created_at AS createdAt FROM material_library WHERE id = ?').get('lib-sand') as { createdAt: string };

const attached = attachLibraryMaterialToMixDesign(database, 'mix-1', 'lib-sand');
const initialMaterial = database.prepare(`SELECT library_snapshot_json AS snapshotJson, specific_gravity AS specificGravity,
  absorption_percent AS absorptionPercent, source, astm_c117_finer_75um_percent AS c117,
  astm_c127_c128_ssd_specific_gravity AS c127c128Sg, aggregate_quality_standard AS qualityStandard,
  aggregate_test_evidence_ref AS evidenceRef FROM materials WHERE id = ?`).get(attached.materialId) as {
    snapshotJson: string; specificGravity: number; absorptionPercent: number; source: string;
    c117: number; c127c128Sg: number; qualityStandard: string; evidenceRef: string;
  };
const originalSnapshot = JSON.parse(initialMaterial.snapshotJson) as { source?: string; status?: string; properties?: { specificGravity?: number; absorptionPercent?: number; astmC117Finer75umPercent?: number } };
if (initialMaterial.specificGravity !== 2.65 || initialMaterial.absorptionPercent !== 1.8) throw new Error('Library material core properties were not copied into the mix-design material.');
if (initialMaterial.c117 !== 2.4 || initialMaterial.c127c128Sg !== 2.65 || initialMaterial.qualityStandard !== 'ASTM C33/C33M-24a' || initialMaterial.evidenceRef !== 'LAB-001/C117-C128') throw new Error('Extended engineering properties were not copied into the mix-design material.');
if (originalSnapshot.source !== 'Yazd Quarry A' || originalSnapshot.properties?.specificGravity !== 2.65 || originalSnapshot.properties?.astmC117Finer75umPercent !== 2.4 || originalSnapshot.status !== 'active') throw new Error('Material library snapshot is incomplete.');

saveMaterialLibraryRecord(database, {
  id: 'lib-sand', materialType: 'fine_aggregate', name: 'Natural Sand A - Updated', source: 'Yazd Quarry B',
  standardDesignation: 'ASTM C33/C33M-24a', laboratoryName: 'Tolou Lab', laboratoryReportNumber: 'LAB-002',
  testDate: '2026-09-04', validUntil: '2027-09-04', properties: { specificGravity: 2.61, absorptionPercent: 2.2 }
});
const editedMaster = database.prepare('SELECT created_at AS createdAt, name, source FROM material_library WHERE id = ?').get('lib-sand') as { createdAt: string; name: string; source: string };
if (editedMaster.createdAt !== initialMaster.createdAt) throw new Error('Editing a Master Material Record changed its original creation identity.');
if (editedMaster.name !== 'Natural Sand A - Updated' || editedMaster.source !== 'Yazd Quarry B') throw new Error('Master Material Record edit did not persist current values.');

setMaterialLibraryStatus(database, 'lib-sand', 'inactive');
let inactiveRejected = false;
try { attachLibraryMaterialToMixDesign(database, 'mix-1', 'lib-sand'); } catch { inactiveRejected = true; }
if (!inactiveRejected) throw new Error('Inactive Library material was attached to a mix design.');

const afterLibraryEdit = database.prepare(`SELECT name, source, specific_gravity AS specificGravity, absorption_percent AS absorptionPercent,
  astm_c117_finer_75um_percent AS c117, library_snapshot_json AS snapshotJson FROM materials WHERE id = ?`).get(attached.materialId) as {
    name: string; source: string; specificGravity: number; absorptionPercent: number; c117: number; snapshotJson: string;
  };
const preservedSnapshot = JSON.parse(afterLibraryEdit.snapshotJson) as { source?: string; status?: string; properties?: { specificGravity?: number; absorptionPercent?: number; astmC117Finer75umPercent?: number } };
if (afterLibraryEdit.source !== 'Yazd Quarry A' || afterLibraryEdit.specificGravity !== 2.65 || afterLibraryEdit.absorptionPercent !== 1.8 || afterLibraryEdit.c117 !== 2.4) throw new Error('Editing the reusable Library mutated an existing mix-design material.');
if (preservedSnapshot.source !== 'Yazd Quarry A' || preservedSnapshot.properties?.specificGravity !== 2.65 || preservedSnapshot.properties?.astmC117Finer75umPercent !== 2.4 || preservedSnapshot.status !== 'active') throw new Error('Historical material snapshot changed after Library edit/status change.');

let invalidAggregateRejected = false;
try { saveMaterialLibraryRecord(database, { materialType: 'fine_aggregate', name: 'Invalid Sand', properties: { specificGravity: 2.65, absorptionPercent: 35 } }); } catch { invalidAggregateRejected = true; }
if (!invalidAggregateRejected) throw new Error('Out-of-range aggregate absorption was accepted by Master Record validation.');

let missingCementSgRejected = false;
try { saveMaterialLibraryRecord(database, { materialType: 'cement', name: 'Invalid Cement', properties: { alkaliPercent: 0.6 } }); } catch { missingCementSgRejected = true; }
if (!missingCementSgRejected) throw new Error('Cement Master Record without specific gravity was accepted.');

let invalidAdmixtureRejected = false;
try { saveMaterialLibraryRecord(database, { materialType: 'admixture', name: 'Invalid Admixture', properties: { densityKgM3: 1100, solidsPercent: 130 } }); } catch { invalidAdmixtureRejected = true; }
if (!invalidAdmixtureRejected) throw new Error('Out-of-range admixture solids content was accepted.');

saveMaterialLibraryRecord(database, { id: 'lib-expired', materialType: 'cement', name: 'Expired Cement', status: 'active', validUntil: '2020-01-01', properties: { specificGravity: 3.15 } });
let expiredRejected = false;
try { attachLibraryMaterialToMixDesign(database, 'mix-1', 'lib-expired'); } catch { expiredRejected = true; }
if (!expiredRejected) throw new Error('Expired material laboratory evidence must block attachment to a mix design.');

database.prepare("UPDATE mix_designs SET status = 'approved' WHERE id = 'mix-1'").run();
setMaterialLibraryStatus(database, 'lib-sand', 'active');
let lockedRejected = false;
try { attachLibraryMaterialToMixDesign(database, 'mix-1', 'lib-sand'); } catch { lockedRejected = true; }
if (!lockedRejected) throw new Error('Approved revision accepted a new Library material.');

database.close();
console.log('Material Library snapshot smoke passed: full engineering mapping, validation and immutability contracts are enforced.');
