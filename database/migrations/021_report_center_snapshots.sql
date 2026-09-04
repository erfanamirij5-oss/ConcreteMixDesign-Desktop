CREATE TABLE IF NOT EXISTS report_snapshots (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'mix_design',
    'engineering_calculation',
    'material_summary',
    'durability_compliance',
    'gradation_blend',
    'revision_identity',
    'production_sheet'
  )),
  language TEXT NOT NULL CHECK (language IN ('fa', 'en')),
  snapshot_json TEXT NOT NULL,
  generated_by TEXT,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_mix_revision
  ON report_snapshots(mix_design_id, revision_number, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_type
  ON report_snapshots(mix_design_id, report_type, language, generated_at DESC);
