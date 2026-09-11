CREATE TABLE IF NOT EXISTS engineering_requirement_snapshots (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 0),
  standard_profile_id TEXT,
  standard_profile_version TEXT,
  calculation_result_id TEXT,
  snapshot_json TEXT NOT NULL,
  resolution_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_requirement_snapshots_mix_revision
  ON engineering_requirement_snapshots(mix_design_id, revision_number, created_at);

CREATE TABLE IF NOT EXISTS mix_design_approval_events (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 0),
  requirements_snapshot_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'engineering_review',
    'lab_verified',
    'approved',
    'production_authorized',
    'rejected',
    'revision_requested'
  )),
  reason TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL,
  profile_identity_json TEXT,
  calculation_identity_json TEXT,
  actor_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE RESTRICT,
  FOREIGN KEY (requirements_snapshot_id) REFERENCES engineering_requirement_snapshots(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_approval_events_mix_revision
  ON mix_design_approval_events(mix_design_id, revision_number, created_at);
CREATE INDEX IF NOT EXISTS idx_approval_events_snapshot
  ON mix_design_approval_events(requirements_snapshot_id, created_at);
