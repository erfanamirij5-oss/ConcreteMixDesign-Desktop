from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix


def test_c2_reduces_project_w_cm_to_durability_limit():
    result = calculate_integrated_normal_mix(
        {
            "requirements": {
                "target_strength_mpa": 40,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.45,
            },
            "durability_conditions": {
                "moisture_exposure": True,
                "external_chloride_exposure": True,
                "reinforced_or_embedded_metal": True,
            },
        }
    )

    assert result["durability"]["exposure_classes"]["corrosion"] == "C2"
    assert result["mix_proportions"]["durability_governing_max_w_cm"] == 0.40
    assert result["mix_proportions"]["w_cm_ratio"] == 0.40


def test_f2_applies_required_air_content_to_mix():
    result = calculate_integrated_normal_mix(
        {
            "requirements": {
                "target_strength_mpa": 35,
                "slump_mm": 75,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.45,
            },
            "durability_conditions": {
                "freeze_thaw_exposure": True,
                "freeze_water_exposure": "frequent",
            },
        }
    )

    assert result["durability"]["exposure_classes"]["freeze_thaw"] == "F2"
    assert result["mix_proportions"]["air_content_percent"] == 6.0
    assert result["mix_proportions"]["durability_target_air_percent"] == 6.0


def test_strength_below_durability_minimum_is_fail():
    result = calculate_integrated_normal_mix(
        {
            "requirements": {
                "target_strength_mpa": 25,
                "slump_mm": 100,
                "max_aggregate_size_mm": 19,
                "w_cm_ratio": 0.45,
            },
            "durability_conditions": {
                "moisture_exposure": True,
                "external_chloride_exposure": True,
            },
        }
    )

    assert result["status"] == "fail"
    assert any(
        warning["code"] == "TARGET_STRENGTH_BELOW_DURABILITY_MINIMUM"
        for warning in result["warnings"]
    )
