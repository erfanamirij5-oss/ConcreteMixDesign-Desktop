from tolou_mix_engine.water_compliance import evaluate_mixing_water_compliance


def water(**overrides):
    item = {
        "id": "w1",
        "name": "آب شهری",
        "material_type": "water",
        "material_subtype": "mixing_water",
        "water_share_percent": 100.0,
        "chloride_mg_l": 120.0,
        "sulfate_mg_l": 250.0,
        "alkalis_na2oeq_mg_l": 80.0,
        "total_solids_mg_l": 700.0,
        "c1602_strength_ratio_7d_percent": 96.0,
        "c1602_setting_time_deviation_min": 20.0,
    }
    item.update(overrides)
    return item


def test_single_source_complete_water_passes():
    result = evaluate_mixing_water_compliance({"admixtures": [water()]}, {})
    assert result["status"] == "pass"
    assert result["combined_water"]["performance_qualified"] is True


def test_strength_below_90_fails():
    result = evaluate_mixing_water_compliance({"admixtures": [water(c1602_strength_ratio_7d_percent=89.0)]}, {})
    assert result["status"] == "fail"
    assert any(item["code"] == "ASTM_C1602_PERFORMANCE_FAILED" for item in result["warnings"])


def test_setting_time_outside_window_fails():
    result = evaluate_mixing_water_compliance({"admixtures": [water(c1602_setting_time_deviation_min=95.0)]}, {})
    assert result["status"] == "fail"


def test_missing_performance_data_needs_review():
    result = evaluate_mixing_water_compliance({"admixtures": [water(c1602_strength_ratio_7d_percent=None)]}, {})
    assert result["status"] == "needs_review"


def test_two_sources_require_combined_performance_qualification():
    first = water(id="w1", name="شهری", water_share_percent=70.0)
    second = water(id="w2", name="بازیافتی", material_subtype="wash_water", water_share_percent=30.0)
    result = evaluate_mixing_water_compliance({"admixtures": [first, second]}, {})
    assert result["status"] == "needs_review"
    assert result["combined_water"]["chloride_mg_l"] == 120.0
    assert any(item["code"] == "COMBINED_WATER_PERFORMANCE_TEST_REQUIRED" for item in result["warnings"])


def test_optional_chemical_exceedance_is_review_not_false_fail():
    result = evaluate_mixing_water_compliance({"admixtures": [water(sulfate_mg_l=3500.0)]}, {})
    assert result["status"] == "needs_review"
    assert any(item["code"] == "ASTM_C1602_OPTIONAL_CHEMICAL_LIMIT_EXCEEDED" for item in result["warnings"])


def test_prestressed_uses_lower_chloride_screening_limit():
    result = evaluate_mixing_water_compliance(
        {"admixtures": [water(chloride_mg_l=600.0)]},
        {"prestressed_concrete": True},
    )
    chloride = next(item for item in result["combined_water"]["chemical_checks"] if item["parameter"] == "chloride_mg_l")
    assert chloride["limit"] == 500.0
    assert chloride["status"] == "exceeds_optional_limit"
