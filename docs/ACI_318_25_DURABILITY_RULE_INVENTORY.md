# G02B — ACI CODE-318-25 Durability / Exposure Rule Inventory

Status: FOUNDATION / NUMERICAL CERTIFICATION BLOCKED

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

## Safety boundary
Presence of an ACI 318-25 table/section label in the code does **not** constitute verification. Existing numerical values, category thresholds, exceptions, notes, interpolation/snap policy, and applicability conditions remain unverified until compared to an authorized exact-edition source and covered by independent golden/boundary tests.

## Known audit concerns
1. `air_requirement()` currently snaps a non-tabulated NMSA to the nearest table key.
2. Exposure classification helpers contain implicit defaults that must be checked against exact code applicability and required project inputs.
3. Chloride limits and sulfate restrictions are executable acceptance logic and therefore require exact-edition source closure.
4. Governing-combination arithmetic can be verified independently from standards-derived inputs.

## G02B exit criteria
G02B may close only when:
- exact ACI CODE-318-25 source locators are recorded for every executable standards-derived rule;
- every numerical/category rule is either `verified_exact_edition` or explicitly fail-closed / disabled from compliance claims;
- exact-node and boundary tests are independently derived from authorized evidence;
- implicit snapping/default behavior is either justified by evidence or removed from the compliance path;
- production output exposes machine-readable rule verification state and exact standard identity;
- exact-head CI / Windows gates are green.
