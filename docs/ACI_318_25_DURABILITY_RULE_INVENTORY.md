# G02B — ACI CODE-318-25 Durability / Exposure Rule Inventory

Status: IMPLEMENTATION CLOSED / EXACT-EDITION NUMERICAL CERTIFICATION EVIDENCE-BLOCKED

## Authoritative identity
- Authority: American Concrete Institute (ACI)
- Committee: ACI Committee 318
- Designation: ACI CODE-318-25
- Title: Building Code for Structural Concrete — Code Requirements and Commentary
- Publication year: 2025
- Official ACI public metadata confirms durability is within code scope.

## Existing production implementation under audit
`engine/python/src/tolou_mix_engine/durability.py`

The current engine contains executable behavior labelled against ACI 318-25 for:

| Rule key | Existing behavior | Current verification state |
|---|---|---|
| `ACI318.EXPOSURE.FREEZE_THAW.CLASSIFY` | F0/F1/F2 classification | `existing_unverified` |
| `ACI318.EXPOSURE.SULFATE.CLASSIFY` | S0/S1/S2/S3 classification from sulfate/seawater inputs | `existing_unverified` |
| `ACI318.EXPOSURE.WATER.CLASSIFY` | W0/W1/W2 classification | `existing_unverified` |
| `ACI318.EXPOSURE.CORROSION.CLASSIFY` | C0/C1/C2 classification | `existing_unverified` |
| `ACI318.DURABILITY.WCM_STRENGTH` | max w/cm and minimum strength lookup by exposure class | `existing_unverified` |
| `ACI318.DURABILITY.AIR` | target air lookup by freeze-thaw class and NMSA | `existing_unverified` |
| `ACI318.DURABILITY.CHLORIDE_LIMIT` | chloride limit lookup by corrosion class / prestress state | `existing_unverified` |
| `ACI318.DURABILITY.SULFATE_BINDER` | sulfate cementitious restrictions / CaCl2 policy | `existing_unverified` |
| `ACI318.DURABILITY.GOVERNING_COMBINATION` | deterministic minimum max-w/cm + maximum minimum-strength aggregation | `engineering_core` |
| `ACI318.DURABILITY.PSI_TO_MPA` | deterministic unit conversion | `engineering_core` |

## Implementation closure achieved in G02B
The software-side safety and traceability work for this gate is complete:
- active exposure inputs fail closed when dependent evidence is missing or contradictory;
- F1/F2 durability-air lookup refuses non-tabulated NMSA instead of nearest-node snapping;
- ACI 318 verification state and exact profile identity are machine-readable in production output;
- standards-derived rules cannot be promoted to VERIFIED unless exact-edition evidence is closed;
- sulfate numerical inputs require explicit method / edition / evidence provenance before the current classifier path is used;
- sulfate acceptance routes remain `needs_review` until exact-edition acceptance relationships are verified;
- chloride source provenance is persisted end-to-end from material storage through engine payload, source breakdown, calculation persistence and immutable report snapshots;
- chloride mass balance remains deterministic engineering-core arithmetic;
- chloride standards acceptance cannot return `pass` when any active numerical chloride source lacks test method, exact edition or evidence reference;
- missing provenance does not alter the numerical mass balance; it downgrades standards acceptance to `needs_review`;
- ACI chloride numerical limits remain `existing_unverified` and are not promoted by the provenance implementation;
- exact-head CI Validation, Release Acceptance and License Manager Windows Gate are green at implementation closure head `67dd822dfd131ef56120adea9bf38a5c156b4f83`.

## Evidence boundary
Presence of an ACI 318-25 table/section label in the code does **not** constitute exact-edition verification. Existing numerical values, category thresholds, exceptions, notes and applicability conditions remain unverified until compared against an authorized exact-edition source and independently tested from that evidence.

Public ACI metadata is sufficient to establish document identity and scope only. It is not treated as authority for numerical/category acceptance rules.

## Remaining blocker classification
The remaining G02B blockers are **evidence blockers, not implementation blockers**:
- authorized exact-edition ACI CODE-318-25 source locators for F/S/W/C classification rules;
- authorized exact-edition source locators for max w/cm, minimum strength, air-content requirements, chloride limits and sulfate material restrictions/exceptions;
- independent golden/boundary cases derived from those authorized source locators before any rule is promoted to `verified_exact_edition`.

These blockers must not trigger additional speculative production coding. When authorized evidence becomes available, verification-state promotion and evidence-derived tests may be added without redesigning the current implementation boundary.

## G02B disposition
**Implementation status: CLOSED.**

**Standards certification status: EVIDENCE-BLOCKED.**

G02B may therefore hand off to G02C while retaining the unresolved exact-edition verification items as explicit evidence debt. No ACI 318-25 standards-derived numerical/category rule is claimed VERIFIED until that debt is closed.
