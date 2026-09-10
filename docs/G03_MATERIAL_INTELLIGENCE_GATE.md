# G03 — Material Intelligence

Status: ACTIVE

## Goal
Evolve Material Library into versioned Material Intelligence while preserving historical reproducibility and existing product behavior.

## Scope
- Cement, Water, Fine Aggregate, Coarse Aggregate, SCM, Chemical Admixture, Fibers, Other Additions as first-class material families.
- Supplier/source/manufacturer identity and evidence references.
- Versioned test observations and qualification history; no destructive replacement of historical facts.
- Variability/performance summaries derived from traceable evidence.
- Cost-history linkage without mutating historical cost sets.
- Compatibility/evidence model only where technically defensible.
- Immutable material snapshots for historical mix revisions.

## Engineering contract
1. Measured facts, derived metrics, and engineering interpretation are separate states.
2. Every derived intelligence value records its source observations, method/version, unit and calculation timestamp/version where applicable.
3. Editing a material master record must not silently rewrite facts already captured by a historical mix revision.
4. Qualification/compliance state must preserve standard/profile/evidence provenance and must never be inferred from a material name or designation alone.
5. Existing migrations remain immutable; schema changes are forward-only.
6. Existing Materials and Mix Design workflows remain regression-free.

## Initial implementation sequence
1. Audit current material schema, types, repositories, IPC and UI fields against Gate 03 requirements.
2. Identify the minimum forward-only schema extension needed for evidence/test-history/intelligence records.
3. Implement domain/service persistence before UI expansion.
4. Add deterministic summaries and explicit provenance.
5. Integrate user-facing history/intelligence views without changing historical records.
6. Close with exact-head CI Validation, Release Acceptance and Windows Gate.

## Exit criteria
- A historical mix can reproduce the material facts used at that revision.
- Material intelligence distinguishes measured fact, derived metric and engineering interpretation.
- No destructive history rewrite path exists.
- New privileged persistence remains behind Main/Application services and typed IPC.
- Exact-head CI, release acceptance and Windows packaging/license gates pass.
