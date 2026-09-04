from tolou_mix_engine.cli import validate_normal_mix_request


def test_high_strength_without_explicit_w_cm_is_rejected_before_proportioning():
    result = validate_normal_mix_request(
        {"requirements": {"target_strength_mpa": 60, "air_entrained": False}}
    )

    assert result is not None
    assert result["status"] == "fail"
    assert result["mix_proportions"]["w_cm_ratio"] is None
    assert any(
        warning["code"] == "W_CM_EXPLICIT_REQUIRED_OUTSIDE_STRENGTH_LOOKUP"
        for warning in result["warnings"]
    )


def test_air_entrained_strength_outside_lookup_requires_explicit_w_cm():
    result = validate_normal_mix_request(
        {"requirements": {"target_strength_mpa": 40, "air_entrained": True}}
    )

    assert result is not None
    assert result["status"] == "fail"


def test_in_range_strength_without_explicit_w_cm_can_use_lookup():
    result = validate_normal_mix_request(
        {"requirements": {"target_strength_mpa": 35, "air_entrained": False}}
    )

    assert result is None


def test_explicit_w_cm_bypasses_strength_lookup_guard():
    result = validate_normal_mix_request(
        {"requirements": {"target_strength_mpa": 60, "w_cm_ratio": 0.34}}
    )

    assert result is None
