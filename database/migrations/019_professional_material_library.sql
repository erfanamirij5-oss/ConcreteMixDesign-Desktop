CREATE TABLE IF NOT EXISTS material_library (
  id TEXT PRIMARY KEY,
  material_type TEXT NOT NULL CHECK (material_type IN ('cement', 'scm', 'fine_aggregate', 'coarse_aggregate', 'water', 'admixture')),
  name TEXT NOT NULL,
  material_subtype TEXT,
  manufacturer TEXT,
  source TEXT,
  product_code TEXT,
  standard_designation TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'inactive')),
  test_date TEXT,
  valid_until TEXT,
  laboratory_name TEXT,
  laboratory_report_number TEXT,
  properties_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_material_library_type_status
  ON material_library(material_type, status);
CREATE INDEX IF NOT EXISTS idx_material_library_name
  ON material_library(name);

ALTER TABLE materials ADD COLUMN library_material_id TEXT REFERENCES material_library(id) ON DELETE SET NULL;
ALTER TABLE materials ADD COLUMN library_snapshot_json TEXT;
ALTER TABLE materials ADD COLUMN library_snapshot_at TEXT;

CREATE INDEX IF NOT EXISTS idx_materials_library_material_id
  ON materials(library_material_id);
