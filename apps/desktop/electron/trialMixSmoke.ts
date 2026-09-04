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
console.log('Minimum Trial Mix smoke passed: persistence, revision identity, validation, audit and workflow guards are enforced.');
