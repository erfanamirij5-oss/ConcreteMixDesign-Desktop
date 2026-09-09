CREATE TABLE IF NOT EXISTS mix_cost_input_sets (
  id TEXT PRIMARY KEY,
  mix_design_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 0),
  currency TEXT NOT NULL CHECK (length(trim(currency)) BETWEEN 3 AND 12),
  source_reference TEXT,
  effective_at TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (mix_design_id) REFERENCES mix_designs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mix_cost_input_sets_revision
  ON mix_cost_input_sets(mix_design_id, revision_number, created_at DESC);

CREATE TABLE IF NOT EXISTS mix_cost_input_items (
  id TEXT PRIMARY KEY,
  input_set_id TEXT NOT NULL,
  cost_role TEXT NOT NULL CHECK (cost_role IN ('cementitious', 'water', 'fine_aggregate', 'coarse_aggregate')),
  unit_cost_per_kg REAL NOT NULL CHECK (unit_cost_per_kg >= 0),
  FOREIGN KEY (input_set_id) REFERENCES mix_cost_input_sets(id) ON DELETE CASCADE,
  UNIQUE (input_set_id, cost_role)
);

CREATE INDEX IF NOT EXISTS idx_mix_cost_input_items_set
  ON mix_cost_input_items(input_set_id, cost_role);
