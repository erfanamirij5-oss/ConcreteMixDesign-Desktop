-- Production/QC foundation
-- Additive only. No acceptance criteria or standard compliance inference is encoded here.

CREATE TABLE IF NOT EXISTS production_batches (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 0),
  batch_code TEXT NOT NULL,
  produced_at TEXT NOT NULL,
  batch_quantity_m3 REAL NOT NULL CHECK (batch_quantity_m3 > 0),
  plant_name TEXT,
  ticket_number TEXT,
  truck_number TEXT,
  operator_name TEXT,
  slump_mm REAL CHECK (slump_mm IS NULL OR slump_mm >= 0),
  air_content_percent REAL CHECK (air_content_percent IS NULL OR (air_content_percent >= 0 AND air_content_percent <= 100)),
  concrete_temperature_c REAL,
  fresh_density_kg_m3 REAL CHECK (fresh_density_kg_m3 IS NULL OR fresh_density_kg_m3 > 0),
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (mix_design_id, revision_number, batch_code),
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_production_batches_mix_revision
  ON production_batches(mix_design_id, revision_number, produced_at DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS production_material_actuals (
  id TEXT PRIMARY KEY,
  production_batch_id TEXT NOT NULL,
  material_role TEXT NOT NULL CHECK (material_role IN (
    'cement', 'scm', 'water', 'fine_aggregate', 'coarse_aggregate', 'admixture', 'fiber', 'other'
  )),
  material_reference_id TEXT,
  material_name TEXT NOT NULL,
  target_mass_kg REAL CHECK (target_mass_kg IS NULL OR target_mass_kg >= 0),
  batched_mass_kg REAL NOT NULL CHECK (batched_mass_kg >= 0),
  moisture_percent REAL CHECK (moisture_percent IS NULL OR (moisture_percent >= 0 AND moisture_percent <= 100)),
  absorption_percent REAL CHECK (absorption_percent IS NULL OR (absorption_percent >= 0 AND absorption_percent <= 100)),
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (production_batch_id) REFERENCES production_batches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_production_material_actuals_batch
  ON production_material_actuals(production_batch_id, material_role, material_name);

CREATE TABLE IF NOT EXISTS production_specimens (
  id TEXT PRIMARY KEY,
  production_batch_id TEXT NOT NULL,
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
  UNIQUE (production_batch_id, specimen_code),
  FOREIGN KEY (production_batch_id) REFERENCES production_batches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_production_specimens_batch
  ON production_specimens(production_batch_id, target_test_age_days, specimen_code);

CREATE TABLE IF NOT EXISTS production_compressive_strength_results (
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
  FOREIGN KEY (specimen_id) REFERENCES production_specimens(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_production_strength_results_specimen
  ON production_compressive_strength_results(specimen_id, tested_at DESC);
