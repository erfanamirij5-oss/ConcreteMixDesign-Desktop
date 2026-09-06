# G03 — Versioned Standards Rule Engine

## Engineering goal

Create a deterministic, edition-pinned and auditable rule infrastructure before family-specific normative limits are added to production calculations.

## Change impact

- Database: none.
- Python engine: adds standards rule infrastructure only.
- Existing mix algorithms: unchanged.
- UI/IPC: unchanged in this gate.
- Licensing: unchanged and locked.
- Packaging: no new runtime dependency.
- Regression risk: low; additive module.

## Contract

Every production rule must carry an organization, document code, edition, rule id, parameter, unit where applicable, source reference metadata, severity, applicability predicate, deterministic evaluator, outcome and engineering reason.

Supported outcomes are `PASS`, `WARNING`, `FAIL`, and `NOT_APPLICABLE`.

Hard engineering constraints are represented separately from soft/advisory rules so later cost/carbon optimization cannot silently override mandatory constraints.

Rule packs are explicitly versioned. A conflicting version cannot replace a registered pack under the same pack id; another edition requires a distinct pack identity. Historical calculations can therefore retain the rule-pack identity that produced them when persistence is introduced in later gates.

## Scientific safety rule

G03 does **not** encode remembered or guessed ACI/ASTM/EN/ISO/ISIRI numerical limits. Numerical production rules may be registered only after authoritative source/edition review and numerical test coverage. The unit tests in G03 use a clearly synthetic `TEST-1` fixture, not a concrete design requirement.

This separation is intentional: standards metadata and evaluation mechanics are infrastructure; normative engineering content is controlled data.

## Initial source architecture context

The G02 family matrix already identifies source profiles by concrete family. G03 provides the common execution contract those profiles can later resolve into. Current source-profile identifiers are not automatically equivalent to implemented production rule packs.

## Acceptance criteria

1. Deterministic evaluation for identical context.
2. Explicit PASS/FAIL/WARNING/N/A state model.
3. Edition and source-reference traceability on every result.
4. Actual and limiting values available for explainability when a rule evaluates them.
5. Fail-closed behavior for unknown packs.
6. No silent replacement of a different pack version.
7. No unverified normative numerical rules introduced by this gate.
8. Existing Python and desktop regression suites remain green.
