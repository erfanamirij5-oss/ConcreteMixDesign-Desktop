import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { getMaterialChlorideProvenance, saveMaterialChlorideProvenance } from './chlorideProvenanceStore';

const database = new Database(':memory:');
try {
  database.exec(`
    CREATE TABLE materials (
      id TEXT PRIMARY KEY,
      chloride_test_method TEXT,
      chloride_test_edition TEXT,
      chloride_evidence_ref TEXT
    );
    INSERT INTO materials (id) VALUES ('material-1');
  `);

  const saved = saveMaterialChlorideProvenance(database, 'material-1', {
    chlorideTestMethod: ' ASTM C1218/C1218M ',
    chlorideTestEdition: ' 20 ',
    chlorideEvidenceRef: ' LAB-CL-001 '
  });
  assert.deepEqual(saved, {
    chlorideTestMethod: 'ASTM C1218/C1218M',
    chlorideTestEdition: '20',
    chlorideEvidenceRef: 'LAB-CL-001'
  });
  assert.deepEqual(getMaterialChlorideProvenance(database, 'material-1'), saved);

  const cleared = saveMaterialChlorideProvenance(database, 'material-1', {
    chlorideTestMethod: ' ',
    chlorideTestEdition: null,
    chlorideEvidenceRef: undefined
  });
  assert.deepEqual(cleared, {
    chlorideTestMethod: null,
    chlorideTestEdition: null,
    chlorideEvidenceRef: null
  });

  assert.throws(
    () => saveMaterialChlorideProvenance(database, 'missing', { chlorideTestMethod: 'ASTM C1218/C1218M' }),
    /پیدا نشد/
  );

  console.log('Chloride provenance persistence smoke passed: method, exact edition and evidence reference round-trip without inference.');
} finally {
  database.close();
}
