# Tolou Concrete Engineering Decision Platform — Mega-Prompt Completion Gates

Status: ACTIVE PROGRAM
Baseline: `main@3b176d1e1366e3b93185fdcf7489b354659dfc2c`
Program branch: `upgrade/megaprompt-completion`
Golden baseline: `release/v1.0.1-accepted@77dbc82ca6e63af5f7620089ddaad7b1a207b3db` — immutable.

## Governing principles

1. DO NOT BREAK A WORKING PRODUCT.
2. Existing migrations 001–025 are immutable. New schema work is forward-only from 026.
3. No engineering rule enters production from memory, guesswork, or an unverified secondary source.
4. Every standards-derived rule requires an authoritative reference, edition/version, deterministic implementation, traceability, and tests.
5. Engineering outputs must be deterministic, explainable, unit-safe, validated and versioned. Important outputs expose input, method, intermediate values, result, unit, warnings, interpretation, reference/profile and version where applicable.
6. Renderer never directly controls SQLite, privileged filesystem, licensing, Python processes, or other privileged operations. New privileged behavior uses typed IPC and Main/Application services.
7. Historical/revision-bound engineering records remain immutable unless an explicit, audited forward revision operation is defined.
8. Every implementation gate requires exact-head typecheck/tests/build and applicable Windows packaging/release/license gates before merge.
9. CI success is not a substitute for manual installed-Windows UAT.
10. A gate closes only on implemented code + tests + traceability + required UI/workflow + documentation; a design document alone cannot close an implementation gate.

## Gate 00 — Baseline and completion contract

Deliverables:
- Freeze and record the accepted v1.1 RC baseline.
- Maintain a Mega-Prompt requirement-to-code verification matrix.
- Classify each requirement as implemented, partial, absent, or intentionally deferred with evidence.
- Reconcile stale ROADMAP, PRODUCT_SCOPE, STANDARDS_REGISTRY and engineering verification documentation with actual code.

Exit criteria:
- No Mega-Prompt requirement is untracked.
- Every subsequent gate has explicit evidence and regression scope.

## Gate 01 — Standards Profile Architecture

Goal: implement the target `Engineering Core -> Standard Profiles -> Regional/Company Profiles` architecture without contaminating generic engineering logic.

Deliverables:
- Versioned StandardProfile domain contract and registry.
- Standard identity, edition/version, jurisdiction, effective dates, source/reference metadata and applicability contract.
- Profile composition/override policy with explicit provenance.
- Regional and Company profile contracts separated from authoritative standard rules.
- Persisted selected profile/version on relevant calculation/revision/report snapshots.
- Deterministic profile resolution and conflict detection.
- Backward-compatible default mapping for existing records.

Exit criteria:
- Existing ACI behavior remains regression-free.
- Profile selection is traceable and reproducible.
- No silent fallback or hidden override.

## Gate 02 — Verified Standards Packs

Goal: convert standards from names/registry entries into verified executable profiles.

Sequence:
1. ACI/ASTM pack — formalize existing verified behavior.
2. EN pack.
3. ISIRI pack.
4. ISO references only where a concrete engineering requirement genuinely applies.

Rules:
- Authoritative source verification is mandatory before implementing numerical limits, tables or acceptance criteria.
- Copyrighted standards are referenced, not copied wholesale into the repository.
- Unsupported clauses must be explicitly reported as unsupported rather than guessed.

Exit criteria per pack:
- source/edition register;
- rule coverage matrix;
- golden/reference cases independently derived;
- boundary/invalid-input tests;
- report traceability;
- no unverified placeholder used as an industrial rule.

## Gate 03 — Material Intelligence

Goal: evolve Material Library into versioned Material Intelligence.

Deliverables:
- Complete first-class material families: Cement, Water, Fine/Coarse Aggregate, SCM, Chemical Admixture, Fibers, Other Additions.
- Supplier/source/manufacturer identity and evidence references.
- Versioned test observations and qualification history rather than destructive replacement of historical facts.
- Material variability/performance summaries derived from evidence.
- Cost-history linkage without mutating historical cost sets.
- Compatibility/evidence model where technically defensible.
- Material snapshots remain immutable for historical revisions.

