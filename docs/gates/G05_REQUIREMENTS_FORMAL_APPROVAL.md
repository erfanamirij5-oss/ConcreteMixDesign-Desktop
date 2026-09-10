# G05 — Requirements & Formal Approval

Status: ACTIVE
Base: `main@d9c0a00007c32f9dfad26a74639654f73c1a5883`
Branch: `feature/g05-requirements-formal-approval`

## Objective

Close the controlled workflow between engineering requirements, verified Trial/Lab evidence, formal engineering review, approval and production authorization without mutating historical evidence or inferring standards acceptance.

## Existing foundation to preserve

- Mix Design revision snapshots and immutable historical revision reads.
- Existing lifecycle states `draft -> trial_required -> trial_completed -> under_review -> approved -> production -> superseded` remain backward-compatible during migration.
- G04 Trial/Lab feedback and controlled revision proposal path.
- Standard Profile identity/provenance infrastructure.
- Main-process permission enforcement and audit history.

## Integrated G05 contract

1. Requirements are revision-bound engineering records, not free-form mutable metadata.
2. Requirement domains cover project, exposure/durability, strength, workability, placement/pumping, temperature/environment and applicable Standard Profile where supported.
3. Every requirement records provenance: source kind, source reference/evidence ID, actor, timestamp and unit/value semantics where applicable.
4. Governing-value resolution is deterministic and explainable. Conflicts are surfaced; no silent override is permitted.
5. Standards-derived numerical limits or acceptance criteria are admitted only from verified executable profiles. Missing exact-edition evidence remains an explicit unsupported/unverified condition.
6. Formal approval workflow is expressed as Draft -> Engineering Review -> Lab Verified -> Approved -> Production Authorized. Legacy persisted statuses are mapped compatibly rather than destructively rewritten.
7. Review/approval/authorization events are append-only and identify exact Mix Design ID, revision number, requirements snapshot identity, calculation/profile identity, actor, timestamp, reason and evidence IDs.
8. Approval never edits Mix Design inputs/results. Engineering changes require a new controlled revision.
9. Production authorization requires the exact approved revision and cannot silently follow a later revision.
10. Rejection or revision requests are explicit audited events and cannot erase prior approvals/evidence.
11. Renderer uses typed IPC/preload APIs only. Persistence, permission checks and lifecycle enforcement remain in Main/application services.
12. Historical approved/authorized revisions and their approval evidence remain immutable/read-only.

## Implementation package

- forward-only persistence for requirement snapshots and approval events;
- deterministic requirement resolution service;
- formal approval state/service contract with legacy-status compatibility;
- permission-gated typed IPC/preload bridge;
- user-facing Requirements & Approval workflow integrated with Mix Design management;
- revision/approval immutability and stale-revision guards;
- integrated migration, domain, IPC and regression smokes;
- exact-head CI Validation, Release Acceptance and License Manager Windows Gate.

## Non-goals

- No guessed ACI/ASTM/EN/ISIRI limits.
- No AI or black-box approval decision.
- No automatic approval from Trial strength or calibration results.
- No automatic Production authorization.
- No destructive rewrite of existing lifecycle/audit history.

## Exit criteria

G05 closes only when an approved production-authorized mix can identify the exact revision, requirements snapshot, calculation/profile provenance, Trial/Lab evidence where applicable, approval/authorization actors and immutable event history; stale or altered revisions must fail closed and existing v1.0.1/v1.1 workflows must remain regression-free.
