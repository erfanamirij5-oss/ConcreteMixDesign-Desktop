import { readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import './trialMixV2RevisionFeedbackContractSmoke';

const database = new Database(':memory:');
database.pragma('foreign_keys = ON');
database.exec(`
  CREATE TABLE mix_designs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    revision_number INTEGER NOT NULL DEFAULT 0
  );
`);

const migrationPath = path.join(process.cwd(), 'database/migrations/020_minimum_trial_mix.sql');
database.exec(readFileSync(migrationPath, 'utf-8'));
database.prepare("INSERT INTO mix_designs (id, status, revision_number) VALUES ('mix-1', 'trial_required', 0)").run();

let blockedWithoutEvidence = false;
try {
  database.prepare("UPDATE mix_designs SET status = 'trial_completed' WHERE id = 'mix-1'").run();
} catch (error) {
  blockedWithoutEvidence = String(error).includes('trial_completed_requires_valid_trial_mix_record_for_current_revision');
}
if (!blockedWithoutEvidence) throw new Error('trial_required -> trial_completed was not blocked without valid current-revision Trial Mix evidence.');

const now = new Date().toISOString();
database.prepare(`
  INSERT INTO trial_mix_records (
    id, mix_design_id, revision_number, trial_date, batch_quantity_m3, actual_slump_mm,
    air_content_percent, concrete_temperature_c, fresh_density_kg_m3,
    strength_7d_mpa, strength_28d_mpa, notes, created_by, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'trial-1', 'mix-1', 0, '2026-09-04', 0.05, 95, 2.1, 24.5, 2380,
  29.4, 41.2, 'Reference trial', 'CI', now, now
);

database.prepare("UPDATE mix_designs SET status = 'trial_completed' WHERE id = 'mix-1'").run();
const completed = database.prepare('SELECT status FROM mix_designs WHERE id = ?').get('mix-1') as { status: string };
if (completed.status !== 'trial_completed') throw new Error('Valid current-revision Trial Mix evidence did not permit trial completion.');

database.prepare("UPDATE mix_designs SET revision_number = 1, status = 'trial_required' WHERE id = 'mix-1'").run();
let previousRevisionRejected = false;
try {
  database.prepare("UPDATE mix_designs SET status = 'trial_completed' WHERE id = 'mix-1'").run();
} catch (error) {
  previousRevisionRejected = String(error).includes('trial_completed_requires_valid_trial_mix_record_for_current_revision');
}
if (!previousRevisionRejected) throw new Error('Previous-revision Trial Mix evidence incorrectly completed a new revision.');

let checkConstraintRejected = false;
try {
  database.prepare(`
    INSERT INTO trial_mix_records (
      id, mix_design_id, revision_number, trial_date, batch_quantity_m3, actual_slump_mm,
      air_content_percent, concrete_temperature_c, fresh_density_kg_m3,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('trial-invalid', 'mix-1', 1, '2026-09-04', 0, 95, 2.1, 24.5, 2380, now, now);
} catch {
  checkConstraintRejected = true;
}
if (!checkConstraintRejected) throw new Error('Trial Mix database constraints accepted a zero batch quantity.');

database.close();
console.log('Trial workflow smoke passed: current-revision completion evidence and Trial Mix constraints are enforced.');
