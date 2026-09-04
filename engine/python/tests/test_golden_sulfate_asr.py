from tolou_mix_engine.asr_compliance import evaluate_asr_compliance
from tolou_mix_engine.cementitious_compliance import evaluate_cementitious_compliance


def test_golden_s2_direct_type_v_cement_passes_sulfate_compliance():
    durability = {"exposure_classes": {"sulfate": "S2"}}
    materials = [
        {
            "id": "cement-v",
            "material_type": "cement",
            "material_subtype": "portland_cement",
            "name": "Portland Cement Type V",
            "standard_designation": "ASTM C150 Type V",
        }
    ]

    checked = evaluate_cementitious_compliance(materials, durability)

    assert checked["status"] == "pass"
    assert checked["sulfate_exposure_class"] == "S2"
    assert checked["compliance_route"] == "direct_designation"
    assert checked["qualification_evidence"]["matched_requirement"] == "C150 TYPEV"
    assert checked["warnings"] == []


def test_golden_reactive_aggregate_with_c1567_mitigation_and_traceability_passes():
    materials = {
        "cementitious": [
            {
                "id": "cement",
                "material_type": "cement",
                "name": "Cement",
                "alkali_percent": 0.60,
                "astm_c1567_expansion_14d_percent": 0.07,
                "asr_performance_evidence_ref": "LAB-ASR-2026-014",
            },
            {
                "id": "scm",
                "material_type": "scm",
                "name": "SCM",
                "alkali_percent": 0.30,
                "astm_c1567_expansion_14d_percent": 0.07,
                "asr_performance_evidence_ref": "LAB-ASR-2026-014",
            },
        ],
        "aggregates": [
            {
                "id": "agg",
                "material_type": "coarse_aggregate",
                "name": "Reactive aggregate",
                "asr_reactivity_class": "reactive",
                "astm_c1260_expansion_14d_percent": 0.24,
                "asr_qualification_method": "astm_c1260",
                "asr_performance_evidence_ref": "LAB-C1260-2026-031",
            }
        ],
    }
    binder_system = {
        "components": [
            {"material_id": "cement", "name": "Cement", "mass_kg_m3": 300.0},
            {"material_id": "scm", "name": "SCM", "mass_kg_m3": 100.0},
        ]
    }

    checked = evaluate_asr_compliance(materials, binder_system)

    # Independent alkali loading: 300*0.60% + 100*0.30% = 2.10 kg Na2Oeq/m3.
    assert checked["status"] == "pass"
    assert checked["binder_alkali"]["data_complete"] is True
    assert checked["binder_alkali"]["total_na2oeq_kg_m3"] == 2.1
    assert checked["aggregate_reactivity"]["any_reactive"] is True
    assert checked["aggregate_reactivity"]["sources"][0]["status"] == "reactive"
    assert checked["mitigation"]["status"] == "pass"
    assert checked["mitigation"]["qualified"] is True
    assert checked["mitigation"]["best_c1567_expansion_14d_percent"] == 0.07
    assert checked["warnings"] == []
