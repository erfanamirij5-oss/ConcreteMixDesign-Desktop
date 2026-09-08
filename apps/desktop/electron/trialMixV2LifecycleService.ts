import type Database from 'better-sqlite3';
import { getDatabase } from './database';
import { ensureRuntimeMigrations } from './runtimeMigrations';
import { getTrialSessionDetailFromDatabase, type TrialSessionStatus } from './trialMixV2Service';

export type TransitionTrialSessionInput = {
  sessionId: string;
  targetStatus: TrialSessionStatus;
  actorName?: string | null;
};

const ALLOWED_TRANSITIONS: Record<TrialSessionStatus, TrialSessionStatus[]> = {
  planned: ['in_progress', 'void'],
  in_progress: ['completed', 'void'],
  completed: [],
  void: []
};

function db() {
  const database = getDatabase();
  ensureRuntimeMigrations(database);
  return database;
}

function nonEmpty(value: unknown, message: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
  return value.trim();
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function audit(database: Database.Database, mixDesignId: string, action: string, details: Record<string, unknown>, actorName?: string | null) {
  database.prepare(`
    INSERT INTO audit_logs (id, mix_design_id, action, details_json, actor_name, created_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?)
  `).run(mixDesignId, action, JSON.stringify(details), optionalText(actorName), new Date().toISOString());
}

export function allowedTrialSessionTransitions(status: TrialSessionStatus) {
  return [...ALLOWED_TRANSITIONS[status]];
}

export function transitionTrialSessionStatus(input: TransitionTrialSessionInput) {
  const database = db();
  const sessionId = nonEmpty(input.sessionId, 'شناسه Trial Session الزامی است.');
  if (!['planned', 'in_progress', 'completed', 'void'].includes(input.targetStatus)) throw new Error('وضعیت مقصد Trial Session معتبر نیست.');

  const session = database.prepare(`
    SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber, status
    FROM trial_mix_sessions WHERE id = ?
  `).get(sessionId) as { id: string; mixDesignId: string; revisionNumber: number; status: TrialSessionStatus } | undefined;
  if (!session) throw new Error('Trial Session پیدا نشد.');

  const allowed = ALLOWED_TRANSITIONS[session.status] ?? [];
  if (!allowed.includes(input.targetStatus)) {
    throw new Error(`تغییر وضعیت Trial Session از ${session.status} به ${input.targetStatus} مجاز نیست.`);
  }

  if (input.targetStatus === 'completed') {
    const linkedBatch = database.prepare('SELECT 1 FROM trial_mix_session_records WHERE session_id = ? LIMIT 1').get(sessionId);
    if (!linkedBatch) throw new Error('تکمیل Trial Session بدون حداقل یک Batch متصل مجاز نیست.');
  }

  const now = new Date().toISOString();
  database.transaction(() => {
    database.prepare('UPDATE trial_mix_sessions SET status = ?, updated_at = ? WHERE id = ?').run(input.targetStatus, now, sessionId);
    audit(database, session.mixDesignId, 'trial_mix_v2_session_status_changed', {
      sessionId,
      revisionNumber: session.revisionNumber,
      fromStatus: session.status,
      toStatus: input.targetStatus
    }, input.actorName);
  })();

  return { status: 'pass' as const, session: getTrialSessionDetailFromDatabase(database, sessionId) };
}
