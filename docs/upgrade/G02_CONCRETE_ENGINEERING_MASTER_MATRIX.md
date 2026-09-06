# G02 — Concrete Engineering Master Matrix

## Purpose

This document defines the scientific scope contract for Tolou concrete families before family-specific algorithms are implemented. It deliberately avoids embedding unverified numeric limits. Numeric rules belong to G03 versioned standard packs and must be traced to an authoritative edition/source before they can influence production calculations.

## Change Impact Report

- Gate: `G02`
- Feature: Concrete Families × Inputs × Materials × Design Focus × Trial/Validation × Reference Profiles master matrix
- Engineering Goal: Prevent future concrete-family engines from being built from assumptions, copied conventional formulas, or UI-first placeholders.
- Database Impact: None.
- Python Engine Impact: None in this document-only scientific gate.
- UI Impact: None. Planned families remain unavailable as production calculations.
- IPC/Security/Licensing/Packaging Impact: None.
- Regression Risk: Low.
- Standards Policy: References identify authoritative source families. No numeric requirement becomes production logic until G03 verifies edition, applicability, rule and test coverage.

## Confidence model used by all families

| Level | Meaning | Minimum interpretation |
|---|---|---|
| A — VERIFIED | Material-specific + completed trial/testing + accepted calibration | Eligible to be identified as verified for the recorded conditions and scope |
| B — MATERIAL-SPECIFIC | Actual material characterization available, but validation loop incomplete | Engineering design based on actual materials; not production-verified |
| C — PRELIMINARY | One or more influential inputs rely on defaults/reference assumptions | Preliminary design only; missing evidence must be shown |
| D — CONCEPTUAL | Feasibility/research concept with substantial unknowns | Must never be presented as production-ready |

## Master family matrix

