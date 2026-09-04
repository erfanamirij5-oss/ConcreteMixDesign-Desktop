# Gate 09 — Users / Roles / Audit Security

## Objective
Deliver a production-grade local identity, authorization and audit-security layer for the Tolou Concrete Mix Design Suite without weakening existing engineering traceability or upgrade safety.

## Security model
1. Every privileged mutation must execute under an authenticated, active user identity.
2. Authorization is deny-by-default and permission-based; renderer visibility is not a security boundary.
3. Passwords must never be stored or logged in plaintext. Store only a modern salted password verifier using a deliberately expensive KDF available in the packaged runtime.
4. Authentication failures must not disclose whether a username exists.
5. Disabled users cannot create new sessions or perform privileged operations.
6. Sessions are local-process security context and must not persist reusable plaintext credentials.
7. Role or user changes take effect for subsequent authorization checks without requiring database edits outside the supported service.

## Minimum roles
- Administrator: user/role administration, security audit access, and all engineering permissions.
- Engineer: engineering create/edit/calculate/trial/report operations, but no user or role administration.
- Viewer: read-only access to permitted engineering records and reports.

Roles map to explicit permission identifiers. Business logic checks permissions, not role-name strings, except bootstrap/last-admin invariants.

## User lifecycle
- Bootstrap must provide a controlled first-administrator path for an existing installation with no users.
- Usernames are normalized and unique.
- Users can be created, renamed where safe, activated/deactivated, and assigned roles by authorized administrators.
- Prevent deletion/deactivation/demotion of the last active administrator.
- Password change/reset invalidates prior authentication state as applicable.
- Never expose password verifier material to renderer APIs.

## Audit security
Security-sensitive operations write an append-only audit event containing at minimum:
- event id
- timestamp
- actor user id and stable username snapshot
- action identifier
- target type/id where applicable
- outcome (success/denied/failure)
- structured non-secret detail sufficient for traceability

Audit events must cover authentication outcomes, user lifecycle, role/permission changes, and denied privileged operations. Passwords, password hashes/verifiers, salts, tokens and equivalent secrets are forbidden in audit detail.

Audit records are not editable/deletable through normal application APIs. Security audit viewing requires an explicit permission.

## Database / upgrade safety
- Add versioned schema migration(s) for users, roles, role permissions, user-role assignment, security state and security audit as required.
- Existing commercial data must survive upgrade unchanged.
- Foreign keys and uniqueness constraints enforce identity relationships.
- Migration is idempotent through the normal migration path and remains compatible with backup/restore schema checks.
- Existing engineering audit tables are not silently repurposed or destroyed; security audit has an explicit ownership boundary.

## Main-process enforcement
Authentication, password verification, session establishment, authorization and security-audit writes live in trusted main-process/domain services. Renderer IPC is treated as untrusted input and validates all arguments.

Privileged IPC handlers must authorize in the main process before invoking mutations. New security APIs return bounded DTOs and never raw database rows containing verifier material.

## Required tests
1. Fresh-install bootstrap and first-admin creation.
2. Existing-database migration preserves representative engineering data.
3. Correct password succeeds; wrong password and unknown user fail generically.
4. Password verifier is salted/non-plaintext and different users with the same password do not store identical verifier material.
5. Disabled user authentication and authorization are rejected.
6. Administrator/Engineer/Viewer permission matrix is enforced in business logic.
7. Unauthorized direct IPC/domain mutation is denied even if renderer UI is bypassed.
8. Last-active-admin deactivation/demotion is rejected atomically.
9. Authentication, authorization denial, and user/role changes create append-only audit events with actor/action/target/outcome.
10. Audit payload contains no credential secret material.
11. Audit records cannot be mutated/deleted through supported application APIs.
12. Repeated login/logout and role-change cycles do not retain stale authorization.
13. Backup/restore compatibility smoke remains green after the new migration.
14. Desktop typecheck/build, Python engine tests, and Windows installer packaging gate are green on exact PR head.

## Acceptance gate
Gate 09 closes only when the schema, trusted security service, IPC/UI integration and regression coverage are implemented; exact-head CI is green; and a final review finds no renderer-only authorization, plaintext/reversible credential storage, privilege-escalation path, last-admin lockout path, or unaudited security-sensitive mutation.