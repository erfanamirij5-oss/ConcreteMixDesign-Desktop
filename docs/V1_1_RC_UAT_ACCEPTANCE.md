# Tolou Concrete Mix Design v1.1.0 — RC / Manual Windows UAT Acceptance

This checklist is the human acceptance gate for Tolou Concrete Mix Design v1.1.0. Automated CI, packaging, licensing and release-acceptance workflows remain necessary but do not replace this manual UAT.

## Release Candidate Identity

- Product: Tolou Concrete Mix Design
- Target version: `1.1.0`
- RC source branch: `main`
- RC commit SHA: record the exact commit used for the installer under test.
- Installer filename must follow: `Tolou-Concrete-Mix-Design-1.1.0-Setup.exe`
- Do not declare v1.1 accepted if the tested installer cannot be traced to the exact accepted commit.

## Automated Preconditions

Before manual UAT begins, confirm all required automated gates passed for the exact RC SHA:

- CI Validation
- License Manager Windows Gate
- Release Acceptance
- Windows installer build and packaging verification
- Packaged migrations through `025_cost_engine_foundation`
- Packaged v1.1 runtime contract verification
- Installed application launch and renderer acceptance
- License Manager ↔ customer runtime contract
- Backup/restore regression coverage
- Historical revision read contract
- Trial Mix v2 / Production-QC / Cost persistence contracts

If any required automated gate is red, manual UAT cannot produce an accepted release.

## Manual Windows UAT — Required Sequence

Run this sequence on a clean or representative Windows customer environment using the exact RC installer.

### 1. Install / Launch / Identity

- Install the NSIS package successfully.
- Confirm application title/icon/shortcut identity is Tolou.
- Confirm the installed version is `1.1.0`.
- Launch from the installed shortcut, not from the development environment.
- Confirm no startup crash, blank window or missing renderer assets.

### 2. Authentication / Licensing

- Login with an authorized application user.
- Verify unlicensed state blocks engineering access.
- Activate or load a valid machine-bound license.
- Confirm licensed state allows engineering access.
- Confirm customer/edition/remaining-days information is coherent.
- Confirm logout and re-login behave correctly.

### 3. Core Project Workflow

- Open Dashboard.
- Create or open a Project / Mix Design.
- Open the active Mix Design Workspace.
- Enter or verify required engineering inputs.
- Run calculation.
- Confirm result is returned without runtime error.
- Save the Mix Design.
- Close the application.
- Reopen the application.
- Reopen the same Mix Design and verify persisted data/results.

### 4. Material Library / Engineering Traceability

- Open Material Library.
- Create or select representative materials.
- Confirm material identity and engineering properties persist.
- Use the materials in a Mix Design where applicable.
- Confirm saved revision/material snapshot behavior is coherent after reopening.

### 5. Revision Control

- Create a new revision from an existing Mix Design using the supported workflow.
- Confirm prior revision remains immutable.
- Compare current and historical revision evidence.
- Confirm historical engineering reads do not silently use the current design state.

### 6. Trial Mix v2

- Create a Trial Mix session for the active revision.
- Start the session.
- Link a Trial Batch.
- Record actual material quantities.
- Record specimen information.
- Record compressive-strength evidence.
- Review descriptive strength analytics.
- Review calibration comparison.
- Review moisture-correction evidence where applicable.
- Review Revision Feedback.
- Confirm no pass/fail, standards acceptance or recommendation is inferred unless explicitly supported by a verified standards profile.
- Complete the Trial Mix session only when its workflow requirements are satisfied.
- Confirm completed/void sessions are read-only.

### 7. Production / QC

- Create representative Production/QC batch evidence for the current revision.
- Record material actuals/specimen/strength evidence as supported by the UI.
- Review Production/QC descriptive analytics.
- Verify historical revisions cannot receive new Production/QC writes.
- Confirm revision identity is visible and coherent throughout the workflow.

### 8. Cost Engine

- Create a cost input set for the current revision.
- Enter representative unit costs.
- Calculate cost per m³.
- Confirm deterministic line totals and total cost.
- Confirm missing quantity/cost evidence is reported as incomplete rather than silently invented.
- Confirm a historical revision cannot receive a new cost input set.

### 9. Engineering Decision Summary / Reports

- Review Engineering Decision Summary for the current revision.
- Confirm strength evidence is scoped to the current revision.
- Confirm cost evidence is scoped to the current revision.
- Confirm policy flags do not claim acceptance/pass-fail/compliance when they were not applied.
- Open Report Center.
- Generate representative reports.
- Verify immutable report snapshots/history.
- Verify Production/QC evidence appears in the supported production report flow.
- Exercise PDF/Print/export paths where available.

### 10. Data Safety

- Open Data Safety / Backup.
- Create a backup successfully.
- Confirm manifest/backup identity is shown or recorded.
- Make a safe test change.
- Exercise restore according to the product warning flow.
- Confirm Recovery Copy behavior is presented before destructive replacement.
- After relaunch, verify restored data integrity.

### 11. Security / Users

- Open Security & Users administration with an authorized user.
- Confirm unauthorized operations are blocked for a lower-privilege user where practical.
- Confirm actor identity/audit behavior remains coherent for security-sensitive changes.

### 12. Close / Reopen / Persistence Pass

Perform one final end-to-end persistence cycle:

`Install → Launch → Login → License → Dashboard → Open/Create Project → Open Mix → Calculation → Save → Trial/QC/Cost evidence → Report → Backup → Close → Reopen → Verify Persistence`

No critical data loss, startup failure, licensing regression, migration error, corrupted historical revision, or unexplained engineering result is acceptable.

## Acceptance Record

Record the following when UAT passes:

- RC commit SHA:
- Installer filename:
- Installer SHA-256:
- Windows edition/version:
- Test machine identifier or asset label:
- UAT date:
- Tester:
- CI Validation run:
- License Manager Windows Gate run:
- Release Acceptance run:
- Result: `PASS` / `FAIL`
- Blocking defects:
- Non-blocking observations:

## Release Decision Rule

Tolou Concrete Mix Design v1.1.0 may be declared accepted only when:

1. all required automated gates pass on the exact RC SHA;
2. the exact RC installer passes this manual Windows UAT;
3. no unresolved release-blocking defect remains;
4. the accepted installer can be cryptographically traced to the accepted RC commit.

Passing CI alone is not final commercial acceptance.