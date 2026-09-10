# Tolou Concrete Engineering Decision Platform — Mega-Prompt Completion Program

Status: ACTIVE PROGRAM
Baseline: `main` at `3b176d1e1366e3b93185fdcf7489b354659dfc2c`
Golden commercial baseline remains immutable: `release/v1.0.1-accepted` at `77dbc82ca6e63af5f7620089ddaad7b1a207b3db`.

## Mission

Close every product, engineering, data, standards, QA, security, reporting, and release obligation defined by the Tolou mega-prompt without regressing the accepted v1.0.1 product or the v1.1 RC stack.

A gate is not complete because code exists. It closes only when implementation, deterministic verification, traceability, persistence compatibility, UI exposure where applicable, packaging/runtime inclusion, and exact-head CI evidence are all satisfied.

## Non-negotiable engineering rules

- DO NOT BREAK A WORKING PRODUCT.
- Migrations 001–022 are immutable. Migrations 023–025 are existing v1.1 contracts and are not rewritten. All future schema evolution is forward-only.
- No standards rule enters production from memory, guesswork, or an unverified secondary source.
- Standards logic is versioned, referenced, tested, and separated from generic engineering logic.
- Engineering outputs are deterministic, traceable, explainable, unit-safe, validated, and versioned.
- Important outputs expose input, method, intermediate values, result, unit, warnings/limitations, interpretation, and standard/profile reference where applicable.
- Renderer never receives direct privileged DB/filesystem/licensing/Python-process authority.
- Historical engineering evidence remains immutable; corrections create new evidence/revisions rather than silently mutating history.
- Automated CI acceptance never substitutes for manual installed-Windows UAT.

## Gate map

### G00 — Program Baseline & Coverage Matrix
Deliverables:
- canonical mega-prompt obligation matrix
- source-of-truth mapping from every obligation to code/test/UI/schema/report/release evidence
- explicit states: implemented / partial / missing / blocked-by-authoritative-source / manual-UAT
- stale documentation reconciliation
Exit: zero unclassified mega-prompt obligations.

### G01 — Engineering Traceability Closure
Deliverables:
- independent cementitious mass/share golden verification
- audit every top-level engineering result for method/reference/assumption/warning/limitation completeness
- regression contract preventing silent untraced outputs
Exit: every production engineering path has reproducible reference evidence and deterministic tests.

### G02 — Standards Profile Architecture
Deliverables:
- Engineering Core separated from Standard Profiles and Regional/Company Profiles
- versioned profile identity and applicability contract
- profile provenance/reference metadata
- no duplicated hard-coded acceptance logic across profiles
Exit: generic engine can execute an explicit versioned profile without renderer-owned standards logic.

### G03 — ACI/ASTM Production Profiles
Deliverables:
- migrate existing verified ACI/ASTM rules into explicit profiles without semantic regression
- profile-level golden cases and traceability
- profile version persisted with engineering evidence
Exit: existing ACI/ASTM behavior remains regression-equivalent and profile-driven.

### G04 — EN/ISO/ISIRI Profile Expansion
Deliverables:
- authoritative-source-backed EN/ISO/ISIRI rules only
- exact edition/version/reference metadata
- applicability, conflicts, unsupported-rule behavior
- no invented national-standard numbers or clauses
Exit: each claimed profile has verified source coverage; unsupported areas fail explicitly rather than infer.

### G05 — Material Intelligence Foundation
Deliverables:
- first-class material identity, supplier/source, type, standard, density/SG, absorption/moisture plus evidence/version metadata
- Other Additions support
- historical test/performance/cost provenance model
- immutable material snapshots remain compatible
Exit: material evidence can be traced from source record through design/trial/production/revision/report.

### G06 — Requirements & Approval Engine
Deliverables:
- explicit project/design requirements model
- requirement source and priority/governing resolution
- formal Draft → Engineering Review → Lab Verified → Approved → Production Authorized lifecycle
- actor/reason/timestamp/evidence and immutable approval history
- no renderer-spoofed actor identity
Exit: production authorization is service-enforced and traceable.

### G07 — Special Concrete Engine Framework
Deliverables:
- common typed special-concrete engine contract
- explicit applicability and unsupported-case handling
- no reuse of normal-weight assumptions outside validated scope
Exit: framework proven with regression isolation from normal-weight engine.

### G08 — Special Concrete Families
Implement only with verified engineering references and independent golden cases:
- high-strength
- self-consolidating
- lightweight
- heavyweight
- mass concrete
- pumped concrete
- no-slump/paving
- fiber-reinforced
- SCM-focused systems
Exit: each claimed family has input contract, method, limits, golden verification, persistence, UI, report traceability.

