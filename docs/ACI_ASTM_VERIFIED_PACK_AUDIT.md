# Gate 02 — ACI/ASTM Verified Pack Audit

Status: AUDIT / NO NEW NUMERICAL RULES
Baseline: `main@0d67e02d9dcb7f6e520aec26678424eaebbd9c16`

## Purpose

This audit is the precondition for converting the existing ACI/ASTM-labelled engineering behavior into a verified executable Standard Profile. It does **not** certify the existing numerical rules merely because they already exist in code.

No new numerical limit, table value, acceptance criterion, or standards-derived rule may be introduced by this audit.

## Classification

Each standards-related behavior is classified as:

- `EXISTING_UNVERIFIED` — executable behavior exists, but Gate 02 authoritative-source verification is not yet recorded.
- `TESTED_EXISTING_UNVERIFIED` — executable behavior and regression tests exist, but authoritative-source verification is not yet recorded.
- `REFERENCE_ONLY` — standard identifier/reference is present but does not itself implement a rule.
- `VERIFIED` — reserved for behavior with authoritative source/edition evidence, rule coverage mapping, independent golden/boundary cases, and traceable output. No row is promoted to VERIFIED by this audit alone.
- `UNSUPPORTED` — intentionally not executed until authoritative evidence and a deterministic contract exist.

## Current executable ACI/ASTM surface

| Area | Current code | Current references/identifiers | Current state | Gate 02 requirement |
|---|---|---|---|---|
| Normal-weight proportioning | Python normal-mix engine + Electron payload | `ACI_PRC_211_1_22` | EXISTING_UNVERIFIED | Verify edition/source and every table/interpolation used; independent golden cases |
| Exposure classification / durability | `durability.py` | `ACI_CODE_318_25`, ASTM C1580, D516, C1218/C1218M | TESTED_EXISTING_UNVERIFIED | Verify exposure classes, governing w/cm, strength, air, chloride and sulfate behavior against authoritative edition |
| Aggregate compliance | `aggregate_compliance.py` | ASTM C33, C117, C127, C128, C136, C29, C131/C535, C88, C142, C123, D4791, D5821 | TESTED_EXISTING_UNVERIFIED | Separate test-method evidence from acceptance limits; verify any executable limits |
| Cementitious materials | `cementitious.py`, `cementitious_compliance.py` | ASTM C150, C595, C1157, C618, C989, C1240, C1012 | TESTED_EXISTING_UNVERIFIED | Verify material qualification logic and distinguish designation from acceptance rule |
| ASR | `asr_compliance.py` | ASTM C1260, C1293, C1567, C1778 | TESTED_EXISTING_UNVERIFIED | Verify thresholds, decision sequence, applicability and limitations |
| Chloride | `chloride_compliance.py`, `durability.py` | ACI 318-25 + ASTM C1218/C1218M / C1603 as applicable | TESTED_EXISTING_UNVERIFIED | Verify limits, basis, specimen/material basis and method applicability |
| Admixture / mixing water | `admixture_compliance.py`, `admixtures.py` | ASTM C494, C260, C1602, C1603 | TESTED_EXISTING_UNVERIFIED | Verify acceptance/qualification behavior and monitoring assumptions |
| Ready-mixed concrete | payload/reference surface | ASTM C94 | REFERENCE_ONLY | Do not infer acceptance rules until explicitly sourced and implemented |

## Critical findings from code audit

1. `enginePayload.ts` currently carries a broad ACI/ASTM identifier list. Presence in this list is **not** evidence that the corresponding standard is executable or verified.
2. `durability.py` contains executable ACI 318-25-labelled tables/thresholds and already has regression tests. Under Gate 02 these remain `TESTED_EXISTING_UNVERIFIED` until authoritative-source evidence is recorded.
3. Existing test names and ASTM-prefixed database fields are evidence of implementation intent, not standards verification.
4. Test methods (for example sieve analysis or absorption methods) must be distinguished from acceptance/specification limits. A method reference must never be treated as a pass/fail criterion by implication.
5. Unsupported clauses remain unsupported; no fallback to a neighbouring standard, older edition, or remembered value is permitted.

## Source register contract

For each promoted rule, record at minimum:

- authority/publisher;
- standard/designation;
- exact edition/year used by Tolou;
- rule key owned by Tolou;
- source locator sufficient for an authorized reviewer to reproduce the interpretation (table/section identifier where legally appropriate);
- applicability and exclusions;
- implementation module/function;
- independent golden case(s);
- boundary/invalid-input tests;
- output/report traceability field;
- verification status and reviewer/date.

Copyrighted standards are referenced, not copied wholesale into the repository.

## Promotion sequence

### G02A — ACI 211 normal-weight proportioning
Audit every executable table/interpolation/default in the normal-weight proportioning path. Preserve current behavior until each rule is either VERIFIED or explicitly marked unsupported/legacy-unverified.

### G02B — ACI 318 durability/exposure
Verify exposure classification, mixture requirements, air-content and chloride/sulfate-related decision paths. Boundary tests are mandatory because class thresholds are safety-relevant engineering constraints.

### G02C — ASTM material/test-method pack
Verify the distinction between test-method metadata and executable material acceptance/qualification rules across aggregate, cementitious, ASR, chloride, admixture and water modules.

### G02D — Profile/report closure
Only VERIFIED rules may be advertised as verified executable coverage in the ACI/ASTM Standard Profile. Reports must expose profile identity/version and rule references without claiming unsupported coverage.

## Gate 02 fail-closed rules

- No numerical rule is promoted from memory, an unofficial summary, or an unverified secondary source.
- No existing code is silently re-labelled VERIFIED.
- No unsupported standard identifier implies compliance.
- No test-method designation alone implies a pass/fail limit.
- Edition changes require a new profile/rule version and regression evidence.
- If authoritative source access is insufficient, keep the rule `EXISTING_UNVERIFIED` or `UNSUPPORTED` and do not change industrial behavior.
