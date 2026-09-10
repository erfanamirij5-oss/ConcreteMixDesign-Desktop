from tolou_mix_engine.durability import evaluate_durability


def _soil_result(value: float) -> dict:
    return {
        "soil_water_soluble_sulfate_percent": value,
        "soil_sulfate_test_method": "ASTM C1580",
        "soil_sulfate_test_edition": "20",
        "soil_sulfate_evidence_ref": "LAB-SOIL-001",
    }


def test_soil_sulfate_result_without_provenance_fails_closed():
    checked = evaluate_durability(
        {
            "conditions": {"soil_water_soluble_sulfate_percent": 0.15},
            "max_aggregate_size_mm": 19.0,
        }
    )

    assert checked["status"] == "fail"
    codes = {item["code"] for item in checked["warnings"]}
    assert "SULFATE_TEST_METHOD_REQUIRED" in codes
    assert "SULFATE_TEST_EDITION_REQUIRED" in codes
    assert "SULFATE_EVIDENCE_REFERENCE_REQUIRED" in codes


def test_soil_sulfate_result_with_provenance_enters_existing_unverified_classifier():
    checked = evaluate_durability(
        {
            "conditions": _soil_result(0.15),
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


def test_explicit_non_seawater_with_soil_result_and_provenance_reaches_classifier():
    conditions = _soil_result(0.15)
    conditions["seawater_exposure"] = False
    checked = evaluate_durability(
        {
            "conditions": conditions,
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