Exit criteria:
- A historical mix can reproduce the material facts used at that revision.
- Intelligence outputs distinguish measured fact, derived metric and engineering interpretation.

## Gate 04 — Requirements and Formal Approval

Goal: create a traceable requirements-to-approval workflow.

Deliverables:
- Requirements model for project, exposure, strength, workability, placement/pumping, temperature/environment and applicable profile.
- Requirement provenance and governing-value resolution.
- Formal lifecycle: Draft -> Engineering Review -> Lab Verified -> Approved -> Production Authorized, with controlled rejection/revision routes.
- Actor, timestamp, reason, evidence and immutable approval event history.
- Approval never silently edits the underlying mix.
- Permission enforcement in Main/service layer.

Exit criteria:
- Every approved production mix identifies the exact revision, requirements, calculation method/profile and approval evidence.

## Gate 05 — Engineering Traceability Closure

Goal: close all remaining core-engine verification gaps before adding broader engines.

Deliverables:
- Independent integrated cementitious mass/share golden case.
- Audit every top-level engineering output for input/method/intermediates/result/unit/warnings/interpretation/reference/version as applicable.
- Unit-safety and invalid-range tests.
- Remove silent/weakly traced calculation paths.

Exit criteria:
- Engineering verification matrix has no unresolved core calculation blocker.

## Gate 06 — Special Concrete Engine Framework

Goal: introduce a common extensible engine contract before individual special-concrete implementations.

Deliverables:
- ConcreteType/EngineCapability contract.
- Shared validated inputs/results/traceability envelope.
- Capability discovery: supported/unsupported/not-applicable.
- No pretending a normal-weight method supports a special concrete family.

Exit criteria:
- Existing normal-weight engine works unchanged through the framework.

## Gate 07 — Special Concrete Engines

Implement as separate evidence-driven sub-gates, each requiring authoritative references and golden cases:
- 07A High-strength concrete.
- 07B Self-consolidating concrete.
- 07C Lightweight concrete.
- 07D Heavyweight concrete.
- 07E Mass concrete.
- 07F Pumped concrete.
- 07G No-slump/pavement concrete.
- 07H Fiber-reinforced concrete.
- 07I SCM/durability-oriented advanced binder systems.

Exit criteria per engine:
- validated inputs;
- deterministic calculation path;
- explicit method/reference/version;
- limitations and unsupported conditions;
- independent golden cases;
- persistence/revision/report integration;
- no regression to existing engine.

## Gate 08 — Full Mix Optimization / Decision Engine

Goal: move beyond aggregate-only optimization while keeping recommendations advisory and explainable.

Deliverables:
- Explicit objective/constraint model covering only verified dimensions (e.g. strength evidence, durability requirements, workability constraints, cost, material availability, trial feedback).
- Deterministic candidate evaluation and ranking.
- Hard constraints separated from optimization objectives.
- Complete reason codes, trade-offs and provenance.
- No automatic mutation of an approved/current mix; user-approved revision creation only.
- Versioned optimization method.

Exit criteria:
- Same inputs/profile/version produce the same ranked output.
- Every recommendation is explainable and reversible.

## Gate 09 — Advanced Production QC & Statistics

Goal: evolve Production/QC into a statistical quality-control subsystem.

Deliverables:
- mean, standard deviation, coefficient of variation and moving statistics with explicit sample rules;
- control/trend views where statistically valid;
- outlier/data-quality flags without silent deletion;
- batch/material/time segmentation;
- traceable correlation views that do not imply causation;
- acceptance/compliance rules only from verified profiles;
- historical batches remain read-only.

Advanced methods such as control limits/CUSUM are implemented only with a documented statistical contract and sufficient data preconditions.

Exit criteria:
- Reference datasets reproduce independently calculated statistics within stated tolerance.

## Gate 10 — Knowledge Layer

Goal: convert accumulated evidence into a searchable engineering knowledge layer without turning inference into fact.

Deliverables:
- Project/mix/material/trial/production knowledge records linked to source IDs and revisions.
- Search/retrieval over historical evidence.
- Successful/failure pattern summaries with provenance.
- Company lessons and engineer notes separated from standards rules.
- Knowledge versioning and invalidation when source evidence changes.

