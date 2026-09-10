# G02D — Final Standards Integration Gate

Status: INTEGRATION AUDIT / FAIL CLOSED

## Purpose
Integrate the G02A, G02B and G02C verification boundaries into one release-level contract for Tolou Concrete Mix Design Suite.

## Inputs
- G02A — ACI 211 normal-weight verification: implementation-safe, exact-edition numerical evidence blocked.
- G02B — ACI 318 durability/exposure verification: implementation-safe, exact-edition numerical/category evidence blocked where not independently authorized.
- G02C — ASTM material/test-method verification: implementation-closed; public identity/scope metadata is separated from exact-edition acceptance evidence.

## Release contract
1. No standards-derived rule may be labelled `verified_exact_edition` unless an authorized exact-edition source locator and regression test exist.
2. Public title/scope metadata may establish standard identity or general scope only.
3. A test-method designation never establishes a standalone acceptance criterion.
4. A material standard designation never proves product compliance by itself.
5. Existing numerical standards-derived behavior that lacks exact-edition evidence remains explicitly `existing_unverified`, `existing_unverified_acceptance`, or `evidence_blocked` and must not be promoted by integration code.
6. Unsupported or insufficiently evidenced paths fail closed to `needs_review`, `unsupported`, or an equivalent non-compliance-claiming state.
7. Engineering-core arithmetic remains deterministic and separate from standards provenance.

## G02D audit targets
- search production and reporting paths for unconditional standards-compliance claims;
- search for any `verified_exact_edition` promotion not backed by evidence metadata;
- verify ACI/ASTM identifiers are not treated as executable authority merely because they appear in a registry or payload;
- verify reports preserve the distinction between calculation result, method evidence, acceptance basis and verification state;
- add regression tests for the integrated fail-closed contract where a real gap is found.

## Exit rule
G02D closes only when the integrated production/reporting surface cannot promote an evidence-blocked ACI/ASTM rule to verified compliance, and the exact branch head passes CI Validation, Release Acceptance and License Manager Windows Gate.
