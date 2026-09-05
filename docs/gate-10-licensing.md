# Gate 10 — Commercial Licensing

Gate 10 establishes the minimum commercial licensing layer required before Tolou Concrete Mix Design can be distributed as a sellable Windows product.

## Goals

1. The application must distinguish clearly between unlicensed, trial/grace, active licensed, expired, revoked/invalid and incompatible license states.
2. Licensing decisions must be enforced in the Electron main process. Renderer UI state is not an authorization boundary.
3. A license must be bound to a stable machine fingerprint derived from non-secret local machine characteristics. Raw hardware identifiers must not be exposed to the renderer or written to logs.
4. The product must support offline activation for environments with no internet access.
5. The installed application must verify a signed license payload using an embedded public verification key. The private signing key must never be shipped in the repository, installer or application bundle.
6. The license payload must be tamper-evident and include at minimum: license id, customer/display name, product id, edition, issued-at time, expiry or perpetual marker, machine binding, feature set, schema/version marker and signature.
7. Signature verification must use an asymmetric algorithm available in Node.js crypto. Runtime validation must never depend on a shared secret embedded in the client.
8. License persistence must use the application data directory and must survive normal application upgrades. It must not be stored inside the install directory.
9. Importing/replacing a license must validate signature, product, schema/version compatibility, machine binding and time constraints before committing it as active.
10. Invalid, corrupted, foreign-product, wrong-machine, expired and unsupported-future license files must be rejected with explicit user-facing status while avoiding disclosure of sensitive machine identifiers.
11. A valid active license must remain usable offline without periodic cloud dependency.
12. System clock rollback must not silently extend a time-limited license. Runtime must persist a monotonic-style last-seen wall-clock marker and reject suspicious rollback beyond an allowed tolerance.
13. Licensing state changes must be auditable through the existing authenticated security audit mechanism where an authenticated actor exists. License secrets/signatures/raw machine identifiers must not be written to audit details.
14. License management actions must be Administrator-only under the existing server-side RBAC model.
15. Engineering operations must be blocked when the license state does not permit product use. Login/bootstrap and license-management/recovery screens must remain reachable so an installation can be activated.
16. Backup/Restore must not accidentally transfer a machine-bound license as a valid entitlement to another machine. The license store must remain outside the engineering SQLite backup payload.
17. Restoring an engineering backup must not overwrite licensing state.
18. Existing Gate 09 user/security data must remain compatible after Gate 10 implementation.
19. CI must include smoke tests for valid signature verification, payload tampering, wrong product, wrong machine, expiry, perpetual license, future schema/version rejection, clock rollback protection, atomic license replacement and license persistence path behavior.
20. Windows packaging CI must confirm the licensing runtime code and public verification key/resource required for verification are present, while confirming no private signing key is packaged.

## Initial commercial scope

- Local/offline signed license file activation.
- Machine-bound commercial licenses.
- Perpetual and expiry-based licenses.
- Edition/feature claims in the license payload.
- Administrator license-management UI and clear license status.
- Main-process enforcement before protected engineering operations.

## Non-goals for Gate 10

- Cloud account login or subscription billing.
- Online activation server.
- Floating/network license server.
- Hardware dongles.
- Automatic payment processing.
- Remote revocation service.
- Organization-wide seat management.

Those can be added after v1.0 without weakening the offline signed-license architecture established here.

## Gate close criteria

Gate 10 may close only after implementation, exact-head Desktop/Python/Windows CI success, review of license enforcement beyond compilation, confirmation that no private signing material is present in the repository/package, and upgrade/backup behavior is verified.