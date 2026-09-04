ALTER TABLE materials ADD COLUMN astm_d4791_flat_elongated_percent REAL;
ALTER TABLE materials ADD COLUMN flat_elongated_limit_percent REAL;
ALTER TABLE materials ADD COLUMN astm_d4791_dimensional_ratio TEXT;
ALTER TABLE materials ADD COLUMN astm_d5821_fractured_particles_percent REAL;
ALTER TABLE materials ADD COLUMN fractured_particles_min_percent REAL;
ALTER TABLE materials ADD COLUMN fractured_faces_required INTEGER;
ALTER TABLE materials ADD COLUMN shape_texture_evidence_ref TEXT;