### G09 — Full Mix Optimization / Decision Engine
Deliverables:
- deterministic objective/constraint model spanning engineering requirements, durability, material availability, cost, workability evidence, and trial feedback
- recommendation evidence separated from automatic mutation
- explainable ranking and constraint violations
- engineer approval required before a recommendation becomes a new revision
Exit: no black-box optimization and no automatic unapproved design mutation.

### G10 — Trial/Lab/Calibration Closure
Deliverables:
- complete Trial Mix v2 evidence lifecycle
- richer specimen/test extensibility where justified
- calibration provenance and revision feedback contract
- historical write protection through functional service-level tests
Exit: trial → lab → calibration → revision chain is immutable and reproducible.

### G11 — Production QC & Statistics
Deliverables:
- production actuals and strength/QC closure
- mean, standard deviation, coefficient of variation, moving statistics and control-limit framework
- trend/outlier/drift evidence with explicit method/version
- advanced methods such as CUSUM only when requirements and references are verified
Exit: statistics are deterministic, unit-tested, revision-aware, and never presented as standards compliance unless backed by an explicit profile rule.

### G12 — Cost & Economic Decision Closure
Deliverables:
- deterministic revision-bound cost engine
- historical price provenance/effective date
- incomplete-cost evidence handling
- optimization integration without contaminating engineering acceptance rules
Exit: cost comparison is reproducible for a historical revision and source price set.

### G13 — Reporting, Export & Audit Package
Deliverables:
- professional immutable report snapshots
- PDF/print closure
- Excel export with stable schema/version metadata
- project interchange/export format with versioning and validation
- complete audit package: requirements, materials, calculation, trial, lab, calibration, revision, approval, production, QC, cost
Exit: exported evidence can reconstruct what was known and decided at the historical point in time.

### G14 — Knowledge Layer
Deliverables:
- structured project/company knowledge records derived only from approved historical evidence
- searchable successful/failed mix families, material performance, recurring risks, lessons learned
- provenance back to immutable source evidence
Exit: knowledge records cannot fabricate or overwrite engineering evidence.

### G15 — AI Engineering Assistant Contract
Deliverables:
- AI context/export contract built from traceable project evidence
- strict separation of factual evidence, deterministic calculations, recommendations, and AI-generated narrative
- AI cannot silently alter engineering records or claim compliance
- prompt/context versioning and audit trail
Exit: AI assistance is advisory, attributable, reproducible in context, and safe around standards claims.

### G16 — Data Safety, Navigation & Recovery Closure
Deliverables:
- Backup/Restore UI safely integrated into navigation
- restore validation, compatibility guard, recovery tests
- no risky App-level rewrite; integration must be surgical and regression-tested
Exit: installed user can discover, create, validate, and restore backups through supported UI.

### G17 — Security, Licensing & Privilege Boundary Re-Audit
Deliverables:
- Electron security posture regression audit
- typed/validated privileged IPC
- actor identity authority audit
- offline Ed25519 licensing regression
- machine-binding/subscription/expiration/license-manager regression
Exit: no new feature bypasses established privilege/licensing boundaries.

### G18 — Packaging & Installed Runtime Completeness
Deliverables:
- packaging contract expanded for all new migrations/services/profile assets/report/export resources
- installer/runtime smoke on exact head
- install/launch/render/icon/uninstall/user-data-preservation checks
Exit: no source-only feature can pass release while missing from packaged runtime.

### G19 — Documentation & Engineering Verification Sync
Deliverables:
- architecture, product scope, standards registry, verification matrix, migration registry, release/UAT docs synchronized with actual implementation
- remove stale “future” claims that are already implemented; retain explicit unsupported scope
Exit: docs describe the actual product, not historical intentions.

### G20 — Final Commercial Acceptance
Deliverables:
- complete exact-head CI, License Manager Windows Gate, Release Acceptance
- manual installed-Windows UAT across full workflow
- clean-install and upgrade-from-v1.0.1/v1.1 compatibility acceptance
- final regression review and release evidence
Exit: all automated gates green, manual UAT signed off, zero unresolved mega-prompt obligations, and release candidate is reproducible from tagged source.

## Mandatory per-gate Change Impact Report

Before implementation of each gate record:
Feature / Why / Affected Modules / DB / Migrations / Engine / UI / Security / Licensing / IPC / Packaging / Regression Risk / Tests / Standards Evidence.

## Definition of Done

The mega-prompt is COMPLETE only when G00–G20 are closed with evidence. “Implemented” without verification is not completion. “CI green” without required manual UAT is not commercial acceptance. A standards feature without an authoritative verified reference remains unsupported, not guessed.
