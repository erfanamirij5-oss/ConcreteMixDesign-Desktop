# Gate 08 — Backup / Restore / Data Safety

## Commercial v1.0 objective
Tolou must be able to create a complete, verifiable backup of the active SQLite database and restore it without silent corruption, partial replacement, schema incompatibility, or loss of the pre-restore database.

## Locked safety contract

1. **Consistent backup** — backup is created through SQLite-aware backup semantics, not by blindly copying an open WAL-mode database file.
2. **Pre-export validation** — active database must pass `PRAGMA quick_check` and foreign-key validation before a backup is declared valid.
3. **Backup manifest** — every backup carries format version, application/schema compatibility information, creation timestamp, source database identity/path metadata, file size, and SHA-256 digest.
4. **Restore validation before replacement** — candidate backup is opened separately and checked for SQLite integrity, foreign keys, and supported schema/migration compatibility before touching the active database.
5. **Atomic restore boundary** — an invalid or interrupted candidate must never partially overwrite the active database.
6. **Automatic safety copy** — immediately before restore, Tolou creates a recovery copy of the currently active database.
7. **Post-restore validation** — restored database is reopened with runtime pragmas and must pass runtime database health/compatibility checks before the restore is considered successful.
8. **Failure recovery** — if post-restore validation fails, the pre-restore recovery copy is restored and validated; the failed candidate is not accepted.
9. **Controlled database lifecycle** — restore must close active SQLite handles before file replacement and reopen them only after replacement/validation.
10. **WAL safety** — restore/backup behavior must account for SQLite WAL/SHM state and must not leave stale sidecar files attached to a replaced database.
11. **User-visible provenance** — backup/restore results expose timestamp, source/destination, digest, schema version and validation result; no silent success.
12. **No destructive UI shortcut** — restore requires explicit user action and displays that current data will be replaced after a safety copy is created.

## Required regression tests

- backup of a populated current database restores all representative project/material/gradation/durability/calculation/trial/report data;
- backup SHA-256 and manifest validation;
- corrupted/non-SQLite candidate rejected without changing active DB;
- foreign-key-invalid candidate rejected;
- unsupported future schema rejected;
- restore creates pre-restore recovery backup;
- failed post-restore validation rolls active DB back to recovery copy;
- WAL-mode backup remains consistent;
- repeated backup/restore cycles preserve `PRAGMA quick_check = ok` and zero FK violations;
- packaged Windows runtime contains all required backup/restore code/resources.

## Acceptance rule
Gate 08 remains open until exact-head Desktop/Python/Windows CI is green and the automated recovery tests demonstrate that a failed restore cannot destroy the previously valid active database. Green compilation alone is not sufficient.
