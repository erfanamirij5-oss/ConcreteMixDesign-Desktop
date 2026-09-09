import { readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE mix_designs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    revision_number INTEGER NOT NULL DEFAULT 0
  );
  INSERT INTO mix_designs (id, status, revision_number) VALUES ('mix-1', 'approved', 2);
`);

for (const migration of ['024_production_qc_foundation.sql', '025_cost_engine_foundation.sql']) {
  database.exec(readFileSync(path.join(process.cwd(), 'database/migrations', migration), 'utf-8'));
}

const now = new Date().toISOString();
database.prepare(`
  INSERT INTO production_batches (
    id, mix_design_id, revision_number, batch_code, produced_at, batch_quantity_m3,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('batch-1', 'mix-1', 2, 'B-001', now, 6.5, now, now);

let invalidBatchRejected = false;
try {
  database.prepare(`
    INSERT INTO production_batches (
      id, mix_design_id, revision_number, batch_code, produced_at, batch_quantity_m3,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('batch-invalid', 'mix-1', 2, 'B-000', now, 0, now, now);
} catch {
  invalidBatchRejected = true;
}
if (!invalidBatchRejected) throw new Error('Production/QC migration accepted a non-positive batch quantity.');

database.prepare(`
  INSERT INTO production_material_actuals (
    id, production_batch_id, material_role, material_name, batched_mass_kg, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`).run('mat-1', 'batch-1', 'cement', 'Cement', 2200, now);

let invalidMaterialRoleRejected = false;
try {
  database.prepare(`
    INSERT INTO production_material_actuals (
      id, production_batch_id, material_role, material_name, batched_mass_kg, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run('mat-invalid', 'batch-1', 'invalid_role', 'Invalid', 1, now);
} catch {
  invalidMaterialRoleRejected = true;
}
if (!invalidMaterialRoleRejected) throw new Error('Production/QC migration accepted an invalid material role.');

database.prepare(`
  INSERT INTO production_specimens (
    id, production_batch_id, specimen_code, specimen_type, cast_at, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`).run('spec-1', 'batch-1', 'S-001', 'cube', now, now);

let invalidSpecimenTypeRejected = false;
try {
  database.prepare(`
    INSERT INTO production_specimens (
      id, production_batch_id, specimen_code, specimen_type, cast_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run('spec-invalid', 'batch-1', 'S-X', 'invalid', now, now);
} catch {
  invalidSpecimenTypeRejected = true;
}
if (!invalidSpecimenTypeRejected) throw new Error('Production/QC migration accepted an invalid specimen type.');

database.prepare(`
  INSERT INTO production_compressive_strength_results (
    id, specimen_id, tested_at, test_age_days, maximum_load_kn, loaded_area_mm2,
    strength_mpa, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('strength-1', 'spec-1', now, 28, 400, 10000, 40, now);

let inconsistentStrengthRejected = false;
try {
  database.prepare(`
    INSERT INTO production_compressive_strength_results (
      id, specimen_id, tested_at, test_age_days, maximum_load_kn, loaded_area_mm2,
      strength_mpa, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('strength-invalid', 'spec-1', now, 28, 400, 10000, 41, now);
} catch {
  inconsistentStrengthRejected = true;
}
if (!inconsistentStrengthRejected) throw new Error('Production/QC migration accepted an inconsistent compressive-strength calculation.');

database.prepare(`
  INSERT INTO mix_cost_input_sets (
    id, mix_design_id, revision_number, currency, effective_at, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`).run('cost-set-1', 'mix-1', 2, 'IRR', now, now);

let invalidCurrencyRejected = false;
try {
  database.prepare(`
    INSERT INTO mix_cost_input_sets (
      id, mix_design_id, revision_number, currency, effective_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run('cost-set-invalid', 'mix-1', 2, 'IR', now, now);
} catch {
  invalidCurrencyRejected = true;
}
if (!invalidCurrencyRejected) throw new Error('Cost Engine migration accepted an invalid currency code.');

database.prepare(`
  INSERT INTO mix_cost_input_items (id, input_set_id, cost_role, unit_cost_per_kg)
  VALUES (?, ?, ?, ?)
`).run('cost-item-1', 'cost-set-1', 'cementitious', 125000);

let negativeCostRejected = false;
try {
  database.prepare(`
    INSERT INTO mix_cost_input_items (id, input_set_id, cost_role, unit_cost_per_kg)
    VALUES (?, ?, ?, ?)
  `).run('cost-item-negative', 'cost-set-1', 'water', -1);
} catch {
  negativeCostRejected = true;
}
if (!negativeCostRejected) throw new Error('Cost Engine migration accepted a negative unit cost.');

let duplicateCostRoleRejected = false;
try {
  database.prepare(`
    INSERT INTO mix_cost_input_items (id, input_set_id, cost_role, unit_cost_per_kg)
    VALUES (?, ?, ?, ?)
  `).run('cost-item-duplicate', 'cost-set-1', 'cementitious', 130000);
} catch {
  duplicateCostRoleRejected = true;
}
if (!duplicateCostRoleRejected) throw new Error('Cost Engine migration accepted a duplicate cost role in one input set.');

database.prepare('DELETE FROM production_batches WHERE id = ?').run('batch-1');
const remainingSpecimens = database.prepare('SELECT COUNT(*) AS count FROM production_specimens WHERE production_batch_id = ?').get('batch-1') as { count: number };
if (remainingSpecimens.count !== 0) throw new Error('Production/QC cascade delete contract failed.');

database.prepare('DELETE FROM mix_cost_input_sets WHERE id = ?').run('cost-set-1');
const remainingCostItems = database.prepare('SELECT COUNT(*) AS count FROM mix_cost_input_items WHERE input_set_id = ?').get('cost-set-1') as { count: number };
if (remainingCostItems.count !== 0) throw new Error('Cost Engine cascade delete contract failed.');

database.close();
console.log('v1.1 persistence contract smoke passed: migrations 024 and 025 enforce Production/QC and Cost Engine constraints.');
