# G07 — SCC / Pumpable Engines

## Scope

G07 adds two placement-sensitive engineering strategies without collapsing them into one generic mix calculator.

### Self-consolidating concrete (SCC)

SCC is treated as a fresh-state performance system. The engine requires explicit project definitions for filling ability, passing ability, segregation resistance, and a fresh-property test plan. It does not infer SCC acceptance from slump alone and does not fabricate production proportions from incomplete requirements.

The architecture follows the subject structure of ACI PRC-237-07 (Reapproved 2019): fresh properties/performance requirements, materials, mixture proportioning, production and quality control. Numerical acceptance limits are not encoded in G07 unless an edition-pinned rule pack and authoritative source are registered.

### Pumpable concrete

Pumpability is implemented as a placement-performance overlay on a valid base concrete design. The overlay requires explicit placement distance, vertical rise and line configuration. Base strength/durability engineering remains authoritative.

ACI PRC-211.9-18 is the primary guide reference. Trial batching and project-representative pumpability testing remain required before production acceptance. No unverified numerical pumpability limits are encoded in this gate.

## Commands

- `calculate-placement-family`
  - `self_consolidating` / `scc`
  - `pumped` / `pumpable`

Specialized families remain blocked from unrelated commands by the capability registry.

## Confidence

- SCC: `PRELIMINARY_UNTIL_TRIAL_AND_CALIBRATION`
- Pumpable: `PRELIMINARY_UNTIL_PUMPABILITY_VALIDATION`

Neither status is equivalent to a verified production mixture.

## Change control

- No database migration.
- No licensing change.
- No Golden Baseline mutation.
- No merge, tag or release.
