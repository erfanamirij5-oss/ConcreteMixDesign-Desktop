CREATE TABLE material_library_v2 (
  id TEXT PRIMARY KEY,
  material_type TEXT NOT NULL CHECK (material_type IN ('cement', 'scm', 'fine_aggregate', 'coarse_aggregate', 'water', 'admixture', 'fiber', 'other_addition')),
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

INSERT INTO material_library_v2 (
  id, material_type, name, material_subtype, manufacturer, source, product_code,
  standard_designation, status, test_date, valid_until, laboratory_name,
  laboratory_report_number, properties_json, notes, created_at, updated_at
)
SELECT
  id, material_type, name, material_subtype, manufacturer, source, product_code,
  standard_designation, status, test_date, valid_until, laboratory_name,
  laboratory_report_number, properties_json, notes, created_at, updated_at
FROM material_library;

DROP TABLE material_library;
ALTER TABLE material_library_v2 RENAME TO material_library;

CREATE INDEX idx_material_library_type_status
  ON material_library(material_type, status);
CREATE INDEX idx_material_library_name
  ON material_library(name);
