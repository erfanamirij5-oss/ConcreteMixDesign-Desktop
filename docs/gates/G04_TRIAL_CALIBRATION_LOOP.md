# G04 — Trial Mix Calibration & Revision Loop

## Objective
Close the engineering feedback loop from an immutable mix-design revision through Trial Mix observations and laboratory results into a traceable revision-feedback package.

## Existing foundation audited at G04 start
The repository already contains Trial Mix V2 services for lifecycle, calibration comparison, moisture correction, strength analytics, historical revision design resolution, and revision feedback aggregation. G04 therefore extends and hardens this existing foundation instead of rewriting it.

## Gate contract
1. Every Trial Session remains bound to an explicit mix-design ID and revision number.
2. Current-revision comparisons resolve from persisted mix results; historical-revision comparisons resolve from immutable revision snapshots.
3. Predicted/designed and observed/actual values retain explicit units, deterministic calculations, and source identifiers.
4. Moisture/absorption correction is explicit and must never be silently mixed with raw-batched water or raw-batched w/cm.
5. Strength results remain traceable to their stored laboratory result identities.
6. Revision feedback is descriptive and evidence-based. It must not silently mutate a mix, infer standards acceptance, or auto-approve a revision.
7. Any future proposed revision adjustment must be represented as an explicit, reviewable proposal with method/version, source IDs, before/after values, units, rationale, warnings, and actor/audit context before application.
8. Applying an accepted proposal must create/use a controlled revision path; historical revisions and Trial/Lab evidence are immutable.
9. Renderer access remains through typed IPC/preload contracts; privileged persistence stays in Electron Main/application services.
10. G04 closure requires deterministic smoke coverage, regression coverage for historical revisions, and full CI/release gates.

## First implementation package
- audit and strengthen Trial Mix V2 calibration/revision-feedback invariants;
- add explicit revision-proposal domain contract without automatic mutation;
- preserve source/provenance IDs from Trial/Lab evidence;
- verify historical-revision behavior and immutability;
- wire through Main/IPC/preload/renderer contract where required;
- add integrated smoke tests and CI invocation.

## Non-goals
- no guessed ACI/ASTM/EN/ISIRI acceptance limits;
- no black-box optimization score;
- no automatic approval or production release;
- no destructive rewrite of Trial Mix V2 history.
