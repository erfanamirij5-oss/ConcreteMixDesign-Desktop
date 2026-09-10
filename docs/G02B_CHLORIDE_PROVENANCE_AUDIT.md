# G02B — Chloride Provenance Audit

## Scope
Audit Tolou's current full-mixture chloride path before any ACI CODE-318-25 chloride rule is promoted to verified status.

## Current executable path
`engine/python/src/tolou_mix_engine/chloride_compliance.py` currently aggregates chloride contributions from:
- cementitious materials via `chloride_percent`;
- aggregates via `chloride_percent`;
- chemical admixtures via the chloride mass already calculated by `admixture_compliance.py`;
- mixing-water sources via `chloride_mg_l` and source share.

The deterministic mass-balance arithmetic is engineering-core behavior. The governing ACI chloride limit remains standards-derived and `existing_unverified` until authorized exact-edition evidence closure.

## Provenance gap found
The present material contract stores numerical chloride values but does not carry a dedicated chloride test-method/edition/evidence tuple with each numerical result.

Current fields under audit include:
- `chloride_percent`
- `chloride_mg_l`

Current persistence/type surfaces do not expose dedicated fields equivalent to:
- `chloride_test_method`
- `chloride_test_edition`
- `chloride_evidence_ref`

As a result, a stored chloride number can currently contribute to the mixture total without proving how that number was measured or documented.

## Unsafe inference explicitly prohibited
A numeric `chloride_percent` or `chloride_mg_l` must not be treated as proof that a particular ASTM method was used.

In particular, references presently rendered by the engine such as `ASTM C1218/C1218M` or `ASTM C1602/C1602M` are standards context only. They must not be interpreted as the laboratory provenance of a specific source result unless the source record carries that method/edition/evidence explicitly.

## Production contract required before VERIFIED acceptance
For each active chloride source that contributes to the total, Tolou should retain:
- source category and material identity;
- measured chloride value and unit/basis;
- test method designation;
- exact method edition;
- laboratory/certificate evidence reference;
- sample/report date when available;
- calculation contribution in kg/m3;
- downstream percent by mass of cementitious materials;
- ACI CODE-318-25 exact-edition locator for the governing acceptance relationship.

## Implementation order
1. Extend material/library persistence with chloride provenance fields without changing existing chloride numerical values.
2. Thread the fields through renderer → typed IPC → Electron main/store → engine payload.
3. Preserve the provenance tuple in `source_breakdown` and immutable `engineeringOutput`/report snapshots.
4. Only after the end-to-end path is available, fail closed or downgrade final chloride acceptance when an active chloride source lacks provenance.
5. Keep ACI chloride limits `existing_unverified` until authorized exact-edition ACI evidence and independent boundary tests are closed.

## Regression rule
Do not immediately require new provenance fields before the desktop persistence/UI path exists. Doing so would convert previously valid saved projects into unexplained failures and violate the project's `DO NOT BREAK A WORKING PRODUCT` rule. Introduce the end-to-end data contract first, then activate fail-closed enforcement with explicit migration/backward-compatibility semantics.

## Verification state
- Chloride mass-balance arithmetic: engineering-core, independently testable.
- Material chloride provenance: incomplete contract; remediation required.
- ACI CODE-318-25 chloride acceptance limit: `existing_unverified`.
- ASTM method applicability for any specific stored result: not inferred from the number alone.
