from tolou_mix_engine.mix_design.normal_weight import calculate_normal_weight_mix


def test_out_of_range_strength_without_explicit_w_cm_returns_structured_fail():
    result = calculate_normal_weight_mix(
        {
            "requirements": {
                "target_strength_mpa": 60,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
            }
        }
    )

    assert result["status"] == "fail"
    assert result["mix_proportions"]["w_cm_ratio"] is None
    assert result["mix_proportions"]["cementitious_kg_m3"] is None
    assert result["mix_proportions"]["strength_based_w_cm_ratio"] is None
    assert result["aggregate_analysis"] == []
    assert any(
        warning["code"] == "W_CM_EXPLICIT_REQUIRED_OUTSIDE_STRENGTH_LOOKUP"
        and warning["severity"] == "fail"
        for warning in result["warnings"]
    )


def test_out_of_range_strength_with_explicit_w_cm_continues_without_extrapolation():
    result = calculate_normal_weight_mix(
        {
            "requirements": {
                "target_strength_mpa": 60,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.35,
            }
        }
    )

    assert result["mix_proportions"]["w_cm_ratio"] == 0.35
    assert result["mix_proportions"]["strength_based_w_cm_ratio"] is None
    assert result["mix_proportions"]["cementitious_kg_m3"] > 0
    assert not any(
        warning["code"] == "W_CM_EXPLICIT_REQUIRED_OUTSIDE_STRENGTH_LOOKUP"
        for warning in result["warnings"]
    )
    assert any(warning["code"] == "HIGH_STRENGTH_SCOPE" for warning in result["warnings"])
