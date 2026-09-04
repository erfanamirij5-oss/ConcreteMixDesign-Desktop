# Gate 05 — Engineering Engine Verification Matrix

Gate 05 closes only when each engineering subsystem has a reproducible verification case, explicit standard traceability, assumptions/limitations, and regression coverage.

| Subsystem | Primary verification target | Golden/reference case status |
|---|---|---|
| ACI 211.1 mixing water | Slump / NMSA / air table selection | Golden verified |
| Strength-based w/cm | interpolation + explicit-input guard outside lookup | Existing unit tests; traceability review remaining |
| Absolute volume | 1 m³ volume balance and cement/water/air volumes | Golden verified |
| Coarse aggregate volume | NMSA + fine aggregate FM + dry-rodded unit weight | Golden verified |
| Moisture / absorption | OD → SSD → wet batch and water correction | Golden verified |
| ACI 318 durability | governing max w/cm, min strength, target air | Golden verified: F2/S2/W2/C2 |
| Cementitious system | binder shares, SCM replacement and traceability | Sulfate qualification golden verified; binder mass-share review remaining |
| Chloride | source contributions and exposure limits | Golden verified |
| Sulfate | qualification / compliance logic | Golden verified: S2 direct Type V route |
| ASR | reactivity, qualification and mitigation | Golden verified: reactive aggregate + C1567 mitigation |
| Mixing water | ASTM C1602 qualification / monitoring | Golden verified |
| Aggregate quality | C33/C117/C127/C128/C29 + advanced quality | Golden verified with explicit project limits |
| Gradation | sieve envelope and combined-curve behavior | Golden verified |
| Combined aggregate | weighted curve, continuity and share basis | Golden verified |
| Blend optimizer | deterministic optimum / constraints / manual lock | Golden deterministic optimum verified; existing manual-lock/budget regressions retained |

## Verification rules

1. Golden expected values must be independently derived from the selected reference inputs and equations; they must not simply copy current engine output.
2. Numeric comparisons must use explicit engineering tolerances where exact decimal equality is not inherent to the contract.
3. A golden case must state the governing method/standard reference, inputs, assumptions, expected outputs and limitations.
4. No automatic extrapolation is accepted where the underlying lookup/table scope is exceeded unless an explicit engineering rule exists and is documented.
5. Every calculation path must preserve traceability through `standard_references`, `assumptions`, `warnings` and `limitations` where that subsystem emits a full calculation result; compliance modules must preserve their own references/warnings/evidence contracts.
6. Existing unit tests remain necessary but do not by themselves satisfy Gate 05; complete-system reference cases are required.

## Golden reference suite

- `test_golden_aci_211_normal_weight_19mm_non_air_coarse_volume_case` verifies 100 mm slump, 19 mm NMSA, non-air-entrained water lookup, explicit w/cm 0.45, fine aggregate FM 2.6, coarse aggregate dry-rodded unit weight 1600 kg/m³, absolute-volume fine aggregate calculation, and OD/SSD/wet moisture corrections.
- Durability golden case verifies simultaneous F2/S2/W2/C2 exposure with governing `w/cm = 0.40`, `f'c >= 5000 psi ≈ 34.5 MPa`, and 6% target air at 19 mm NMSA.
- Chloride golden case independently mass-balances binder, aggregate, admixture, and mixing-water chloride contributions against the governing ACI exposure limit.
- ASTM C1602 golden case verifies a qualified single-source mixing-water path with complete chemical and performance data.
- Sulfate/ASR golden cases verify direct ASTM C150 Type V qualification for S2 and a reactive-aggregate mitigation route using ASTM C1567 evidence.
- Aggregate-system golden cases verify explicit C33/C117/C127/C128/C29/LA-Abrasion acceptance inputs, direct weighted combined gradation, and a deterministic optimizer case where the analytically known 50/50 blend scores 100 and ranks first.

## Remaining Gate 05 closure work

1. Verify the integrated cementitious mass/share calculation path with an independent numerical case, not only sulfate qualification.
2. Audit every top-level engineering output for method/reference/assumption/warning/limitation completeness and remove any silent or weakly traced path.
3. Run the complete exact-head Desktop/Python/Windows CI after final changes, review the PR diff, then move PR #6 out of Draft only when no engineering verification blocker remains.
