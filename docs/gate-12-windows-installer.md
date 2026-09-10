# Gate 12 — Windows Installer

Gate 12 turns the hardened desktop application into a deterministic, commercially distributable Windows installer while preserving engineering data and the security/licensing boundaries established by earlier gates.

## Release contract

1. Build a Windows x64 NSIS installer from repository-controlled inputs.
2. Packaging must never implicitly publish to GitHub or require a repository publishing token. Publishing belongs to the release gate.
3. Keep a stable application identity (`ir.tolou.concreteMixDesign`), product name and executable name so upgrades do not create parallel identities accidentally.
4. Install per-user by default and run the application as the invoking user; the application itself must not require administrator execution.
5. The assisted installer must allow the destination directory to be selected and create Start Menu and desktop shortcuts.
6. Uninstall must preserve user engineering data by default. Destructive user-data deletion is not an uninstall side effect.
7. The packaged application must contain the compiled engineering engine and all runtime database migrations required by the current schema.
8. The packaged engineering engine must pass its health contract on the Windows CI runner.
9. The packaged ASAR must contain the licensing verification runtime and public verification key, and must not contain private signing material.
10. CI must verify that a nontrivial installer artifact is produced and report its SHA-256 digest for traceability.
11. Installer metadata and the data-preservation policy are release contracts and must be regression-tested in CI.
12. The approved Tolou Windows icon must be wired to the customer executable, installer and uninstaller and verified by fixed hash plus PE-resource checks.
13. Authenticode/code-signing is a distribution trust requirement. If a production signing certificate is not yet provisioned, Gate 12 records it as an external release prerequisite and never embeds private signing credentials in the repository.
14. Clean-install, upgrade, uninstall/reinstall and data-preservation behavior require real Windows acceptance testing in Gate 13; CI packaging does not substitute for user-driven GUI/system-level acceptance tests.
15. JavaScript/Electron dependencies used for production packaging must be locked in committed `package-lock.json`; CI and release workflows must use `npm ci` so package/lock drift fails rather than silently resolving a new graph.
16. Python build tooling used to produce the bundled engine must be reproducibly constrained; PyInstaller and other build-only dependencies must use exact versions for commercial release builds.

## Current Gate 12 status for v1.1.0

Resolved repository-controlled prerequisites:

- Approved Tolou `.ico` asset is committed at `build/tolou-standard.ico`, wired into Electron/NSIS configuration and protected by Windows CI icon/resource checks.
- `package-lock.json` is committed for product version `1.1.0`; desktop CI, Windows packaging, License Manager validation and Release Acceptance install dependencies with `npm ci`.
- Python engine build dependencies are exact-pinned: `pyinstaller==6.22.2` and `Pillow==11.3.0`.
- Windows packaging verifies the bundled engineering engine, runtime migrations through 025, licensing runtime/public key, v1.1 application runtime modules, installer metadata and user-data preservation policy.
- Product release identity is `1.1.0`; installer naming is derived from the package version and checked before `dist:win`.

External/final acceptance prerequisites:

- Production Authenticode certificate provisioning remains external to the repository. Private certificate/key material must never be committed.
- Gate 13 manual Windows UAT remains required for the user-driven application workflow and upgrade/reinstall behavior. Automated Release Acceptance is necessary evidence but is not a substitute for manual UAT.

## Gate close criteria

Gate 12 may close when the reproducible-build branch passes exact-head CI Validation, License Manager Windows Gate and Release Acceptance with the committed lockfile and `npm ci` workflow. Gate 13/manual UAT remains a separate release-acceptance activity after Gate 12 repository-controlled criteria are satisfied.
