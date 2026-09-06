# Tolou Next Generation — Gate Status

This file is the repository source of truth for the G00–G24 upgrade program. Chat history is not authoritative.

## Baseline

- Golden accepted branch: `release/v1.0.1-accepted`
- Golden accepted commit: `77dbc82ca6e63af5e7620089ddaad7b1a207b3db`
- Development branch: `upgrade/v1.1`
- Current implementation branch: `feature/g00-upgrade-foundation`
- Existing database migration ceiling at program start: `022_users_roles_audit_security`
- Owner: Engineer Erfan Amiri

## Status vocabulary

`NOT_STARTED` · `PLANNED` · `IN_PROGRESS` · `IMPLEMENTED` · `AUTOMATED_VERIFIED` · `WINDOWS_VERIFIED` · `OWNER_ACCEPTED` · `BLOCKED`

Automated verification is not Windows verification, and Windows verification is not owner acceptance.

## Gate ledger

| Gate | Title | Status | Evidence / Notes |
|---|---|---|---|
| G00 | Golden baseline & upgrade foundation | IN_PROGRESS | Baseline recovered at `77dbc82`; implementing explicit accepted-baseline upgrade regression and CI-on-upgrade branches. |
| G01 | Universal concrete family architecture | NOT_STARTED | Depends on G00. |
| G02 | Concrete engineering master matrix | NOT_STARTED | Depends on G01. |
| G03 | Versioned standards rule engine | NOT_STARTED | Depends on G02. |
| G04 | Tolou Engineering Advisor | NOT_STARTED | Depends on G02/G03. |
| G05 | Universal material intelligence | NOT_STARTED | Depends on G02. |
| G06 | Normal / HSC / HPC engines | NOT_STARTED | Depends on G03/G05. |
| G07 | SCC / pumpable engines | NOT_STARTED | Depends on G06. |
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

## G00 acceptance criteria

G00 is not complete until all of the following are true:

1. The accepted v1.0.1 schema/data can be opened by the upgrade line without data loss.
2. A validated pre-upgrade database backup is produced before migration execution.
3. Re-running runtime migrations is idempotent.
4. SQLite `quick_check` and foreign-key integrity remain clean after upgrade.
5. Existing startup, renderer, engine, security, licensing, report, backup and persistence regression gates remain green.
6. CI runs automatically for `upgrade/v1.1` and its feature branches, not only `main`.
7. Windows packaging gates pass; this is automated evidence only, not real-Windows owner acceptance.
8. Gate status is updated with commit SHA and CI run evidence before G01 begins.

## Change-control rules

- Never rewrite migrations `001`–`022`.
- Never modify `release/v1.0.1-accepted`.
- No merge to `main`, tag, release or Golden Baseline mutation without explicit owner approval.
- Licensing and the accepted Windows icon pipeline remain locked unless a directly related defect requires change.
