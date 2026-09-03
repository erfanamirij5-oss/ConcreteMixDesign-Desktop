CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  city TEXT,
  location_description TEXT,
  structure_type TEXT,
  element_type TEXT,
  client_name TEXT,
  contractor_name TEXT,
  consultant_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS laboratories (
  id TEXT PRIMARY KEY,
  lab_name TEXT NOT NULL,
  license_number TEXT,
  address TEXT,
  phone TEXT,
  logo_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS designers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT,
  license_or_membership_number TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mix_designs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  laboratory_id TEXT,
  designer_id TEXT,
  concrete_type TEXT NOT NULL,
  target_strength_mpa REAL,
  required_slump_mm REAL,
  max_aggregate_size_mm REAL,
  exposure_summary TEXT,
  status TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  standards_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (laboratory_id) REFERENCES laboratories(id),
  FOREIGN KEY (designer_id) REFERENCES designers(id)
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  material_type TEXT NOT NULL,
  name TEXT NOT NULL,
  source TEXT,
  specific_gravity REAL,
  absorption_percent REAL,
  moisture_percent REAL,
  unit_weight_kg_m3 REAL,
  notes TEXT,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id)
);

CREATE TABLE IF NOT EXISTS aggregate_sieve_results (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL,
  sieve_size_mm REAL NOT NULL,
  percent_passing REAL NOT NULL,
  standard_min REAL,
  standard_max REAL,
  status TEXT NOT NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

CREATE TABLE IF NOT EXISTS mix_results (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  cementitious_content_kg_m3 REAL,
  water_content_kg_m3 REAL,
  w_cm_ratio REAL,
  fine_aggregate_kg_m3 REAL,
  coarse_aggregate_kg_m3 REAL,
  admixtures_json TEXT,
  air_content_percent REAL,
  density_kg_m3 REAL,
  notes TEXT,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id)
);

CREATE TABLE IF NOT EXISTS durability_checks (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  check_name TEXT NOT NULL,
  exposure_class TEXT,
  requirement TEXT,
  actual_value TEXT,
  status TEXT NOT NULL,
  reference_standard TEXT NOT NULL,
  explanation TEXT,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id)
);

CREATE TABLE IF NOT EXISTS ai_prompts (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id)
);
