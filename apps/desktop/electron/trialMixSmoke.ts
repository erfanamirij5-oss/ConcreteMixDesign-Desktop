import { readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  hasCompletedTrialMixRecordInDatabase,
  listTrialMixRecordsFromDatabase,
  saveTrialMixRecordToDatabase
} from './trialMixStore';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE mix_designs (id TEXT PRIMARY KEY, status TEXT NOT NULL, revision_number INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    mix_design_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details_json TEXT,
    actor_name TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
  );
`);

database.exec(readFileSync(path.join(process.cwd(), 'database/migrations/020_minimum_trial_mix.sql'), 'utf-8'));
database.exec(readFileSync(path.join(process.cwd(), 'database/migrations/023_trial_mix_v2_foundation.sql'), 'utf-8'));
database.prepare("INSERT INTO mix_designs (id, status, revision_number) VALUES ('mix-1', 'trial_required', 0)").run();

if (hasCompletedTrialMixRecordInDatabase(database, 'mix-1')) {
  throw new Error('Trial completion was reported before any Trial Mix record existed.');
}

const saved = saveTrialMixRecordToDatabase(database, {
  mixDesignId: 'mix-1', trialDate: '2026-09-04', batchQuantityM3: 0.08,
  actualSlumpMm: 95, airContentPercent: 2.1, concreteTemperatureC: 27.5,
  freshDensityKgM3: 2385, strength7dMpa: 31.4, strength28dMpa: 43.8,
  notes: 'Reference minimum Trial Mix record', actorName: 'CI Smoke'
});

if (saved.status !== 'pass') throw new Error('Valid Trial Mix record was not saved.');
if (!hasCompletedTrialMixRecordInDatabase(database, 'mix-1')) throw new Error('Valid Trial Mix record did not satisfy completion evidence.');

const records = listTrialMixRecordsFromDatabase(database, 'mix-1') as Array<Record<string, unknown>>;
if (records.length !== 1) throw new Error('Trial Mix list did not return the persisted record.');
if (records[0].actualSlumpMm !== 95 || records[0].strength28dMpa !== 43.8 || records[0].revisionNumber !== 0) {
  throw new Error('Trial Mix persisted values or revision identity were not reopened faithfully.');
}

const recordId = String(records[0].id);
const now = new Date().toISOString();
database.prepare(`
  INSERT INTO trial_mix_batch_components (
    id, trial_mix_record_id, material_role, material_snapshot_id, material_name_snapshot,
    designed_mass_kg, actual_mass_kg, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('component-1', recordId, 'cement', 'material-snapshot-1', 'Cement Snapshot', 32.0, 32.2, now, now);

database.prepare(`
  INSERT INTO trial_mix_targets (
    trial_mix_record_id, target_slump_mm, target_air_content_percent,
    target_fresh_density_kg_m3, target_strength_28d_mpa, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(recordId, 100, 2.0, 2400, 40, now, now);

database.prepare(`
  INSERT INTO trial_mix_strength_specimens (
    id, trial_mix_record_id, age_days, specimen_label, specimen_type,
    measured_strength_mpa, tested_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('specimen-1', recordId, 28, 'S28-1', 'cube', 43.8, now, now, now);

database.prepare(`
  INSERT INTO trial_mix_evaluations (
    trial_mix_record_id, outcome, slump_deviation_mm, air_deviation_percent,
    fresh_density_deviation_kg_m3, strength_28d_deviation_mpa,
    interpretation, evaluated_by, evaluated_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(recordId, 'pass', -5, 0.1, -15, 3.8, 'Foundation evaluation record', 'CI Smoke', now, now, now);

const foundation = database.prepare(`
  SELECT
    (SELECT COUNT(*) FROM trial_mix_batch_components WHERE trial_mix_record_id = ?) AS components,
    (SELECT COUNT(*) FROM trial_mix_targets WHERE trial_mix_record_id = ?) AS targets,
    (SELECT COUNT(*) FROM trial_mix_strength_specimens WHERE trial_mix_record_id = ?) AS specimens,
    (SELECT COUNT(*) FROM trial_mix_evaluations WHERE trial_mix_record_id = ?) AS evaluations
`).get(recordId, recordId, recordId, recordId) as { components: number; targets: number; specimens: number; evaluations: number };
if (foundation.components !== 1 || foundation.targets !== 1 || foundation.specimens !== 1 || foundation.evaluations !== 1) {
  throw new Error('Trial Mix v2 foundation records were not persisted consistently.');
}

let invalidOutcomeRejected = false;
try {
  database.prepare(`
    UPDATE trial_mix_evaluations SET outcome = 'unknown' WHERE trial_mix_record_id = ?
  `).run(recordId);
} catch { invalidOutcomeRejected = true; }
if (!invalidOutcomeRejected) throw new Error('Trial Mix v2 accepted an invalid evaluation outcome.');

const audit = database.prepare("SELECT action, actor_name AS actorName, details_json AS detailsJson FROM audit_logs WHERE mix_design_id = 'mix-1'").get() as { action: string; actorName: string; detailsJson: string };
if (audit.action !== 'trial_mix_record_created' || audit.actorName !== 'CI Smoke') throw new Error('Trial Mix audit trace was not persisted.');
if (JSON.parse(audit.detailsJson).revisionNumber !== 0) throw new Error('Trial Mix audit did not preserve revision identity.');

database.prepare("UPDATE mix_designs SET revision_number = 1, status = 'trial_required' WHERE id = 'mix-1'").run();
if (hasCompletedTrialMixRecordInDatabase(database, 'mix-1')) {
  throw new Error('A Trial Mix from the previous revision incorrectly satisfied the new revision.');
}

let invalidAirRejected = false;
try {
  saveTrialMixRecordToDatabase(database, {
    mixDesignId: 'mix-1', trialDate: '2026-09-04', batchQuantityM3: 0.05,
    actualSlumpMm: 100, airContentPercent: 120, concreteTemperatureC: 25,
    freshDensityKgM3: 2400
  });
} catch { invalidAirRejected = true; }
if (!invalidAirRejected) throw new Error('Out-of-range air content was accepted.');

database.prepare("UPDATE mix_designs SET status = 'approved' WHERE id = 'mix-1'").run();
let lockedWorkflowRejected = false;
try {
  saveTrialMixRecordToDatabase(database, {
    mixDesignId: 'mix-1', trialDate: '2026-09-04', batchQuantityM3: 0.05,
    actualSlumpMm: 100, airContentPercent: 2, concreteTemperatureC: 25,
    freshDensityKgM3: 2400
  });
} catch { lockedWorkflowRejected = true; }
if (!lockedWorkflowRejected) throw new Error('Trial Mix record was accepted outside trial workflow states.');

database.close();
console.log('Trial Mix smoke passed: minimum persistence plus v2 foundation schema, constraints, revision identity, audit and workflow guards are enforced.');
