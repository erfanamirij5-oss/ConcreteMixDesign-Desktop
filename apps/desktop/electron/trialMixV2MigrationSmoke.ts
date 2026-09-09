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
`);

database.exec(readFileSync(path.join(process.cwd(), 'database/migrations/020_minimum_trial_mix.sql'), 'utf-8'));
database.exec(readFileSync(path.join(process.cwd(), 'database/migrations/023_trial_mix_v2_foundation.sql'), 'utf-8'));

database.prepare("INSERT INTO mix_designs (id, status, revision_number) VALUES ('mix-v2', 'trial_required', 2)").run();
database.prepare(`
  INSERT INTO trial_mix_records (
    id, mix_design_id, revision_number, trial_date, batch_quantity_m3, actual_slump_mm,
    air_content_percent, concrete_temperature_c, fresh_density_kg_m3,
    strength_7d_mpa, strength_28d_mpa, notes, created_by, created_at, updated_at
  ) VALUES (
    'record-v2', 'mix-v2', 2, '2026-09-08', 0.08, 95,
    2.0, 26.5, 2390, NULL, NULL, 'v2 foundation smoke', 'CI Smoke',
    '2026-09-08T12:00:00.000Z', '2026-09-08T12:00:00.000Z'
  )
`).run();

database.prepare(`
  INSERT INTO trial_mix_sessions (
    id, mix_design_id, revision_number, session_code, trial_date, status,
    objective, location, lead_engineer, created_by, created_at, updated_at
  ) VALUES (
    'session-v2', 'mix-v2', 2, 'TM-002-A', '2026-09-08', 'in_progress',
    'Validate production candidate', 'Tolou Lab', 'CI Engineer', 'CI Smoke',
    '2026-09-08T12:00:00.000Z', '2026-09-08T12:00:00.000Z'
  )
`).run();

database.prepare(`
  INSERT INTO trial_mix_session_records (session_id, trial_mix_record_id, batch_sequence, linked_at)
  VALUES ('session-v2', 'record-v2', 1, '2026-09-08T12:01:00.000Z')
`).run();

database.prepare(`
  INSERT INTO trial_mix_material_actuals (
    id, trial_mix_record_id, material_role, material_reference_id, material_name,
    target_mass_kg, batched_mass_kg, moisture_percent, absorption_percent,
    moisture_correction_kg, snapshot_json, created_at
  ) VALUES (
    'material-v2', 'record-v2', 'fine_aggregate', 'material-sand-1', 'Fine Aggregate',
    62.0, 63.1, 3.2, 1.1, 1.1, '{"source":"snapshot"}', '2026-09-08T12:02:00.000Z'
  )
`).run();

database.prepare(`
  INSERT INTO trial_mix_specimens (
    id, trial_mix_record_id, specimen_code, specimen_type, cast_at,
    target_test_age_days, width_mm, height_mm, length_mm, diameter_mm,
    curing_condition, notes, created_at
  ) VALUES (
    'specimen-v2', 'record-v2', 'CUBE-28-01', 'cube', '2026-09-08T12:10:00.000Z',
    28, 150, 150, 150, NULL, 'water cured', NULL, '2026-09-08T12:10:00.000Z'
  )
`).run();

database.prepare(`
  INSERT INTO trial_mix_compressive_strength_results (
    id, specimen_id, tested_at, test_age_days, maximum_load_kn, loaded_area_mm2,
    strength_mpa, standard_reference, machine_reference, failure_mode,
    tested_by, notes, created_at
  ) VALUES (
    'strength-v2', 'specimen-v2', '2026-10-06T12:10:00.000Z', 28, 1000, 22500,
    44.44, NULL, 'CTM-01', 'normal', 'CI Technician', NULL, '2026-10-06T12:11:00.000Z'
  )
`).run();

const session = database.prepare(`
  SELECT s.session_code AS sessionCode, s.revision_number AS revisionNumber,
         r.trial_mix_record_id AS trialMixRecordId, r.batch_sequence AS batchSequence
  FROM trial_mix_sessions s
  JOIN trial_mix_session_records r ON r.session_id = s.id
  WHERE s.id = 'session-v2'
`).get() as { sessionCode: string; revisionNumber: number; trialMixRecordId: string; batchSequence: number };

if (session.sessionCode !== 'TM-002-A' || session.revisionNumber !== 2 || session.trialMixRecordId !== 'record-v2' || session.batchSequence !== 1) {
  throw new Error('Trial Mix v2 session did not preserve revision and batch linkage.');
}

const strength = database.prepare(`
  SELECT maximum_load_kn AS maximumLoadKn, loaded_area_mm2 AS loadedAreaMm2, strength_mpa AS strengthMpa
  FROM trial_mix_compressive_strength_results WHERE id = 'strength-v2'
`).get() as { maximumLoadKn: number; loadedAreaMm2: number; strengthMpa: number };

const calculatedStrength = strength.maximumLoadKn * 1000 / strength.loadedAreaMm2;
if (Math.abs(calculatedStrength - strength.strengthMpa) > 0.05) {
  throw new Error('Compressive strength traceability calculation is inconsistent.');
}

let inconsistentStrengthRejected = false;
try {
  database.prepare(`
    INSERT INTO trial_mix_compressive_strength_results (
      id, specimen_id, tested_at, test_age_days, maximum_load_kn, loaded_area_mm2,
      strength_mpa, created_at
    ) VALUES ('bad-strength', 'specimen-v2', '2026-10-06T12:20:00.000Z', 28, 1000, 22500, 55, '2026-10-06T12:20:00.000Z')
  `).run();
} catch { inconsistentStrengthRejected = true; }
if (!inconsistentStrengthRejected) throw new Error('Inconsistent compressive strength was accepted.');

let duplicateRecordLinkRejected = false;
try {
  database.prepare(`
    INSERT INTO trial_mix_session_records (session_id, trial_mix_record_id, batch_sequence, linked_at)
    VALUES ('session-v2', 'record-v2', 2, '2026-09-08T12:30:00.000Z')
  `).run();
} catch { duplicateRecordLinkRejected = true; }
if (!duplicateRecordLinkRejected) throw new Error('A Trial Mix record was linked to a session more than once.');

database.prepare("DELETE FROM trial_mix_records WHERE id = 'record-v2'").run();
const childCounts = database.prepare(`
  SELECT
    (SELECT COUNT(*) FROM trial_mix_session_records) AS links,
    (SELECT COUNT(*) FROM trial_mix_material_actuals) AS materials,
    (SELECT COUNT(*) FROM trial_mix_specimens) AS specimens,
    (SELECT COUNT(*) FROM trial_mix_compressive_strength_results) AS results,
    (SELECT COUNT(*) FROM trial_mix_sessions) AS sessions
`).get() as { links: number; materials: number; specimens: number; results: number; sessions: number };

if (childCounts.links !== 0 || childCounts.materials !== 0 || childCounts.specimens !== 0 || childCounts.results !== 0) {
  throw new Error('Trial Mix v2 child records did not cascade with the parent Trial Mix record.');
}
if (childCounts.sessions !== 1) throw new Error('Deleting a batch unexpectedly deleted the Trial Mix session identity.');

database.close();
console.log('Trial Mix v2 migration smoke passed: session linkage, material traceability, specimen persistence, deterministic strength checks and cascade policies are enforced.');
