# G02C — ASTM Material / Test-Method Pack

Status: FOUNDATION / VERIFICATION IN PROGRESS

## Purpose
Build a traceable ASTM material/test-method layer for Tolou Concrete Mix Design Suite without hard-coding standards-derived acceptance rules from memory or inference.

## Scope
G02C covers ASTM references used by the engineering engine for concrete constituent materials, durability inputs, and laboratory/test evidence. The pack must distinguish three things explicitly:

1. standard identity and scope;
2. test-method provenance supplied by the user/laboratory;
3. standards-derived acceptance criteria that require exact-edition evidence before they can be marked verified.

## Initial audit domains
- cementitious materials and binder-related ASTM designations;
- aggregates and aggregate test methods;
- mixing-water test methods and chemistry data;
- chemical admixtures and material declarations;
- chloride test methods and source provenance;
- sulfate test methods and source provenance;
- ASR-related material/test evidence;
- density, specific gravity, absorption, moisture and other material characterization inputs already used by the engine.

## Verification states
- `engineering_core`: deterministic arithmetic, unit conversion, aggregation or validation independent of a standards table;
- `existing_unverified`: current executable standards-derived behavior that has not yet been closed against exact-edition evidence;
- `verified_identity_scope`: official/public metadata confirms standard identity and general scope only;
- `verified_exact_edition`: exact edition/source locator has been checked and is covered by independent tests;
- `evidence_blocked`: implementation is safe/fail-closed but exact-edition evidence is not currently available.

## Hard rules
- Never infer a laboratory test method from a field name such as `chloride_percent` or `sulfate_mg_l`.
- Never treat a generic laboratory report number as method-specific provenance unless explicitly mapped by the user/data source.
- Never promote an ASTM acceptance rule to verified using public title/scope metadata alone.
- Preserve source identity, method, edition, evidence reference, value, unit and basis through engine output and immutable report snapshots where applicable.
- Do not break existing working product behavior merely to satisfy documentation structure; unsafe acceptance paths must instead fail closed or return `needs_review`.

## G02C implementation sequence
1. inventory every ASTM reference currently present in production code;
2. classify each reference as identity-only, test-method provenance, acceptance rule, or engineering-core support;
3. create a machine-readable verification registry/evidence manifest;
4. close unsafe inference/default behavior;
5. add exact-node/boundary/golden tests only where evidence supports them;
6. expose verification state in engineering output where relevant;
7. require exact-head CI, Windows gate and Release Acceptance to be green before closure.

## Exit rule
G02C closes when every ASTM-related production rule is either backed by traceable exact-edition evidence and tests or explicitly isolated as `evidence_blocked` / `existing_unverified` with no false verified-compliance claim.
