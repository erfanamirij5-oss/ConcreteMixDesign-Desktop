import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';
import { resolveEngineeringRequirements, type EngineeringRequirement } from './requirementsDomain';

export type ApprovalEventType = 'engineering_review' | 'lab_verified' | 'approved' | 'production_authorized' | 'rejected' | 'revision_requested';

export type CreateRequirementSnapshotInput = {
  mixDesignId: string;
  revisionNumber: number;
  requirements: EngineeringRequirement[];
  standardProfileId?: string | null;
  standardProfileVersion?: string | null;
  calculationResultId?: string | null;
  actorName?: string | null;
};

export type AppendApprovalEventInput = {
  mixDesignId: string;
  revisionNumber: number;
  requirementsSnapshotId: string;
  eventType: ApprovalEventType;
  reason: string;
  evidenceIds?: string[];
  profileIdentity?: Record<string, unknown> | null;
  calculationIdentity?: Record<string, unknown> | null;
  actorName: string;
};

const FORMAL_SEQUENCE: ApprovalEventType[] = ['engineering_review', 'lab_verified', 'approved', 'production_authorized'];
const LEGACY_STATUS_FOR_EVENT: Partial<Record<ApprovalEventType, string[]>> = {
  engineering_review: ['under_review'],
  lab_verified: ['under_review'],
  approved: ['approved'],
  production_authorized: ['production']
};

