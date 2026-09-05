# Gate 11 — Production Hardening

Gate 11 hardens Tolou Concrete Mix Design for commercial Windows release after completion of licensing.

## Goals

1. Application startup must initialize every runtime dependency in deterministic order before any renderer is created.
2. Licensing runtime and licensing IPC must be initialized before protected engineering access is possible; an unlicensed installation must still be able to authenticate and import a license.
3. Startup failures must fail closed with an explicit user-facing diagnostic instead of leaving a partially initialized application.
4. Electron BrowserWindow must retain context isolation, disabled Node integration, controlled navigation and safe external-window behavior.
5. Privileged IPC must require authenticated main-process identity and applicable product-license entitlement; UI state is never an authorization boundary.
6. Diagnostic IPC that exposes executable/runtime information must be reviewed and either protected or explicitly justified as non-sensitive.
7. Engineering engine child processes must have bounded execution time and bounded stdout/stderr capture so a hung or runaway process cannot freeze or exhaust the desktop application.
8. Engine process failures, malformed output and non-zero exits must return controlled errors without leaking local filesystem details in normal user-facing messages.
9. Unhandled promise rejections and uncaught main-process exceptions must be surfaced through a controlled fatal-error path and must not silently corrupt state.
10. SQLite startup must complete migrations, schema compatibility checks, integrity checks and required runtime initialization before the main window opens.
11. Destructive operations, backup/restore, licensing replacement and security administration must preserve existing rollback/atomicity guarantees under failure.
12. Renderer forms and long-running actions must prevent accidental duplicate submissions where duplicate execution could create inconsistent data.
13. Application shutdown must close or quiesce persistent resources and child processes cleanly.
14. License state, security session state and engineering authorization must remain consistent after login, logout, license import/removal and renderer destruction.
15. No private license signing material, password verifier, session identifier, raw machine identifier or secret-like field may be exposed through renderer APIs, logs or audit detail.
16. Production packaging must not depend on development-only source paths, environment state or globally installed tools.
17. Windows packaging CI must continue to verify the bundled engine, migrations, licensing verifier and installer artifact.
18. CI must add hardening regression coverage for startup runtime wiring, product-access initialization, engine timeout/output limits, and relevant failure paths.
19. Existing Gate 01–10 smoke tests must remain green without weakening earlier contracts.
20. Gate 11 cannot close on compilation alone; exact-head Desktop, Python and Windows CI plus behavior/security review are required.

## Initial hardening findings

During the Gate 11 opening review, the merged Gate 10 code was found to contain licensing runtime modules and renderer integration, but `main.ts` did not initialize `initializeLicensingRuntime()` or register `registerLicensingIpc()` before creating the application window. This leaves engineering product-access checks without an installed guard and makes license activation IPC unavailable in a real application startup. Gate 11 treats this as a critical integration regression and closes it first.

## Non-goals

- Large feature additions unrelated to production readiness.
- Cloud telemetry platform.
- Online licensing server.
- Major UI redesign.
- New concrete-engineering calculation capabilities.

## Gate close criteria

Gate 11 may close only after all critical and high-severity hardening findings are resolved, exact-head CI is green across Desktop/Python/Windows, packaging remains valid, and a final review confirms no known release-blocking runtime, security, recovery or data-integrity defect remains.
