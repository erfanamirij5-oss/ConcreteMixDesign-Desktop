ALTER TABLE mix_designs ADD COLUMN revision_number INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS mix_design_revision_snapshots (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mix_revision_snapshot_unique
  ON mix_design_revision_snapshots(mix_design_id, revision_number);

CREATE INDEX IF NOT EXISTS idx_mix_revision_snapshot_mix_design
  ON mix_design_revision_snapshots(mix_design_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mix_design_audit_log (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details_json TEXT,
  actor_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mix_design_audit_mix_design
  ON mix_design_audit_log(mix_design_id, created_at DESC);
