# G02C — Aggregate Method / Acceptance Boundary

Status: IMPLEMENTATION AUDIT — FAIL CLOSED

## Decision

ASTM test-method identity and acceptance/specification authority are separate concepts in Tolou.

A measured value produced by a test method MUST NOT become a standards-compliance pass/fail result merely because the method designation is ASTM-labelled.

## Aggregate contract

| Measurement / domain | Method identity | Acceptance authority in current implementation | G02C state |
|---|---|---|---|
| Gradation / particle-size distribution | ASTM C136/C136M | Stored lower/upper limits, potentially sourced from ASTM C33/C33M or project specification | `existing_unverified_acceptance` |
| Material finer than 75 µm | ASTM C117 | Explicit stored `finer_75um_limit_percent` | `project_or_spec_limit_required` |
| Relative density / absorption | ASTM C127 / C128 | No implicit pass/fail limit | `method_metadata_only` |
| Rodded unit weight | ASTM C29/C29M | No implicit pass/fail limit | `method_metadata_only` |
| LA abrasion | ASTM C131/C535 route | Explicit stored `la_abrasion_limit_percent` | `project_or_spec_limit_required` |
| Soundness | ASTM C88/C88M | Explicit stored `soundness_limit_percent` | `project_or_spec_limit_required` |
| Clay lumps / friable particles | ASTM C142/C142M | Explicit stored `clay_lumps_limit_percent` | `project_or_spec_limit_required` |
| Lightweight particles | ASTM C123/C123M | Explicit stored `lightweight_particles_limit_percent` | `project_or_spec_limit_required` |
| Flat / elongated particles | ASTM D4791 | Explicit stored `flat_elongated_limit_percent` | `project_or_spec_limit_required` |
| Fractured particles | ASTM D5821 | Explicit stored `fractured_particles_min_percent` | `project_or_spec_limit_required` |

## Verified architectural behavior

The current `aggregate_compliance.py` implementation already follows the required fail-closed boundary for the non-gradation checks:

1. a method result without an explicit acceptance limit returns `needs_review`, not `pass`;
2. an explicit stored project/specification limit can be compared deterministically;
3. no numerical ASTM acceptance threshold is synthesized from the method name;
4. physical-property methods such as C127/C128/C29 are treated as measurements/completeness inputs rather than implicit compliance thresholds;
5. D4791/D5821 shape results do not numerically infer pumpability.

## Remaining evidence debt

Gradation rows may carry stored `standard_min` / `standard_max` values and the output may identify ASTM C33/C33M. These numerical limits are executable existing data, but G02C does NOT certify them as exact-edition ASTM C33/C33M limits until authorized exact-edition evidence, source locator, applicability, and regression evidence are attached.

Likewise, any project/specification limit supplied for C117, abrasion, soundness, deleterious-material, or shape checks is a user/project acceptance input unless its own standards provenance is explicitly established. The ASTM test-method designation alone is not that provenance.

## Public-source boundary

Public ASTM metadata is sufficient to establish the distinction between a specification such as C33/C33M and test methods such as C117, C127, C128 and C136. It is not sufficient to promote copyrighted numerical acceptance tables or limits to `verified_exact_edition`.

## Exit rule for aggregate sub-pack

The aggregate implementation may be considered G02C implementation-closed when regression tests lock the following invariants:

- method result + missing acceptance limit => never standards `pass`;
- explicit project/specification limit => deterministic comparison;
- method-only physical properties => no invented acceptance threshold;
- stored C33-labelled gradation limits remain `existing_unverified_acceptance` until exact-edition evidence is available.

Exact-edition ASTM numerical evidence remains an evidence blocker, not an implementation blocker.
