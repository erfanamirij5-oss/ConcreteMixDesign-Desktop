# Tolou Concrete Mix Design — Megaprompt Master Completion Program

## Purpose

This document is the source of truth for completing the Tolou Concrete Mix Design megaprompt as a real engineering product. A feature is not complete because UI exists or because a calculation returns a number. Completion requires deterministic engineering behavior, traceability, regression coverage, persistence where applicable, safe historical behavior, packaged runtime presence, and acceptance evidence.

## Non-negotiable Definition of Done

A gate may be closed only when every applicable item below is satisfied:

1. Engineering method and scope are explicit.
2. Standard/profile rules are sourced, versioned, referenced, and separated from generic business logic.
3. Inputs, units, assumptions, intermediate values, outputs, warnings, limitations, and interpretation are traceable.
4. Unsupported engineering scope fails safely; no silent extrapolation or invented rule is allowed.
5. Persistence is versioned and migrations are forward-only/additive where practical.
6. Historical revisions remain immutable and historical reads use immutable evidence.
7. Renderer does not directly control privileged DB/filesystem/licensing/Python operations.
8. Automated regression tests cover normal, boundary, invalid, and historical cases.
9. Typecheck, Python tests, desktop tests, build, packaging, licensing gate, and release acceptance pass for the exact SHA when applicable.
10. User-facing workflows receive manual Windows UAT before commercial acceptance.
11. Documentation and verification matrices match the implemented state.
12. No unresolved release-blocking defect remains.

## Program Gates

### Gate 01 — Engineering Verification & Traceability Closure

Scope:
- Close all remaining Engineering Verification Matrix items.
- Independently verify integrated cementitious mass/share and weighted specific gravity.
- Audit top-level engineering outputs for method/reference/assumption/warning/limitation completeness.
- Lock unsupported-scope behavior and unit/traceability contracts with regression tests.

Exit criteria:
- No open verification item remains in `engineering-verification-matrix.md`.
- Golden numerical cases are independently derived and reproducible.
- Exact-head CI passes.

### Gate 02 — Standards Profile Architecture

Scope:
- Introduce explicit Engineering Core / Standard Profiles / Regional-Company Profiles separation.
- Define versioned profile contracts for rule identity, source, edition, effective status, inputs, outputs, warnings, and traceability.
- Prevent standards rules from being embedded anonymously in generic business logic.
- Provide profile-selection and provenance contracts without changing engineering results until a verified profile is selected.

Exit criteria:
- Profile architecture is typed, tested, persisted/versionable where required, and backwards-compatible.
- Existing ACI/ASTM behavior is mapped to explicit verified profile provenance.

### Gate 03 — Verified Standards Coverage: ACI / ASTM / EN / ISO / ISIRI

Scope:
- Convert registry entries into verified executable/profile rules only from authoritative references.
- Complete ACI/ASTM provenance already used by the engine.
- Add EN/ISO/ISIRI only after exact source/edition verification.
- Version aggregate gradation presets and project/company overrides.

Exit criteria:
- Every production rule has source, edition/version, tests, applicability scope, and report traceability.
- No placeholder or draft limit is treated as verified compliance logic.

### Gate 04 — Requirements & Formal Approval Workflow

Scope:
- Build explicit project requirements model separate from raw inputs.
- Add engineering-review lifecycle: Draft → Review → Lab Verified → Approved → Production Authorized (or an equivalent verified workflow).
- Add approver identity, timestamp, reason/evidence, immutable approval record, and revision binding.
- Ensure approval cannot mutate historical design evidence.

Exit criteria:
- Requirements and approvals are revision-scoped, permission-checked, audited, and UAT-tested.

### Gate 05 — Material Intelligence

Scope:
- Evolve Material Library into Material Intelligence.
- Complete first-class categories: Cement, Water, Fine/Coarse Aggregate, SCM, Chemical Admixture, Fibers, Other Additions.
- Add supplier/source identity, test history, variability, qualification evidence, cost history, production/trial performance links, and material-version traceability.
- Preserve immutable material snapshots in design revisions.

