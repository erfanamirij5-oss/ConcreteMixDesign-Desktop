# G05 — Universal Material Intelligence

## Objective

Create a shared material-intelligence contract for every concrete-family engine without replacing the existing cementitious, aggregate, admixture, water or compliance modules.

## Architectural rule

Existing engineering modules remain calculation/compliance authorities. G05 adds provenance, confidence and traceability around material properties so downstream design, Advisor, optimization, Trial Mix and Calibration can distinguish real project evidence from defaults.

## Provenance classes

- `lab_measured`
- `supplier_certificate`
- `project_specification`
- `user_declared`
- `reference_default`
- `derived`

Unknown provenance is never promoted to verified evidence.

## Confidence classes

- `verified`
- `material_specific`
- `declared`
- `preliminary`

A material record inherits its lowest property confidence. Any reference/default property therefore prevents the record from being represented as production-verified.

## Material categories

Cement, SCM, fine aggregate, coarse aggregate, water, chemical admixture, fiber, filler and special material are explicit categories. Unsupported categories fail closed instead of being guessed.

## Traceability rules

Laboratory, supplier-certificate and project-specification values should carry a source reference. Missing source references generate deterministic warnings. Duplicate property names are rejected because silent precedence would destroy auditability.

## Scope boundary

This gate intentionally does not introduce new normative numerical limits, change existing ACI/ASTM/EN/ISIRI compliance calculations, alter migrations 001–022, or mutate licensing. Material-specific numerical requirements remain the responsibility of verified standards/rule packs and specialized family engines.

## G06 handoff

Normal/HSC/HPC engines may consume G05 records and must propagate provenance/confidence into calculation outputs. A default/reference value may support preliminary design but must never be presented as validated production material data.
