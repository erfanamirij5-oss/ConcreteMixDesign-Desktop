# Tolou Next Generation — Gate Status

This file is the repository source of truth for the G00–G24 upgrade program. Chat history is not authoritative.

## Baseline

- Golden accepted branch: `release/v1.0.1-accepted`
- Golden accepted commit: `77dbc82ca6e63af5e7620089ddaad7b1a207b3db`
- Development branch: `upgrade/v1.1`
- Current implementation branch: `feature/g06-normal-hsc-hpc-engines`
- Existing database migration ceiling at program start: `022_users_roles_audit_security`
- Owner: Engineer Erfan Amiri

## Status vocabulary

`NOT_STARTED` · `PLANNED` · `IN_PROGRESS` · `IMPLEMENTED` · `AUTOMATED_VERIFIED` · `WINDOWS_VERIFIED` · `OWNER_ACCEPTED` · `BLOCKED`

Automated verification is not Windows verification, and Windows verification is not owner acceptance.

## Gate ledger

| Gate | Title | Status | Evidence / Notes |
|---|---|---|---|
| G00 | Golden baseline & upgrade foundation | AUTOMATED_VERIFIED | Implementation head `feee70317dc0051f71edad0d81cd41bd34cbd1d8`; workflow run `34048919939` passed desktop golden-baseline/regression, Python engineering regression, and Windows packaging evidence. Real installed-Windows owner acceptance is not claimed. |
| G01 | Universal concrete family architecture | AUTOMATED_VERIFIED | Implementation verified at head `c81c0795f5eed3d2ccf5d7ba4d620b608f9d123a`; workflow run `34049408496` passed Python engineering regression, golden-baseline/desktop regression, and Windows packaging evidence. |
| G02 | Concrete engineering master matrix | AUTOMATED_VERIFIED | Verified head `0e5f81c2954ebd3e705a4972c300b1de9b9c11e9`; workflow run `34049796758` completed successfully. |
| G03 | Versioned standards rule engine | AUTOMATED_VERIFIED | Verified head `c7c76e28930dfb7eef4b61b4150af37a42eadb76`; workflow run `34052032937` passed all upgrade jobs. No unverified normative numerical limits were added. |
| G04 | Tolou Engineering Advisor | AUTOMATED_VERIFIED | Verified head `f37638b0d850d3b9e6d726b96080a97046cea482`; workflow run `34053839949` passed all upgrade jobs. |
| G05 | Universal material intelligence | AUTOMATED_VERIFIED | Verified head `0d343edb73623129b00cbae2947475216547eecc`; workflow run `34054187760` passed all upgrade jobs. |
| G06 | Normal / HSC / HPC engines | AUTOMATED_VERIFIED | Verified head `4ec95a040394fcbaeffac076e6b6dd12a3087907`; workflow run `34055382662` passed Python engineering regression, golden-baseline/desktop regression, and Windows packaging evidence. HSC/HPC remain Preliminary until Trial/Calibration. |
| G07 | SCC / pumpable engines | PLANNED | Depends on verified G06. SCC must use an explicit rheology/stability strategy; pumpable concrete must remain a placement-specific overlay with explicit pumpability requirements and trial verification. |
| G08 | Lightweight / heavyweight engines | NOT_STARTED | Depends on G05/G06. |
| G09 | FRC / shotcrete / RCC / pervious / mass / special placement | NOT_STARTED | Depends on preceding material/design foundations. |
| G10 | UHPC / UHPFRC engine | NOT_STARTED | Depends on G05/G06. |
| G11 | Candidate mix generator | NOT_STARTED | Depends on G06–G10 as applicable. |
| G12 | Multi-objective optimization | NOT_STARTED | Depends on G11. |
| G13 | Trial Mix v2 | NOT_STARTED | Depends on candidate/design workflow. |
| G14 | Specimen & laboratory system | NOT_STARTED | Depends on G13. |
| G15 | Calibration engine | NOT_STARTED | Depends on G13/G14. |
| G16 | Production/moisture correction | NOT_STARTED | Depends on G13/G15. |
| G17 | QC & statistical intelligence | NOT_STARTED | Depends on G14–G16. |
| G18 | Cost & carbon intelligence | NOT_STARTED | Depends on materials/design data. |
| G19 | Engineering decision center | NOT_STARTED | Depends on comparison-ready outputs. |
| G20 | Report & knowledge system | NOT_STARTED | Depends on domain outputs. |
| G21 | Industrial integration | NOT_STARTED | Depends on stable core workflows. |
| G22 | Commercial hardening | NOT_STARTED | Final feature-freeze hardening. |
| G23 | Real Windows acceptance | NOT_STARTED | Requires installed-product evidence. |
| G24 | New release | NOT_STARTED | Requires owner approval after G23. |

## G06 completion record

- Gate: `G06`
- Status: `AUTOMATED_VERIFIED`
- Branch: `feature/g06-normal-hsc-hpc-engines`
- Verified implementation head: `4ec95a040394fcbaeffac076e6b6dd12a3087907`
- Core module: `engine/python/src/tolou_mix_engine/family_mix.py`
- Capability registry: `engine/python/src/tolou_mix_engine/concrete_families.py`
- CLI command: `calculate-family-mix`
- Tests: `engine/python/tests/test_family_mix.py`, `engine/python/tests/test_concrete_family_registry.py`
- Contract: `docs/upgrade/G06_NORMAL_HSC_HPC_ENGINES.md`
- HSC/HPC normal-strength lookup fallback: prohibited
- HSC/HPC explicit water/w_cm/air/material inputs: required
- HPC performance requirements: required
- Confidence before Trial/Calibration: Preliminary
- New normative numerical HSC/HPC limits added: none
- CI run: `34055382662`
- Python engineering regression: PASS
- Golden baseline and desktop regression: PASS
- Windows packaging evidence: PASS
- Database migrations changed: none
- Licensing changed: no
- Golden baseline changed: no
- Merge/tag/release performed: no

## Change-control rules

- Never rewrite migrations `001`–`022`.
- Never modify `release/v1.0.1-accepted`.
- No merge to `main`, tag, release or Golden Baseline mutation without explicit owner approval.
- Licensing and the accepted Windows icon pipeline remain locked unless a directly related defect requires change.
