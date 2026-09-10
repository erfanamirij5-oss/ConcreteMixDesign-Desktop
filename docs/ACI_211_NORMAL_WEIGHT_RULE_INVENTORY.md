# G02A — ACI PRC-211.1-22 Normal-Weight Executable Rule Inventory

Status: SOURCE-BOUND AUDIT; NO RULE IS PROMOTED TO VERIFIED BY THIS DOCUMENT ALONE.

Authoritative public metadata source: American Concrete Institute, ACI PRC-211.1-22, *Selecting Proportions for Normal-Density and High-Density Concrete—Guide*, publication year 2022. ACI's public description confirms that the guide covers selection/adjustment of mixture proportions, absolute-volume calculations, aggregate gradation, workability, strength, durability, chemical admixtures, SCMs and trial batching. The public table of contents identifies Chapter 5 as the proportion-selection procedure and Chapter 8 as trial batching. Numerical tables/clauses that are not exposed by an authorized source are not reproduced here and are not independently certified by this audit.

## Runtime path

`calculate-normal-mix` → `validate_normal_mix_request()` → `calculate_integrated_normal_mix()` → `calculate_normal_weight_mix()`.

The normal-weight core is `engine/python/src/tolou_mix_engine/mix_design/normal_weight.py`.

## Executable inventory

| Tolou rule key | Runtime behavior | Current evidence state | Verification action |
|---|---|---|---|
| `ACI211.WATER.SLUMP_NMSA.AIR` | Selects preliminary mixing water by slump band, NMSA and air-entrainment state | `EXISTING_UNVERIFIED` | Authorized ACI table/edition comparison + exact-cell golden tests + out-of-domain tests |
| `ACI211.AIR.ENTRAPPED.NMSA` | Selects estimated entrapped air by NMSA | `EXISTING_UNVERIFIED` | Authorized table comparison + exact-cell tests |
| `ACI211.AIR.ENTRAINED.DEFAULT` | Supplies an air-entrained default when project/durability value is absent | `EXISTING_UNVERIFIED` and architecturally suspect | Verify whether a default is permitted; otherwise remove/fail closed and require exposure-derived/project input |
| `ACI211.WCM.STRENGTH.PRELIMINARY` | Interpolates preliminary strength-based w/cm within bounded lookup ranges | `EXISTING_UNVERIFIED` | Authorized relationship comparison + node/interpolation/boundary tests; no extrapolation |
| `ACI211.CEMENTITIOUS.FROM_WCM` | Computes cementitious mass from water / governing w/cm | `ENGINEERING_CORE` | Unit/determinism/golden tests; standards provenance is the governing inputs, not arithmetic itself |
| `ACI211.COARSE_VOLUME.NMSA_FM` | Interpolates dry-rodded coarse aggregate bulk volume using NMSA and fine-aggregate FM | `EXISTING_UNVERIFIED` | Authorized table comparison + FM interpolation tests + domain tests |
| `ACI211.ABSOLUTE_VOLUME.FINE_BALANCE` | Computes remaining fine-aggregate absolute volume after water/cementitious/air/coarse volumes | `ENGINEERING_CORE` | Independent volume-balance golden case + impossible-volume fail test |
| `ACI211.MOISTURE.SSD.BATCH` | Converts aggregate OD/SSD/wet batch state and batch-water adjustment | `ENGINEERING_CORE_WITH_ASTMC127_C128_INPUTS` | Independent mass/water balance golden cases; test-method evidence audited separately in G02C |
| `ACI211.TRIAL_BATCH.REQUIRED` | Output states that production acceptance requires trial-batch verification | `REFERENCE_ONLY` | Ensure reports retain limitation and Trial Mix linkage; do not claim automatic acceptance |

## Fail-closed findings

1. Strength-based w/cm already refuses extrapolation outside its bounded lookup and requires an explicit project/durability w/cm.
2. Slump outside the implemented lookup domain currently produces a warning but still maps to a lookup band. This must not be promoted to VERIFIED until the exact ACI procedure for out-of-domain workability is established.
3. Non-tabulated NMSA currently snaps to the nearest lookup size with a warning. This is not VERIFIED behavior and requires an explicit policy before production-profile certification.
4. The air-entrained default in the normal-weight core is explicitly described in code as a placeholder. A placeholder cannot be part of a VERIFIED standards pack. The integrated durability path can supply an exposure-derived air requirement; otherwise the profile must require explicit evidence rather than silently certify the placeholder.
5. `pumped` currently passes through the normal-weight integrated engine. ACI PRC-211.1-22 public scope confirms normal-density/high-density proportioning, while ACI separately publishes PRC-211.9 for pumpable concrete. Therefore G02A certifies only the normal-weight proportioning core; pumpability-specific claims remain outside this sub-gate.

## Promotion contract

A row can become `VERIFIED` only when all are present:

- authorized authoritative ACI edition evidence;
- Tolou rule key and applicability;
- implementation locator;
- exact node/cell or deterministic formula mapping as applicable;
- independent golden case;
- boundary and invalid-input cases;
- no silent extrapolation or unsupported snapping unless explicitly authorized by the source/procedure;
- output traceability to profile id/version and rule key;
- trial-batch limitation retained where applicable.

## G02A closure blockers

- Obtain/confirm authorized numerical source evidence for water, air, strength–w/cm and coarse-volume relationships.
- Resolve the placeholder air-entrained default.
- Resolve slump and NMSA out-of-domain policy fail-closed.
- Add independent golden/boundary verification suite.
- Bind verified rule keys to the Standard Profile output envelope and report traceability.
