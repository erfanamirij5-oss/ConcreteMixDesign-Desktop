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
12. A product-specific Windows icon is required before Gate 12 closes. Until an approved Tolou `.ico` asset is committed, the default Electron icon is a known release blocker rather than silently accepted.
13. Authenticode/code-signing is a distribution trust requirement. If a production signing certificate is not yet provisioned, Gate 12 must record it as an external release prerequisite and must not embed private signing credentials in the repository.
14. Clean-install, upgrade, uninstall/reinstall and data-preservation behavior require real Windows acceptance testing in Gate 13; CI packaging does not substitute for those GUI/system-level acceptance tests.
15. JavaScript/Electron dependencies used for production packaging must be locked in a committed package-manager lockfile. A build driven by `latest` ranges and `npm install` without a lockfile is not reproducible enough for commercial release.
16. Python build tooling used to produce the bundled engine must be reproducibly constrained before commercial release; an unconstrained future PyInstaller version must not silently change a release artifact.

## Current release blockers

- No approved Tolou `.ico` application asset is present, so electron-builder falls back to the default Electron icon.
- No `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock` or `pnpm-lock.yaml` is committed while `package.json` uses `latest` dependency ranges. The currently green installer build is therefore valid as a packaging proof, but not yet a deterministic commercial build.
- The Python build extra currently allows any `pyinstaller>=6.0.0`; this must be constrained/locked as part of reproducible release tooling.
- Production Authenticode certificate provisioning is external to the repository. Private certificate/key material must never be committed.

## Gate close criteria

Gate 12 may close only when the installer configuration is deterministic, implicit publishing is disabled, the commercial installer contract passes exact-head CI, a Tolou application icon is packaged, JavaScript and Python packaging inputs are reproducibly constrained, no private signing material is present, and no known packaging defect would prevent Gate 13 acceptance testing.
