# G04 — Tolou Engineering Advisor

## Purpose

The Engineering Advisor is a deterministic guidance layer between project inputs, the concrete-family engineering matrix, versioned standard-rule results, and the user's next engineering action.

It does not replace the engineer and does not silently modify a mix design.

## Message classes

- `REQUIRED`: missing prerequisite or blocking engineering input.
- `RECOMMENDED`: evidence-backed action that improves design maturity.
- `WARNING`: standard-rule warning/failure or engineering risk requiring attention.
- `ENGINEERING_INSIGHT`: interpretation of evidence/confidence state.
- `NEXT_ACTION`: explicit next workflow step.

## Confidence states

- `A_VERIFIED`: material-specific evidence plus completed Trial Mix and Calibration.
- `B_MATERIAL_SPECIFIC`: real project/material data exists, but Trial/Calibration verification is incomplete.
- `C_PRELIMINARY`: partial material data and/or reference defaults are still being used.
- `D_CONCEPTUAL`: early concept/research state without sufficient project-specific evidence.

No state below `A_VERIFIED` may be presented as equivalent to a production-verified mixture.

## Safety rules

1. Unknown concrete families fail closed.
2. Missing required input groups are surfaced individually and block progression.
3. Standard `FAIL` results are never hidden and produce a resolve-first next action.
4. The advisor consumes standard-engine outcomes; it does not invent normative limits.
5. Advice is traceable to the G02 matrix and G03 standard-rule result references.
6. No automatic mutation of approved mix revisions is permitted.
7. User-visible guidance must distinguish requirement, recommendation, warning, insight, and next action.