function text(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

function mix(database: Database.Database, mixDesignId: string) {
  const row = database.prepare('SELECT id, COALESCE(revision_number, 0) AS revisionNumber, status FROM mix_designs WHERE id = ?').get(mixDesignId) as { id: string; revisionNumber: number; status: string } | undefined;
  if (!row) throw new Error('Mix Design was not found.');
  return row;
}

function dedupe(values: string[] = []) { return [...new Set(values.map(value => value.trim()).filter(Boolean))].sort(); }

export function createRequirementSnapshotInDatabase(database: Database.Database, input: CreateRequirementSnapshotInput) {
  const mixDesignId = text(input.mixDesignId, 'mixDesignId');
  if (!Number.isInteger(input.revisionNumber) || input.revisionNumber < 0) throw new Error('revisionNumber must be a non-negative integer.');
  const current = mix(database, mixDesignId);
  if (current.revisionNumber !== input.revisionNumber) throw new Error('Requirement snapshot revision is stale.');
  if (['production', 'superseded', 'archived'].includes(current.status)) throw new Error('Historical/production revisions cannot receive new requirement snapshots.');
  const resolution = resolveEngineeringRequirements(input.requirements);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const snapshot = {
    method: { version: 'engineering-requirements-snapshot-v1', immutableAfterCreation: true },
    mixDesignId,
    revisionNumber: input.revisionNumber,
    standardProfile: input.standardProfileId ? { id: input.standardProfileId.trim(), version: input.standardProfileVersion?.trim() || null } : null,
    calculationResultId: input.calculationResultId?.trim() || null,
    requirements: input.requirements
  };
  database.prepare(`INSERT INTO engineering_requirement_snapshots (
    id, mix_design_id, revision_number, standard_profile_id, standard_profile_version, calculation_result_id,
    snapshot_json, resolution_json, created_by, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, mixDesignId, input.revisionNumber, input.standardProfileId?.trim() || null, input.standardProfileVersion?.trim() || null,
      input.calculationResultId?.trim() || null, JSON.stringify(snapshot), JSON.stringify(resolution), input.actorName?.trim() || null, now);
  return { status: 'pass' as const, id, snapshot, resolution, createdAt: now };
}

export function createRequirementSnapshot(input: CreateRequirementSnapshotInput) { return createRequirementSnapshotInDatabase(getDatabase(), input); }

export function getRequirementSnapshotInDatabase(database: Database.Database, id: string) {
  const row = database.prepare(`SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber,
    snapshot_json AS snapshotJson, resolution_json AS resolutionJson, created_by AS createdBy, created_at AS createdAt
    FROM engineering_requirement_snapshots WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error('Requirement snapshot was not found.');
  return { ...row, snapshot: JSON.parse(String(row.snapshotJson)), resolution: JSON.parse(String(row.resolutionJson)) };
}

function assertSequence(database: Database.Database, input: AppendApprovalEventInput) {
  if (!FORMAL_SEQUENCE.includes(input.eventType)) return;
  const prior = database.prepare(`SELECT event_type AS eventType FROM mix_design_approval_events
    WHERE mix_design_id = ? AND revision_number = ? AND requirements_snapshot_id = ?
    AND event_type IN ('engineering_review','lab_verified','approved','production_authorized') ORDER BY created_at, rowid`)
    .all(input.mixDesignId, input.revisionNumber, input.requirementsSnapshotId) as Array<{ eventType: ApprovalEventType }>;
  const expected = FORMAL_SEQUENCE[prior.length];
  if (input.eventType !== expected) throw new Error(`Formal approval event out of sequence. Expected ${expected ?? 'no further event'}.`);
}

export function appendApprovalEventInDatabase(database: Database.Database, input: AppendApprovalEventInput) {
  const mixDesignId = text(input.mixDesignId, 'mixDesignId');
  text(input.requirementsSnapshotId, 'requirementsSnapshotId');
  const reason = text(input.reason, 'reason');
  const actorName = text(input.actorName, 'actorName');
  if (!Number.isInteger(input.revisionNumber) || input.revisionNumber < 0) throw new Error('revisionNumber must be a non-negative integer.');
  const current = mix(database, mixDesignId);
  if (current.revisionNumber !== input.revisionNumber) throw new Error('Approval event revision is stale.');
  const snapshot = getRequirementSnapshotInDatabase(database, input.requirementsSnapshotId) as { mixDesignId: unknown; revisionNumber: unknown; resolution: { conflicts?: unknown[] } };
  if (String(snapshot.mixDesignId) !== mixDesignId || Number(snapshot.revisionNumber) !== input.revisionNumber) throw new Error('Approval event requirement snapshot identity mismatch.');
  if (input.eventType === 'engineering_review' && Array.isArray(snapshot.resolution.conflicts) && snapshot.resolution.conflicts.length) throw new Error('Engineering review cannot start while requirement conflicts remain unresolved.');
  const allowed = LEGACY_STATUS_FOR_EVENT[input.eventType];
  if (allowed && !allowed.includes(current.status)) throw new Error(`${input.eventType} is incompatible with lifecycle status ${current.status}.`);
  assertSequence(database, input);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const evidenceIds = dedupe(input.evidenceIds);
  database.prepare(`INSERT INTO mix_design_approval_events (
    id, mix_design_id, revision_number, requirements_snapshot_id, event_type, reason, evidence_ids_json,
    profile_identity_json, calculation_identity_json, actor_name, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, mixDesignId, input.revisionNumber, input.requirementsSnapshotId, input.eventType, reason, JSON.stringify(evidenceIds),
      input.profileIdentity ? JSON.stringify(input.profileIdentity) : null, input.calculationIdentity ? JSON.stringify(input.calculationIdentity) : null, actorName, now);
  return { status: 'pass' as const, id, eventType: input.eventType, revisionNumber: input.revisionNumber, requirementsSnapshotId: input.requirementsSnapshotId, evidenceIds, actorName, createdAt: now };
}

export function appendApprovalEvent(input: AppendApprovalEventInput) { return appendApprovalEventInDatabase(getDatabase(), input); }

export function listRequirementSnapshots(mixDesignId: string) {
  return getDatabase().prepare(`SELECT id, mix_design_id AS mixDesignId, revision_number AS revisionNumber,
    standard_profile_id AS standardProfileId, standard_profile_version AS standardProfileVersion,
    calculation_result_id AS calculationResultId, created_by AS createdBy, created_at AS createdAt
    FROM engineering_requirement_snapshots WHERE mix_design_id = ? ORDER BY revision_number DESC, created_at DESC`).all(text(mixDesignId, 'mixDesignId'));
}

export function listApprovalEvents(mixDesignId: string, revisionNumber?: number) {
  const database = getDatabase();
  return revisionNumber === undefined
    ? database.prepare('SELECT * FROM mix_design_approval_events WHERE mix_design_id = ? ORDER BY revision_number DESC, created_at DESC').all(text(mixDesignId, 'mixDesignId'))
    : database.prepare('SELECT * FROM mix_design_approval_events WHERE mix_design_id = ? AND revision_number = ? ORDER BY created_at').all(text(mixDesignId, 'mixDesignId'), revisionNumber);
}
