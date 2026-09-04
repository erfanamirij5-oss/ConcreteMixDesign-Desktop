from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix


def _payload(concrete_type: str) -> dict:
    return {
        "concrete_type": concrete_type,
        "requirements": {
            "target_strength_mpa": 30,
            "slump_mm": 100,
            "max_aggregate_size_mm": 19,
        },
        "materials": {},
        "durability_conditions": {},
    }


def test_unsupported_concrete_family_fails_before_normal_weight_proportioning():
    result = calculate_integrated_normal_mix(_payload("self_consolidating"))

    assert result["status"] == "fail"
    assert result["error"] == "unsupported_concrete_type_for_current_engine"
    assert result["mix_proportions"] == {}
    assert any(item["code"] == "CONCRETE_TYPE_NOT_IMPLEMENTED" for item in result["warnings"])


def test_pumped_normal_weight_scope_is_allowed():
    result = calculate_integrated_normal_mix(_payload("pumped"))

    assert result.get("error") != "unsupported_concrete_type_for_current_engine"
    assert result.get("mix_proportions")