Exit criteria:
- Every knowledge statement can navigate back to supporting records/evidence or is clearly marked as human-authored interpretation.

## Gate 11 — AI Engineering Assistant Contract

Goal: add a safe AI-facing layer after deterministic engineering and knowledge contracts are stable.

Deliverables:
- Structured Mega-Prompt/export context generated from validated project/revision/profile/evidence data.
- AI output is advisory and never becomes an engineering calculation or approval automatically.
- No standards clause/limit invented by AI.
- Clear separation between deterministic result, retrieved evidence and generated explanation.
- Explicit human confirmation for any proposed revision/action.

Exit criteria:
- AI can explain and compare evidence but cannot bypass deterministic services, permissions, approval or revision controls.

## Gate 12 — Professional Export & Interchange

Deliverables:
- Professional PDF/print closure.
- Excel export with stable schemas, units, revision/profile metadata and traceability.
- Versioned Tolou project interchange format with validation and backward compatibility policy.
- Engineering Mega-Prompt/context export.
- Export snapshots are reproducible and historical exports do not silently change.

Exit criteria:
- round-trip/import tests where import is supported;
- deterministic export contract tests;
- no privileged renderer file access.

## Gate 13 — Data Safety UX and Operational Hardening

Deliverables:
- Integrate existing backup/restore capability into safe navigation without risky whole-App rewrite.
- Pre-restore validation and explicit destructive-operation confirmation.
- Recovery/error paths.
- backup/restore migration compatibility checks.
- security, licensing, startup, installer and user-data regression coverage.

Exit criteria:
- Data Safety is user-accessible and Windows-installed workflow verified.

## Gate 14 — Product UX Completion

Deliverables:
- End-to-end workflow navigation for Materials -> Requirements -> Mix Design -> Calculation -> Optimization -> Trial -> Lab -> Calibration -> Revision -> Approval -> Production -> QC -> Statistics -> Cost -> Reporting -> Knowledge.
- Empty/loading/error/permission/historical-read-only states.
- Accessibility and keyboard/navigation regression review.
- No dead/disabled navigation for a completed feature.

Exit criteria:
- Every completed domain capability has a safe user-facing path or is explicitly service-only by design.

## Gate 15 — System Verification and Commercial Release

Automated:
- Python tests and golden engineering cases.
- Desktop typecheck/tests/build.
- database compatibility and forward migration smoke.
- security/licensing gates.
- packaged runtime resource contract.
- Windows installer/render/icon/launch/uninstall acceptance.
- exact-head required workflow success.

Manual installed-Windows UAT:
- Install -> Launch -> Login -> License -> Dashboard.
- Project/material/requirements/profile workflow.
- Normal and every supported special-concrete calculation.
- Save/close/reopen persistence.
- Trial/lab/calibration/revision/approval.
- Production/QC/statistics/cost/reporting/knowledge.
- backup/restore and recovery.
- export workflows.
- visual/RTL/accessibility sanity.

Exit criteria:
- zero unresolved release-blocking defects;
- all Mega-Prompt matrix rows closed with evidence;
- final exact-head gates green;
- manual Windows UAT signed off;
- release tag only after owner-approved final acceptance.

## Execution order and merge policy

Execution order is Gate 00 -> 15. A gate may be split into small feature branches/PRs. High-risk schema, engine, security, licensing, startup and packaging changes remain isolated. A later gate may begin discovery while CI runs, but it cannot rely on an unmerged contract from an earlier gate.

For every implementation PR:
1. inspect current canonical main;
2. issue Change Impact Report;
3. branch from exact main;
4. implement the smallest coherent change;
5. run targeted tests/typecheck/build;
6. open PR;
7. run exact-head CI, License Manager Windows Gate and Release Acceptance when applicable;
8. review failures and fix rather than bypass;
9. merge only after required gates are green and mergeability is verified;
10. verify new canonical main before starting the next dependency-bearing change.

## Definition of Complete

The Mega-Prompt is complete only when every gate above satisfies its exit criteria with repository evidence. A feature is not considered complete merely because a file, screen, schema or placeholder exists. Standards-dependent behavior is not complete without authoritative verification and tests. Automated green CI is not final commercial acceptance without the required manual installed-Windows UAT.
