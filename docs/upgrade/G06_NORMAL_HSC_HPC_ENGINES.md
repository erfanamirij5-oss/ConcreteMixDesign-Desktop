# G06 — Normal / HSC / HPC Engines

## Scope

G06 introduces an explicit family-level calculation entry point for Normal-weight, High-Strength Concrete (HSC), and High-Performance Concrete (HPC). It does not collapse these families into one opaque `calculateMix()` function.

## Engineering architecture

- `normal_weight` keeps the established integrated normal-density engine and its existing ACI 211.1-based preliminary workflow.
- `high_strength` uses a distinct strategy identifier: `high_strength_explicit_input_absolute_volume`.
- `high_performance` uses a distinct strategy identifier: `high_performance_explicit_input_absolute_volume`.
- HSC/HPC do not use the normal-concrete strength-to-w/cm lookup or mixing-water lookup.
- HSC/HPC require explicit w/cm, mixing water, air content, cementitious system, aggregate system, and aggregate blend shares.
- HPC additionally requires at least one explicit performance requirement; compressive strength alone does not define HPC.
- Shared absolute-volume and moisture-correction mechanics may be reused as common engineering infrastructure, while family identity and strategy remain explicit in the result.

## Standards and source discipline

ACI PRC-211.1-22 remains the current reference for the existing normal-density proportioning workflow and shared absolute-volume background. ACI PRC-211.4-08 is identified as a high-strength proportioning guidance source, but G06 intentionally adds no remembered or guessed family-specific numerical limits from it.

Any future HSC/HPC numerical requirement must enter through the versioned G03 rule engine with source identity, edition, applicability, traceability, and tests. Copyrighted standards text is not copied into the repository.

## Confidence and production status

Every HSC/HPC output is marked `PRELIMINARY_UNTIL_TRIAL_AND_CALIBRATION`. G06 does not equate a successful numerical calculation with production verification. Trial Mix, laboratory results, and Calibration remain required before a mixture can reach Verified confidence.

## Fail-closed controls

The engine blocks proportioning when:

- HSC/HPC w/cm is missing;
- HSC/HPC mixing water is missing;
- HSC/HPC air content is missing;
- cementitious sources are absent or invalid;
- aggregate sources or blend shares are absent;
- HPC has no explicit performance requirement;
- a concrete family outside G06 is sent to the G06 family engine.

No silent fallback to the normal-concrete family is permitted.

## Command

`calculate-family-mix`

Supported in G06 for:

- `normal_weight`
- `high_strength` / `hsc`
- `high_performance` / `hpc`

Other families remain blocked until their dedicated gates are implemented.

## Regression boundaries

G06 does not change migrations, licensing, the accepted Windows icon pipeline, the Golden Baseline, or approved revision immutability. The existing `calculate-normal-mix` command remains available for backward compatibility.
