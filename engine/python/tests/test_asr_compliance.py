from tolou_mix_engine.asr_compliance import evaluate_asr_compliance


def binder_system():
    return {"components": [{"material_id": "c1", "name": "Type II", "mass_kg_m3": 400.0}]}


def test_nonreactive_aggregate_and_complete_alkali_data_can_pass():
    materials = {
        "cementitious": [{"id": "c1", "material_type": "cement", "alkali_percent": 0.55}],
        "aggregates": [{"id": "a1", "name": "Aggregate", "astm_c1293_expansion_1y_percent": 0.03}],
    }
    result = evaluate_asr_compliance(materials, binder_system())
    assert result["status"] == "pass"
    assert result["binder_alkali"]["total_na2oeq_kg_m3"] == 2.2
    assert result["aggregate_reactivity"]["sources"][0]["status"] == "nonreactive"


def test_missing_binder_alkali_needs_review():
    materials = {
        "cementitious": [{"id": "c1", "material_type": "cement"}],
        "aggregates": [{"id": "a1", "name": "Aggregate", "astm_c1260_expansion_14d_percent": 0.05}],
    }
    result = evaluate_asr_compliance(materials, binder_system())
    assert result["status"] == "needs_review"
    assert any(w["code"] == "BINDER_NA2OEQ_MISSING" for w in result["warnings"])


def test_reactive_aggregate_without_mitigation_needs_review():
    materials = {
        "cementitious": [{"id": "c1", "material_type": "cement", "alkali_percent": 0.60}],
        "aggregates": [{"id": "a1", "name": "Reactive aggregate", "astm_c1260_expansion_14d_percent": 0.25}],
    }
    result = evaluate_asr_compliance(materials, binder_system())
    assert result["status"] == "needs_review"
    assert result["aggregate_reactivity"]["any_reactive"] is True
    assert any(w["code"] == "ASR_MITIGATION_QUALIFICATION_REQUIRED" for w in result["warnings"])


def test_reactive_aggregate_with_effective_c1567_can_pass():
    materials = {
        "cementitious": [{"id": "c1", "material_type": "cement", "alkali_percent": 0.60, "astm_c1567_expansion_14d_percent": 0.07}],
        "aggregates": [{"id": "a1", "name": "Reactive aggregate", "astm_c1293_expansion_1y_percent": 0.08}],
    }
    result = evaluate_asr_compliance(materials, binder_system())
    assert result["status"] == "pass"
    assert result["mitigation"]["qualified"] is True


def test_failed_c1567_causes_fail():
    materials = {
        "cementitious": [{"id": "c1", "material_type": "cement", "alkali_percent": 0.60, "astm_c1567_expansion_14d_percent": 0.14}],
        "aggregates": [{"id": "a1", "name": "Reactive aggregate", "astm_c1260_expansion_14d_percent": 0.30}],
    }
    result = evaluate_asr_compliance(materials, binder_system())
    assert result["status"] == "fail"
    assert any(w["code"] == "ASR_MITIGATION_C1567_NOT_EFFECTIVE" for w in result["warnings"])


def test_c1260_intermediate_range_needs_review():
    materials = {
        "cementitious": [{"id": "c1", "material_type": "cement", "alkali_percent": 0.50}],
        "aggregates": [{"id": "a1", "name": "Borderline aggregate", "astm_c1260_expansion_14d_percent": 0.15}],
    }
    result = evaluate_asr_compliance(materials, binder_system())
    assert result["status"] == "needs_review"
    assert result["aggregate_reactivity"]["sources"][0]["status"] == "needs_review"
