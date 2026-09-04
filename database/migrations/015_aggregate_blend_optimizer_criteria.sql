CREATE TABLE IF NOT EXISTS aggregate_blend_optimizer_settings (
  mix_design_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  step_percent REAL NOT NULL DEFAULT 5.0,
  fine_share_min_percent REAL,
  fine_share_max_percent REAL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS aggregate_blend_constraints (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  min_percent REAL,
  max_percent REAL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aggregate_blend_constraints_mix_design
  ON aggregate_blend_constraints(mix_design_id);

CREATE TABLE IF NOT EXISTS combined_gradation_limits (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  sieve_size_mm REAL NOT NULL,
  lower_percent REAL,
  upper_percent REAL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_combined_gradation_limits_mix_sieve
  ON combined_gradation_limits(mix_design_id, sieve_size_mm);