Exit criteria:
- Material records support engineering qualification and historical performance without hidden inference.
- Intelligence outputs are evidence-based and explainable.

### Gate 06 — Special Concrete Engineering Engines

Scope:
Implement and independently verify dedicated methods for the supported product families rather than routing them through normal-weight logic:
- High-strength concrete
- Self-consolidating concrete
- Lightweight concrete
- Heavyweight concrete
- Mass concrete
- Pumped concrete beyond the current normal-weight-derived mode where dedicated rules are required
- No-slump/pavement concrete
- Fiber-reinforced concrete
- SCM-focused systems

Exit criteria for each family:
- Verified engineering scope and reference method.
- Independent golden cases.
- Dedicated unsupported-boundary guards.
- UI/persistence/reporting integration.
- No family is marked supported until its own gate criteria pass.

### Gate 07 — Full Mix Optimization & Engineering Decision Engine

Scope:
- Extend optimization beyond aggregate blending.
- Build deterministic, constraint-driven optimization across engineering requirements, durability, workability evidence, material availability, cost, trial feedback, and user-selected objectives.
- Keep recommendation separate from factual evidence and require explicit user acceptance before creating a new revision.
- Never silently mutate an approved or historical mix.

Exit criteria:
- Objective function, constraints, inputs, alternatives, ranking rationale, warnings, and rejected candidates are traceable.
- Optimization is reproducible and regression-tested.

### Gate 08 — Production QC, Statistics & Feedback Loop

Scope:
- Expand descriptive QC to industrial statistics: mean, standard deviation, coefficient of variation, moving statistics, control limits, trend/drift detection and other justified methods.
- Link production evidence to revision, material snapshots, trial evidence, cost, and approved design.
- Build controlled feedback from Production/QC → Calibration → Revision proposal.
- No automatic standards acceptance unless a verified profile explicitly defines it.

Exit criteria:
- Statistics are mathematically verified with golden datasets.
- Historical writes remain blocked.
- Feedback is evidence-scoped and cannot mutate designs automatically.

### Gate 09 — Reporting, Export, Knowledge & AI Engineering Layer

Scope:
- Complete professional PDF/print outputs and immutable report snapshots.
- Add verified Excel/data export and, if productized, a portable project package with schema/version identity.
- Build an engineering Knowledge Layer from immutable project/material/trial/production evidence.
- Add AI engineering assistance only as a traceable layer over retrieved product evidence; AI must not invent standards rules or silently alter calculations.
- Provide exportable engineering context/megaprompt where useful.

Exit criteria:
- Reports and exports are deterministic and revision-scoped.
- Knowledge claims link back to source evidence.
- AI output clearly distinguishes retrieved facts, calculations, assumptions, and suggestions.

### Gate 10 — Commercial Hardening, Security, Packaging & Final Acceptance

Scope:
- Re-audit privileged IPC, security roles/audit identity, licensing isolation, backup/restore, migrations, installer/runtime resources, startup and upgrade paths.
- Run clean-install and representative-upgrade UAT.
- Verify all megaprompt gates are closed on the accepted release SHA.
- Record installer SHA-256 and final acceptance evidence.

Exit criteria:
- All automated gates green on exact release SHA.
- Full Manual Windows UAT passes.
- No unresolved blocking defects.
- Accepted installer is cryptographically traceable to accepted source.

## Execution Order

Gates are executed in order unless a later gate contains a low-risk prerequisite needed by an earlier one. Engineering verification and standards provenance precede expansion into new concrete families or automated decision logic.

## Change Control

- Golden baseline `release/v1.0.1-accepted` remains immutable.
- Historical migrations 001–022 are never rewritten.
- New schema changes are forward-only migrations starting after current migration 025.
- Main is changed only through scoped, reviewed, exact-SHA validated PRs.
- Working-product behavior is preserved unless an identified defect or approved requirement requires change.
- Standards rules are never implemented from memory, guesswork, or unverified secondary sources.

## Current Program State

- v1.1 operational foundation: substantially implemented and in RC/UAT stage.
- Megaprompt full platform: not yet complete.
- Active gate: Gate 01 — Engineering Verification & Traceability Closure.
