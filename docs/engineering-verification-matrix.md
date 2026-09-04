# Gate 05 — Engineering Engine Verification Matrix

Gate 05 closes only when each engineering subsystem has a reproducible verification case, explicit standard traceability, assumptions/limitations, and regression coverage.

| Subsystem | Primary verification target | Golden/reference case status |
|---|---|---|
| ACI 211.1 mixing water | Slump / NMSA / air table selection | Started |
| Strength-based w/cm | interpolation + explicit-input guard outside lookup | Existing unit tests; golden expansion pending |
| Absolute volume | 1 m³ volume balance and cement/water/air volumes | Started |
| Coarse aggregate volume | NMSA + fine aggregate FM + dry-rodded unit weight | Started |
| Moisture / absorption | OD → SSD → wet batch and water correction | Started |
| ACI 318 durability | governing max w/cm, min strength, target air | Pending golden cases |
| Cementitious system | binder shares, SCM replacement and traceability | Pending golden cases |
| Chloride | source contributions and exposure limits | Pending golden cases |
| Sulfate | qualification / compliance logic | Pending golden cases |
| ASR | reactivity, qualification and mitigation | Pending golden cases |
| Mixing water | ASTM C1602 qualification / monitoring | Pending golden cases |
| Aggregate quality | C33/C117/C127/C128/C29 + advanced quality | Pending golden cases |
| Gradation | sieve envelope and manual override behavior | Pending golden cases |
| Blend optimizer | deterministic optimum / constraints / manual lock | Pending golden cases |

## Verification rules

1. Golden expected values must be independently derived from the selected reference inputs and equations; they must not simply copy current engine output.
2. Numeric comparisons must use explicit engineering tolerances where exact decimal equality is not inherent to the contract.
3. A golden case must state the governing method/standard reference, inputs, assumptions, expected outputs and limitations.
4. No automatic extrapolation is accepted where the underlying lookup/table scope is exceeded unless an explicit engineering rule exists and is documented.
5. Every calculation path must preserve traceability through `standard_references`, `assumptions`, `warnings` and `limitations`.
6. Existing unit tests remain necessary but do not by themselves satisfy Gate 05; complete-system reference cases are required.

## First reference case

`test_golden_aci_211_normal_weight_19mm_non_air_coarse_volume_case` verifies a complete normal-weight path using 100 mm slump, 19 mm NMSA, non-air-entrained water lookup, explicit governing w/cm 0.45, fine aggregate FM 2.6, coarse aggregate dry-rodded unit weight 1600 kg/m³, absolute-volume fine aggregate calculation, and OD/SSD/wet moisture corrections.
