-- Trial Mix v2 foundation
-- Additive only: preserves migration 020 and the existing trial_mix_records workflow invariant.

CREATE TABLE IF NOT EXISTS trial_mix_sessions (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 0),
  session_code TEXT NOT NULL,
  trial_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'void')),
  objective TEXT,
  location TEXT,
  lead_engineer TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (mix_design_id, revision_number, session_code),
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trial_mix_sessions_mix_revision
  ON trial_mix_sessions(mix_design_id, revision_number, trial_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS trial_mix_session_records (
  session_id TEXT NOT NULL,
  trial_mix_record_id TEXT NOT NULL UNIQUE,
  batch_sequence INTEGER NOT NULL CHECK (batch_sequence > 0),
  linked_at TEXT NOT NULL,
  PRIMARY KEY (session_id, batch_sequence),
  FOREIGN KEY (session_id) REFERENCES trial_mix_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (trial_mix_record_id) REFERENCES trial_mix_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trial_mix_session_records_record
  ON trial_mix_session_records(trial_mix_record_id);

CREATE TABLE IF NOT EXISTS trial_mix_material_actuals (
  id TEXT PRIMARY KEY,
  trial_mix_record_id TEXT NOT NULL,
  material_role TEXT NOT NULL CHECK (material_role IN (
    'cement', 'scm', 'water', 'fine_aggregate', 'coarse_aggregate', 'admixture', 'fiber', 'other'
  )),
  material_reference_id TEXT,
  material_name TEXT NOT NULL,
  target_mass_kg REAL CHECK (target_mass_kg IS NULL OR target_mass_kg >= 0),
  batched_mass_kg REAL NOT NULL CHECK (batched_mass_kg >= 0),
  moisture_percent REAL CHECK (moisture_percent IS NULL OR (moisture_percent >= 0 AND moisture_percent <= 100)),
  absorption_percent REAL CHECK (absorption_percent IS NULL OR (absorption_percent >= 0 AND absorption_percent <= 100)),
  moisture_correction_kg REAL,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (trial_mix_record_id) REFERENCES trial_mix_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trial_mix_material_actuals_record
  ON trial_mix_material_actuals(trial_mix_record_id, material_role, material_name);

CREATE TABLE IF NOT EXISTS trial_mix_specimens (
  id TEXT PRIMARY KEY,
  trial_mix_record_id TEXT NOT NULL,
  specimen_code TEXT NOT NULL,
  specimen_type TEXT NOT NULL CHECK (specimen_type IN ('cube', 'cylinder', 'beam', 'other')),
  cast_at TEXT NOT NULL,
  target_test_age_days INTEGER CHECK (target_test_age_days IS NULL OR target_test_age_days > 0),
  width_mm REAL CHECK (width_mm IS NULL OR width_mm > 0),
  height_mm REAL CHECK (height_mm IS NULL OR height_mm > 0),
  length_mm REAL CHECK (length_mm IS NULL OR length_mm > 0),
  diameter_mm REAL CHECK (diameter_mm IS NULL OR diameter_mm > 0),
  curing_condition TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (trial_mix_record_id, specimen_code),
  FOREIGN KEY (trial_mix_record_id) REFERENCES trial_mix_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trial_mix_specimens_record
  ON trial_mix_specimens(trial_mix_record_id, target_test_age_days, specimen_code);

CREATE TABLE IF NOT EXISTS trial_mix_compressive_strength_results (
  id TEXT PRIMARY KEY,
  specimen_id TEXT NOT NULL,
  tested_at TEXT NOT NULL,
  test_age_days REAL NOT NULL CHECK (test_age_days >= 0),
  maximum_load_kn REAL NOT NULL CHECK (maximum_load_kn > 0),
  loaded_area_mm2 REAL NOT NULL CHECK (loaded_area_mm2 > 0),
  strength_mpa REAL NOT NULL CHECK (strength_mpa > 0),
  calculation_method TEXT NOT NULL DEFAULT 'strength_mpa = maximum_load_kn * 1000 / loaded_area_mm2',
  standard_reference TEXT,
  machine_reference TEXT,
  failure_mode TEXT,
  tested_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  CHECK (ABS(strength_mpa - ((maximum_load_kn * 1000.0) / loaded_area_mm2)) <= 0.05),
  FOREIGN KEY (specimen_id) REFERENCES trial_mix_specimens(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trial_mix_compressive_results_specimen
  ON trial_mix_compressive_strength_results(specimen_id, tested_at DESC);
