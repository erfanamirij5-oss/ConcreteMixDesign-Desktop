import Database from 'better-sqlite3';
import { saveMaterialLibraryRecord, listMaterialLibraryRecords } from './materialLibraryStore';

const database = new Database(':memory:');
database.exec(`
  CREATE TABLE material_library (
    id TEXT PRIMARY KEY,
    material_type TEXT NOT NULL CHECK (material_type IN ('cement', 'scm', 'fine_aggregate', 'coarse_aggregate', 'water', 'admixture', 'fiber', 'other_addition')),
    name TEXT NOT NULL, material_subtype TEXT, manufacturer TEXT, source TEXT, product_code TEXT,
    standard_designation TEXT, status TEXT NOT NULL DEFAULT 'active', test_date TEXT, valid_until TEXT,
    laboratory_name TEXT, laboratory_report_number TEXT, properties_json TEXT NOT NULL DEFAULT '{}', notes TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
`);

const fiber = saveMaterialLibraryRecord(database, {
  id: 'fiber-1', materialType: 'fiber', name: 'Macro Synthetic Fiber', manufacturer: 'Supplier A', source: 'Plant A',
  productCode: 'F-001', standardDesignation: 'supplier-declared', laboratoryReportNumber: 'LAB-F-1',
  properties: { densityKgM3: 910, dosageValue: 3.5, dosageUnit: 'kg/m3' }
});
if (fiber.materialType !== 'fiber' || fiber.manufacturer !== 'Supplier A' || fiber.properties.dosageValue !== 3.5) throw new Error('Fiber Material Library round-trip failed.');

const addition = saveMaterialLibraryRecord(database, {
  id: 'addition-1', materialType: 'other_addition', name: 'Custom Mineral Addition', source: 'Source B',
  properties: { specificGravity: 2.4, replacementPercent: 8 }
});
if (addition.materialType !== 'other_addition' || addition.properties.replacementPercent !== 8) throw new Error('Other Addition Material Library round-trip failed.');

const fibers = listMaterialLibraryRecords(database, 'fiber');
const additions = listMaterialLibraryRecords(database, 'other_addition');
if (fibers.length !== 1 || fibers[0].id !== 'fiber-1' || additions.length !== 1 || additions[0].id !== 'addition-1') throw new Error('Extended material-family filtering failed.');

let invalidFiberRejected = false;
try { saveMaterialLibraryRecord(database, { materialType: 'fiber', name: 'Invalid Fiber', properties: { dosageValue: -1 } }); } catch { invalidFiberRejected = true; }
if (!invalidFiberRejected) throw new Error('Negative Fiber dosage was accepted.');

let invalidAdditionRejected = false;
try { saveMaterialLibraryRecord(database, { materialType: 'other_addition', name: 'Invalid Addition', properties: { replacementPercent: -0.1 } }); } catch { invalidAdditionRejected = true; }
if (!invalidAdditionRejected) throw new Error('Negative Other Addition replacement was accepted.');

database.close();
console.log('G03 extended material families smoke passed: Fiber and Other Addition persist, filter and validate without inferred standards compliance.');
