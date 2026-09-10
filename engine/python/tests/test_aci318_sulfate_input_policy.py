from tolou_mix_engine.durability import evaluate_durability


def test_soil_sulfate_result_is_sufficient_to_enter_existing_unverified_classifier():
    checked = evaluate_durability(
        {
            "conditions": {"soil_water_soluble_sulfate_percent": 0.15},
            "max_aggregate_size_mm": 19.0,
        }
    )

    assert checked["status"] in {"pass", "warning"}
    assert checked["exposure_classes"]["sulfate"] == "S1"


def test_explicit_non_seawater_sulfate_assessment_requires_a_test_result():
    checked = evaluate_durability(
        {
            "conditions": {"seawater_exposure": False},
            "max_aggregate_size_mm": 19.0,
        }
    )

    assert checked["status"] == "fail"
    assert checked["error"] == "durability_exposure_inputs_incomplete"
    assert any(item["code"] == "SULFATE_TEST_RESULT_REQUIRED" for item in checked["warnings"])


def test_explicit_non_seawater_with_soil_result_reaches_existing_unverified_classifier():
    checked = evaluate_durability(
        {
            "conditions": {
                "seawater_exposure": False,
                "soil_water_soluble_sulfate_percent": 0.15,
            },
            "max_aggregate_size_mm": 19.0,
        }
    )

    assert checked["status"] in {"pass", "warning"}
    assert checked["exposure_classes"]["sulfate"] == "S1"


def test_non_boolean_seawater_flag_fails_closed():
    checked = evaluate_durability(
        {
            "conditions": {"seawater_exposure": "yes"},
            "max_aggregate_size_mm": 19.0,
        }
    )

    assert checked["status"] == "fail"
    assert checked["error"] == "durability_exposure_inputs_incomplete"
    assert any(item["code"] == "SEAWATER_EXPOSURE_BOOLEAN_REQUIRED" for item in checked["warnings"])


def test_legacy_empty_conditions_preserve_backward_compatible_s0_baseline():
    checked = evaluate_durability({"conditions": {}, "max_aggregate_size_mm": 19.0})

    assert checked["exposure_classes"]["sulfate"] == "S0"
