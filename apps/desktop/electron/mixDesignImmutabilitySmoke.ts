import Database from 'better-sqlite3';
import { assertMaterialEngineeringEditable, assertMixDesignEngineeringEditable } from './mixDesignEditGuard';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE mix_designs (id TEXT PRIMARY KEY, status TEXT NOT NULL, revision_number INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE materials (id TEXT PRIMARY KEY, mix_design_id TEXT NOT NULL, FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id));
`);

const insertMix = database.prepare('INSERT INTO mix_designs (id, status, revision_number) VALUES (?, ?, ?)');
insertMix.run('draft-mix', 'draft', 2);
insertMix.run('approved-mix', 'approved', 3);
insertMix.run('production-mix', 'production', 4);
insertMix.run('archived-mix', 'archived', 5);
database.prepare('INSERT INTO materials (id, mix_design_id) VALUES (?, ?)').run('approved-material', 'approved-mix');

const editable = assertMixDesignEngineeringEditable(database, 'draft-mix');
if (editable.status !== 'draft' || editable.revisionNumber !== 2) throw new Error('Editable draft revision was rejected or misidentified.');

for (const id of ['approved-mix', 'production-mix', 'archived-mix']) {
  let rejected = false;
  try { assertMixDesignEngineeringEditable(database, id); } catch { rejected = true; }
  if (!rejected) throw new Error(`Locked revision ${id} accepted an engineering write.`);
}

let materialRejected = false;
try { assertMaterialEngineeringEditable(database, 'approved-material'); } catch { materialRejected = true; }
if (!materialRejected) throw new Error('Material write bypassed approved revision immutability.');

database.close();
console.log('Mix design immutability smoke passed: locked revisions reject engineering writes.');
