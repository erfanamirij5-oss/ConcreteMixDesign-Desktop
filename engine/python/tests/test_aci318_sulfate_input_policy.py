from tolou_mix_engine.durability import evaluate_durability


def _soil_result(value: float) -> dict:
    return {
        "soil_water_soluble_sulfate_percent": value,
        "soil_sulfate_test_method": "ASTM C1580",
        "soil_sulfate_test_edition": "20",
        "soil_sulfate_evidence_ref": "LAB-SOIL-001",
    }


def _water_result(value: float) -> dict:
    return {
        "water_dissolved_sulfate_ppm": value,
        "water_sulfate_test_method": "ASTM D516",
        "water_sulfate_test_edition": "22",
        "water_sulfate_evidence_ref": "LAB-WATER-001",
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
    assert checked["sulfate_evidence"]["soil"]["value"] == 0.15
    assert checked["sulfate_evidence"]["soil"]["test_method"] is None
    assert checked["sulfate_evidence"]["verification_state"] == "classification_thresholds_existing_unverified"


def test_soil_sulfate_result_with_provenance_enters_existing_unverified_classifier():
    checked = evaluate_durability(
        {
            "conditions": _soil_result(0.15),
            "max_aggregate_size_mm": 19.0,
        }
    )

    assert checked["status"] in {"pass", "warning"}
    assert checked["exposure_classes"]["sulfate"] == "S1"
    assert checked["sulfate_evidence"]["soil"] == {
        "value": 0.15,
        "unit": "percent_by_mass",
        "test_method": "ASTM C1580",
        "test_edition": "20",
        "evidence_ref": "LAB-SOIL-001",
    }
    assert checked["traceability"]["soil_sulfate_test"] == "caller-supplied method/edition retained in sulfate_evidence"


def test_water_sulfate_provenance_is_preserved_without_inferred_method():
    checked = evaluate_durability(
        {
            "conditions": _water_result(2000.0),
            "max_aggregate_size_mm": 19.0,
        }
    )

    assert checked["status"] in {"pass", "warning"}
    assert checked["exposure_classes"]["sulfate"] == "S2"
    assert checked["sulfate_evidence"]["water"] == {
        "value": 2000.0,
        "unit": "ppm",
        "test_method": "ASTM D516",
        "test_edition": "22",
        "evidence_ref": "LAB-WATER-001",
    }


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
    assert checked["sulfate_evidence"]["seawater_exposure"] is False


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
    assert checked["sulfate_evidence"]["seawater_exposure"] is False


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
    assert checked["sulfate_evidence"] == {
        "verification_state": "classification_thresholds_existing_unverified",
        "seawater_exposure": None,
        "soil": None,
        "water": None,
    }
