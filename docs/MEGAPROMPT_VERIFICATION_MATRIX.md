# Mega-Prompt Requirement Verification Matrix

Baseline audit: `main@3b176d1e1366e3b93185fdcf7489b354659dfc2c`

Legend: CLOSED = implemented with evidence; PARTIAL = meaningful implementation exists but target contract is incomplete; OPEN = target capability is not yet product-complete; MANUAL = cannot be closed by CI alone.

| Capability | Baseline status | Completion gate | Evidence / closure requirement |
|---|---|---:|---|
| Electron + React/TypeScript + SQLite + Python engine architecture | CLOSED | 00 | Preserve architecture and privileged-boundary regressions |
| Typed/controlled privileged IPC | CLOSED/PARTIAL audit | 00/15 | Keep renderer privilege restrictions and audit all new APIs |
| Security baseline | CLOSED | 15 | Regression gates remain mandatory |
| Offline machine-bound licensing | CLOSED | 15 | Regression gates remain mandatory |
| Immutable v1.0.1 Golden Baseline | CLOSED | 00 | Never mutate accepted release branch/commit |
| Forward migration discipline through 025 | CLOSED | 00 | New migrations start at 026 and remain forward-only |
| Normal-weight mix design | CLOSED | 05 | Preserve verified ACI behavior |
| Absolute-volume calculation | CLOSED | 05 | Preserve golden reference tests |
| Moisture/absorption correction | CLOSED | 05 | Preserve golden reference tests |
| Durability/chloride/sulfate/ASR/water/aggregate engineering checks | CLOSED | 05 | Preserve references and golden cases |
| Aggregate gradation and blend optimization | CLOSED | 05/08 | Preserve aggregate optimizer; full mix optimizer is separate |
| Full top-level output traceability | PARTIAL | 05 | Audit all outputs and close weak/silent paths |
| Integrated cementitious mass/share independent golden verification | PARTIAL | 05 | Add independent numerical golden case |
| Standard Profile architecture | OPEN | 01 | Versioned profile registry/resolution/persistence/provenance |
| ACI/ASTM executable profile pack | PARTIAL | 02 | Formalize existing rules into profile contract and coverage matrix |
| EN executable profile pack | OPEN | 02 | Authoritative verified implementation |
| ISIRI executable profile pack | OPEN | 02 | Authoritative verified implementation |
| ISO applicable references/profile support | OPEN | 02 | Implement only verified applicable requirements |
| Regional profile | OPEN | 01/02 | Explicit provenance/override policy |
| Company profile | OPEN | 01/02 | Explicit provenance/override policy, never masquerades as standard |
| Material Library | CLOSED | 03 | Preserve existing behavior/snapshots |
| Material Intelligence | PARTIAL | 03 | Versioned observations, supplier/source performance and derived intelligence |
| Other Additions first-class material family | OPEN | 03 | Domain/schema/service/UI/report integration |
| Project/engineering Requirements subsystem | PARTIAL | 04 | Formal requirements model and governing resolution |
| Trial Mix v2 | CLOSED | 15 | Preserve lifecycle/persistence/regression coverage |
| Lab specimen/strength results | CLOSED | 15 | Preserve deterministic results and evidence |
| Calibration | CLOSED/PARTIAL | 15 | Preserve current evidence; expand only through explicit future contracts |
| Immutable revision/history | CLOSED | 15 | Historical records remain protected |
| Formal engineering approval/sign-off | PARTIAL | 04 | Draft/review/lab verified/approved/production authorized + immutable events |
| Production foundation | CLOSED | 09/15 | Preserve historical-write guards |
| Production/QC analytics | CLOSED/PARTIAL | 09 | Add statistically rigorous advanced QC |
| Advanced statistics/SPC | OPEN | 09 | Reference datasets and statistical preconditions |
| Cost Engine | CLOSED | 08/15 | Preserve deterministic revision-bound cost behavior |
| Full Mix Optimization/Decision Engine | OPEN | 08 | Multi-objective/constraint, advisory, explainable, versioned |
| Decision Summary | CLOSED/PARTIAL | 08/10 | Integrate with future verified decision/knowledge layers |
| High-strength concrete engine | OPEN | 07A | Verified method + golden cases + full integration |
| SCC engine | OPEN | 07B | Verified method + golden cases + full integration |
| Lightweight concrete engine | OPEN | 07C | Verified method + golden cases + full integration |
| Heavyweight concrete engine | OPEN | 07D | Verified method + golden cases + full integration |
| Mass concrete engine | OPEN | 07E | Verified method + golden cases + full integration |
| Pumped concrete engine | OPEN | 07F | Verified method + golden cases + full integration |
| No-slump/pavement engine | OPEN | 07G | Verified method + golden cases + full integration |
| Fiber-reinforced concrete engine | OPEN | 07H | Verified method + golden cases + full integration |
| Advanced SCM/durability binder engine | PARTIAL | 07I | Verified full engine integration |
| Report Center / PDF / print | CLOSED/PARTIAL | 12 | Professional export closure and future profile/knowledge metadata |
| Excel export | OPEN | 12 | Stable schema/units/revision/profile traceability |
| Tolou project interchange format | OPEN | 12 | Versioned validated interchange contract |
| Engineering Mega-Prompt/context export | OPEN | 11/12 | Structured validated export |
| Knowledge Layer | OPEN | 10 | Evidence-linked searchable knowledge and provenance |
| AI Engineering Assistant contract | OPEN | 11 | Advisory only; cannot bypass deterministic/approval controls |
| Backup/restore backend | CLOSED | 13 | Preserve safety/regressions |
| Data Safety user navigation | OPEN | 13 | Safe UI integration without risky whole-App rewrite |
| End-to-end product navigation | PARTIAL | 14 | All completed capabilities reachable with state handling |
| Windows automated release acceptance | CLOSED baseline | 15 | Re-run for every release-bearing exact head |
| Full installed-Windows commercial UAT | MANUAL | 15 | Owner/operator sign-off on final candidate |

## Audit rule

A row changes to CLOSED only after the corresponding gate evidence exists on the canonical branch. Documentation, placeholders, disabled navigation, unverified standards tables, or green CI without the required engineering/manual evidence do not qualify as closure.
