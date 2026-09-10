CREATE TABLE IF NOT EXISTS material_test_observations (
  id TEXT PRIMARY KEY,
  material_library_id TEXT NOT NULL REFERENCES material_library(id) ON DELETE RESTRICT,
  observed_at TEXT NOT NULL,
  property_key TEXT NOT NULL,
  numeric_value REAL,
  text_value TEXT,
  unit TEXT,
  method_reference TEXT,
  standard_edition TEXT,
  laboratory_name TEXT,
  report_number TEXT,
  evidence_ref TEXT,
  source_kind TEXT NOT NULL DEFAULT 'measured' CHECK (source_kind IN ('measured', 'certificate', 'historical_import')),
  notes TEXT,
  created_at TEXT NOT NULL,
  CHECK ((numeric_value IS NOT NULL AND text_value IS NULL) OR (numeric_value IS NULL AND text_value IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_material_test_observations_material_time
  ON material_test_observations(material_library_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_test_observations_property
  ON material_test_observations(material_library_id, property_key, observed_at DESC);

CREATE TABLE IF NOT EXISTS material_qualification_events (
  id TEXT PRIMARY KEY,
  material_library_id TEXT NOT NULL REFERENCES material_library(id) ON DELETE RESTRICT,
  event_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('qualified', 'needs_review', 'rejected', 'expired')),
  basis TEXT NOT NULL,
  standard_reference TEXT,
  standard_edition TEXT,
  evidence_ref TEXT,
  actor TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_material_qualification_events_material_time
  ON material_qualification_events(material_library_id, event_at DESC);