| Family ID | Persian family | Primary design focus | Required input groups before a production-capable engine may exist | Trial / validation emphasis | Primary authoritative reference profile for later G03 verification |
|---|---|---|---|---|---|
| `normal_weight` | بتن معمولی | Absolute-volume proportioning governed by workability, strength, durability and aggregate system | Project requirements; binder properties; aggregate SG/absorption/moisture/gradation; water; admixtures; exposure; target fresh/hardened properties | Trial batch; fresh properties; density/yield; strength; adjustment and revision | ACI PRC-211.1-22; applicable ACI 318/301 project requirements; ASTM constituent/test methods |
| `pumped` | بتن پمپی | Conventional proportioning plus pumpability/transport constraints | Normal-weight inputs plus pipeline/placement requirements, aggregate grading/shape, consistency and stability information | Trial mixture and, where required, pumping/field validation of consistency, blockage risk and strength | ACI 211.9R-18; ACI 304.2R-17; base proportioning standard as applicable |
| `high_strength` | بتن پرمقاومت | Strength with low water-binder ratio, SCM/admixture system and material compatibility | Actual cementitious system; HRWR; aggregate strength/quality; target strength/age; curing; production capability; durability | Multiple optimized trial batches; workability retention; strength development; production QC | ACI PRC-211.4-08 plus applicable material/test standards |
| `high_performance` | بتن توانمند | Multi-performance design rather than strength alone | Explicit performance objectives; durability/exposure; transport/placement; binder/admixture system; aggregate quality; measurable acceptance criteria | Performance-specific trial program and project acceptance tests | G03 must assemble a verified profile from applicable ACI/ASTM/project requirements; no single universal HPC formula assumed |
| `self_consolidating` | بتن خودتراکم | Filling ability, passing ability, stability/rheology plus hardened performance | Target fresh-performance class/criteria; geometry/congestion; powder/binder; aggregate grading/volume; HRWR/VMA as applicable; temperature; durability/strength | Slump-flow/workability characterization, passing/stability tests selected for project, segregation control, strength/durability | ACI PRC-237-07(19); ASTM SCC test methods as verified in G03; ACI 238 workability/rheology references where applicable |
| `structural_lightweight` | بتن سبک سازه‌ای | Required equilibrium/fresh density plus strength and durability with absorptive lightweight aggregate behavior | Lightweight aggregate source; density; absorption/moisture; prewetting/conditioning; aggregate grading; target density; strength; exposure | Moisture conditioning; density/yield; workability; strength; absorption-sensitive batch correction; project validation | ACI PRC-213-14(23); applicable ACI 318 requirements; relevant ASTM lightweight aggregate/test methods |
| `heavyweight` | بتن سنگین | Target high density while maintaining segregation control, workability, strength and placement feasibility | Heavy aggregate mineral/source; particle density; grading; target density; handling/placement constraints; binder/water/admixture data | Density uniformity; segregation; workability; strength; placement/compaction validation | ACI PRC-304.3-20; ACI PRC-211.1-22 high-density guidance where applicable |
| `fiber_reinforced` | بتن الیافی | Matrix performance plus fiber type/dose/geometry/dispersion and required post-cracking behavior | Base matrix; fiber material/type; dimensions/aspect information; dosage/volume; mixing/placement constraints; target mechanical response | Workability/dispersion; balling risk; selected residual/flexural/toughness tests; strength/durability as required | ACI PRC-544.3-08(23); ACI 544 family documents; applicable ASTM fiber-performance tests |
| `shotcrete` | بتن پاششی | Dry/wet process, pump/spray behavior, accelerator system, rebound/adhesion and early-age/finished performance | Process type; equipment/nozzle constraints; aggregate; binder; admixture/accelerator; target early/final properties; substrate/placement conditions | Preconstruction trial; operator/process qualification where required; fresh/early-age tests; cores/panels/finished acceptance | ACI PRC-506-22 with ACI 506.2 specification and verified test references |
| `roller_compacted` | بتن غلتکی | Very low/no-slump consistency, maximum practical density/compaction and application-specific performance | Application (pavement/mass); aggregate skeleton; moisture; binder; consistency/compaction target; equipment/lift constraints | Moisture-density/consistency, compaction/density, strength, joint/field QC appropriate to application | ACI PRC-327-24 for pavements; ACI PRC-207.5-11 for RCC mass applications; ACI PRC-309.5-22 compaction report |
| `pervious` | بتن نفوذپذیر | Connected void system balancing permeability, density and structural/service performance | Aggregate grading; paste/binder; target void/permeability/service requirements; compaction method; placement environment | Unit weight/void-related checks, infiltration/permeability as specified, strength and placement validation | ACI PRC-522-23 plus applicable ASTM pervious test methods |
| `mass_concrete` | بتن حجیم | Thermal behavior, heat generation and cracking risk integrated with constructability/durability/economy | Element geometry/boundary conditions; placement sequence; ambient/placing temperature; binder heat characteristics; thermal properties; strength schedule; cooling/insulation strategy | Trial/thermal characterization as required; temperature prediction/monitoring; strength and thermal-control verification | ACI PRC-207.1-21; ACI PRC-207.2 and 207.4 profiles as applicable |
| `underwater` | بتن زیرآب / جایگذاری ویژه | Cohesion, washout resistance, placement stability and required hardened performance | Placement method/depth/environment; fresh stability; binder/powder; admixtures; aggregate; target strength/durability | Procedure-specific mock-up/trial, fresh stability/washout-related testing where specified, strength/durability | G03 requires authoritative project/ACI/ASTM source assembly before production rules are enabled |
| `recycled_aggregate` | بتن با سنگدانه بازیافتی | Replacement/source variability, absorption/moisture, density and performance effects | RCA origin/classification; density; absorption; moisture; grading; contaminants/quality; replacement fractions; target performance | Moisture correction; density/yield; workability; strength/durability and variability validation | G03 source review required; applicable aggregate/concrete standards and project specifications must govern |
| `low_carbon` | بتن کم‌کربن | Engineering-feasible mixture first, then embodied-carbon optimization | Full engineering inputs plus material-specific environmental factors/EPD source, functional unit, system boundary and performance targets | Same engineering trial/validation as host concrete family; carbon objective never overrides mandatory engineering constraints | Host-family standards + verified environmental/LCA methodology in G18; no carbon rule assumed in G02 |
| `uhpc` | بتن فوق‌توانمند | Dense particle system, dispersion, ultra-low water/binder regime, HRWR compatibility, workability, mechanical and durability performance | PSD for powders/aggregates where used; chemistry/physical properties; binder/filler system; HRWR compatibility; water; mixing energy/sequence; curing; target rheology/mechanical/durability metrics | Paste/matrix optimization; mixing/workability; mechanical and durability testing; material-specific iterative trials | ACI 239R-18; ACI PRC-239.1-24; FHWA-HRT-13-100 and current project requirements; verified ASTM test methods |
| `uhpfrc` | بتن الیافی فوق‌توانمند | UHPC matrix plus fiber dispersion/orientation and tensile/post-cracking performance | All UHPC inputs plus fiber geometry/material/volume, mixing/placing/orientation constraints and tensile-performance targets | Matrix trials followed by fiber-reinforced composite trials; workability, compressive, tensile/post-cracking and durability validation | ACI 239 family + ACI 544/test-method profiles + FHWA UHPC research as applicable; G03 verifies exact requirements |
| `alkali_activated` | بتن قلیایی‌فعال / ژئوپلیمری | Precursor/activator chemistry, fresh behavior, curing sensitivity, mechanical and durability performance | Precursor chemistry/physical data; activator type/concentration/composition; liquid/binder definitions; aggregate; curing regime; target properties; handling/safety constraints | Fresh properties; setting; strength development under specified curing; shrinkage/durability and project-specific qualification | ACI PRC-242-22 as technical report plus verified project/material/test standards; no Portland-cement formula is silently reused |
| `custom_research` | طرح سفارشی / تحقیقاتی | Explicit constraint-based experimental design without pretending a standard method exists | User-defined materials, variables, bounds, objectives, units, evidence status, test plan and acceptance criteria | Mandatory experiment/trial matrix; provenance of every assumption and result | Research-mode only until an authoritative standard/profile and validated production strategy are attached |

