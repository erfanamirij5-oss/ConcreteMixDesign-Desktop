CREATE TABLE IF NOT EXISTS durability_inputs (
  mix_design_id TEXT PRIMARY KEY,
  freeze_thaw_exposure INTEGER NOT NULL DEFAULT 0,
  freeze_water_exposure TEXT NOT NULL DEFAULT 'limited',
  soil_water_soluble_sulfate_percent REAL,
  water_dissolved_sulfate_ppm REAL,
  seawater_exposure INTEGER NOT NULL DEFAULT 0,
  water_contact INTEGER NOT NULL DEFAULT 0,
  low_permeability_required INTEGER NOT NULL DEFAULT 0,
  moisture_exposure INTEGER NOT NULL DEFAULT 0,
  external_chloride_exposure INTEGER NOT NULL DEFAULT 0,
  reinforced_or_embedded_metal INTEGER NOT NULL DEFAULT 1,
  prestressed_concrete INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);
