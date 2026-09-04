-- Engineering properties for binders, SCMs, chemical admixtures and fibers.
-- Kept on the material record so each source/product can be traced independently.
ALTER TABLE materials ADD COLUMN material_subtype TEXT;
ALTER TABLE materials ADD COLUMN standard_designation TEXT;
ALTER TABLE materials ADD COLUMN density_kg_m3 REAL;
ALTER TABLE materials ADD COLUMN dosage_value REAL;
ALTER TABLE materials ADD COLUMN dosage_unit TEXT;
ALTER TABLE materials ADD COLUMN binder_share_percent REAL;
ALTER TABLE materials ADD COLUMN replacement_percent REAL;
ALTER TABLE materials ADD COLUMN solids_percent REAL;
ALTER TABLE materials ADD COLUMN chloride_percent REAL;
ALTER TABLE materials ADD COLUMN alkali_percent REAL;
ALTER TABLE materials ADD COLUMN loss_on_ignition_percent REAL;
ALTER TABLE materials ADD COLUMN activity_index_percent REAL;
ALTER TABLE materials ADD COLUMN manufacturer TEXT;
ALTER TABLE materials ADD COLUMN product_code TEXT;
