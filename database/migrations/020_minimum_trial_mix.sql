CREATE TABLE IF NOT EXISTS trial_mix_records (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  trial_date TEXT NOT NULL,
  batch_quantity_m3 REAL NOT NULL CHECK (batch_quantity_m3 > 0),
  actual_slump_mm REAL NOT NULL CHECK (actual_slump_mm >= 0),
  air_content_percent REAL NOT NULL CHECK (air_content_percent >= 0 AND air_content_percent <= 100),
  concrete_temperature_c REAL NOT NULL,
  fresh_density_kg_m3 REAL NOT NULL CHECK (fresh_density_kg_m3 > 0),
  strength_7d_mpa REAL CHECK (strength_7d_mpa IS NULL OR strength_7d_mpa >= 0),
  strength_28d_mpa REAL CHECK (strength_28d_mpa IS NULL OR strength_28d_mpa >= 0),
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trial_mix_records_mix_design
  ON trial_mix_records(mix_design_id, trial_date DESC, created_at DESC);
