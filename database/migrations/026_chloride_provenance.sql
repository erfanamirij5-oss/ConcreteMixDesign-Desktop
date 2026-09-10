-- G02B chloride provenance foundation.
-- Numerical chloride values are not standards evidence by themselves; retain method,
-- exact edition and evidence reference with every material chloride result.
ALTER TABLE materials ADD COLUMN chloride_test_method TEXT;
ALTER TABLE materials ADD COLUMN chloride_test_edition TEXT;
ALTER TABLE materials ADD COLUMN chloride_evidence_ref TEXT;
