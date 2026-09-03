CREATE TABLE IF NOT EXISTS aggregate_gradation_controls (
  material_id TEXT PRIMARY KEY,
  manual_limit_override INTEGER NOT NULL DEFAULT 0,
  manual_blend_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

CREATE TABLE IF NOT EXISTS aggregate_blend_shares (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  material_name TEXT NOT NULL,
  share_percent REAL NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);
