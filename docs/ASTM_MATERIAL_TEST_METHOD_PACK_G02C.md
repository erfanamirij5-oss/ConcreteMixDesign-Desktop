# G02C — ASTM Material / Test-Method Pack

Status: IMPLEMENTATION-CLOSED / EXACT-EDITION EVIDENCE BLOCKED

## Purpose
Build a traceable ASTM material/test-method layer for Tolou Concrete Mix Design Suite without hard-coding standards-derived acceptance rules from memory or inference.

## Scope
G02C covers ASTM references used by the engineering engine for concrete constituent materials, durability inputs, and laboratory/test evidence. The pack explicitly separates:

1. standard identity and public scope metadata;
2. test-method provenance supplied by the user/laboratory;
3. standards-derived acceptance criteria requiring authorized exact-edition evidence.

## Closed implementation domains
- cementitious product designations are separated from verified product acceptance;
- aggregate test-method identity is separated from specification/project acceptance authority;
- ASR C1260/C1293/C1567 test evidence is separated from C1778 guidance and exact-edition acceptance authority;
- mixing water C1602 specification identity is separated from C1603 measurement-method identity;
- chemical admixture C494/C260 designation identity is separated from verified product qualification;
- chloride/sulfate and related laboratory values remain evidence-bearing inputs and do not become method-specific provenance by field name alone;
- the machine-readable registry inventories verified-public-metadata references and explicitly marks unresolved editions as `existing_unverified_edition`.

## Verification states
- `engineering_core`: deterministic arithmetic, unit conversion, aggregation or validation independent of a standards table;
- `existing_unverified` / `existing_unverified_edition`: current standards-derived behavior or reference whose exact edition has not been closed;
- `identity_scope_verified_public_metadata`: official/public metadata confirms designation identity and general scope only;
- `verified_exact_edition`: reserved for an authorized exact edition/source locator checked against independent tests;
- `evidence_blocked_exact_edition_required`: safe boundary exists but exact-edition acceptance evidence is unavailable.

## Hard rules
- Never infer a laboratory test method from a field name.
- Never treat a generic laboratory report number as method-specific provenance unless explicitly mapped.
- Never promote an ASTM numerical acceptance rule to verified using public title/scope metadata alone.
- A test method does not, by itself, establish a pass/fail acceptance criterion.
- A standard designation on a material record does not, by itself, prove product compliance.
- Preserve source identity, method, edition, evidence reference, value, unit and basis through engineering output/reporting where applicable.
- Do not break working product behavior to satisfy documentation structure; uncertain standards-derived acceptance remains fail-closed or `needs_review`.

## Evidence debt retained outside implementation closure
Existing executable numerical behavior in modules such as mixing-water and ASR compliance is not certified here as exact-edition ASTM acceptance. Public ASTM metadata confirms that C1602 is a mixing-water specification, C1603 is a solids-in-water test method, C494/C260 are admixture specifications, C1260/C1293/C1567 are ASR test methods and C1778 is guidance. Exact numerical tables, qualification frequencies, categories and acceptance relationships remain evidence debt until an authorized exact-edition source is supplied and traced.

## Exit rule
Implementation closure is achieved when every ASTM-related production path is either exact-edition verified or isolated behind an explicit evidence boundary that prevents a false `verified_exact_edition` claim. Final G02C gate closure additionally requires exact-head CI Validation, Release Acceptance and License Manager Windows Gate to be green.
