from tolou_mix_engine.mix_design.normal_weight import calculate_normal_weight_mix


def test_normal_weight_engine_returns_traceable_result():
    result = calculate_normal_weight_mix(
        {
            "requirements": {
                "target_strength_mpa": 35,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.45,
            }
        }
    )

    assert result["engine_version"] == "0.1.0"
    assert result["mix_proportions"]["water_kg_m3"] > 0
    assert result["mix_proportions"]["cementitious_kg_m3"] > 0
    assert result["standard_references"]
    assert result["assumptions"]
    assert result["limitations"]


def test_high_w_cm_ratio_creates_warning():
    result = calculate_normal_weight_mix({"requirements": {"w_cm_ratio": 0.6}})

    assert any(warning["code"] == "HIGH_W_CM" for warning in result["warnings"])


def test_high_strength_is_flagged_for_aci_211_4_review():
    result = calculate_normal_weight_mix({"requirements": {"target_strength_mpa": 60}})

    assert any(warning["code"] == "HIGH_STRENGTH_SCOPE" for warning in result["warnings"])
