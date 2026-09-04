ALTER TABLE mix_designs ADD COLUMN source_mix_design_id TEXT;
ALTER TABLE mix_designs ADD COLUMN archived_from_status TEXT;
ALTER TABLE mix_designs ADD COLUMN archived_at TEXT;

CREATE TABLE IF NOT EXISTS mix_design_status_history (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  actor_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mix_design_status_history_mix_design
  ON mix_design_status_history(mix_design_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mix_design_source
  ON mix_designs(source_mix_design_id);
