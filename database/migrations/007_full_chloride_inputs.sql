-- Inputs required for full mixture chloride accounting.
ALTER TABLE materials ADD COLUMN chloride_mg_l REAL;
ALTER TABLE materials ADD COLUMN water_share_percent REAL;
