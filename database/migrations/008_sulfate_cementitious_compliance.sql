-- Structured sulfate-resistance qualification for cementitious systems.
ALTER TABLE materials ADD COLUMN sulfate_resistance_class TEXT;
ALTER TABLE materials ADD COLUMN sulfate_qualification_method TEXT;
ALTER TABLE materials ADD COLUMN astm_c1012_expansion_6m_percent REAL;
ALTER TABLE materials ADD COLUMN astm_c1012_expansion_12m_percent REAL;
ALTER TABLE materials ADD COLUMN sulfate_performance_evidence_ref TEXT;
