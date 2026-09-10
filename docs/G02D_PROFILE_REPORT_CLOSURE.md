# G02D — Standard Profile / Report Closure

Status: FOUNDATION / FAIL-CLOSED INTEGRATION AUDIT

## Purpose
Close Gate 02 at the profile and reporting boundary without upgrading any ACI/ASTM rule beyond its recorded evidence state.

G02D integrates the outcomes of G02A, G02B and G02C. It does not introduce new numerical limits, table values, categories, interpolation rules, or acceptance criteria.

## Current Gate 02 evidence state
- G02A — ACI 211 normal-weight proportioning: implementation/audit boundary exists; exact-edition numerical verification remains evidence-blocked.
- G02B — ACI 318 durability/exposure: implementation safety and provenance boundary closed; exact-edition numerical/category verification remains evidence-blocked.
- G02C — ASTM material/test-method pack: implementation closed; exact-edition acceptance evidence remains blocked where authoritative numerical evidence is unavailable.

## G02D profile contract
A Standard Profile may advertise a rule as `verified_exact_edition` only when the rule has all of the following:
1. authoritative publisher/source;
2. exact designation and edition;
3. reproducible source locator;
4. applicability/exclusion contract;
5. implementation rule key and code owner;
6. independent golden/boundary tests;
7. output/report traceability;
8. recorded verification status and review evidence.

If any item is absent, the profile must not advertise exact-edition verified coverage for that rule.

## Reporting contract
Reports and engineering outputs may expose:
- selected profile identity/version;
- standard/reference identifiers used as metadata;
- engineering rule keys;
- verification/evidence state;
- warnings and review requirements.

They must not convert `existing_unverified`, `existing_unverified_edition`, `identity_scope_verified_public_metadata`, `evidence_blocked_exact_edition_required`, test-method identity, or user/project acceptance inputs into a claim of exact-edition standards compliance.

## Integration invariants
- Presence of `ACI`, `ASTM`, a designation, or an edition string is not proof of verified compliance.
- A test method is evidence provenance, not an acceptance criterion by itself.
- A material specification designation is product identity unless qualification evidence is explicitly traced.
- Existing executable numerical behavior remains unchanged unless exact-edition evidence and regression tests authorize a change.
- Unsupported/evidence-blocked coverage fails closed and remains visible to the reviewer.
- No G02D implementation may weaken the accepted v1.0.1 product baseline or privileged-process architecture.

## Closure audit
Before G02D is implementation-closed:
1. inventory the profile/payload/report surfaces that expose ACI/ASTM coverage;
2. identify any path that can imply `VERIFIED` or standards compliance from identifier presence alone;
3. add the smallest safe guard/contract needed to prevent false promotion;
4. add regression tests for the profile/report claim boundary;
5. run exact-head CI Validation, Release Acceptance and License Manager Windows Gate.

## Exit rule
G02D is implementation-closed when the product can represent the current ACI/ASTM evidence state without false exact-edition verification claims, all claim-boundary regression tests pass, and the exact branch head is green on all required gates.

Exact-edition evidence debt may remain open after implementation closure; it must remain explicitly classified and must not be silently promoted.