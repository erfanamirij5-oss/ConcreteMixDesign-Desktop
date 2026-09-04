import Database from 'better-sqlite3';
import { persistCalculatedMixResult } from './calculationResultStore';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE mix_designs (id TEXT PRIMARY KEY);
  CREATE TABLE mix_results (
    id TEXT PRIMARY KEY,
    mix_design_id TEXT NOT NULL,
    cementitious_content_kg_m3 REAL,
    water_content_kg_m3 REAL,
    w_cm_ratio REAL,
    fine_aggregate_kg_m3 REAL,
    coarse_aggregate_kg_m3 REAL,
    admixtures_json TEXT,
    air_content_percent REAL,
    density_kg_m3 REAL,
    notes TEXT,
    FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id)
  );
`);
database.prepare('INSERT INTO mix_designs (id) VALUES (?)').run('mix-1');

const first = persistCalculatedMixResult(database, 'mix-1', {
  status: 'pass',
  calculation_method: 'ACI PRC-211.1-22',
  mix_proportions: {
    cementitious_kg_m3: 400,
    water_kg_m3: 180,
    w_cm_ratio: 0.45,
    fine_aggregate_kg_m3: 720,
    coarse_aggregate_kg_m3: 1020,
    air_content_percent: 2
  },
  standard_references: ['ACI PRC-211.1-22'],
  assumptions: ['SSD basis'],
  warnings: [{ code: 'TRACE', message: 'engineering traceability preserved' }],
  limitations: ['Trial validation pending']
});

if (!first || first.wCmRatio !== 0.45 || first.cementitiousContentKgM3 !== 400) throw new Error('Calculated mix result was not persisted correctly.');
const firstTrace = first.traceability as { calculationMethod?: string; standardReferences?: string[]; limitations?: string[] };
if (firstTrace.calculationMethod !== 'ACI PRC-211.1-22') throw new Error('Calculation method traceability was not persisted.');
if (!firstTrace.standardReferences?.includes('ACI PRC-211.1-22')) throw new Error('Standard references were not persisted.');
if (!firstTrace.limitations?.includes('Trial validation pending')) throw new Error('Calculation limitations were not persisted.');

const second = persistCalculatedMixResult(database, 'mix-1', {
  status: 'pass',
  calculation_method: 'ACI PRC-211.1-22',
  mix_proportions: { cementitious_kg_m3: 420, water_kg_m3: 180, w_cm_ratio: 0.429 }
});
const count = database.prepare('SELECT COUNT(*) AS count FROM mix_results WHERE mix_design_id = ?').get('mix-1') as { count: number };
if (count.count !== 1) throw new Error('Current revision must keep exactly one current calculation result row.');
if (!second || second.cementitiousContentKgM3 !== 420 || second.wCmRatio !== 0.429) throw new Error('Recalculation did not replace the current revision result atomically.');

let rejected = false;
try { persistCalculatedMixResult(database, 'mix-1', { status: 'fail', mix_proportions: { w_cm_ratio: 0.5 } }); }
catch { rejected = true; }
if (!rejected) throw new Error('Failed engine results must never be persisted as valid mix results.');

const afterReject = database.prepare('SELECT cementitious_content_kg_m3 AS cementitious FROM mix_results WHERE mix_design_id = ?').get('mix-1') as { cementitious: number };
if (afterReject.cementitious !== 420) throw new Error('Rejected engine result modified the last valid persisted calculation.');

database.close();
console.log('Calculation result persistence smoke validation passed.');