## Cross-family mandatory domains

Every future production-capable family strategy must explicitly declare applicability for these domains rather than inheriting them silently:

1. **Project and performance requirements** — target ages/properties, placement method, service environment, structural/application constraints.
2. **Material characterization** — identity, source, standard/evidence, physical/chemical properties relevant to the family, date/validity and historical snapshot.
3. **Units and measurement state** — all engineering values carry explicit units and material moisture/reference state where relevant.
4. **Proportioning/optimization strategy** — named algorithm/method version; no black-box output.
5. **Fresh-concrete validation** — tests selected by family/application, not one universal slump field.
6. **Hardened-performance validation** — strength plus any family-specific mechanical/durability requirements.
7. **Trial plan** — a calculated mixture is not automatically VERIFIED.
8. **Production translation** — batch size, moisture/SSD correction, yield and process constraints where applicable.
9. **Traceability** — family strategy version, standard profile/edition, material snapshots, calculation version, trial/revision relationship.
10. **Confidence state** — A/B/C/D must derive from evidence completeness, never from a cosmetic UI selection.

## Dependency rules for later gates

- G03 may create numeric standard rules only when an authoritative edition and applicability statement are verified.
- G04 Engineering Advisor consumes missing/required domains from this matrix; it does not invent engineering advice independently.
- G05 Material Intelligence must support the material evidence demanded by all families, especially PSD, absorption/moisture, chemistry, fibers and activators.
- G06–G10 may activate a family only after its input contract, method, numerical tests, standards profile, trial criteria and failure behavior are complete.
- G11/G12 operate only on family engines that are already feasible/validated enough to generate candidates; optimization never bypasses family constraints.

## Primary source registry reviewed for G02

The following authoritative source families were reviewed to establish scope, not to copy copyrighted numeric rules:

- ACI PRC-211.1-22 — Selecting Proportions for Normal-Density and High-Density Concrete.
- ACI PRC-211.4-08 — High-Strength Concrete mixture proportioning and trial optimization.
- ACI 211.9R-18 — Selecting Proportions for Pumpable Concrete.
- ACI 304.2R-17 — Placing Concrete by Pumping Methods.
- ACI PRC-237-07(19) — Self-Consolidating Concrete.
- ACI PRC-213-14(23) — Structural Lightweight-Aggregate Concrete.
- ACI PRC-304.3-20 — Heavyweight Concrete.
- ACI PRC-544.3-08(23) — Specifying, Proportioning and Production of Fiber-Reinforced Concrete.
- ACI PRC-506-22 — Shotcrete Guide.
- ACI PRC-327-24 — Roller-Compacted Concrete Pavements.
- ACI PRC-207.5-11 — Roller-Compacted Mass Concrete.
- ACI PRC-522-23 — Pervious Concrete.
- ACI PRC-207.1-21 — Mass Concrete.
- ACI 239R-18 and ACI PRC-239.1-24 — UHPC technical references.
- ACI PRC-242-22 — Alkali-Activated Cements.
- FHWA-HRT-13-100 — Development of Non-Proprietary UHPC for the highway bridge sector.

## G02 Definition of Done

G02 is complete only when:

- every G01 family has a row in the master matrix;
- each row identifies design focus, required input groups, validation emphasis and source profile status;
- no unverified numeric standard rule is introduced;
- planned families remain blocked from production calculation;
- a machine-checkable coverage test verifies G01 family registry ↔ G02 matrix completeness;
- existing regression and packaging gates remain green.
