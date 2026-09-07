CREATE TABLE IF NOT EXISTS trial_mix_batch_components (
  id TEXT PRIMARY KEY,
  trial_mix_record_id TEXT NOT NULL,
  material_role TEXT NOT NULL CHECK (material_role IN ('cement','scm','water','fine_aggregate','coarse_aggregate','admixture','fiber','other')),
  material_snapshot_id TEXT,
  material_name_snapshot TEXT,
  designed_mass_kg REAL CHECK (designed_mass_kg IS NULL OR designed_mass_kg >= 0),
  actual_mass_kg REAL CHECK (actual_mass_kg IS NULL OR actual_mass_kg >= 0),
  designed_dosage REAL CHECK (designed_dosage IS NULL OR designed_dosage >= 0),
  actual_dosage REAL CHECK (actual_dosage IS NULL OR actual_dosage >= 0),
  dosage_unit TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (trial_mix_record_id) REFERENCES trial_mix_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trial_mix_batch_components_record
  ON trial_mix_batch_components(trial_mix_record_id, material_role);

CREATE TABLE IF NOT EXISTS trial_mix_targets (
  trial_mix_record_id TEXT PRIMARY KEY,
  target_slump_mm REAL CHECK (target_slump_mm IS NULL OR target_slump_mm >= 0),
  target_air_content_percent REAL CHECK (target_air_content_percent IS NULL OR (target_air_content_percent >= 0 AND target_air_content_percent <= 100)),
  target_fresh_density_kg_m3 REAL CHECK (target_fresh_density_kg_m3 IS NULL OR target_fresh_density_kg_m3 > 0),
  target_strength_7d_mpa REAL CHECK (target_strength_7d_mpa IS NULL OR target_strength_7d_mpa >= 0),
  target_strength_28d_mpa REAL CHECK (target_strength_28d_mpa IS NULL OR target_strength_28d_mpa >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (trial_mix_record_id) REFERENCES trial_mix_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trial_mix_strength_specimens (
  id TEXT PRIMARY KEY,
  trial_mix_record_id TEXT NOT NULL,
  age_days INTEGER NOT NULL CHECK (age_days > 0),
  specimen_label TEXT,
  specimen_type TEXT,
  measured_strength_mpa REAL CHECK (measured_strength_mpa IS NULL OR measured_strength_mpa >= 0),
  tested_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (trial_mix_record_id) REFERENCES trial_mix_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trial_mix_strength_specimens_record
  ON trial_mix_strength_specimens(trial_mix_record_id, age_days, created_at);

CREATE TABLE IF NOT EXISTS trial_mix_evaluations (
  trial_mix_record_id TEXT PRIMARY KEY,
  outcome TEXT NOT NULL CHECK (outcome IN ('pending','pass','needs_adjustment','fail')),
  slump_deviation_mm REAL,
  air_deviation_percent REAL,
  fresh_density_deviation_kg_m3 REAL,
  strength_7d_deviation_mpa REAL,
  strength_28d_deviation_mpa REAL,
  interpretation TEXT,
  evaluated_by TEXT,
  evaluated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (trial_mix_record_id) REFERENCES trial_mix_records(id) ON DELETE CASCADE
);
